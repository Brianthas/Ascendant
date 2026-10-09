import { talent, effectItem, uuidFor } from "../lib/item.mjs";
import { naturals } from "../lib/degree.mjs";
import { levelChain, atLeast, below, flavour, levelBlock } from "../lib/grants.mjs";
import { DREAD_PRESENCE } from "../../scripts/constants.mjs";

const PACK = "ascendant-apex";
const SLUG = "dread-presence";
const IMG = "icons/magic/control/fear-fright-monster-grin-green.webp";
const TOGGLE = "ascendant-dread-presence";
const [AURA_EFFECT, AURA_EFFECT_ALL] = DREAD_PRESENCE.effects;

/**
 * Set on the owner while the aura is on, so an attack against the owner carries
 * `target:ascendant-dread-presence`. An attack's target options come from
 * getSelfRollOptions("target"), which maps only options starting with `self:`;
 * a feat registers as plain `feat:<slug>`, so no `target:feat:` option exists.
 */
const OWNER_OPTION = `self:${TOGGLE}`;
const SAVE_EFFECT = `${SLUG}-low-roll`;

/** PF2e's Frightened and Off-Guard conditions, read off the installed system's packs. */
const FRIGHTENED = "Compendium.pf2e.conditionitems.Item.TBSHQspnbcqxsmjL";
const OFF_GUARD = "Compendium.pf2e.conditionitems.Item.AJh5ex99aV6VTggg";

/**
 * Apex: Dread Presence. Every part below was verified live.
 *
 * The aura hands enemies an effect granting Frightened `inMemoryOnly` at the
 * effect's counter badge. scripts/dread-presence.mjs rolls the Will save when
 * the effect lands and sets the badge: PF2e's Aura rule element has a `save`
 * field that applyAreaEffects never reads, so no aura in the system rolls one.
 * An in-memory condition cannot be lowered, which is the floor while inside; on
 * leaving, the script keeps the value as a stored Frightened and adds a
 * Lingering effect holding the rolled result for 1 round, or 1 minute after a
 * critical failure.
 *
 * Immunity follows the level ladder through the effect's traits, because PF2e's
 * createDocuments drops an effect whose traits the actor is immune to
 * (pf2e.mjs:45566), silently for an aura effect. Below 10th the effect is
 * mental: mental-immune creatures stay out, a predicate keeps mindless ones out,
 * and fear- and emotion-immune creatures come in and roll one degree better.
 * From 10th a second copy carries only the aura trait, which no immunity
 * matches, so everything comes in; mental-immune and mindless creatures roll
 * one degree better until 17th. The degree adjustments are rules on the effect,
 * switched on by roll options the script puts on the save.
 *
 * "Off-Guard to you" from 3rd is an EphemeralEffect on the talent's own
 * attacks, landing Off-Guard on a target that carries either aura effect.
 *
 * The 5th-level low-roll clause covers "a save against any of your effects".
 * For the aura's own save it is four rules on the aura effect, switched on by
 * the script; for every other save it rides an EphemeralEffect onto whoever
 * saves against the owner.
 *
 * The 15th-level attack penalty lives on the aura effect (which is on the
 * enemy): an untyped penalty equal to the enemy's frightened value against
 * the aura's owner, untyped because the rules say it is in addition to the
 * Frightened status penalty and two status penalties would not stack.
 *
 * Healing on a kill, dropped items and lost reactions on a critical failure,
 * and the 20th-level approach ban are table-run.
 */
const auraEffect = (slug, traits) =>
    effectItem({
        slug,
        name: "Dread Presence",
        img: IMG,
        traits,
        badge: { type: "counter", value: 1, min: 1, max: 4 },
        description: `
<p>You are inside an enemy's <strong>Dread Presence</strong> and are <strong>Frightened</strong> at the value on this effect. It cannot be reduced while you remain inside.</p>
<hr />
<p>Your Will save against the aura's owner (the higher of their Class DC and Spell DC) is rolled automatically when this effect arrives: Frightened 1 on a critical success, 2 on a success, 3 on a failure, 4 on a critical failure (and you drop what you hold and cannot use reactions inside the aura). When it leaves, you keep your Frightened value, and it cannot drop below the result rolled for 1 round (1 minute after a critical failure). Leaving and re-entering rerolls, taking the worse result. Deleting this effect by hand counts as leaving the aura.</p>
<p>From the owner's 7th level you cannot reduce Frightened below 2 inside the aura, and below 3 from their 13th. From their 15th your attacks against them take a penalty equal to your Frightened value in addition to the usual one. From their 20th you cannot willingly move closer to them while inside.</p>
`.trim(),
        rules: [
            {
                key: "GrantItem",
                uuid: FRIGHTENED,
                inMemoryOnly: true,
                alterations: [{ mode: "override", property: "badge-value", value: "@item.badge.value" }],
            },
            // An immune creature the aura reaches anyway treats its result as one degree better.
            {
                key: "AdjustDegreeOfSuccess",
                selector: "will",
                adjustment: { all: "one-degree-better" },
                predicate: [DREAD_PRESENCE.better],
            },
            // 5th: the low-roll clause on the aura's own save.
            ...[1, 2, 3, 4].map((value) => ({
                key: "AdjustDegreeOfSuccess",
                selector: "will",
                adjustment: { all: "one-degree-worse" },
                predicate: [DREAD_PRESENCE.lowRoll, `self:condition:frightened:${value}`, naturals(1, value)],
            })),
            // Critical failure: what PF2e has no condition for.
            {
                key: "Note",
                selector: "will",
                title: "Dread Presence",
                text: "ASCENDANT.Note.DreadPresenceCriticalFailure",
                outcome: ["criticalFailure"],
                predicate: [DREAD_PRESENCE.save],
            },
            // 15th: a penalty equal to the frightened value against the aura's owner.
            ...[1, 2, 3, 4].map((value) => ({
                key: "FlatModifier",
                selector: "attack-roll",
                slug: `${SLUG}-frightened-penalty`,
                label: "ASCENDANT.Rules.DreadPresencePenalty",
                type: "untyped",
                value: -value,
                predicate: [`self:condition:frightened:${value}`, `target:${TOGGLE}`, { gte: ["target:level", 15] }],
            })),
        ],
    });

