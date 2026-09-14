import { talent } from "../lib/item.mjs";
import { byLevel } from "../lib/rules.mjs";
import { levelChain, atLeast, flavour, levelBlock } from "../lib/grants.mjs";

const PACK = "ascendant-apex";
const SLUG = "deathless";
const IMG = "icons/magic/life/heart-shadow-red.webp";

/** The three deactivating types the rules offer. */
const DEACTIVATORS = ["spirit", "vitality", "void"];

/** Damage types a resistance dial may be set to. Everything PF2e lists except the deactivators, which are excluded by the rules. */
const DAMAGE_TYPES = ["acid", "bludgeoning", "cold", "electricity", "fire", "force", "mental", "piercing", "poison", "slashing", "sonic", "spirit", "vitality", "void"];

const traitLabel = (type) => `PF2E.Trait${type.charAt(0).toUpperCase()}${type.slice(1)}`;

/** Roll option prefix scripts/deathless.mjs reads to learn the deactivating type. Keep the two in step. */
const DEACTIVATOR_OPTION = "ascendant-regen-deactivator";
const DEACTIVATED_OPTION = "ascendant-regen-deactivated";

/**
 * Apex: Deathless.
 *
 * Regeneration is a FastHealing rule of type `regeneration`, one per
 * deactivating type so `deactivatedBy` is a literal (a "{item|flags...}" string
 * there survives into the player-facing line). PF2e never acts on
 * `deactivatedBy`; scripts/deathless.mjs applies an effect setting
 * `ascendant-regen-deactivated` when matching damage lands, and every
 * FastHealing rule predicates on its absence. Both verified live.
 *
 * The two chosen resistances are toggleable RollOptions with the damage types
 * as suboptions, so they can be changed on the sheet at daily preparations. A
 * ChoiceSet asks once at creation and cannot be re-asked. The Resistance rule
 * reads the selection back off the item, the way the Damage Dial's
 * DamageAlteration does (verified live on 8.5.0).
 *
 * The immunities at 7th and 15th are ChoiceSets on those level sub-feats, so
 * the question arrives with the level. That the chosen type must be one of the
 * two resistances and not the deactivator is on the player: a ChoiceSet cannot
 * read another rule's selection.
 *
 * Resist All from 13th applies to the deactivating type too, as the rules say
 * it does; no exception is written.
 *
 * Table-run: "conditions that would reduce by 1 at the end of your turn are
 * removed instead", not eating, drinking, sleeping or breathing, and the 19th
 * level replacement of Unconscious with Slowed 1.
 */
const RESIST_DIAL_A = "ascendant-deathless-resist-a";
const RESIST_DIAL_B = "ascendant-deathless-resist-b";
/** Flag PF2e writes a toggle's suboption to: the option in dromedary case. */
const RESIST_FLAG_A = "{item|flags.system.rulesSelections.ascendantDeathlessResistA}";
const RESIST_FLAG_B = "{item|flags.system.rulesSelections.ascendantDeathlessResistB}";

const RESIST_LADDER = byLevel([[1, 5], [5, 10], [9, 15], [17, 20]]);

const immunityPick = (level, letter) => ({
    key: "ChoiceSet",
    slug: `deathlessImmunity${letter}`,
    rollOption: `ascendant-deathless-immunity-${letter.toLowerCase()}`,
    prompt: "ASCENDANT.Rules.DeathlessImmunityPrompt",
    adjustName: true,
    choices: DAMAGE_TYPES.map((type) => ({ value: type, label: traitLabel(type) })),
});

const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "Deathless",
    img: IMG,
    levels: [
        { level: 5, text: levelBlock("5th Level", ["Chosen resistances increase to 10."]) },
        {
            level: 7,
            text: levelBlock("7th Level", ["Immune to Drained.", "Regeneration increases to three times your level.", "Choose one resistant type and become immune to it."]) +
                "<p><strong>In Foundry:</strong> choose the type when this arrives. It must be one of your two chosen resistances and cannot be your deactivating type.</p>",
            rules: [
                immunityPick(7, "A"),
                { key: "Immunity", type: "{item|flags.pf2e.rulesSelections.deathlessImmunityA}" },
            ],
        },
        { level: 9, text: levelBlock("9th Level", ["Chosen resistances increase to 15."]) },
        { level: 11, text: levelBlock("11th Level", ["Immune to Clumsy and Enfeebled."]) },
        { level: 13, text: levelBlock("13th Level", ["Gain Resist All 5."]) },
        {
            level: 15,
            text: levelBlock("15th Level", ["You no longer need to breathe.", "Choose a second type to become immune to."]) +
                "<p><strong>In Foundry:</strong> choose the type when this arrives. It must be one of your two chosen resistances and cannot be your deactivating type.</p>",
            rules: [
                immunityPick(15, "B"),
                { key: "Immunity", type: "{item|flags.pf2e.rulesSelections.deathlessImmunityB}" },
            ],
        },
        { level: 17, text: levelBlock("17th Level", ["Chosen resistances increase to 20.", "Resist All increases to 10."]) },
        { level: 19, text: levelBlock("19th Level", ["You no longer gain the Unconscious condition at 0 Hit Points unless your regeneration is deactivated. You are instead Slowed 1 until you begin a turn above 0 Hit Points."]) },
    ],
});

