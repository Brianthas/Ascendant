import { MODULE_ID, DREAD_PRESENCE } from "./constants.mjs";

const LINGERING_SLUG = "ascendant-dread-presence-lingering";
const ICON = "icons/magic/control/fear-fright-monster-grin-green.webp";

/** The aura's traits, carried onto the save as roll options so bonuses against fear or mental effects apply. */
const SAVE_TRAITS = ["emotion", "fear", "mental", "visual"];

/** PF2e's degree of success for a critical failure. */
const CRITICAL_FAILURE = 0;

/** Frightened value per degree of success, indexed from critical failure (0) to critical success (3). */
const FRIGHTENED_BY_DEGREE = [4, 3, 2, 1];

/** Seconds in a round, as PF2e's duration table counts them. */
const SECONDS_PER_ROUND = 6;

/**
 * Automate Dread Presence's Will save and what follows from it.
 *
 * PF2e's Aura rule element hands one of the talent's two aura effects to each
 * enemy inside, on the client of that enemy's primary updater. PF2e 8.5.1 never
 * rolls an aura save: the schema has a `save` field and applyAreaEffects does
 * not read it. So this watches for the effect arriving and rolls the save on the
 * same client, which is the one allowed to update that actor.
 *
 * The result is the effect's counter badge, and the effect grants Frightened at
 * the badge value in memory, which nothing can lower: that is the floor while
 * inside. From the owner's 7th level the floor also stops reductions below 2
 * (3 from 13th), but only once the creature's Frightened has reached that value,
 * by Bryan's ruling: a critical success stays at Frightened 1. So whenever the
 * creature's stored Frightened rises while it is inside, the badge rises to the
 * lower of that value and the level floor.
 *
 * When the effect leaves (the enemy walks out, the aura is switched off, or
 * someone deletes it), the creature keeps its Frightened value as a stored
 * condition that decays normally, and a Lingering effect holds the rolled
 * result for 1 round, or 1 minute after a critical failure. The level floors say
 * "while in your aura", so they do not linger. Re-entering hands over a new
 * effect and a new roll, and PF2e shows whichever Frightened is higher, which is
 * the text's "taking the worse result".
 */
export function registerDreadPresence() {
    Hooks.on("createItem", (item, _options, userId) => {
        if (userId !== game.user.id) return;
        if (isAuraEffect(item)) {
            rollSave(item).catch((error) => console.error(`${MODULE_ID} | Dread Presence save failed`, error));
        } else if (isStoredFrightened(item)) {
            ratchet(item.actor).catch((error) => console.error(`${MODULE_ID} | Dread Presence floor failed`, error));
        }
    });
    Hooks.on("updateItem", (item, changes, _options, userId) => {
        if (userId !== game.user.id || !isStoredFrightened(item) || changes.system?.value === undefined) return;
        ratchet(item.actor).catch((error) => console.error(`${MODULE_ID} | Dread Presence floor failed`, error));
    });
    Hooks.on("deleteItem", (item, _options, userId) => {
        if (userId !== game.user.id || !isAuraEffect(item)) return;
        onLeave(item).catch((error) => console.error(`${MODULE_ID} | Dread Presence exit failed`, error));
    });
    return true;
}

/** An effect the aura handed over, and not a copy dragged from the compendium. */
function isAuraEffect(item) {
    return item?.type === "effect" && DREAD_PRESENCE.effects.includes(item.slug) && !!item.flags?.pf2e?.aura;
}

function isStoredFrightened(item) {
    return item?.type === "condition" && item.slug === "frightened" && !item.isLocked;
}

/**
 * The talent's DC: "the higher of your class DC or spell DC".
 *
 * PF2e's classOrSpellDC is exactly that for one class: the primary class DC,
 * raised by every spellcasting entry's DC (an NPC's starts from its level-based
 * class DC). A character with a second class has a second class DC that PF2e
 * leaves out, so every class DC is checked as well.
 *
 * Returns null when the actor has no DC at all: a character with no class has a
 * classOrSpellDC of 0.
 */
