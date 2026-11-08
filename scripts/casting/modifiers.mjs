/**
 * Slots that class features and feats add on top of a class's Spells per Day table.
 *
 * Inexhaustible Magics triples the class's table only, and an archetype's spellcasting benefits.
 * Nothing here is tripled, feats and class features alike: "if you have 4 spells per level, you now
 * have 12"; Cantrip Expansion, the curriculum and Divine Font add on top (Bryan, 2026-11-07).
 *
 * Every addition below quotes its item, read off the installed PF2e packs on 2026-11-07. Free of
 * Foundry globals so `tools/test-casting-sync.mjs` runs it.
 */

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
 * Additions to one entry's slots, as `{ slotN: n }`.
 *
 * @param {object} facts
 * @param {string} facts.classSlug
 * @param {string} facts.pool
 * @param {string} facts.type        "prepared" or "spontaneous"
 * @param {number[]} facts.baseRow   the table row for this level, cantrips first
 * @param {Set<string>} facts.slugs  slugs of the feats and features attributed to this class
 */
export function slotAdditions({ classSlug, pool, type, baseRow, slugs }) {
    const added = {};
    const add = (key, n) => (added[key] = (added[key] ?? 0) + n);

    if (pool !== classSlug) return added;

    // "Prepared: You can prepare two additional cantrips each day." The spontaneous half adds to
    // the repertoire, not to slots.
    if (type === "prepared" && slugs.has("cantrip-expansion")) add("slot0", 2);

    if (EXTRA_TENTH[classSlug] && slugs.has(EXTRA_TENTH[classSlug])) add("slot10", 1);

    if (classSlug === "wizard" && hasCurriculum(slugs)) {
        add("slot0", 1);
        // Curriculum lists stop at 9th rank; the 10th-rank slot is the capstone's.
        for (let rank = 1; rank <= 9; rank++) if (baseRow[rank] > 0) add(`slot${rank}`, 1);
    }
    return added;
}

/**
 * Feats that add spells to a repertoire, on top of the one spell per slot the class table gives:
 * "If a feat or other ability adds a spell to your spell repertoire, it wouldn't give you another
 * spell slot" (every spontaneous class page).
 */
const PLUS_ONE_PER_RANK = {
    // "Add one spell to your repertoire of each spell rank you can cast."
    bard: "deep-lore",
    // "Add one spell to your spell repertoire for each spell rank you can cast."
    sorcerer: "greater-mental-evolution",
};

/**
 * Additions to one spontaneous entry's spells known, as `{ slotN: n }` (slot0 is cantrips).
 *
 * The 10th-rank capstones (Magnum Opus, Oracular Clarity, Bloodline Paragon, Infinite Mind) each
 * say "Add two common 10th-rank ... spells to your repertoire" against "a single 10th-rank spell
 * slot", so a table row with a 10th-rank slot knows one more spell than it has slots.
 *
 * @param {object} facts as for `slotAdditions`
 */
export function knownAdditions({ classSlug, pool, type, baseRow, slugs }) {
    const added = {};
    const add = (key, n) => (added[key] = (added[key] ?? 0) + n);
    if (pool !== classSlug || type !== "spontaneous") return added;

    // "Spontaneous: Add two additional cantrips from your spell list to your repertoire."
    if (slugs.has("cantrip-expansion")) add("slot0", 2);
    if (PLUS_ONE_PER_RANK[classSlug] && slugs.has(PLUS_ONE_PER_RANK[classSlug])) {
        for (let rank = 1; rank <= 10; rank++) if (baseRow[rank] > 0) add(`slot${rank}`, 1);
    }
    if (baseRow[10] > 0) add("slot10", 1);
    return added;
}

/**
 * A Spells per Day table carried in an item's own description, as `rows[level - 1][column]`
 * (column 0 cantrips, 1 to 10 ranks), or null when it is not a 20-row table of counts.
 *
 * The Battle Creed doctrine replaces the Cleric table with its own ("shown in Battle Harbinger
 * Spells per Day"), and PF2e carries it as an HTML table in the feature's description: a header of
 * Your Level, Cantrips, 1st to 9th, then 20 rows with "-" for none (read 2026-11-07).
 */
export function parseSlotTable(html) {
    const body = (html ?? "").match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1];
    if (!body) return null;
    const rows = [...body.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((m) => [...m[1].matchAll(/<td>([\s\S]*?)<\/td>/g)].map((c) => c[1].replace(/<[^>]*>/g, "").trim()));
    if (rows.length !== 20 || rows.some((cells, i) => cells[0] !== String(i + 1))) return null;
    const parsed = rows.map((cells) => {
        const counts = cells.slice(1).map((c) => (c === "-" ? 0 : Number(c.replace(/\D+$/, ""))));
        while (counts.length < 11) counts.push(0);
        return counts.slice(0, 11);
    });
    return parsed.every((row) => row.every((n) => Number.isInteger(n) && n >= 0)) ? parsed : null;
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
