import { talent, actionItem } from "../lib/item.mjs";
import { levelChain, grantNow, atLeast, flavour, levelBlock } from "../lib/grants.mjs";

const PACK = "ascendant-adept";
const SLUG = "shape-of-harm";
const IMG = "icons/commodities/tech/dial-meter-gauge-blue.webp";

/**
 * The roll option the dial sets, and the item flag PF2e derives from it.
 *
 * A toggleable RollOption with suboptions writes the chosen suboption's value
 * to `flags.pf2e.rulesSelections.<option in dromedary case>`, so
 * `ascendant-shape-of-harm` becomes `ascendantShapeOfHarm`. Both names are kept
 * together here and in scripts/damage-dial.mjs; changing one without the other
 * silently stops the alterations resolving.
 */
export const DIAL_OPTION = "ascendant-shape-of-harm";
const DIAL_FLAG = "{item|flags.system.rulesSelections.ascendantShapeOfHarm}";
const GROUP_OPTION = "ascendant-shape-of-harm-group";

const GROUPS = {
    physical: ["bludgeoning", "piercing", "slashing"],
    elemental: ["acid", "cold", "electricity", "fire", "sonic"],
    esoteric: ["force", "mental", "poison", "spirit", "vitality", "void"],
};

const traitLabel = (type) => `PF2E.Trait${type.charAt(0).toUpperCase()}${type.slice(1)}`;

/** Damage domains the attunement reaches: weapon strikes, spells and impulses. */
const DOMAINS = ["strike-damage", "spell-damage", "elemental-blast-damage"];

/**
 * Adept: Shape of Harm. A toggleable RollOption with suboptions and a
 * DamageAlteration overriding the damage type from the selection, verified
 * live on 8.5.0 (a longsword rolling 1d8 slashing rolled 1d8 fire after
 * `rule.toggle(true, "fire")`); PF2e's own Oscillating Wave uses the same
 * construction. The group
 * chosen at 1st is a ChoiceSet; each suboption is predicated on the groups the
 * character has reached, so the dropdown only offers what the rules allow at
 * that level.
 *
 * The physical types counting as cold iron or silver, and adamantine from
 * 5th, are AdjustStrike material additions on every Strike while a physical
 * type is attuned. That adds both cold iron and silver where the rules offer a
 * choice of one; nothing reads the choice, so both are listed and the player
 * uses the one they picked.
 *
 * Changing the attunement when rolling initiative (10th) is a free action the
 * player takes; attuning to two types at once (15th) has no representation and
 * is on the text.
 */
const suboption = (type, predicate) => ({ value: type, label: traitLabel(type), predicate });

const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "Shape of Harm",
    img: IMG,
    levels: [
        { level: 5, text: levelBlock("5th Level", ["You gain access to the other of those two groups.", "Physical types you choose also count as adamantine."]) },
        { level: 10, text: levelBlock("10th Level", ["You gain access to the esoteric group: force, mental, poison, spirit, vitality, and void.", "You may also change your attunement as a free action when you roll initiative."]) },
        { level: 15, text: levelBlock("15th Level", ["You may attune to two types at once from any group.", "Your attacks count as both types for overcoming resistances, weaknesses, and immunities, and deal damage as whichever of the two is more effective against the target."]) },
    ],
});

export const attune = actionItem({
    slug: `${SLUG}-attune`,
    name: "Attune",
    actionType: "free",
    frequency: { value: 1, max: 1, per: "round" },
    img: IMG,
    description: `
<p>Attune to a single damage type within a group you have access to. Your Strikes, spells and impulses deal that type instead of their normal type until you change it.</p>
<hr />
<p>Pick a type on the card this posts. Only the groups you have reached are offered.</p>
`.trim(),
});

export const release = actionItem({
    slug: `${SLUG}-release`,
    name: "Release Attunement",
    actionType: "free",
    img: IMG,
    description: `<p>Your Strikes, spells and impulses return to their normal damage types.</p><hr /><p>Press the button on the card this posts.</p>`,
});