export function dreadPresenceDC(owner) {
    const values = [
        owner?.system?.attributes?.classOrSpellDC?.value,
        ...Object.values(owner?.classDCs ?? {}).map((statistic) => statistic?.dc?.value),
    ].filter(Number.isFinite);
    const best = Math.max(...values);
    return best > 0 ? best : null;
}

/** "Cannot reduce their Frightened value below 2 while in your aura" from 7th, 3 from 13th. */
export const levelFloor = (level) => (level >= 13 ? 3 : level >= 7 ? 2 : 0);

/**
 * Whether a creature the aura reached treats its result as one degree better.
 *
 * Below 10th: fear- and emotion-immune creatures (mental-immune and mindless
 * ones are kept out by the effect's mental trait and the aura's predicate). From
 * 10th to 16th: mental-immune and mindless creatures, while fear- and
 * emotion-immune ones roll normally. From 17th: nobody.
 */
export function rollsBetter(target, ownerLevel) {
    if (ownerLevel >= 17) return false;
    const immune = new Set(target.attributes.immunities.map((immunity) => immunity.type));
    if (ownerLevel >= 10) return immune.has("mental") || target.traits.has("mindless");
    return immune.has("fear-effects") || immune.has("emotion");
}

/** The creature's stored Frightened value, 0 if it has none. */
function storedFrightened(actor) {
    return actor.itemTypes.condition.find((c) => isStoredFrightened(c))?._source.system.value.value ?? 0;
}

async function rollSave(effect) {
    const target = effect.actor;
    const owner = await fromUuid(effect.flags.pf2e.aura.origin);
    if (!target || !owner) return;

    const dc = dreadPresenceDC(owner);
    if (!dc) {
        ui.notifications.warn(game.i18n.format("ASCENDANT.DreadPresence.NoDC", { owner: owner.name, target: target.name }));
        return;
    }

    // Traits go in as roll options, both bare and as item:trait:, the way PF2e's
    // own inline save links pass them. There is deliberately no origin: an origin
    // pulls every EphemeralEffect the owner has onto the save, each relying on its
    // own predicate to stay out of an aura save. The degree adjustments this save
    // does need are rules on the aura effect, switched on by the options below.
    const options = [...SAVE_TRAITS, ...SAVE_TRAITS.map((trait) => `item:trait:${trait}`), DREAD_PRESENCE.save];
    if (rollsBetter(target, owner.level)) options.push(DREAD_PRESENCE.better);
    if (owner.level >= 5) options.push(DREAD_PRESENCE.lowRoll);

    const roll = await target.saves?.will?.roll({
        dc: { value: dc, label: game.i18n.localize("ASCENDANT.DreadPresence.SaveDC") },
        extraRollOptions: options,
        skipDialog: true,
    });
    const degree = roll?.degreeOfSuccess;
    if (!Number.isInteger(degree)) return;
    const result = FRIGHTENED_BY_DEGREE[degree];
    const badge = Math.max(result, Math.min(storedFrightened(target), levelFloor(owner.level)));

    // The enemy can leave before the roll comes back. Its effect is gone then,
    // and onLeave skipped it because no result was recorded, so do the leaving here.
    let recorded = false;
    const live = target.items.get(effect.id);
    if (live) {
        try {
            await live.update({ "system.badge.value": badge, [`flags.${MODULE_ID}`]: { degree, result } });
            recorded = true;
        } catch (error) {
            console.warn(`${MODULE_ID} | Dread Presence effect left while its save was rolling`, error);
        }
    }
    if (!recorded) await leave(target, effect, badge, result, degree);
}

/**
 * Raise each aura effect's badge to the level floor the creature's stored
 * Frightened has reached. Never lowers a badge.
 */
async function ratchet(actor) {
    if (!actor) return;
    const stored = storedFrightened(actor);
    for (const effect of actor.itemTypes.effect.filter(isAuraEffect)) {
        if (!Number.isInteger(effect.flags?.[MODULE_ID]?.result)) continue;
        const owner = await fromUuid(effect.flags.pf2e.aura.origin);
        if (!owner) continue;
        const floor = Math.min(stored, levelFloor(owner.level));
        if (floor > (effect.system.badge?.value ?? 0)) await effect.update({ "system.badge.value": floor });
    }
}