export const deathless = talent({
    name: "Deathless",
    slug: SLUG,
    category: "ascendant-apex",
    img: IMG,
    description: `
${flavour("Whatever governs the closing of wounds has decided, in your case, to be generous. Bones knit while the blow that broke them is still landing, and the slow indignities that wear other bodies down: plague, venom, exhaustion, age itself, find nothing in you willing to yield.")}
${levelBlock("1st Level", [
    "Regeneration equal to twice your level.<ul><li>Choose spirit, vitality, or void at character creation. That damage type deactivates it.</li></ul>",
    "Immune to all persistent damage, poison, and disease.",
    "You do not need to eat, drink, or sleep.",
    "Conditions that would reduce by 1 at the end of your turn are removed instead.",
    "Choose two damage types. You gain resistance 5 to each, changeable during daily preparations.",
])}
${levelBlock("5th Level", ["Chosen resistances increase to 10."])}
${levelBlock("7th Level", ["Immune to Drained.", "Regeneration increases to three times your level.", "Choose one resistant type and become immune to it."])}
${levelBlock("9th Level", ["Chosen resistances increase to 15."])}
${levelBlock("11th Level", ["Immune to Clumsy and Enfeebled."])}
${levelBlock("13th Level", ["Gain Resist All 5."])}
${levelBlock("15th Level", ["You no longer need to breathe.", "Choose a second type to become immune to."])}
${levelBlock("17th Level", ["Chosen resistances increase to 20.", "Resist All increases to 10."])}
${levelBlock("19th Level", ["You no longer gain the Unconscious condition at 0 Hit Points unless your regeneration is deactivated. You are instead Slowed 1 until you begin a turn above 0 Hit Points."])}
<p><em>Your regeneration is deactivated when you take at least 1 point of damage of your chosen type, or from an effect bearing a matching trait. Damage absorbed by temporary Hit Points counts. A missed attack, or a save that reduces the damage to 0, does not. You cannot select your deactivating type as one of your chosen resistances or immunities, and no spell, item, or other effect can grant you resistance or immunity to it. Resist All gained from this talent is the sole exception, and applies to your deactivating type normally.</em></p>
<hr />
<p><strong>In Foundry:</strong> choose your deactivating type when you take this talent. Regeneration is offered at the start of each of your turns, and is switched off until the end of your next turn whenever damage of that type, or from an effect with that trait, is applied to you, including damage that temporary Hit Points absorbed. The immunities, the two chosen resistances and Resist All all apply automatically.</p>
<p>Your two resistances are the <em>Deathless Resistance A</em> and <em>B</em> dropdowns in your effects panel. Set them at daily preparations; do not set either to your deactivating type. The immunities at 7th and 15th ask which type when they arrive.</p>
<p>For the table: conditions that would reduce by 1 at the end of your turn are removed instead, you need not eat, drink, sleep or (from 15th) breathe, and from 19th you are Slowed 1 rather than Unconscious at 0 Hit Points while your regeneration is active.</p>
`.trim(),
    rules: [
        {
            key: "ChoiceSet",
            slug: "regenDeactivator",
            rollOption: DEACTIVATOR_OPTION,
            prompt: "ASCENDANT.Rules.DeathlessDeactivatorPrompt",
            adjustName: true,
            choices: DEACTIVATORS.map((type) => ({ value: type, label: traitLabel(type) })),
        },
        // One FastHealing per deactivating type, so `deactivatedBy` is a literal.
        ...DEACTIVATORS.map((type) => ({
            key: "FastHealing",
            type: "regeneration",
            value: byLevel([[1, "@actor.level * 2"], [7, "@actor.level * 3"]]),
            deactivatedBy: [type],
            predicate: [`${DEACTIVATOR_OPTION}:${type}`, { not: DEACTIVATED_OPTION }],
        })),
        { key: "Immunity", type: "persistent-damage" },
        { key: "Immunity", type: "poison" },
        { key: "Immunity", type: "disease" },
        { key: "Immunity", type: "drained", predicate: [atLeast(7)] },
        { key: "Immunity", type: "clumsy", predicate: [atLeast(11)] },
        { key: "Immunity", type: "enfeebled", predicate: [atLeast(11)] },
        // The two chosen resistances, as dials.
        ...[
            [RESIST_DIAL_A, RESIST_FLAG_A, "ASCENDANT.Rules.DeathlessResistA"],
            [RESIST_DIAL_B, RESIST_FLAG_B, "ASCENDANT.Rules.DeathlessResistB"],
        ].flatMap(([option, flag, label]) => [
            {
                key: "RollOption",
                domain: "all",
                option,
                label,
                toggleable: true,
                value: true,
                suboptions: DAMAGE_TYPES.map((type) => ({ value: type, label: traitLabel(type) })),
            },
            { key: "Resistance", type: flag, value: RESIST_LADDER, predicate: [option] },
        ]),
        { key: "Resistance", type: "all-damage", value: byLevel([[13, 5], [17, 10]]), predicate: [atLeast(13)] },
        {
            key: "Note",
            selector: "saving-throw",
            title: "Deathless",
            text: "ASCENDANT.Note.DeathlessUnconscious",
            predicate: [atLeast(19), "self:hp:0"],
            visibility: "owner",
        },
        ...grants,
    ],
});

export default [deathless, ...subFeats];
