import { MODULE_ID } from "./constants.mjs";
import { linkedOwner } from "./bonded.mjs";

/** Slug of the marker effect the Dread Form aura hands to enemies inside it. */
const MARKER_SLUG = "ascendant-bonded-dread-form-frightened";

/** The aura's traits, carried onto the save as roll options so bonuses against fear or mental effects apply. */
const SAVE_TRAITS = ["emotion", "fear", "mental"];

/** PF2e's degree of success for a success. */
const SUCCESS = 2;

/**
 * Bonded Soul's Dread Form: "Enemies that begin their turn within 30 feet are
 * Frightened 1 unless they succeed at a Will save against your class DC."
 *
 * PF2e 8.5.1 applies an aura's effects whenever a creature is inside, whatever
 * the effect's `events` say: applyAreaEffects never reads them, and they only
 * set removeOnExit's default (pf2e.mjs:40972). So the aura effect is a marker
 * meaning "inside Dread Form", which PF2e already limits to enemies and keeps off
 * creatures immune to its fear, emotion or mental traits (createDocuments,
 * pf2e.mjs:45566). At the start of a turn, a creature carrying the marker rolls
 * the save here, on the client of its primary updater, and a failure raises its
 * stored Frightened to at least 1, which then decays as normal.
 *
 * "Your class DC" is the owner's, found through the Bonded's link flag; with two
 * classes, the higher.
 */
export function registerDreadForm() {
    Hooks.on("pf2e.startTurn", (combatant) => {
        const actor = combatant?.actor;
        if (!actor || actor.primaryUpdater !== game.user) return;
        for (const marker of actor.itemTypes.effect.filter((e) => e.slug === MARKER_SLUG && e.flags?.pf2e?.aura)) {
            rollSave(actor, marker).catch((error) => console.error(`${MODULE_ID} | Dread Form save failed`, error));
        }
    });
    return true;
}

/** The owner's class DC, the higher of two classes', or null. */
export function ownerClassDC(owner) {
    const values = Object.values(owner?.classDCs ?? {})
        .map((statistic) => statistic?.dc?.value)
        .filter(Number.isFinite);
    const best = Math.max(...values);
    return best > 0 ? best : null;
}

async function rollSave(actor, marker) {
    const bonded = await fromUuid(marker.flags.pf2e.aura.origin);
    const owner = bonded ? linkedOwner(bonded) : null;
    const dc = ownerClassDC(owner);
    if (!dc) {
        ui.notifications.warn(game.i18n.format("ASCENDANT.DreadForm.NoDC", { bonded: bonded?.name ?? "?", target: actor.name }));
        return;
    }

    const roll = await actor.saves?.will?.roll({
        dc: { value: dc, label: game.i18n.localize("ASCENDANT.DreadForm.SaveDC") },
        extraRollOptions: [...SAVE_TRAITS, ...SAVE_TRAITS.map((trait) => `item:trait:${trait}`)],
        skipDialog: true,
    });
    const degree = roll?.degreeOfSuccess;
    if (!Number.isInteger(degree) || degree >= SUCCESS) return;

    const current = actor.itemTypes.condition.find((c) => c.slug === "frightened" && !c.isLocked);
    if (!current) await actor.increaseCondition("frightened", { value: 1 });
}
