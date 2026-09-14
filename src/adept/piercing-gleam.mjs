import { talent, effectItem, uuidFor } from "../lib/item.mjs";
import { byLevel } from "../lib/rules.mjs";
import { levelChain, atLeast, flavour, levelBlock } from "../lib/grants.mjs";

const PACK = "ascendant-adept";
const SLUG = "piercing-gleam";
const IMG = "icons/magic/light/beam-rays-yellow.webp";
const TOGGLE = "ascendant-piercing-gleam";
const LIGHT = "ascendant-piercing-gleam-light";
const EFFECT = `${SLUG}-effect`;

/** 20 feet, plus 5 more for every even level. */
const RADIUS = byLevel(Array.from({ length: 20 }, (_, i) => [i + 1, 20 + 5 * Math.floor((i + 1) / 2)]));

/**
 * Adept: Piercing Gleam. A toggled Aura handing allies an effect, and a
 * TokenLight for the light itself, both verified live. The effect carries what the rules
 * grant everyone inside: the +2 status bonus against illusion, emotion and
 * mental effects, immunity to visual illusions from 5th, truesight from 5th
 * (PF2e's sense for seeing through illusions, morphs and polymorphs), and the
 * degree improvement from 10th against effects that would make you
 * Fascinated, Confused or Controlled. A spell's conditions are not roll
 * options, so that one is behind a toggle on the effect (Bryan's ruling,
 * 2026-09-14): the ally switches it on for a save against such an effect.
 *
 * The level-scaled rules on the effect read `@actor.level` off the ally, so
 * they are keyed to the aura owner's level instead by shipping the aura in
 * level bands: one Aura rule per band, each pointing at an effect built for
 * that band. Three bands cover 1st to 4th, 5th to 9th, and 10th and up.
 *
 * "Sheds actual light" is a second toggle driving the TokenLight. Seeing as
 * though in bright light regardless of conditions is what darkvision does in
 * PF2e and is granted the same way. The 15th-level invisibility to enemies
 * and automatic successes are on the text.
 */
const BANDS = [
    { from: 1, to: 5, key: "1" },
    { from: 5, to: 10, key: "5" },
    { from: 10, to: 21, key: "10" },
];

const saveBonus = {
    key: "FlatModifier",
    selector: "saving-throw",
    slug: "ascendant-piercing-gleam",
    label: "ASCENDANT.Rules.PiercingGleam",
    type: "status",
    value: 2,
    predicate: [{ or: ["item:trait:illusion", "item:trait:emotion", "item:trait:mental"] }],
};

const effects = BANDS.map(({ key, from }) =>
    effectItem({
        slug: `${EFFECT}-${key}`,
        name: `Piercing Gleam${from > 1 ? ` (${from}th+)` : ""}`,
        img: IMG,
        traits: ["light"],
        showIcon: false,
        description: `
<p>You are inside a <strong>Piercing Gleam</strong> aura. You see as though in bright light regardless of actual conditions, and gain a +2 status bonus to saves against illusion, emotion and mental effects.</p>
${from >= 5 ? "<p>You see through illusions, morphs and polymorphs, perceiving things as they truly are, and are immune to visual illusion effects. This never reveals an ally who wishes to remain hidden, and never helps an enemy see through anything.</p>" : ""}
${from >= 10 ? "<p>Creatures inside the aura cannot be Concealed, Hidden or Undetected from you. Your saves against effects that would make you Fascinated, Confused or Controlled are one degree better: switch <em>Piercing Gleam: mind save</em> on in your effects panel before such a save, and off after.</p>" : ""}
<hr />
<p>This effect arrives and leaves with the aura. It does not need removing by hand.</p>
`.trim(),
        rules: [
            { key: "Sense", selector: "darkvision" },
            saveBonus,
            ...(from >= 5
                ? [
                    { key: "Sense", selector: "truesight", acuity: "precise" },
                    { key: "Immunity", type: "visual", exceptions: [], definition: ["item:trait:illusion"] },
                ]
                : []),
            ...(from >= 10
                ? [
                    { key: "RollOption", domain: "saving-throw", option: "ascendant-gleam-mind-save", label: "ASCENDANT.Rules.PiercingGleamMindSave", toggleable: true, value: false },
                    {
                        key: "AdjustDegreeOfSuccess",
                        selector: "saving-throw",
                        adjustment: { criticalFailure: "one-degree-better", failure: "one-degree-better", success: "one-degree-better" },
                        predicate: ["ascendant-gleam-mind-save"],
                    },
                ]
                : []),
        ],
    }),
);