async function onLeave(effect) {
    const target = effect.actor;
    const { degree, result } = effect.flags?.[MODULE_ID] ?? {};
    // No result yet: the save is still rolling, and rollSave does the leaving when it lands.
    if (!target || !Number.isInteger(degree)) return;
    await leave(target, effect, effect.system.badge?.value ?? result, result, degree);
}

/**
 * Keep the Frightened value the creature had inside as a stored condition, and
 * the rolled result as a floor for a while longer.
 *
 * An enemy stepping in and out at the aura's edge leaves a Lingering effect each
 * time. One that the new floor covers, no higher and ending no later, is
 * removed, so the effects panel shows one entry rather than a stack. One that
 * is higher or lasts longer stays, because its floor still applies.
 */
async function leave(target, effect, value, result, degree) {
    await raiseFrightened(target, value);
    const source = lingeringSource(target, effect, result, degree);
    const lasts = source.system.duration.value * SECONDS_PER_ROUND;
    const covered = target.itemTypes.effect
        .filter((e) => e.slug === LINGERING_SLUG)
        .filter((e) => (e.badge?.value ?? 0) <= result && e.remainingDuration.remaining <= lasts)
        .map((e) => e.id);
    if (covered.length) await target.deleteEmbeddedDocuments("Item", covered);
    await target.createEmbeddedDocuments("Item", [source]);
}

/** Stored Frightened at least `value`, never lowered. */
async function raiseFrightened(actor, value) {
    const current = actor.itemTypes.condition.find((c) => isStoredFrightened(c));
    if (!current) {
        await actor.increaseCondition("frightened", { value });
        return;
    }
    if ((current._source.system.value.value ?? 0) < value) await current.update({ "system.value.value": value });
}

/**
 * Where an actor's turn sits against the current one: "ahead" (still to come
 * this round), "now", "passed", or null outside a running combat.
 *
 * PF2e counts the Lingering effect's duration from the creature's own
 * initiative: an effect with no origin context takes its own actor as origin,
 * and _preCreate records that combatant's initiative as the start. Whether its
 * turn this round has happened yet decides how many rounds to ask for.
 */
function turnPosition(actor) {
    const combat = game.combat;
    const combatant = actor.combatant;
    if (!combat?.started || !combatant) return null;
    const index = combat.turns.indexOf(combatant);
    if (index > combat.turn) return "ahead";
    return index === combat.turn ? "now" : "passed";
}

/**
 * The floor after leaving: "for 1 round after leaving ... below the result
 * rolled", or 1 minute after a critical failure. It grants Frightened at its
 * badge with the aura effect's own GrantItem rule, and carries the aura
 * effect's traits, which the creature has already been shown not to be immune to.
 *
 * Frightened drops at the end of the creature's turn, so "1 round" is read as
 * holding through its next end of turn, and 1 minute as its next ten. The effect
 * lapses at the start of the turn after that, so the floor still holds whether
 * the GM lowers Frightened before or after advancing the tracker. If its turn
 * this round has already passed, the next one is a round further away.
 *
 * PF2e counts a turn-start effect as expired only during that turn, and deletes
 * it then through its "Remove expired effects" automation (on by default). With
 * that setting off, the floor comes back after the turn until the round ends.
 */
function lingeringSource(actor, effect, result, degree) {
    const turns = degree === CRITICAL_FAILURE ? 10 : 1;
    return {
        name: game.i18n.localize("ASCENDANT.DreadPresence.Lingering"),
        type: "effect",
        img: ICON,
        system: {
            slug: LINGERING_SLUG,
            description: { value: game.i18n.localize("ASCENDANT.DreadPresence.LingeringText") },
            badge: { type: "counter", value: result, min: 1, max: 4 },
            duration: {
                value: turnPosition(actor) === "passed" ? turns + 1 : turns,
                unit: "rounds",
                sustained: false,
                expiry: "turn-start",
            },
            traits: { otherTags: [], value: [...effect.system.traits.value], rarity: "unique" },
            tokenIcon: { show: true },
            rules: effect.toObject().system.rules.filter((rule) => rule.key === "GrantItem"),
        },
    };
}
