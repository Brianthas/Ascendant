import { talent, effectItem, uuidFor } from "../lib/item.mjs";
import { naturals } from "../lib/degree.mjs";
import { levelChain, atLeast, below, flavour, levelBlock } from "../lib/grants.mjs";

const PACK = "ascendant-apex";
const SLUG = "dread-presence";
const IMG = "icons/magic/control/fear-fright-monster-grin-green.webp";
const TOGGLE = "ascendant-dread-presence";
const AURA_EFFECT = `ascendant-${SLUG}-frightened`;
const SAVE_EFFECT = `${SLUG}-low-roll`;

/** PF2e's Frightened and Off-Guard conditions, read off the installed system's packs. */
const FRIGHTENED = "Compendium.pf2e.conditionitems.Item.TBSHQspnbcqxsmjL";
const OFF_GUARD = "Compendium.pf2e.conditionitems.Item.AJh5ex99aV6VTggg";

/**
 * Apex: Dread Presence. Every part below was verified live.
 *
 * The aura hands enemies an effect granting Frightened 1 `inMemoryOnly`, the
 * floor of every outcome; the four-step save is rolled at the table and the
 * value raised to match, because PF2e's aura save is a single pass or fail
 * and no rule element can hold a condition at a floor. Immunity handling
 * follows the level ladder as three Aura rules gated by level: fear- and
 * mental-immune creatures are excluded until 10th (they are "not immune" but
 * roll one degree better, which the table applies), mindless and mental-immune
 * creatures are excluded from 10th to 16th, and from 17th nothing is.
 *
 * "Off-Guard to you" from 3rd is an EphemeralEffect on the talent's own
 * attacks, landing Off-Guard on a target that carries the aura effect.
 *
 * The 5th-level low-roll clause rides an EphemeralEffect onto whoever saves
 * against the owner, where four AdjustDegreeOfSuccess rules test the target's
 * own frightened value against the natural die.
 *
 * The 15th-level attack penalty lives on the aura effect (which is on the
 * enemy): an untyped penalty equal to the enemy's frightened value against
 * the aura's owner, untyped because the rules say it is in addition to the
 * Frightened status penalty and two status penalties would not stack.
 *
 * Healing on a kill, the floors on reducing Frightened, re-entry rerolls and
 * the 20th-level approach ban are table-run.
 */
const frightenedEffect = effectItem({
    slug: AURA_EFFECT,
    name: "Dread Presence",
    img: IMG,
    traits: ["emotion", "fear", "mental", "visual"],
    description: `
<p>You are inside an enemy's <strong>Dread Presence</strong> and are <strong>Frightened</strong>.</p>
<hr />
<p>The aura sets Frightened 1. Roll your Will save against the aura's owner (the higher of their Class DC and Spell DC) when you first enter and raise the value to match: 1 on a critical success, 2 on a success, 3 on a failure, 4 on a critical failure (and you drop what you hold and cannot use reactions inside the aura). While inside, and for 1 round after leaving, you cannot reduce Frightened below that result; 1 minute after a critical failure. Leaving and re-entering rerolls, taking the worse result.</p>
<p>From the owner's 7th level you cannot reduce Frightened below 2 inside the aura, and below 3 from their 13th. From their 15th your attacks against them take a penalty equal to your Frightened value in addition to the usual one. From their 20th you cannot willingly move closer to them while inside.</p>
<p>This effect arrives and leaves with the aura. It does not need removing by hand.</p>
`.trim(),
    rules: [
        { key: "GrantItem", uuid: FRIGHTENED, inMemoryOnly: true },
        // 15th: a penalty equal to the frightened value against the aura's owner.
        ...[1, 2, 3, 4].map((value) => ({
            key: "FlatModifier",
            selector: "attack-roll",
            slug: `${SLUG}-frightened-penalty`,
            label: "ASCENDANT.Rules.DreadPresencePenalty",
            type: "untyped",
            value: -value,
            predicate: [`self:condition:frightened:${value}`, `target:feat:${SLUG}`, { gte: ["target:level", 15] }],
        })),
    ],
});