const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "Piercing Gleam",
    img: IMG,
    levels: [
        { level: 5, text: levelBlock("5th Level", ["You and your allies within the aura see through illusions, morphs, and polymorphs, perceiving things as they truly are.", "You and your allies within it are immune to visual illusion effects.<ul><li>This never reveals an ally who wishes to remain hidden, and never helps an enemy see through anything.</li></ul>"]) },
        { level: 10, text: levelBlock("10th Level", ["Creatures within your aura cannot be Concealed, Hidden, or Undetected from you or your allies.", "You and your allies in the aura improve your degree of success by one on saves against effects that would make you Fascinated, Confused, or Controlled."]) },
        { level: 15, text: levelBlock("15th Level", ["Your aura is imperceptible to enemies. They gain no benefit from its light and cannot tell it exists.", "You and your allies within it automatically succeed at saves against illusion and mental effects of a rank equal to or lower than half your level."]) },
    ],
});

export const piercingGleam = talent({
    name: "Piercing Gleam",
    slug: SLUG,
    category: "ascendant-adept",
    img: IMG,
    description: `
${flavour("A clarity radiates from you that does not much care what the light is doing. Illusions come apart, the hidden are simply standing there, and the lie meant to take root in a companion's mind arrives to find the ground already turned.")}
${levelBlock("1st Level", [
    "As a free action, activate or deactivate an aura with a radius of 20 feet + 5 feet per even level.",
    "Within it, you and your allies see as though in bright light regardless of actual conditions.",
    "You and your allies within it gain a +2 status bonus to saves against illusion, emotion, and mental effects.",
    "When you activate the aura, you may choose whether it sheds actual light.<ul><li>If it does, it illuminates the area as bright light and creatures affected by sunlight are affected normally.</li></ul>",
])}
${levelBlock("5th Level", ["You and your allies within the aura see through illusions, morphs, and polymorphs, perceiving things as they truly are.", "You and your allies within it are immune to visual illusion effects.<ul><li>This never reveals an ally who wishes to remain hidden, and never helps an enemy see through anything.</li></ul>"])}
${levelBlock("10th Level", ["Creatures within your aura cannot be Concealed, Hidden, or Undetected from you or your allies.", "You and your allies in the aura improve your degree of success by one on saves against effects that would make you Fascinated, Confused, or Controlled."])}
${levelBlock("15th Level", ["Your aura is imperceptible to enemies. They gain no benefit from its light and cannot tell it exists.", "You and your allies within it automatically succeed at saves against illusion and mental effects of a rank equal to or lower than half your level."])}
<hr />
<p><strong>In Foundry:</strong> switch <em>Piercing Gleam</em> on in your effects panel. Everyone on your side inside the radius receives the aura's effect: darkvision (seeing as in bright light), the +2 status bonus, and from 5th truesight and immunity to visual illusions. Switch <em>Piercing Gleam: Light</em> on as well to shed real light.</p>
<p>For the table: the 10th-level degree improvement is a toggle on the aura's effect that each ally switches on for a save against an effect that would Fascinate, Confuse or Control them; concealment inside the aura from 10th; and from 15th the aura being invisible to enemies and the automatic successes against low-rank illusion and mental effects.</p>
`.trim(),
    rules: [
        { key: "RollOption", domain: "all", option: TOGGLE, label: "ASCENDANT.Rules.PiercingGleamToggle", toggleable: true, value: false },
        { key: "RollOption", domain: "all", option: LIGHT, label: "ASCENDANT.Rules.PiercingGleamLight", toggleable: true, value: false },
        ...BANDS.map(({ from, to, key }) => ({
            key: "Aura",
            slug: `${SLUG}-${key}`,
            radius: RADIUS,
            traits: ["light"],
            effects: [{ uuid: uuidFor(PACK, `${EFFECT}-${key}`), affects: "allies", events: ["enter"], removeOnExit: true, includesSelf: true }],
            appearance: { border: { color: "#f5e26b", alpha: 0.75 }, highlight: { color: "#f5e26b", alpha: 0.2 } },
            predicate: [TOGGLE, atLeast(from), { lt: ["self:level", to] }],
        })),
        { key: "TokenLight", value: { bright: RADIUS, dim: RADIUS }, predicate: [TOGGLE, LIGHT] },
        ...grants,
    ],
});

export default [piercingGleam, ...effects, ...subFeats];
