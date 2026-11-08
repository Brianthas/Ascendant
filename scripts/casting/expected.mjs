/**
 * The arithmetic of spellcasting automation, kept free of Foundry globals so
 * `tools/test-casting-sync.mjs` runs it in node.
 */
import { SLOT_TABLES } from "./slot-tables.mjs";
import { slotAdditions, knownAdditions, fontRow } from "./modifiers.mjs";

/** `system.slots` keys, cantrips first. PF2e's template has slot0 to slot11; 11 is never used. */
export const SLOT_KEYS = Array.from({ length: 11 }, (_, i) => `slot${i}`);

/**
 * Inexhaustible Magics: "Triple the spell slots and cantrips you gain from every spellcasting class
 * or archetype." The class table, not feat additions, and not the repertoire (Bryan, 2026-11-07).
 */
const TRIPLE = 3;

function clampLevel(level) {
    return Math.min(Math.max(Math.trunc(level) || 1, 1), 20);
}

/**
 * An archetype's slots and cantrips, as a table row. Player Core's spellcasting archetype rules:
 * the basic feat grants "a 1st-rank spell slot. At 6th level ... a 2nd-rank spell slot ... At 8th
 * level ... a 3rd-rank spell slot"; the expert feat "a 4th-rank spell slot ... At 14th level ... a
 * 5th-rank ... at 16th level ... a 6th-rank"; the master feat "a 7th-rank spell slot ... At 20th
 * level ... an 8th-rank spell slot". The levels are character levels.
 *
 * @param {{ level: number, cantrips: number, basic: boolean, expert: boolean, master: boolean }} facts
 */
export function archetypeRow({ level, cantrips, basic, expert, master }) {
    const row = Array(11).fill(0);
    row[0] = cantrips;
    if (basic) {
        row[1] = 1;
        if (level >= 6) row[2] = 1;
        if (level >= 8) row[3] = 1;
    }
    if (expert) {
        row[4] = 1;
        if (level >= 14) row[5] = 1;
        if (level >= 16) row[6] = 1;
    }
    if (master) {
        row[7] = 1;
        if (level >= 20) row[8] = 1;
    }
    return row;
}

/** Signature spells an archetype repertoire allows: one each from basic (at 6th), expert and master. */
export function archetypeSignatures({ level, basic, expert, master }) {
    return (basic && level >= 6 ? 1 : 0) + (expert ? 1 : 0) + (master ? 1 : 0);
}

/** The table row for a pool. `font` is Divine Font, derived from the Cleric row. */
function tableRow(classSlug, pool, level, row) {
    if (row) return row;
    if (pool === "font") return fontRow(tableRow(classSlug, classSlug, level), clampLevel(level));
    const rows = SLOT_TABLES[classSlug]?.pools?.[pool];
    if (!rows) throw new Error(`no slot table for ${classSlug}/${pool}`);
    return rows[clampLevel(level) - 1];
}

/**
 * The slot maxima an entry should hold, as `{ slot0: n, ... slot10: n }`.
 *
 * A prepared entry's slot0 is the cantrips it prepares. A spontaneous entry casts cantrips without
 * slots, so its slot0 is 0 and its cantrip count is a repertoire size instead (`expectedKnown`).
 *
 * Inexhaustible Magics triples the class table. Feat and class-feature additions (`modifiers.mjs`)
 * and Divine Font land on top untripled (Bryan, 2026-11-07).
 *
 * @param {Set<string>} [slugs] feats and features attributed to this class, for `slotAdditions`
 * @param {number[]} [row] a row to use instead of the class table: an archetype's (`archetypeRow`),
 *   tripled whole, cantrips included, by Inexhaustible Magics (Bryan, 2026-11-07)
 */
export function expectedSlots({ classSlug, pool, type, level, tripled, slugs = new Set(), row: given }) {
    const row = tableRow(classSlug, pool, level, given);
    const factor = tripled && pool !== "font" ? TRIPLE : 1;
    const added = slotAdditions({ classSlug, pool, type, baseRow: row, slugs });
    return Object.fromEntries(
        SLOT_KEYS.map((key, rank) => {
            if (rank === 0 && type !== "prepared") return [key, 0];
            return [key, row[rank] * factor + (added[key] ?? 0)];
        }),
    );
}