const lowRollEffect = effectItem({
    slug: SAVE_EFFECT,
    name: "Dread Presence: Low Save",
    img: IMG,
    showIcon: false,
    description: `<p>Applied automatically while you save against an effect from a character whose Dread Presence is active. If you are Frightened and roll a number on the die equal to or less than your frightened value, the result is one degree worse.</p>`,
    rules: [1, 2, 3, 4].map((value) => ({
        key: "AdjustDegreeOfSuccess",
        selector: "saving-throw",
        adjustment: { all: "one-degree-worse" },
        predicate: [`self:condition:frightened:${value}`, naturals(1, value)],
    })),
});

/** The aura in one of its three immunity bands. */
const aura = (key, predicate, effectPredicate) => ({
    key: "Aura",
    slug: `${SLUG}-${key}`,
    radius: "10 + (floor(@actor.level / 2) * 5)",
    traits: ["emotion", "fear", "mental", "visual"],
    effects: [{ uuid: uuidFor(PACK, AURA_EFFECT), affects: "enemies", events: ["enter"], removeOnExit: true, predicate: effectPredicate }],
    appearance: { border: { color: "#8b0000", alpha: 0.75 }, highlight: { color: "#8b0000", alpha: 0.25 } },
    predicate: [TOGGLE, ...predicate],
});

const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "Dread Presence",
    img: IMG,
    levels: [
        { level: 3, text: levelBlock("3rd Level", ["Creatures affected by your aura are Off-Guard to you.", "When a creature Frightened by your aura is reduced to 0 Hit Points by any source, you restore Hit Points equal to half your level. This triggers no more than once per round."]) },
        { level: 5, text: levelBlock("5th Level", ["A creature Frightened by your aura that rolls at or below its Frightened value on a save against any of your effects treats the result as one degree worse."]) },
        { level: 7, text: levelBlock("7th Level", ["Enemies cannot reduce their Frightened value below 2 while in your aura."]) },
        { level: 10, text: levelBlock("10th Level", ["The healing from your aura increases to your level, and may trigger twice per round.", "Creatures immune to fear or emotion effects roll normally, and creatures that are mindless or immune to mental effects become affected, treating their result as one degree better."]) },
        { level: 13, text: levelBlock("13th Level", ["Enemies cannot reduce their Frightened value below 3 while in your aura."]) },
        { level: 15, text: levelBlock("15th Level", ["Enemies in your aura take a status penalty to attack rolls against you equal to their Frightened value, in addition to the normal Frightened penalty."]) },
        { level: 17, text: levelBlock("17th Level", ["Nothing is immune to your aura and all creatures roll normally."]) },
        { level: 20, text: levelBlock("20th Level", ["Enemies cannot willingly move closer to you while inside your aura. They may still attack, cast, and move within or out of it."]) },
    ],
});