export const shapeOfHarm = talent({
    name: "Shape of Harm",
    slug: SLUG,
    category: "ascendant-adept",
    img: IMG,
    description: `
${flavour("You have stopped thinking of damage as a fixed property of the thing you are holding. Cold, flame, iron, the awful weight of the void: these are settings rather than limitations, adjusted between one breath and the next to suit whatever is in front of you.")}
${levelBlock("1st Level", ["Choose one group permanently: physical (bludgeoning, piercing, slashing) or elemental (acid, cold, electricity, fire, sonic).", "As a free action once per round, attune to any single damage type within that group. Your Strikes, spells, and impulses deal that type instead of their normal type until you change it.", "Physical types you choose also count as cold iron or silver, your choice."])}
${levelBlock("5th Level", ["You gain access to the other of those two groups.", "Physical types you choose also count as adamantine."])}
${levelBlock("10th Level", ["You gain access to the esoteric group: force, mental, poison, spirit, vitality, and void.", "You may also change your attunement as a free action when you roll initiative."])}
${levelBlock("15th Level", ["You may attune to two types at once from any group.", "Your attacks count as both types for overcoming resistances, weaknesses, and immunities, and deal damage as whichever of the two is more effective against the target."])}
<hr />
<p><strong>In Foundry:</strong> choose your group when you take this talent. Use <strong>Attune</strong> from your Actions tab and pick a type on the card it posts; your Strikes, spells and elemental blasts deal that type until you <strong>Release</strong> it. The <em>Shape of Harm</em> dropdown in your effects panel does the same. While a physical type is attuned your Strikes count as cold iron and silver (use the one you chose), and adamantine from 5th.</p>
<p>For the table: the two-type attunement from 15th. Attune to the type you expect to matter and apply the other by hand when it would do more.</p>
`.trim(),
    rules: [
        {
            key: "ChoiceSet",
            slug: "shapeOfHarmGroup",
            rollOption: GROUP_OPTION,
            prompt: "ASCENDANT.Rules.ShapeOfHarmGroupPrompt",
            adjustName: true,
            choices: [
                { value: "physical", label: "ASCENDANT.Rules.ShapeOfHarmPhysical" },
                { value: "elemental", label: "ASCENDANT.Rules.ShapeOfHarmElemental" },
            ],
        },
        {
            key: "RollOption",
            domain: "all",
            option: DIAL_OPTION,
            label: "ASCENDANT.Rules.ShapeOfHarm",
            toggleable: true,
            suboptions: [
                ...GROUPS.physical.map((t) => suboption(t, [{ or: [`${GROUP_OPTION}:physical`, atLeast(5)] }])),
                ...GROUPS.elemental.map((t) => suboption(t, [{ or: [`${GROUP_OPTION}:elemental`, atLeast(5)] }])),
                ...GROUPS.esoteric.map((t) => suboption(t, [atLeast(10)])),
            ],
        },
        ...DOMAINS.map((selector) => ({
            key: "DamageAlteration",
            selectors: [selector],
            mode: "override",
            property: "damage-type",
            value: DIAL_FLAG,
            predicate: [DIAL_OPTION],
        })),
        ...["cold-iron", "silver"].map((material) => ({
            key: "AdjustStrike",
            mode: "add",
            property: "materials",
            definition: [],
            value: material,
            predicate: [{ or: GROUPS.physical.map((t) => `${DIAL_OPTION}:${t}`) }],
        })),
        {
            key: "AdjustStrike",
            mode: "add",
            property: "materials",
            definition: [],
            value: "adamantine",
            predicate: [atLeast(5), { or: GROUPS.physical.map((t) => `${DIAL_OPTION}:${t}`) }],
        },
        grantNow(PACK, `${SLUG}-attune`),
        grantNow(PACK, `${SLUG}-release`),
        ...grants,
    ],
});

export default [shapeOfHarm, attune, release, ...subFeats];
