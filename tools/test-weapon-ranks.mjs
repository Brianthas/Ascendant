/**
 * Cases for `weaponRanks`, the Weapon Expertise rank arithmetic. Rank 5 is Mythic.
 *
 * Two wrong models are named in `separates`. "Increment only" is the formula that ignores the
 * Expert-start ladder, max(min(base + 1, 5), minimum): it gives Master at 5th for a Fighter's martial
 * weapon outside the chosen group, because PF2e's Fighter Weapon Mastery raises one group only and
 * leaves the martial category at Expert. "0.1.2" is the old item: +1 at 1st to 4th only, floors at
 * 5th and 10th, Mythic at 15th. Base ranks are what PF2e stores before Weapon Expertise, read off the
 * class items and class features in the installed system's packs.
 */

import { weaponRanks, ascendantRank } from "../scripts/weapon-ranks.mjs";

const FIGHTER_START = new Set(["unarmed", "simple", "martial"]);
const GUNSLINGER_START = new Set(["simple-firearms-crossbows", "martial-firearms-crossbows"]);
const NONE = new Set();
const noDerived = new Map();

const cases = [
    {
        name: "Fighter martial at 1st is Master",
        level: 1, entries: { martial: { rank: 2 } }, expertStart: FIGHTER_START,
        expect: { martial: [3, true] },
        separates: null,
    },
    {
        name: "Fighter martial outside the chosen group at 5th is Legendary",
        level: 5, entries: { martial: { rank: 2 }, "weapon-mastery-simple-martial": { rank: 3, definition: ["item:group:sword"] } },
        expertStart: FIGHTER_START,
        expect: { martial: [4, true], "weapon-mastery-simple-martial": [4, false] },
        separates: "increment only and 0.1.2 both give Master for the category",
    },
    {
        name: "Fighter martial at 12th is still Legendary",
        level: 12, entries: { martial: { rank: 2 } }, expertStart: FIGHTER_START,
        expect: { martial: [4, true] },
        separates: "a ladder that reaches Mythic before 13th",
    },
    {
        name: "Fighter martial at 13th is Mythic",
        level: 13, entries: { martial: { rank: 2 } }, expertStart: FIGHTER_START,
        expect: { martial: [5, true] },
        separates: "increment only and 0.1.2 give Legendary until 15th",
    },
    {
        name: "Fighter advanced at 13th follows the normal column",
        level: 13, entries: { advanced: { rank: 1 }, martial: { rank: 2 } }, expertStart: FIGHTER_START,
        expect: { advanced: [4, false], martial: [5, true] },
        separates: "an Expert-start flag applied to the actor rather than the proficiency gives Mythic",
    },
    {
        name: "Fighter advanced at 4th is one rank up, not Master",
        level: 4, entries: { advanced: { rank: 1 } }, expertStart: FIGHTER_START,
        expect: { advanced: [2, false] },
        separates: "an Expert-start flag applied to the actor gives Master",
    },
    {
        name: "Wizard simple at 11th, after the class's own Weapon Expertise, is Legendary",
        level: 11, entries: { simple: { rank: 2 }, martial: { rank: 0 } }, expertStart: NONE,
        expect: { simple: [4, false] },
        separates: "an untrained martial category must not appear at all",
    },
    {
        name: "Wizard simple at 15th is Mythic",
        level: 15, entries: { simple: { rank: 2 } }, expertStart: NONE,
        expect: { simple: [5, false] },
        separates: null,
    },
    {
        name: "Gunslinger firearms at 1st are Master, the martial category Expert",
        level: 1, entries: { martial: { rank: 1 }, "martial-firearms-crossbows": { rank: 2 } }, expertStart: GUNSLINGER_START,
        expect: { martial: [2, false], "martial-firearms-crossbows": [3, true] },
        separates: "0.1.2 never touched keyed entries, leaving firearms at Expert",
    },
    {
        name: "Gunslinger firearms at 5th are Legendary",
        level: 5, entries: { "martial-firearms-crossbows": { rank: 3 } }, expertStart: GUNSLINGER_START,
        expect: { "martial-firearms-crossbows": [4, true] },
        separates: null,
    },
    {
        name: "Gunslinger at 13th: firearms Mythic, a longsword Legendary",
        level: 13, entries: { martial: { rank: 1 }, "martial-firearms-crossbows": { rank: 4 } }, expertStart: GUNSLINGER_START,
        expect: { martial: [4, false], "martial-firearms-crossbows": [5, true] },
        separates: "Mythic for every Strike at 13th, or for none",
    },
    {
        name: "Soulbound Arsenal's entry takes the best category it reads",
        level: 13,
        entries: { simple: { rank: 2 }, martial: { rank: 2 }, advanced: { rank: 1 }, unarmed: { rank: 2 }, "ascendant-soulbound-arsenal": { rank: 2, definition: ["item:tag:soulbound"] } },
        expertStart: FIGHTER_START,
        derived: new Map([["ascendant-soulbound-arsenal", ["simple", "martial", "advanced", "unarmed"]]]),
        expect: { "ascendant-soulbound-arsenal": [5, true] },
        separates: "a +1 of its own gives Legendary for a Fighter's soulbound advanced weapon",
    },
    {
        name: "Slinger's Precision's combination copy inherits the firearm ladder",
        level: 13,
        entries: { "martial-firearms-crossbows": { rank: 4 }, "slingers-precision-martial": { rank: 4, definition: ["item:category:martial"] } },
        expertStart: GUNSLINGER_START,
        derived: new Map([["slingers-precision-martial", ["martial-firearms-crossbows"]]]),
        expect: { "slingers-precision-martial": [5, true] },
        separates: null,
    },
    {
        name: "a derived entry the actor is not trained in stays out",
        level: 13,
        entries: { martial: { rank: 2 }, "copy-of-martial": { rank: 0, definition: ["item:group:bow"] } },
        expertStart: FIGHTER_START,
        derived: new Map([["copy-of-martial", ["martial"]]]),
        expect: { martial: [5, true] },
        absent: ["copy-of-martial"],
        separates: "taking the source's result without checking the entry's own rank",
    },
    {
        name: "a sameAs entry inherits Mythic and Expert-start from its category",
        level: 13,
        entries: { martial: { rank: 2 }, familiarity: { rank: 0, sameAs: "martial", definition: ["item:base:dwarven-war-axe"] } },
        expertStart: FIGHTER_START,
        expect: { martial: [5, true], familiarity: [5, true] },
        separates: null,
    },
    {
        name: "a sameAs entry capped at Master stays at Master",
        level: 13,
        entries: { martial: { rank: 2 }, capped: { rank: 0, sameAs: "martial", maxRank: "master", definition: ["item:group:bow"] } },
        expertStart: FIGHTER_START,
        expect: { capped: [3, true] },
        separates: "ignoring maxRank gives Mythic",
    },
];

