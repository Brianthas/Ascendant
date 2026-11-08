/**
 * Cases for `scripts/casting/expected.mjs`: slot maxima, repertoire sizes, and the per-rank sync
 * rule that keeps a hand-edited rank.
 *
 * Table numbers asserted here were read off the raw AoN cells on 2026-11-07 (Sorcerer row 1 is
 * 5 | 3, row 19's 10th is 1; Wizard row 1 is 5 | 2; Animist row 1 is 2+2 | 1+1; Magus has no 10th
 * column), not off the generated file. Each case names the wrong model it separates.
 */
import { expectedSlots, expectedKnown, planSync, syncRank, SLOT_KEYS } from "../scripts/casting/expected.mjs";

let failed = 0;

function check(name, got, want, separates) {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    if (!ok) {
        failed += 1;
        console.log(`  FAIL ${name}`);
        console.log(`       expected ${JSON.stringify(want)}`);
        console.log(`       got      ${JSON.stringify(got)}`);
        console.log(`       this case exists because: ${separates}`);
    } else {
        console.log(`  ok   ${name}`);
    }
}

/** Pick some keys out of a slot record, so a case states only what it is about. */
function pick(record, ...keys) {
    return Object.fromEntries(keys.map((k) => [k, record[k]]));
}

const sorcerer = { classSlug: "sorcerer", pool: "sorcerer", type: "spontaneous" };
const wizard = { classSlug: "wizard", pool: "wizard", type: "prepared" };

check("Sorcerer 1st: 3 first-rank slots, no cantrip slots",
    pick(expectedSlots({ ...sorcerer, level: 1 }), "slot0", "slot1", "slot2"), { slot0: 0, slot1: 3, slot2: 0 },
    "reading the cantrip column as slots writes 5 into a spontaneous entry's slot0");
check("Wizard 1st: 5 cantrips prepared, 2 first-rank slots",
    pick(expectedSlots({ ...wizard, level: 1 }), "slot0", "slot1"), { slot0: 5, slot1: 2 },
    "dropping the cantrip column for every class leaves a prepared caster no cantrips");
check("Sorcerer 19th has the 10th-rank slot",
    pick(expectedSlots({ ...sorcerer, level: 19 }), "slot9", "slot10"), { slot9: 4, slot10: 1 },
    "stopping at 9th rank, or reading the footnoted 1* as 0");
check("Inexhaustible Magics triples a sorcerer's slots",
    pick(expectedSlots({ ...sorcerer, level: 1, tripled: true }), "slot0", "slot1"), { slot0: 0, slot1: 9 },
    "applying no multiplier, or tripling the spontaneous slot0 that is not written");
check("Inexhaustible Magics triples a wizard's cantrips",
    pick(expectedSlots({ ...wizard, level: 1, tripled: true }), "slot0", "slot1"), { slot0: 15, slot1: 6 },
    "leaving cantrips untripled, which the talent names");
check("Sorcerer repertoire at 1st: 5 cantrips, 3 first-rank spells",
    pick(expectedKnown({ ...sorcerer, level: 1 }), "slot0", "slot1"), { slot0: 5, slot1: 3 },
    "a repertoire smaller than the slots, against 'each time you get a spell slot, you add a spell'");
check("Inexhaustible Magics triples cantrips known but not spells known",
    pick(expectedKnown({ ...sorcerer, level: 1, tripled: true }), "slot0", "slot1"), { slot0: 15, slot1: 3 },
    "tripling the repertoire, which Bryan ruled out on 2026-11-07");

const animistAt = (pool, level) => expectedSlots({ classSlug: "animist", pool, type: pool === "animist" ? "prepared" : "spontaneous", level });
check("Animist 1st: its own pool gets the first half of 2+2 / 1+1",
    pick(animistAt("animist", 1), "slot0", "slot1"), { slot0: 2, slot1: 1 },
    "summing the pools into one entry, which the rules forbid");
check("Animist 1st: apparition pool's first-rank slot",
    pick(animistAt("apparition", 1), "slot0", "slot1"), { slot0: 0, slot1: 1 },
    "giving the spontaneous apparition entry cantrip slots");
check("Animist 19th: only the apparition pool has a 10th-rank slot",
    [animistAt("animist", 19).slot10, animistAt("apparition", 19).slot10], [0, 1],
    "splitting 0+1* the wrong way round");
check("Magus has no 10th column, so slot10 is 0 at 20th",
    expectedSlots({ classSlug: "magus", pool: "magus", type: "prepared", level: 20 }).slot10, 0,
    "a short row shifting or reading undefined");
check("Levels outside 1-20 clamp",
    [expectedSlots({ ...wizard, level: 0 }).slot1, expectedSlots({ ...wizard, level: 25 }).slot10],
    [2, expectedSlots({ ...wizard, level: 20 }).slot10],
    "an index of -1 or 24 returning undefined");

// Additions on top of the table (scripts/casting/modifiers.mjs)
const battle = new Set(["arcane-school", "school-of-battle-magic"]);
const unified = new Set(["arcane-school", "school-of-unified-magical-theory"]);
check("Wizard curriculum adds a cantrip and a 1st-rank slot at 1st",
    pick(expectedSlots({ ...wizard, level: 1, slugs: battle }), "slot0", "slot1", "slot2"), { slot0: 6, slot1: 3, slot2: 0 },
    "the table alone, which the Wizard page's Paizo clarification says leaves the curriculum out");
check("Unified Magical Theory has no curriculum",
    pick(expectedSlots({ ...wizard, level: 1, slugs: unified }), "slot0", "slot1"), { slot0: 5, slot1: 2 },
    "matching every school-of- slug, Unified included");
