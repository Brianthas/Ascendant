/**
 * Slots that class features and feats add on top of a class's Spells per Day table.
 *
 * Inexhaustible Magics triples the table only. Additions from feats are not tripled: "if you have 4
 * spells per level, you now have 12", and Cantrip Expansion adds its two on top (Bryan,
 * 2026-11-07). `CLASS_FEATURE_SLOTS_TRIPLED` records the open question for slots that come from
 * class features (Wizard curriculum, Divine Font) until he rules on it.
 *
 * Every addition below quotes its item, read off the installed PF2e packs on 2026-11-07. Free of
 * Foundry globals so `tools/test-casting-sync.mjs` runs it.
 */

export const CLASS_FEATURE_SLOTS_TRIPLED = false;

/** "You gain an additional 10th-rank spell slot." Each is a 20th-level feat of one class. */
const EXTRA_TENTH = {
    bard: "perfect-encore",
    cleric: "maker-of-miracles",
    druid: "hierophants-power",
    oracle: "oracular-providence",
    sorcerer: "bloodline-perfection",
    witch: "patrons-truth",
    wizard: "archwizards-might",
};

/**
 * Wizard: "one extra curriculum cantrip and one extra curriculum spell of each rank you can cast
 * from your arcane school" (Wizard Spellcasting, with the page's Paizo clarification that the
 * table leaves them out). The School of Unified Magical Theory has "No Curriculum".
 */
function hasCurriculum(slugs) {
    if (slugs.has("school-of-unified-magical-theory")) return false;
    return [...slugs].some((s) => s.startsWith("school-of-"));
}

/**
 * Additions to one entry's slots, as `{ feat: {slotN: n}, feature: {slotN: n} }`, split so the
 * caller can triple the class-feature part if that is ruled in.
 *
 * @param {object} facts
 * @param {string} facts.classSlug
 * @param {string} facts.pool
 * @param {string} facts.type        "prepared" or "spontaneous"
 * @param {number[]} facts.baseRow   the table row for this level, cantrips first
 * @param {Set<string>} facts.slugs  slugs of the feats and features attributed to this class
 */
export function slotAdditions({ classSlug, pool, type, baseRow, slugs }) {
    const feat = {};
    const feature = {};
    const add = (target, key, n) => (target[key] = (target[key] ?? 0) + n);

    if (pool !== classSlug) return { feat, feature };

    // "Prepared: You can prepare two additional cantrips each day." The spontaneous half adds to
    // the repertoire, not to slots.
    if (type === "prepared" && slugs.has("cantrip-expansion")) add(feat, "slot0", 2);

    if (EXTRA_TENTH[classSlug] && slugs.has(EXTRA_TENTH[classSlug])) add(feat, "slot10", 1);

    if (classSlug === "wizard" && hasCurriculum(slugs)) {
        add(feature, "slot0", 1);
        // Curriculum lists stop at 9th rank; the 10th-rank slot is the capstone's.
        for (let rank = 1; rank <= 9; rank++) if (baseRow[rank] > 0) add(feature, `slot${rank}`, 1);
    }
    return { feat, feature };
}

/**
 * Divine Font: "You gain 4 additional spell slots each day at your highest rank of cleric spell
 * slots. You can prepare only heal spells in these slots. At 5th level, the number of additional
 * slots increases to 5, and at 15th level ... 6." Its own entry, so the slots hold nothing else.
 *
 * @param {number[]} clericRow the Cleric table row for this level
 * @param {number} level
 */
export function fontRow(clericRow, level) {
    let highest = 0;
    for (let rank = 1; rank <= 10; rank++) if (clericRow[rank] > 0) highest = rank;
    const count = level >= 15 ? 6 : level >= 5 ? 5 : 4;
    return clericRow.map((_, rank) => (rank === highest ? count : 0));
}