export const dreadPresence = talent({
    name: "Dread Presence",
    slug: SLUG,
    category: "ascendant-apex",
    img: IMG,
    description: `
${flavour("Something in you registers below thought, in the part of the mind that predates language and still knows what it is to be prey. Brave creatures find their hands unsteady near you, and the mindless, who should feel nothing at all, discover they would rather be elsewhere.")}
${levelBlock("1st Level", [
    "As a free action once per round, activate or deactivate an aura with a radius of 10 feet + 5 feet per even level.",
    "When an enemy first enters the aura, or your movement first places them inside, they attempt a Will save against the higher of your Class DC or Spell DC.<ul><li><strong>Critical Success</strong> Frightened 1. <strong>Success</strong> Frightened 2. <strong>Failure</strong> Frightened 3.</li><li><strong>Critical Failure</strong> Frightened 4. The creature drops anything it is holding and cannot use reactions while in your aura.</li><li>While inside the aura, and for 1 round after leaving, they cannot reduce their Frightened value below the result rolled. On a critical failure this lasts 1 minute.</li><li>An enemy that leaves and re-enters rerolls, taking the worse result.</li></ul>",
    "Creatures immune to fear or emotion effects are not immune to your aura, but treat their save result as one degree better.<ul><li>At 10th level they roll normally, and creatures that are mindless or immune to mental effects become affected, treating their result as one degree better.</li><li>At 17th level, nothing is immune to your aura and all creatures roll normally.</li></ul>",
])}
${levelBlock("3rd Level", ["Creatures affected by your aura are Off-Guard to you.", "When a creature Frightened by your aura is reduced to 0 Hit Points by any source, you restore Hit Points equal to half your level. This triggers no more than once per round."])}
${levelBlock("5th Level", ["A creature Frightened by your aura that rolls at or below its Frightened value on a save against any of your effects treats the result as one degree worse."])}
${levelBlock("7th Level", ["Enemies cannot reduce their Frightened value below 2 while in your aura."])}
${levelBlock("10th Level", ["The healing from your aura increases to your level, and may trigger twice per round."])}
${levelBlock("13th Level", ["Enemies cannot reduce their Frightened value below 3 while in your aura."])}
${levelBlock("15th Level", ["Enemies in your aura take a status penalty to attack rolls against you equal to their Frightened value, in addition to the normal Frightened penalty."])}
${levelBlock("20th Level", ["Enemies cannot willingly move closer to you while inside your aura. They may still attack, cast, and move within or out of it."])}
<p><em>Dropped items may be retrieved normally with an Interact action.</em></p>
<hr />
<p><strong>In Foundry:</strong> switch <em>Dread Presence</em> on in your effects panel. The aura is drawn at the right radius and applies <strong>Frightened 1</strong> to enemies inside it, which ends when they leave; fear- and mental-immune creatures are skipped until the level at which the rules bring them in. Affected creatures are Off-Guard to your attacks from 3rd. From 5th, an affected creature saving against any effect of yours that rolls its Frightened value or less on the die has the result worsened one degree. From 15th their attacks against you take the extra penalty.</p>
<p>For the table: roll the Will save when an enemy first enters and raise their Frightened value to match, apply the floors on reducing it, the healing when one drops, and the 20th-level approach ban. PF2e's aura save is pass or fail and it has no floor on a condition.</p>
`.trim(),
    rules: [
        { key: "RollOption", domain: "all", option: TOGGLE, label: "ASCENDANT.Rules.DreadPresenceToggle", toggleable: true, value: false },
        aura("1", [below(10)], [{ nor: ["target:immunity:mental", "target:immunity:fear", "target:immunity:emotion"] }]),
        aura("10", [atLeast(10), below(17)], [{ nor: ["target:immunity:mental", "target:trait:mindless"] }]),
        aura("17", [atLeast(17)], []),
        // 3rd: affected creatures are Off-Guard to you.
        {
            key: "EphemeralEffect",
            affects: "target",
            selectors: ["strike-attack-roll", "spell-attack"],
            uuid: OFF_GUARD,
            predicate: [TOGGLE, atLeast(3), `target:effect:${AURA_EFFECT}`],
        },
        // 5th: the low-roll clause, on whoever saves against you.
        {
            key: "EphemeralEffect",
            affects: "target",
            selectors: ["saving-throw", "fortitude", "reflex", "will"],
            uuid: uuidFor(PACK, SAVE_EFFECT),
            predicate: [TOGGLE, atLeast(5)],
        },
        {
            key: "Note",
            selector: "all",
            title: "Dread Presence",
            text: "ASCENDANT.Note.DreadPresenceHealing",
            predicate: [TOGGLE, atLeast(3), "target:condition:frightened"],
        },
        ...grants,
    ],
});

export default [dreadPresence, frightenedEffect, lowRollEffect, ...subFeats];