check("Curriculum adds one slot at each rank the table has, none above it",
    (() => {
        const base = expectedSlots({ ...wizard, level: 3 });
        const withSchool = expectedSlots({ ...wizard, level: 3, slugs: battle });
        return [withSchool.slot1 - base.slot1, withSchool.slot2 - base.slot2, withSchool.slot3 - base.slot3];
    })(), [1, 1, 0],
    "a curriculum slot at a rank the wizard cannot cast yet");
check("Cantrip Expansion adds two prepared cantrips, untripled",
    [expectedSlots({ ...wizard, level: 2, slugs: new Set(["cantrip-expansion"]) }).slot0,
        expectedSlots({ ...wizard, level: 2, tripled: true, slugs: new Set(["cantrip-expansion"]) }).slot0], [7, 17],
    "tripling the feat's two into six, which Bryan ruled out on 2026-11-07");
check("Cantrip Expansion gives a spontaneous entry no cantrip slots",
    expectedSlots({ ...sorcerer, level: 2, slugs: new Set(["cantrip-expansion"]) }).slot0, 0,
    "applying the prepared half to a repertoire caster");
check("A 20th-level feat's extra 10th-rank slot lands on top of the tripled table",
    [expectedSlots({ ...sorcerer, level: 20, slugs: new Set(["bloodline-perfection"]) }).slot10,
        expectedSlots({ ...sorcerer, level: 20, tripled: true, slugs: new Set(["bloodline-perfection"]) }).slot10], [2, 4],
    "ignoring the feat, or tripling it to 6");
check("Another class's 20th-level feat adds nothing",
    expectedSlots({ ...sorcerer, level: 20, slugs: new Set(["archwizards-might"]) }).slot10, 1,
    "matching any extra-10th feat regardless of class");

const font = { classSlug: "cleric", pool: "font", type: "prepared" };
const fontAt = (level) => Object.entries(expectedSlots({ ...font, level })).filter(([, n]) => n > 0);
check("Divine Font: 4 slots at the highest rank, 5 from 5th, 6 from 15th, nothing else",
    [fontAt(1), fontAt(5), fontAt(15), fontAt(19)], [[["slot1", 4]], [["slot3", 5]], [["slot8", 6]], [["slot10", 6]]],
    "putting font slots at every rank, a fixed count, or cantrips in the font entry");
check("Divine Font stays untripled while the class-feature question is open",
    fontAt(1).concat(Object.entries(expectedSlots({ ...font, level: 1, tripled: true })).filter(([, n]) => n > 0)),
    [["slot1", 4], ["slot1", 4]],
    "tripling a class feature's slots before Bryan has ruled on them");

// planSync
const zeros = Object.fromEntries(SLOT_KEYS.map((k) => [k, 0]));
const at = (level) => expectedSlots({ ...sorcerer, level });

{
    const stored = { ...zeros, slot1: 3 };
    const result = planSync(stored, { ...stored }, at(2));
    check("A managed rank moves to the new level's value", [result.writes, result.mismatches], [{ slot1: 4 }, []],
        "writing nothing on level-up, or flagging a managed rank");
}
{
    const result = planSync({ ...zeros, slot1: 5 }, { ...zeros, slot1: 3 }, at(2));
    check("A hand-edited rank is kept and flagged", [result.writes, result.mismatches, result.synced.slot1], [{}, ["slot1"], 3],
        "overwriting the edit, which Bryan ruled out, or forgetting the old record");
}
{
    const result = planSync({ ...zeros, slot1: 4 }, { ...zeros, slot1: 3 }, at(2));
    check("A rank edited to exactly the expected value becomes managed again", [result.writes, result.mismatches, result.synced.slot1], [{}, [], 4],
        "a stale record that keeps the rank unmanaged forever");
}
{
    const result = planSync({ ...zeros, slot1: 3, slot2: 1 }, {}, at(1));
    check("An adopted entry takes matching ranks and flags the rest", [result.writes, result.mismatches, result.synced.slot1, "slot2" in result.synced],
        [{}, ["slot2"], 3, false],
        "writing over an entry the player built before the setting was on");
}
{
    const result = syncRank({ slot1: 3 }, at(2), "slot1");
    check("The per-rank sync button writes the expected value and records it", result, { writes: { slot1: 4 }, synced: { slot1: 4 } },
        "a button that writes but leaves the rank flagged");
}

// Walk a managed entry from 1st to 20th, twice: once untouched, once with slot1 edited at 5th.
function walk(editAt) {
    let stored = { ...at(1) };
    let synced = { ...at(1) };
    let flaggedAtEnd = [];
    for (let level = 2; level <= 20; level++) {
        if (level === editAt) stored = { ...stored, slot1: 7 };
        const result = planSync(stored, synced, at(level));
        stored = { ...stored, ...result.writes };
        synced = result.synced;
        flaggedAtEnd = result.mismatches;
    }
    return { stored, flaggedAtEnd };
}
{
    const plain = walk(null);
    check("A managed entry walked 1st to 20th ends on the 20th-level row", [plain.stored, plain.flaggedAtEnd], [at(20), []],
        "a sync that stalls after the first write");
    const edited = walk(5);
    check("An edit at 5th survives to 20th while every other rank keeps moving",
        [edited.stored.slot1, edited.stored.slot9, edited.stored.slot10, edited.flaggedAtEnd], [7, at(20).slot9, at(20).slot10, ["slot1"]],
        "one edited rank freezing the whole entry, or the edit being lost at a later level");
}

console.log(failed === 0 ? "\ncasting sync: all cases pass" : `\ncasting sync: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
