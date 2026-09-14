import { talent, actionItem, uuidFor } from "../lib/item.mjs";
import { levelChain, grantNow, atLeast, flavour, levelBlock } from "../lib/grants.mjs";

const PACK = "ascendant-apex";
const SLUG = "unbound-casting";
const IMG = "icons/magic/symbols/runes-carved-stone-purple.webp";

/**
 * The eight Unbound Spellshapes, as free actions on the Actions tab.
 *
 * Every one changes how a spell is cast or targeted, which no rule element
 * reaches: nothing alters a spell's targets, area, range, duration or action
 * cost from outside the spell, and a damage dice increase "by half" cannot be
 * computed from a spell's dice by a rule. So each is an item whose text is
 * the rule, granted when the rules grant it: Empowered Casting outright, and
 * one more at 1st, 3rd, 7th, 10th and 13th chosen through a ChoiceSet on that
 * level's sub-feat.
 */
const SPELLSHAPES = [
    ["empowered-casting", "Empowered Casting", "Increase the damage dice of your next spell by half, rounded down."],
    ["split-casting", "Split Casting", "Your next spell that targets one creature targets two instead, at full effect against each."],
    ["bouncing-casting", "Bouncing Casting", "If your next spell has no effect on its target, through a successful save, a miss, an immunity, or a counteract, it immediately retargets a different creature within range of your choice. It may bounce once.<ul><li>A spell bounces only if the target takes no damage and suffers no condition.</li></ul>"],
    ["delayed-casting", "Delayed Casting", "Your next spell doesn't take effect until the start of your next turn. You choose its targets and areas when it resolves."],
    ["anchored-casting", "Anchored Casting", "Your next spell with a duration of 1 minute or less doesn't require Sustain and lasts its full duration."],
    ["piercing-casting", "Piercing Casting", "Your next spell ignores cover and concealment and requires no line of effect, only line of sight or knowledge of the target's location."],
    ["perfect-reach", "Perfect Reach", "Your next spell's range becomes 500 feet, or it gains a range of 500 feet if it normally has a range of touch."],
    ["perfect-quickening", "Perfect Quickening", "Your next spell costs 1 fewer action, to a minimum of 1. Once per turn."],
];

/** Roll option each learned spellshape sets, so a later pick cannot offer it again. */
const KNOWN = "ascendant-spellshape";

export const spellshapes = SPELLSHAPES.map(([slug, name, text]) =>
    actionItem({
        slug: `${SLUG}-${slug}`,
        name,
        actionType: "free",
        traits: [],
        img: IMG,
        frequency: slug === "perfect-quickening" ? { value: 1, max: 1, per: "turn" } : null,
        description: `<p>${text}</p><p><em>Unbound Spellshape. Requires no additional components, gestures, or words. It has no traits and cannot be identified, counteracted, or prevented.</em></p><hr /><p>Apply the change when you cast the spell. Once per round you may use a spellshape as a free action; from 20th level, with no frequency limit.</p>`,
        // Live on 2026-09-14: five level picks each defaulted to the first spellshape and each
        // granted another copy; `allowDuplicate: false` does not stop a second granter. So a
        // learned spellshape announces itself and the choice lists exclude it.
        rules: [{ key: "RollOption", domain: "all", option: `${KNOWN}:${slug}` }],
    }),
);

const SHAPE_CHOICES = SPELLSHAPES.filter(([slug]) => slug !== "empowered-casting").map(([slug, name]) => ({
    value: uuidFor(PACK, `${SLUG}-${slug}`),
    label: name,
    predicate: [{ not: `${KNOWN}:${slug}` }],
}));

/** A sub-feat that asks which spellshape to learn and grants the answer. */
const learn = (letter) => [
    {
        key: "ChoiceSet",
        slug: `spellshape${letter}`,
        rollOption: `ascendant-spellshape-${letter.toLowerCase()}`,
        prompt: "ASCENDANT.Rules.SpellshapePrompt",
        adjustName: true,
        choices: SHAPE_CHOICES,
    },
    { key: "GrantItem", uuid: `{item|flags.pf2e.rulesSelections.spellshape${letter}}`, allowDuplicate: false },
];

