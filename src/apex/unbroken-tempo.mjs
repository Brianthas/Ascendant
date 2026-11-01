import { talent } from "../lib/item.mjs";
import { levelChain, atLeast, below, flavour, levelBlock } from "../lib/grants.mjs";

const PACK = "ascendant-apex";
const SLUG = "unbroken-tempo";
const IMG = "icons/skills/melee/strikes-sword-scimitar.webp";

/**
 * Apex: Unbroken Tempo.
 *
 * PF2e's `calculateMAPs` (pf2e.mjs:20071) starts from -5/-10, or -4/-8 for an
 * agile weapon, adds every MultipleAttackPenalty synthetic whose predicate
 * matches the strike as `{map1: penalty, map2: penalty * 2}`, and keeps the
 * entry with the largest (least negative) map1. So one rule per printed value,
 * plus an agile-predicated one, gives the printed second-attack penalty, and
 * the third attack is double it as in the base rules.
 *
 * A MultipleAttackPenalty rule registers only negative values, so 12th level
 * is an AdjustModifier overriding the `multiple-attack-penalty` modifier to 0
 * (verified live: `override` rather than `suppress`, because the strike path
 * reads the value without checking `ignored`, pf2e.mjs:34294).
 *
 * 15th ("conditions that reduce the number of actions you gain at the start
 * of your turn have no effect on you") is applied as immunity to Slowed and
 * Stunned, the two conditions that do that. Ruling pending: see MANUAL.md.
 * 20th is a Note on a critical hit.
 */
const MAP = [
    { from: 1, to: 3, plain: -4, agile: -3 },
    { from: 3, to: 7, plain: -3, agile: -2 },
    { from: 7, to: 12, plain: -2, agile: -1 },
];

const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "Unbroken Tempo",
    img: IMG,
    levels: [
        { level: 3, text: levelBlock("3rd Level", ["Your multiple attack penalty is -3, or -2 with agile weapons."]) },
        { level: 7, text: levelBlock("7th Level", ["Your multiple attack penalty is -2, or -1 with agile weapons."]) },
        { level: 12, text: levelBlock("12th Level", ["You are no longer subject to the multiple attack penalty."]) },
        { level: 15, text: levelBlock("15th Level", ["Conditions that reduce the number of actions you gain at the start of your turn have no effect on you."]) },
        { level: 20, text: levelBlock("20th Level", ["Once per round, when you critically hit with a Strike, you may immediately make another Strike against the same target with the same weapon as a free action."]) },
    ],
});

export const unbrokenTempo = talent({
    name: "Unbroken Tempo",
    slug: SLUG,
    category: "ascendant-apex",
    img: IMG,
    description: `
${flavour("There is a rhythm to violence, and it is built around the assumption that a fighter must recover between blows. You have never needed the recovery, so the second strike lands as true as the first, and the third as true as the second.")}
${levelBlock("1st Level", ["Your multiple attack penalty is -4, or -3 with agile weapons."])}
${levelBlock("3rd Level", ["Your multiple attack penalty is -3, or -2 with agile weapons."])}
${levelBlock("7th Level", ["Your multiple attack penalty is -2, or -1 with agile weapons."])}
${levelBlock("12th Level", ["You are no longer subject to the multiple attack penalty."])}
${levelBlock("15th Level", ["Conditions that reduce the number of actions you gain at the start of your turn have no effect on you."])}
${levelBlock("20th Level", ["Once per round, when you critically hit with a Strike, you may immediately make another Strike against the same target with the same weapon as a free action."])}
<hr />
<p><strong>In Foundry:</strong> the multiple attack penalty on your Strike buttons is the printed value at every level, doubled for the third attack as in the base rules, and disappears at 12th. From 15th you are immune to Slowed and Stunned, the two conditions that reduce the actions you gain at the start of your turn.</p>
<p>For the table: the free Strike on a critical hit from 20th level. A note on the critical hit reminds you.</p>
`.trim(),
    rules: [
        ...MAP.flatMap(({ from, to, plain, agile }) => [
            {
                key: "MultipleAttackPenalty",
                selector: "strike-attack-roll",
                value: plain,
                predicate: [atLeast(from), below(to)],
            },
            {
                key: "MultipleAttackPenalty",
                selector: "strike-attack-roll",
                value: agile,
                predicate: [atLeast(from), below(to), "item:trait:agile"],
            },
        ]),
        {
            key: "AdjustModifier",
            selector: "all",
            slug: "multiple-attack-penalty",
            mode: "override",
            value: 0,
            predicate: [atLeast(12)],
        },
        { key: "Immunity", type: "slowed", predicate: [atLeast(15)] },
        { key: "Immunity", type: "stunned", predicate: [atLeast(15)] },
        {
            key: "Note",
            selector: "strike-attack-roll",
            title: "Unbroken Tempo",
            text: "ASCENDANT.Note.UnbrokenTempoCritical",
            outcome: ["criticalSuccess"],
            predicate: [atLeast(20)],
        },
        ...grants,
    ],
});

export default [unbrokenTempo, ...subFeats];