const frightenedEffect = auraEffect(AURA_EFFECT, ["mental"]);
const frightenedEffectAll = auraEffect(AURA_EFFECT_ALL, ["aura"]);

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

/** The aura in one of its two immunity bands. */
const aura = (key, predicate, effectSlug, effectPredicate) => ({
    key: "Aura",
    slug: `${SLUG}-${key}`,
    radius: "10 + (floor(@actor.level / 2) * 5)",
    traits: ["emotion", "fear", "mental", "visual"],
    effects: [{ uuid: uuidFor(PACK, effectSlug), affects: "enemies", events: ["enter"], removeOnExit: true, predicate: effectPredicate }],
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
        { level: 15, text: levelBlock("15th Level", ["Enemies in your aura take an untyped penalty to attack rolls against you equal to their Frightened value. This is deliberately untyped so that it stacks with the penalty from the Frightened condition itself."]) },
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
${levelBlock("15th Level", ["Enemies in your aura take an untyped penalty to attack rolls against you equal to their Frightened value. This is deliberately untyped so that it stacks with the penalty from the Frightened condition itself."])}
${levelBlock("20th Level", ["Enemies cannot willingly move closer to you while inside your aura. They may still attack, cast, and move within or out of it."])}
<p><em>Dropped items may be retrieved normally with an Interact action.</em></p>
<hr />
<p><strong>In Foundry:</strong> switch <em>Dread Presence</em> on at the top of the Encounter section of your Actions tab. The aura is drawn at the right radius. When an enemy enters it, or is inside when you switch it on, its Will save against the higher of your Class DC and Spell DC is rolled automatically and its Frightened value set from the result. That value cannot be reduced while it stays inside, nor below 2 from your 7th level or 3 from your 13th once it has reached them. When it leaves, or you switch the aura off, it keeps its Frightened value, and a <em>Dread Presence: Lingering</em> effect stops it dropping below the result rolled for 1 round, or 1 minute after a critical failure. Re-entering rolls again, and the higher Frightened value wins. Creatures the rules make "not immune" are brought in at the right level and roll one degree better where the rules say so.</p>
<p>Affected creatures are Off-Guard to your attacks from 3rd. From 5th, an affected creature that rolls its Frightened value or less on the die has the result worsened one degree, on the aura's own save and on any other save against your effects. From 15th their attacks against you take the extra penalty.</p>
<p>For the table: a critical failure's dropped items and lost reactions (the save's chat card says so), the healing when a frightened creature drops, and the 20th-level approach ban. A creature immune to the Frightened condition itself stays unaffected at 17th: PF2e will not grant it.</p>
`.trim(),
    rules: [
        { key: "RollOption", domain: "all", option: TOGGLE, label: "ASCENDANT.Rules.DreadPresenceToggle", toggleable: true, value: false },
        // 15th: lets the aura effect's attack penalty recognise an attack against you.
        { key: "RollOption", domain: "all", option: OWNER_OPTION, predicate: [TOGGLE] },
        aura("1", [below(10)], AURA_EFFECT, [{ not: "target:trait:mindless" }]),
        aura("10", [atLeast(10)], AURA_EFFECT_ALL, []),
        // 3rd: affected creatures are Off-Guard to you.
        {
            key: "EphemeralEffect",
            affects: "target",
            selectors: ["strike-attack-roll", "spell-attack"],
            uuid: OFF_GUARD,
            predicate: [TOGGLE, atLeast(3), { or: DREAD_PRESENCE.effects.map((slug) => `target:effect:${slug}`) }],
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

export default [dreadPresence, frightenedEffect, frightenedEffectAll, lowRollEffect, ...subFeats];
