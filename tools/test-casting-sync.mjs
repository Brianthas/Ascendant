/**
 * Cases for `scripts/casting/expected.mjs`: slot maxima, repertoire sizes, and the per-rank sync
 * rule that keeps a hand-edited rank.
 *
 * Table numbers asserted here were read off the raw AoN cells on 2026-11-07 (Sorcerer row 1 is
 * 5 | 3, row 19's 10th is 1; Wizard row 1 is 5 | 2; Animist row 1 is 2+2 | 1+1; Magus has no 10th
 * column), not off the generated file. Each case names the wrong model it separates.
 */
import { expectedSlots, expectedKnown, countKnown, signatureAllowed, planSync, syncRank, nextValue, archetypeRow, archetypeSignatures, SLOT_KEYS } from "../scripts/casting/expected.mjs";
import { parseBloodlineGifts, parseGrantedSpells, parsePsiCantrips, parseMuseSpell, parseStudiousSpells } from "../scripts/casting/granted.mjs";

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
    [2, 1],
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
check("Divine Font is not tripled",
    Object.entries(expectedSlots({ ...font, level: 1, tripled: true })).filter(([, n]) => n > 0), [["slot1", 4]],
    "tripling a class feature's slots, which Bryan ruled out on 2026-11-07");
check("The curriculum slot is not tripled",
    pick(expectedSlots({ ...wizard, level: 1, tripled: true, slugs: battle }), "slot0", "slot1"), { slot0: 16, slot1: 7 },
    "tripling table and curriculum together (18 and 9), which Bryan ruled out on 2026-11-07");

// Remaining slots when a maximum moves (nextValue)
check("A gained slot is available at once; a lost one takes the remainder down with it",
    [nextValue(3, 3, 4), nextValue(3, 1, 4), nextValue(12, 12, 4), nextValue(12, 2, 4), nextValue(4, 4, 4)], [4, 2, 4, 2, 4],
    "lowering the maximum alone, which left 12 of 4 slots live on 2026-11-07");

// Spells known (expectedKnown with knownAdditions, countKnown, signatureAllowed)
check("Cantrip Expansion adds two cantrips known to a spontaneous caster, untripled",
    [expectedKnown({ ...sorcerer, level: 2, slugs: new Set(["cantrip-expansion"]) }).slot0,
        expectedKnown({ ...sorcerer, level: 2, tripled: true, slugs: new Set(["cantrip-expansion"]) }).slot0], [7, 17],
    "no addition, or tripling the feat's two");
check("Greater Mental Evolution adds one known spell at each rank with slots",
    pick(expectedKnown({ ...sorcerer, level: 3, slugs: new Set(["greater-mental-evolution"]) }), "slot1", "slot2", "slot3"),
    { slot1: 5, slot2: 4, slot3: 0 },
    "adding at ranks the sorcerer cannot cast yet, or at none");
check("Deep Lore belongs to the bard: a sorcerer holding the slug gains nothing",
    expectedKnown({ ...sorcerer, level: 3, slugs: new Set(["deep-lore"]) }).slot1, 4,
    "matching the feat regardless of class");
check("The 10th-rank capstone: one slot, two known",
    [expectedSlots({ ...sorcerer, level: 19 }).slot10, expectedKnown({ ...sorcerer, level: 19 }).slot10], [1, 2],
    "known equal to slots at 10th, against 'Add two common 10th-rank spells'");
check("The granted parameter adds its counts per rank (no grant built so far supplies it)",
    pick(expectedKnown({ classSlug: "oracle", pool: "oracle", level: 1, granted: { slot0: 1, slot1: 1 } }), "slot0", "slot1"),
    { slot0: 6, slot1: 4 },
    "the addition dropped or applied to the wrong rank");
check("countKnown counts a heightened copy at its own rank, and signatures among ranked spells only",
    countKnown([
        { isCantrip: true, rank: 1, signature: false },
        { isCantrip: false, rank: 1, signature: true },
        { isCantrip: false, rank: 3, signature: false },
        { isCantrip: false, rank: 1, signature: false },
    ]),
    { known: { ...Object.fromEntries(SLOT_KEYS.map((k) => [k, 0])), slot0: 1, slot1: 2, slot3: 1 }, signature: 1 },
    "counting the copy at its base rank, or a cantrip as a 1st-rank spell");