let failed = 0;
for (const testCase of cases) {
    const result = weaponRanks({
        level: testCase.level,
        entries: testCase.entries,
        expertStart: testCase.expertStart,
        derived: testCase.derived ?? noDerived,
    });
    const problems = [];
    for (const [key, [rank, expertStart]] of Object.entries(testCase.expect)) {
        const got = result.get(key);
        if (!got || got.rank !== rank || got.expertStart !== expertStart) {
            problems.push(`${key}: expected rank ${rank} expertStart ${expertStart}, got ${got ? `rank ${got.rank} expertStart ${got.expertStart}` : "nothing"}`);
        }
    }
    for (const key of [...(testCase.absent ?? []), ...Object.entries(testCase.entries).filter(([, e]) => e.rank === 0 && !e.sameAs).map(([k]) => k)]) {
        if (result.has(key)) problems.push(`${key}: untrained, expected no result, got rank ${result.get(key).rank}`);
    }
    if (problems.length) {
        failed += 1;
        console.log(`  FAIL ${testCase.name}`);
        for (const problem of problems) console.log(`       ${problem}`);
        if (testCase.separates) console.log(`       this case exists because: ${testCase.separates}`);
    } else {
        console.log(`  ok   ${testCase.name}`);
    }
}

// Both level ladders at every level where they change and the level before. A trained weapon whose
// class never raises it, and an Expert-start weapon whose class never raises it past Expert.
const ladders = [
    { name: "trained weapon", base: 1, expertStart: false, steps: [[1, 2], [4, 2], [5, 3], [9, 3], [10, 4], [14, 4], [15, 5], [20, 5]] },
    { name: "Expert-start weapon", base: 2, expertStart: true, steps: [[1, 3], [4, 3], [5, 4], [12, 4], [13, 5], [20, 5]] },
];
for (const ladder of ladders) {
    let ladderFailed = 0;
    for (const [level, rank] of ladder.steps) {
        const got = ascendantRank(ladder.base, level, ladder.expertStart);
        if (got !== rank) {
            ladderFailed += 1;
            console.log(`  FAIL ${ladder.name} at ${level}th: expected ${rank}, got ${got}`);
        }
    }
    failed += ladderFailed;
    if (!ladderFailed) console.log(`  ok   ${ladder.name} ladder at ${ladder.steps.length} levels`);
}
if (ascendantRank(0, 20, true) !== 0) {
    failed += 1;
    console.log("  FAIL an untrained weapon stays untrained");
} else {
    console.log("  ok   an untrained weapon stays untrained");
}

console.log(failed === 0 ? "\nweaponRanks: all cases pass" : `\nweaponRanks: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
