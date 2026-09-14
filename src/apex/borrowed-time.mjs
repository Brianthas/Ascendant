import { talent } from "../lib/item.mjs";
import { byLevel } from "../lib/rules.mjs";
import { levelChain, flavour, levelBlock } from "../lib/grants.mjs";

const PACK = "ascendant-apex";
const SLUG = "borrowed-time";
const IMG = "icons/magic/time/hourglass-yellow-green.webp";

/** PF2e's Quickened condition, read off the installed system's packs. */
const QUICKENED = "Compendium.pf2e.conditionitems.Item.nlCjDvLMf2EkV2dl";

/**
 * Apex: Borrowed Time. Quickened is PF2e's own condition, granted with
 * `onDeleteActions: restrict` so it cannot be removed while the talent is held
 * (verified live). The Speed ladder and the two
 * immunities are rule elements. Reactions, flourishes, Hustle and reaction-free
 * movement are not counted or gated by PF2e and stay with the table.
 */
const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "Borrowed Time",
    img: IMG,
    levels: [
        { level: 3, text: levelBlock("3rd Level and Every 3 Levels", ["Gain an extra reaction at the start of your turn: 2 at 3rd, 3 at 6th, 4 at 9th, 5 at 12th, 6 at 15th, 7 at 18th."]) },
        { level: 5, text: levelBlock("5th Level", ["Speed bonus increases to +30 feet."]) },
        { level: 7, text: levelBlock("7th Level", ["One extra flourish action per round, paying its normal action cost."]) },
        { level: 10, text: levelBlock("10th Level", ["Speed bonus increases to +40 feet."]) },
        { level: 13, text: levelBlock("13th Level", ["Any number of flourish actions per round."]) },
        { level: 15, text: levelBlock("15th Level", ["Speed bonus increases to +50 feet."]) },
        { level: 20, text: levelBlock("20th Level", ["Speed bonus increases to +60 feet."]) },
    ],
});

export const borrowedTime = talent({
    name: "Borrowed Time",
    slug: SLUG,
    category: "ascendant-apex",
    img: IMG,
    description: `
${flavour("Time moves around you rather than through you. Where others must choose between the strike and the step, you take both and find a moment left over, and no one, least of all you, can say where that moment came from.")}
${levelBlock("1st Level", [
    "You are Quickened. Use the extra action however you like.",
    "Immune to Slowed, which does not negate your Quickened condition, and immune to Immobilized.",
    "+20 feet to all Speeds.",
    "When you Hustle, multiply your Speed by 10.",
    "Your movement does not trigger reactions when you Stride, Climb, Crawl, Fly, or Swim.",
])}
${levelBlock("3rd Level and Every 3 Levels", ["Gain an extra reaction at the start of your turn: 2 at 3rd, 3 at 6th, 4 at 9th, 5 at 12th, 6 at 15th, 7 at 18th."])}
${levelBlock("5th / 10th / 15th / 20th Level", ["Speed bonus increases to +30, +40, +50, then +60 feet."])}
${levelBlock("7th Level", ["One extra flourish action per round, paying its normal action cost."])}
${levelBlock("13th Level", ["Any number of flourish actions per round."])}
<hr />
<p><strong>In Foundry:</strong> the Quickened condition is on your sheet and cannot be removed while you hold this talent, the Speed increase follows the ladder, and you are immune to Slowed and Immobilized.</p>
<p>For the table: your reactions per turn (2 at 3rd, one more every 3 levels), the extra flourish from 7th and unlimited flourishes from 13th, Hustle at ten times your Speed, and your movement not triggering reactions. PF2e counts none of these.</p>
`.trim(),
    rules: [
        { key: "GrantItem", uuid: QUICKENED, onDeleteActions: { grantee: "restrict" } },
        { key: "Immunity", type: "slowed" },
        { key: "Immunity", type: "immobilized" },
        {
            key: "FlatModifier",
            selector: "all-speeds",
            slug: "ascendant-borrowed-time-speed",
            label: "ASCENDANT.Rules.BorrowedTimeSpeed",
            type: "untyped",
            value: byLevel([[1, 20], [5, 30], [10, 40], [15, 50], [20, 60]]),
        },
        ...grants,
    ],
});

export default [borrowedTime, ...subFeats];
