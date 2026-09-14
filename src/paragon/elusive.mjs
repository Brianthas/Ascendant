import { talent } from "../lib/item.mjs";
import { improveSave } from "../lib/degree.mjs";
import { levelChain, atLeast, flavour, levelBlock } from "../lib/grants.mjs";

const PACK = "ascendant-paragon";
const SLUG = "elusive";
const IMG = "icons/skills/movement/feet-winged-boots-brown.webp";

/**
 * Paragon: Elusive. The Reflex improvement, the speed ladder and the three
 * condition immunities are rule elements, verified live. Difficult terrain,
 * reaction-free movement and the 10th-level extra
 * move action have no hook in PF2e and stay with the table.
 *
 * "+5 feet to all Speeds, increasing by another 5 feet every 3 levels": 5 at
 * 1st, 10 at 4th, 15 at 7th, and so on to 35 at 19th.
 */
const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "Elusive",
    img: IMG,
    levels: [
        { level: 5, text: levelBlock("5th Level", ["Move normally through difficult terrain.", "Immune to Immobilized."]) },
        {
            level: 10,
            text: levelBlock("10th Level", [
                "At the start of your turn, gain an extra action usable only for actions with the move trait.<ul><li>When you are Slowed, this extra action is lost first, and the Slowed value is reduced by 1 for determining how many of your remaining actions you lose.</li></ul>",
                "Move normally through greater difficult terrain.",
                "Immune to Restrained.",
            ]),
        },
        { level: 15, text: levelBlock("15th Level", ["Immune to Slowed."]) },
    ],
});

export const elusive = talent({
    name: "Elusive",
    slug: SLUG,
    category: "ascendant-paragon",
    img: IMG,
    description: `
${flavour("You are, as a rule, not where the danger arrived expecting you. Blasts find the space you occupied a moment ago, grasping hands close on nothing, and the ground itself seems to decline to slow you down.")}
${levelBlock("1st Level", ["When you roll a Reflex save, improve the degree of success by one.", "+5 feet to all Speeds, increasing by another 5 feet every 3 levels.", "Your Move actions do not trigger reactions."])}
${levelBlock("5th Level", ["Move normally through difficult terrain.", "Immune to Immobilized."])}
${levelBlock("10th Level", ["At the start of your turn, gain an extra action usable only for actions with the move trait.<ul><li>When you are Slowed, this extra action is lost first, and the Slowed value is reduced by 1 for determining how many of your remaining actions you lose.</li></ul>", "Move normally through greater difficult terrain.", "Immune to Restrained."])}
${levelBlock("15th Level", ["Immune to Slowed."])}
<hr />
<p><strong>In Foundry:</strong> the Reflex improvement, the Speed increase (5 feet at 1st, another 5 at 4th, 7th, 10th, 13th, 16th and 19th) and the three immunities apply automatically.</p>
<p>For the table: your Move actions not triggering reactions, moving normally through difficult and greater difficult terrain, and the extra move-only action from 10th level. PF2e has no hook for any of the three.</p>
`.trim(),
    rules: [
        improveSave("reflex"),
        {
            key: "FlatModifier",
            selector: "all-speeds",
            slug: "ascendant-elusive-speed",
            label: "ASCENDANT.Rules.ElusiveSpeed",
            type: "untyped",
            value: "5 + 5 * floor((@actor.level - 1) / 3)",
        },
        { key: "Immunity", type: "immobilized", predicate: [atLeast(5)] },
        { key: "Immunity", type: "restrained", predicate: [atLeast(10)] },
        { key: "Immunity", type: "slowed", predicate: [atLeast(15)] },
        ...grants,
    ],
});

export default [elusive, ...subFeats];
