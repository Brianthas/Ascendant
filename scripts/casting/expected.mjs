/**
 * The arithmetic of spellcasting automation, kept free of Foundry globals so
 * `tools/test-casting-sync.mjs` runs it in node.
 */
import { SLOT_TABLES } from "./slot-tables.mjs";
import { slotAdditions, fontRow, CLASS_FEATURE_SLOTS_TRIPLED } from "./modifiers.mjs";

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

/** The table row for a pool. `font` is Divine Font, derived from the Cleric row. */
function tableRow(classSlug, pool, level) {
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
 * Inexhaustible Magics triples the table; feat additions (`modifiers.mjs`) land on top untripled.
 * Divine Font is a class feature, so it follows `CLASS_FEATURE_SLOTS_TRIPLED` with the curriculum.
 *
 * @param {Set<string>} [slugs] feats and features attributed to this class, for `slotAdditions`
 */
export function expectedSlots({ classSlug, pool, type, level, tripled, slugs = new Set() }) {
    const row = tableRow(classSlug, pool, level);
    const tableFactor = tripled && (pool !== "font" || CLASS_FEATURE_SLOTS_TRIPLED) ? TRIPLE : 1;
    const featureFactor = tripled && CLASS_FEATURE_SLOTS_TRIPLED ? TRIPLE : 1;
    const { feat, feature } = slotAdditions({ classSlug, pool, type, baseRow: row, slugs });
    return Object.fromEntries(
        SLOT_KEYS.map((key, rank) => {
            if (rank === 0 && type !== "prepared") return [key, 0];
            return [key, row[rank] * tableFactor + (feature[key] ?? 0) * featureFactor + (feat[key] ?? 0)];
        }),
    );
}

/**
 * How many spells a spontaneous entry's repertoire holds per rank, same keys as `expectedSlots`.
 *
 * Every spontaneous class page says "each time you get a spell slot ... you add a spell to your
 * spell repertoire of the same rank", so the slot table is the repertoire table. Cantrips known
 * are tripled by Inexhaustible Magics; ranked spells known are not (Bryan, 2026-11-07).
 */
export function expectedKnown({ classSlug, pool, level, tripled }) {
    const row = tableRow(classSlug, pool, level);
    return Object.fromEntries(SLOT_KEYS.map((key, rank) => [key, rank === 0 && tripled ? row[0] * TRIPLE : row[rank]]));
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

/** Accept the expected value for one rank: what the per-rank sync button does. */
export function syncRank(synced, expected, key) {
    return { writes: { [key]: expected[key] ?? 0 }, synced: { ...synced, [key]: expected[key] ?? 0 } };
}