check("One signature spell per rank with slots, 10th included",
    [signatureAllowed(expectedSlots({ ...sorcerer, level: 3 })), signatureAllowed(expectedSlots({ ...sorcerer, level: 19 }))], [2, 10],
    "counting the cantrip column, or stopping at 9th");

// Archetypes (archetypeRow, archetypeSignatures), from Player Core's spellcasting archetype rules.
const arch = (level, tiers, cantrips = 2) => archetypeRow({ level, cantrips, basic: false, expert: false, master: false, ...tiers });
check("Dedication only: cantrips, no slots",
    arch(2, {}), [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    "slots before the basic feat");
check("Basic at 4th: one 1st-rank slot; at 6th a 2nd; at 8th a 3rd",
    [arch(4, { basic: true }).slice(1, 4), arch(6, { basic: true }).slice(1, 4), arch(8, { basic: true }).slice(1, 4)], [[1, 0, 0], [1, 1, 0], [1, 1, 1]],
    "all three ranks at once, or the 2nd rank at the feat's own level");
check("Expert at 12th, 14th, 16th; master at 18th, 20th",
    [arch(12, { basic: true, expert: true }).slice(4, 7), arch(16, { basic: true, expert: true }).slice(4, 7),
        arch(18, { basic: true, expert: true, master: true }).slice(7, 9), arch(20, { basic: true, expert: true, master: true }).slice(7, 10)],
    [[1, 0, 0], [1, 1, 1], [1, 0], [1, 1, 0]],
    "a 9th-rank archetype slot, or expert ranks without the feat");
check("Inexhaustible Magics triples an archetype's slots and cantrips (Bryan: archetypes are the exception)",
    pick(expectedSlots({ classSlug: "wizard", pool: "archetype", type: "prepared", level: 6, tripled: true, row: arch(6, { basic: true }) }), "slot0", "slot1", "slot2"),
    { slot0: 6, slot1: 3, slot2: 3 },
    "leaving archetype slots untripled, or adding the class's curriculum to an archetype");
check("Inexhaustible Magics triples a spontaneous archetype's cantrips known, not its spells known",
    pick(expectedKnown({ classSlug: "sorcerer", pool: "archetype", level: 6, tripled: true, row: arch(6, { basic: true }) }), "slot0", "slot1", "slot2"),
    { slot0: 6, slot1: 1, slot2: 1 },
    "tripling the archetype's repertoire, or leaving its cantrips untripled");
check("Archetype signature spells: one from basic at 6th, one each from expert and master",
    [archetypeSignatures({ level: 4, basic: true }), archetypeSignatures({ level: 6, basic: true }), archetypeSignatures({ level: 18, basic: true, expert: true, master: true })], [0, 1, 3],
    "a signature at 4th, before the rule grants one");

// Bloodline gifts (parseBloodlineGifts), on excerpts of the installed PF2e 8.6.1 markup.
const L = (id) => `@UUID[Compendium.pf2e.spells-srd.Item.${id}]{x}`;
const nymph = `<p><strong>Granted Spells</strong> cantrip: ${L("uZK2BYzPnxUBnDjr")}; 1st: ${L("vLA0q0WOK2YPuJs6")}; 2nd: ${L("b515AZlB0sridKSq")}; 9th: ${L("fkDeKktdmbeplYRY")}</p>
<p><strong>Bloodline Spells</strong> initial: ${L("pHrVvoTKygXeczVG")}</p>`;
const draconic = `<p><strong>Sorcerous Gifts</strong> cantrip: ${L("TVKNbcgTee19PXZR")}; 1st: ${L("4koZzrnMXhhosn0D")}; 2nd: see Draconic Exemplars below; 3rd: ${L("o6YCGx4lycsYpww4")}</p>
<p><strong>Bloodline Spells</strong> initial: ${L("K8vvrOgW4bGakXxm")}</p><ul>
<li><strong>Arcane&mdash;Tradition</strong> arcane; <strong>Sorcerous Gifts</strong> 2nd: ${L("ZxHC7V7HtjUsB8zH")}</li>
<li><strong>Divine&mdash;Tradition</strong> divine; <strong>Sorcerous Gifts</strong> 2nd: ${L("41TZEjhO6D1nWw2X")}</li></ul>`;
const elemental = `<p><strong>Sorcerous Gifts</strong> cantrip: see Elemental Influences below; 2nd: ${L("Fr58LDSrbndgld9n")}; 6th :see Elemental Influences below</p><ul>
<li><strong>Air&mdash;Sorcerous Gifts</strong> cantrip: ${L("dDiOnjcsBFbAvP6t")}; 6th: ${L("TDNlDWbYb58Y55Da")}</li>
<li><strong>Earth&mdash;Sorcerous Gifts</strong> cantrip: ${L("zA0jNIBRgLsyTpbm")}; 6th: ${L("znv4ECL7ZtuiagtA")}</li></ul>`;
const genie = `<p><strong>Granted Spells</strong> cantrip: ${L("gpzpAAAJ1Lza2JVl")}; 2nd: variable (see Genie Type below)</p><ul>
<li><strong>Janni</strong> 2nd: ${L("Mt6ZzkVX8Q4xigFq")}</li><li><strong>Jaathoom</strong> 2nd: ${L("XXqE1eY3w3z6xJCB")}</li></ul>`;
const id = (s) => `Compendium.pf2e.spells-srd.Item.${s}`;
check("Granted Spells list: every linked rank, Bloodline Spells (focus) left out",
    parseBloodlineGifts(nymph).gifts, { 0: id("uZK2BYzPnxUBnDjr"), 1: id("vLA0q0WOK2YPuJs6"), 2: id("b515AZlB0sridKSq"), 9: id("fkDeKktdmbeplYRY") },
    "reading the focus spells' initial link, or stopping at the first rank");
check("Draconic: a red exemplar's 2nd-rank gift comes from the Arcane item (slug first, then tradition)",
    parseBloodlineGifts(draconic, ["red", "arcane"]).gifts[2], id("ZxHC7V7HtjUsB8zH"),
    "skipping 'see Draconic Exemplars below', or taking the first exemplar item");
check("Draconic: a divine exemplar gets the Divine item's spell",
    parseBloodlineGifts(draconic, ["empyreal", "divine"]).gifts[2], id("41TZEjhO6D1nWw2X"),
    "matching every key against every item");
check("Elemental: the air influence fills cantrip and 6th, including the '6th :see' spacing",
    pick(parseBloodlineGifts(elemental, ["air"]).gifts, "0", "2", "6"), { 0: id("dDiOnjcsBFbAvP6t"), 2: id("Fr58LDSrbndgld9n"), 6: id("TDNlDWbYb58Y55Da") },
    "an ordinal pattern that needs the colon right after the rank");
check("Genie: Janni's 2nd-rank spell",
    parseBloodlineGifts(genie, ["janni"]).gifts[2], id("Mt6ZzkVX8Q4xigFq"),
    "the variable rank left empty");
check("No choice made yet: the variant ranks are reported missing, not filled from the first item",
    parseBloodlineGifts(genie, []).missing.includes(2), true,
    "silently taking Janni for every genie sorcerer");

// Oracle, psychic, bard and magus grant sources, on raw excerpts of the installed PF2e 8.6.1 markup.
const blight = `<p><strong>Granted Spells</strong></p><ul><li><strong>cantrip:</strong> ${L("thAHF1zxNplLCJPO")}</li><li><strong>1st:</strong> ${L("1meVElIu1CEVYWkv")}</li><li><strong>2nd:</strong> ${L("3VxVbZqIRvpKkg3O")}</li><li><strong>5th:</strong> ${L("MlpbeZ61Euhl0d60")}</li></ul><p><strong>Revelation Spells</strong></p><ul><li><strong>initial:</strong> ${L("DnVTBGCsai6zqMwL")}</li></ul>`;
const grasp = `<p><strong>Granted Spells</strong></p><ul><li>1st: ${L("sPHcuLIKj9SDaDAD")}</li><li>2nd: ${L("mrDi3v933gsmnw25")}</li><li>9th: ${L("4WS7HrFjwNvTn8T2")}</li></ul><hr /><p><strong>Standard Psi Cantrips</strong></p>
<p>${L("pwzdSlJgYqN7bs2w")}</p><p><strong>Amp</strong> You attempt to @UUID[Compendium.pf2e.actionspf2e.Item.7blmbDrQFNfdT731]{Shove} the target.</p><p>${L("60sgbuMWN0268dB7")}</p><p><strong>Unique Psi Cantrips</strong></p>
<p>surface: @UUID[Compendium.pf2e.spells-srd.Item.yyz029C9eqfY38PT]</p><p><strong>Amp</strong> A creature that critically fails is also @UUID[Compendium.pf2e.conditionitems.Item.dfCMdR4wnpbYNTix].</p>
<p>deeper: @UUID[Compendium.pf2e.spells-srd.Item.a0AMgATvQGwDR5dR]</p><p>deepest: @UUID[Compendium.pf2e.spells-srd.Item.ViqzVEprQVzCXZ9f]</p>`;
check("Mystery: bold rank labels inside Granted Spells, revelation (focus) spells left out",
    parseGrantedSpells(blight), { 0: id("thAHF1zxNplLCJPO"), 1: id("1meVElIu1CEVYWkv"), 2: id("3VxVbZqIRvpKkg3O"), 5: id("MlpbeZ61Euhl0d60") },
    "ending the section at the first bold label, or reading 'initial:' as a rank");
check("Conscious mind: plain rank lines, stopping before the psi cantrips",
    parseGrantedSpells(grasp), { 1: id("sPHcuLIKj9SDaDAD"), 2: id("mrDi3v933gsmnw25"), 9: id("4WS7HrFjwNvTn8T2") },
    "running on into the cantrips");
check("Psi cantrips: two standard and the surface one at 1st, deeper at 6th, deepest at 10th; no action or condition links",
    parsePsiCantrips(grasp).map((c) => `${c.level}:${c.uuid.split(".").at(-1)}`),
    ["1:pwzdSlJgYqN7bs2w", "1:60sgbuMWN0268dB7", "1:yyz029C9eqfY38PT", "6:a0AMgATvQGwDR5dR", "10:ViqzVEprQVzCXZ9f"],
    "all five at 1st (measured live on 2026-11-07), or the amp's Shove taken as a spell");
check("Muse spell",
    parseMuseSpell(`<p><strong>Muse Spell</strong> ${L("Gb7SeieEvd0pL2Eh")}</p>`), id("Gb7SeieEvd0pL2Eh"),
    "no link found after the heading");
check("Studious spells by character level: Gecko Grip and the study's at 7th, Haste and Fly at 11th and 13th",
    parseStudiousSpells(
        `<p>you can use @UUID[Compendium.pf2e.actionspf2e.Item.HbejhIywqIufrmVM]{Arcane Cascade} ... Your studious spells are ${L("5KobTMrZeZxuXMgl")} and an additional spell depending on your hybrid study.</p>\n<p>At 11th level, add ${L("o6YCGx4lycsYpww4")} and an additional spell. At 13th level, add ${L("A2JfEKe6BZcTG1S8")} and an additional spell.</p>`,
        `<p><strong>Studious Spells</strong> 7th: ${L("3JG1t3T4mWn6vTke")}; 11th: ${L("AMEu5zzLN7uCX645")}; 13th: ${L("VlNcjmYyu95vOUe8")}</p>`,
    ).map((s) => `${s.level}:${s.uuid.split(".").at(-1)}`).sort(),
    ["11:AMEu5zzLN7uCX645", "11:o6YCGx4lycsYpww4", "13:A2JfEKe6BZcTG1S8", "13:VlNcjmYyu95vOUe8", "7:3JG1t3T4mWn6vTke", "7:5KobTMrZeZxuXMgl"].sort(),
    "reading the study's 7th/11th/13th as spell ranks, or taking Haste and Fly at 7th");

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
