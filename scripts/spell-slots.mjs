import { MODULE_ID } from "./constants.mjs";
import { castingAutomationOn } from "./casting/settings.mjs";

/** Slug of the Apex talent that triples spell slots and cantrips. */
const TALENT_SLUG = "ascendant-inexhaustible-magics";

/** Where the untripled maxima are kept, so tripling is reversible and idempotent. */
const FLAG = "untripledSlots";

function hasTalent(actor) {
    return actor.itemTypes.feat.some((i) => i.slug === TALENT_SLUG);
}

/** Have we already tripled this character's slots? */
function isTripled(actor) {
    const stored = actor.getFlag(MODULE_ID, FLAG);
    return !!stored && Object.keys(stored).length > 0;
}

/**
 * Triple every spell slot and cantrip maximum on the character's spellcasting entries.
 *
 * Slot maxima are pure stored data. PF2e derives nothing from class or level and
 * never rewrites them: verified by walking a caster from 1st to 20th with no
 * change, and by reading `prepareBaseData`, which only reshapes the `prepared`
 * arrays to match the maximum and never sets it. So tripled values stay put
 * until someone edits them, and this only has to guard against itself.
 *
 * Reading the character's own numbers rather than a per-class chart means this
 * works for any class, any archetype, and anything published later, because the
 * base is whatever is actually on the sheet. Cantrips are `slot0` and are
 * included, as the rules say.
 */
async function tripleSlots(actor) {
    if (isTripled(actor)) return;

    const stored = {};
    const updates = [];

    for (const entry of actor.itemTypes.spellcastingEntry) {
        // Read the stored maxima, not the prepared ones, so nothing derived leaks in.
        const slots = entry._source.system?.slots ?? {};
        const record = {};
        const update = { _id: entry.id };

        for (const [key, data] of Object.entries(slots)) {
            const max = Number(data?.max) || 0;
            if (max <= 0) continue;
            record[key] = max;
            update[`system.slots.${key}.max`] = max * 3;
            // The new slots are available at once, as the automated sync makes them.
            update[`system.slots.${key}.value`] = (Number(data?.value) || 0) + max * 2;
        }

        if (Object.keys(record).length > 0) {
            stored[entry.id] = record;
            updates.push(update);
        }
    }

    if (updates.length === 0) {
        ui.notifications.warn(game.i18n.localize("ASCENDANT.Slots.NothingToTriple"));
        return;
    }

    await actor.updateEmbeddedDocuments("Item", updates);
    await actor.setFlag(MODULE_ID, FLAG, stored);
    ui.notifications.info(game.i18n.format("ASCENDANT.Slots.Tripled", { count: updates.length }));
    actor.sheet?.render(false);
}

/** Put the stored maxima back and forget them. */
async function restoreSlots(actor) {
    const stored = actor.getFlag(MODULE_ID, FLAG);
    if (!stored) return;

    const updates = [];
    for (const [entryId, record] of Object.entries(stored)) {
        const entry = actor.items.get(entryId);
        if (!entry) continue;
        const update = { _id: entryId };
        for (const [key, max] of Object.entries(record)) {
            update[`system.slots.${key}.max`] = max;
            // A slot count left above the restored maximum would read as impossible.
            const current = Number(entry._source.system?.slots?.[key]?.value) || 0;
            if (current > max) update[`system.slots.${key}.value`] = max;
        }
        updates.push(update);
    }

    if (updates.length > 0) await actor.updateEmbeddedDocuments("Item", updates);
    await actor.unsetFlag(MODULE_ID, FLAG);
    ui.notifications.info(game.i18n.localize("ASCENDANT.Slots.Restored"));
    actor.sheet?.render(false);
}

/**
 * A Triple/Restore button on the sheet, only for a character that holds the
 * talent. PF2e's character sheet is an ApplicationV1, so this is the V1 header
 * button hook and shape.
 *
 * Hidden while spellcasting automation is on: the sync then writes the tripled
 * values itself (`casting/expected.mjs`), and a second writer would fight it.
 */
export function registerSpellSlotButton() {
    Hooks.on("getActorSheetPF2eHeaderButtons", (sheet, buttons) => {
        const actor = sheet.actor;
        if (actor?.type !== "character" || !actor.isOwner) return;
        if (castingAutomationOn()) return;
        if (!hasTalent(actor)) return;

        const tripled = isTripled(actor);
        buttons.unshift({
            label: game.i18n.localize(tripled ? "ASCENDANT.Slots.RestoreButton" : "ASCENDANT.Slots.TripleButton"),
            class: "ascendant-triple-slots",
            icon: tripled ? "fa-solid fa-rotate-left" : "fa-solid fa-layer-group",
            onclick: () => (tripled ? restoreSlots(actor) : tripleSlots(actor)),
        });
    });
}

export { tripleSlots, restoreSlots, hasTalent, isTripled };