/**
 * How many spells a spontaneous entry's repertoire holds per rank, same keys as `expectedSlots`.
 *
 * Every spontaneous class page says "each time you get a spell slot ... you add a spell to your
 * spell repertoire of the same rank", so the slot table is the repertoire table. Cantrips known
 * are tripled by Inexhaustible Magics; ranked spells known are not (Bryan, 2026-11-07).
 *
 * Feats and capstones add on top (`knownAdditions`). `granted` counts, per rank, the spells a class
 * feature added on top of the table (an oracle's mystery spells, a bard's muse spell), which
 * `granted.mjs` marks on the spells it creates.
 */
export function expectedKnown({ classSlug, pool, level, tripled, slugs = new Set(), granted = {}, row: given }) {
    const row = tableRow(classSlug, pool, level, given);
    const added = knownAdditions({ classSlug, pool, type: "spontaneous", baseRow: row, slugs });
    return Object.fromEntries(SLOT_KEYS.map((key, rank) => [
        key,
        (rank === 0 && tripled ? row[0] * TRIPLE : row[rank]) + (added[key] ?? 0) + (granted[key] ?? 0),
    ]));
}

/**
 * Count a repertoire by rank, and its signature spells.
 *
 * Each spell is `{ isCantrip, rank, signature }`, where `rank` is the rank it is known at (a copy
 * learned heightened counts at its heightened rank, as the repertoire rules count it). Signature
 * spells are counted among ranked spells only; a cantrip cannot be one.
 *
 * @returns {{ known: Record<string, number>, signature: number }}
 */
export function countKnown(spells) {
    const known = Object.fromEntries(SLOT_KEYS.map((k) => [k, 0]));
    let signature = 0;
    for (const spell of spells) {
        const key = spell.isCantrip ? "slot0" : `slot${spell.rank}`;
        if (key in known) known[key] += 1;
        if (!spell.isCantrip && spell.signature) signature += 1;
    }
    return { known, signature };
}

/** Signature Spells: "For each spell rank you have access to, choose one spell of that rank." */
export function signatureAllowed(slots) {
    return SLOT_KEYS.slice(1).filter((key) => (slots[key] ?? 0) > 0).length;
}

/**
 * Decide what a sync writes, rank by rank, without touching a rank the player edited.
 *
 * `synced` records what Ascendant last wrote or accepted per rank. A rank is managed while its
 * stored maximum still equals that record: it moves to the new expected value. A rank whose stored
 * value differs from the record was edited by hand and is left alone, and reported as a mismatch
 * while it also differs from what is expected. A rank with no record (an entry the player built
 * before turning the setting on) is adopted only where it already matches.
 *
 * @param {Record<string, number>} stored   the entry's `_source` maxima
 * @param {Record<string, number>} synced   the last-synced record, possibly empty
 * @param {Record<string, number>} expected from `expectedSlots`
 * @returns {{ writes: Record<string, number>, synced: Record<string, number>, mismatches: string[] }}
 */
export function planSync(stored, synced, expected) {
    const writes = {};
    const next = {};
    const mismatches = [];
    for (const key of SLOT_KEYS) {
        const have = Number(stored?.[key]) || 0;
        const want = expected[key] ?? 0;
        const last = synced?.[key];
        if (last !== undefined && have === last) {
            if (want !== have) writes[key] = want;
            next[key] = want;
        } else if (have === want) {
            next[key] = want;
        } else {
            if (last !== undefined) next[key] = last;
            mismatches.push(key);
        }
    }
    return { writes, synced: next, mismatches };
}

/**
 * A rank's remaining slots after its maximum moves from `oldMax` to `max`: a gained slot is
 * available at once, and the remainder never exceeds the new maximum.
 */
export function nextValue(oldMax, oldValue, max) {
    const raised = max > oldMax ? oldValue + (max - oldMax) : oldValue;
    return Math.min(Math.max(raised, 0), max);
}

/** Accept the expected value for one rank: what the per-rank sync button does. */
export function syncRank(synced, expected, key) {
    return { writes: { [key]: expected[key] ?? 0 }, synced: { ...synced, [key]: expected[key] ?? 0 } };
}