const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "Unbound Casting",
    img: IMG,
    levels: [
        { level: 3, text: levelBlock("3rd Level", ["Your spells lose the concentrate trait.", "Learn another spellshape."]), rules: learn("B") },
        { level: 7, text: levelBlock("7th Level", ["All your spells are considered subtle.", "Learn another spellshape."]), rules: learn("C") },
        { level: 10, text: levelBlock("10th Level", ["You may Cast a Spell even while Paralyzed, Stunned, Slowed, or otherwise unable to act, though you must still be conscious.", "Learn another spellshape."]), rules: learn("D") },
        { level: 13, text: levelBlock("13th Level", ["You may apply two spellshapes to the same spell, rather than one. This limit does not increase.", "Learn another spellshape."]), rules: learn("E") },
        { level: 15, text: levelBlock("15th Level", ["Your spells remove the incapacitation trait."]) },
        { level: 20, text: levelBlock("20th Level", ["Your spells cannot be dispelled.", "You may use spellshapes as free actions with no frequency limit, except Perfect Quickening, which remains once per turn."]) },
    ],
});

/** Trait alterations on every spell the character owns. */
const alter = (mode, value, predicate = []) => ({ key: "ItemAlteration", itemType: "spell", mode, property: "traits", value, predicate });

export const unboundCasting = talent({
    name: "Unbound Casting",
    slug: SLUG,
    category: "ascendant-apex",
    img: IMG,
    description: `
${flavour("Magic in other hands is a negotiation: the right words, the right gestures, the right undisturbed moment. You have dispensed with the formalities. Bound, silenced, mid-fall, or barely conscious, the working arrives exactly as intended and reshapes itself on the way out.")}
${levelBlock("1st Level", ["Your spells lose the manipulate trait.", "You gain Empowered Casting and one other Unbound Spellshape of your choice.", "Once per round, you may use a spellshape as a free action."])}
${levelBlock("3rd Level", ["Your spells lose the concentrate trait.", "Learn another spellshape."])}
${levelBlock("7th Level", ["All your spells are considered subtle.", "Learn another spellshape."])}
${levelBlock("10th Level", ["You may Cast a Spell even while Paralyzed, Stunned, Slowed, or otherwise unable to act, though you must still be conscious.", "Learn another spellshape."])}
${levelBlock("13th Level", ["You may apply two spellshapes to the same spell, rather than one. This limit does not increase.", "Learn another spellshape."])}
${levelBlock("15th Level", ["Your spells remove the incapacitation trait."])}
${levelBlock("20th Level", ["Your spells cannot be dispelled.", "You may use spellshapes as free actions with no frequency limit, except Perfect Quickening, which remains once per turn."])}
<h3>Unbound Spellshapes</h3>
<p><em>These require no additional components, gestures, or words. They have no traits and cannot be identified, counteracted, or prevented.</em></p>
<ul>${SPELLSHAPES.map(([, name, text]) => `<li><strong>${name}</strong> [free action] ${text}</li>`).join("")}</ul>
<hr />
<p><strong>In Foundry:</strong> your spells lose manipulate, lose concentrate from 3rd, gain subtle from 7th and lose incapacitation from 15th, on the spell cards themselves. Empowered Casting is on your Actions tab, and each level that teaches a spellshape asks which one and adds it.</p>
<p>For the table: applying a spellshape's change to the spell you cast (nothing in PF2e alters a spell's targets, area, range, duration or cost from outside it), casting while unable to act from 10th, and the dispel immunity from 20th.</p>
`.trim(),
    rules: [
        alter("remove", "manipulate"),
        alter("remove", "concentrate", [atLeast(3)]),
        alter("add", "subtle", [atLeast(7)]),
        alter("remove", "incapacitation", [atLeast(15)]),
        grantNow(PACK, `${SLUG}-empowered-casting`),
        ...learn("A"),
        ...grants,
    ],
});

export default [unboundCasting, ...spellshapes, ...subFeats];
