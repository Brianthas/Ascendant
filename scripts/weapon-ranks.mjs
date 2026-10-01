/**
 * Weapon Expertise rank arithmetic, kept free of Foundry so `tools/test-weapon-ranks.mjs` can run it.
 *
 * Ranks are numbers as PF2e stores them, with 5 meaning Mythic. PF2e has no rank 5 (see `mythic()` in
 * `src/lib/rules.mjs`), so the caller stores at most 4 and carries Mythic separately.
 */

const RANK_INDEX = { untrained: 0, trained: 1, expert: 2, master: 3, legendary: 4 };

/**
 * The lowest rank Weapon Expertise allows a trained weapon at a level.
 *
 * "Your proficiency rank is at least Master at 5th level, Legendary at 10th, and Mythic at 15th."
 * For a weapon a class made you Expert with at 1st: "you stay a rank ahead of the minimum with it:
 * Master at 1st, Legendary at 5th, and Mythic at 13th." Below 5th the normal minimum is Expert,
 * which the +1 on a trained weapon reaches anyway.
 *
 * @param {number} level
 * @param {boolean} expertStart
 */
export function minimumRank(level, expertStart) {
    if (expertStart) return level >= 13 ? 5 : level >= 5 ? 4 : 3;
    return level >= 15 ? 5 : level >= 10 ? 4 : level >= 5 ? 3 : 2;
}

/**
 * "One rank higher than your classes would normally grant, up to Mythic", never below the minimum.
 * An untrained weapon stays untrained: the track "applies to all weapon and unarmed attacks you are
 * trained in".
 *
 * @param {number} base The rank before Weapon Expertise.
 * @param {number} level
 * @param {boolean} expertStart
 */
export function ascendantRank(base, level, expertStart) {
    if (!(base >= 1)) return base;
    return Math.max(Math.min(base + 1, 5), minimumRank(level, expertStart));
}

/**
 * Keys PF2e would drop as duplicates, judged on the ranks the classes gave.
 *
 * `prepareMartialProficiencies` (pf2e.mjs:35049 on 8.5.1) deletes an entry when another with a
 * deep-equal `definition` and the same `sameAs` has an equal or higher rank. It compares against a
 * snapshot taken before the loop, so two such entries at the same rank delete each other. Raising
 * ranks creates those ties: Fighter Weapon Mastery (Master) and Weapon Legend (Legendary) on the
 * same group both end at Legendary, and both vanished from the sheet. Dropping the lower one before
 * the raise leaves what PF2e leaves without it. Where the class ranks are already equal, PF2e
 * alone would drop both; this keeps the first.
 *
 * @param {Record<string, {rank: number, definition?: unknown[], sameAs?: string} | null>} entries
 * @returns {string[]}
 */
export function duplicateKeys(entries) {
    const kept = new Map();
    const drop = [];
    for (const [key, entry] of Object.entries(entries)) {
        if (!entry?.definition) continue;
        const identity = `${entry.sameAs ?? ""}|${JSON.stringify([...entry.definition])}`;
        const held = kept.get(identity);
        if (held === undefined) {
            kept.set(identity, key);
        } else if (entry.rank > entries[held].rank) {
            drop.push(held);
            kept.set(identity, key);
        } else {
            drop.push(key);
        }
    }
    return drop;
}

/**
 * Every attack proficiency entry's Weapon Expertise result.
 *
 * Three kinds of entry are handled differently:
 *
 * - An ordinary entry (a category, or a keyed entry such as the Gunslinger's firearms) gets
 *   `ascendantRank` from its own rank.
 * - A derived entry is one whose MartialProficiency value reads other attack ranks: Soulbound
 *   Arsenal's weapon (the highest category) and Slinger's Precision's combination weapons (a copy of
 *   the firearm entries). It takes the higher of its own result and the best result of the entries
 *   it reads, and is Expert-start if any of those is. Its own rank was copied from those entries
 *   before class features raised them, so theirs is normally the higher; its own result stands in
 *   when none of them is trained.
 * - A `sameAs` entry is skipped for rank: PF2e copies its rank from the named entry afterwards, in
 *   `prepareMartialProficiencies`, capped at its `maxRank`. It inherits Mythic and Expert-start from
 *   that entry, and is Mythic only where its cap allows Legendary.
 *
 * @param {object} input
 * @param {number} input.level
 * @param {Record<string, {rank: number, sameAs?: string, maxRank?: string} | null>} input.entries
 *   `system.proficiencies.attacks` as it stands after every class rank has been applied.
 * @param {Set<string>} input.expertStart Keys a class made Expert at 1st level.
 * @param {Map<string, string[]>} input.derived Derived keys, each with the keys it reads.
 * @returns {Map<string, {rank: number, expertStart: boolean, sameAs: boolean}>} One result per trained
 *   entry; rank 5 is Mythic.
 */
export function weaponRanks({ level, entries, expertStart, derived }) {
    const out = new Map();
    const trained = (entry) => !!entry && !entry.sameAs && entry.rank >= 1;

    for (const [key, entry] of Object.entries(entries)) {
        if (!trained(entry) || derived.has(key)) continue;
        const es = expertStart.has(key);
        out.set(key, { rank: ascendantRank(entry.rank, level, es), expertStart: es, sameAs: false });
    }

    for (const [key, reads] of derived) {
        const entry = entries[key];
        if (!trained(entry)) continue;
        const sources = reads.map((read) => out.get(read)).filter(Boolean);
        const own = ascendantRank(entry.rank, level, expertStart.has(key));
        out.set(key, {
            rank: Math.max(own, ...sources.map((s) => s.rank)),
            expertStart: expertStart.has(key) || sources.some((s) => s.expertStart),
            sameAs: false,
        });
    }

    for (const [key, entry] of Object.entries(entries)) {
        if (!entry?.sameAs) continue;
        const target = out.get(entry.sameAs);
        if (!target) continue;
        const cap = RANK_INDEX[entry.maxRank ?? "legendary"] ?? 4;
        out.set(key, { rank: Math.min(target.rank, cap === 4 ? 5 : cap), expertStart: target.expertStart, sameAs: true });
    }

    return out;
}
