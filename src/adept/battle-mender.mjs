import { talent, actionItem } from "../lib/item.mjs";
import { levelChain, grantBetween, atLeast, flavour, levelBlock } from "../lib/grants.mjs";

const PACK = "ascendant-adept";
const SLUG = "battle-mender";
const IMG = "icons/magic/life/cross-worn-green.webp";

/**
 * Adept: Battle Mender. The critical-failure removal is an
 * AdjustDegreeOfSuccess on Medicine checks carrying the Treat Wounds or
 * Battle Medicine action option. The daily-limit removal is
 * scripts/battle-mender.mjs, which deletes PF2e's "Effect: Battle Medicine
 * Immunity" whenever a Battle Mender is its source. The 15th-level revival is
 * a daily activity on the Actions tab. Range, the 1-minute Treat Wounds, and
 * the 10th-level Wounded reduction and condition removal are on the text and
 * on a note under every Medicine check.
 */
export const mendersLastWord = actionItem({
    slug: `${SLUG}-revive`,
    name: "Mender's Last Word",
    actionType: "action",
    actions: 3,
    traits: ["healing", "manipulate"],
    img: IMG,
    frequency: { value: 1, max: 1, per: "day" },
    description: `<p>Once per day, you may return a creature that died within the last minute to life at 1 Hit Point.</p><hr /><p>PF2e counts the daily use here. Set the creature's Hit Points to 1 and remove Dying and Unconscious.</p>`,
});

const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "Battle Mender",
    img: IMG,
    levels: [
        { level: 5, text: levelBlock("5th Level", ["You may administer Battle Medicine or First Aid at a range of 30 feet.", "Treat Wounds takes 1 minute rather than 10."]) },
        { level: 10, text: levelBlock("10th Level", ["When you restore Hit Points by Treating Wounds or administering Battle Medicine, also reduce the target's Wounded value by 1 and remove one condition of your choice."]) },
        { level: 15, text: levelBlock("15th Level", ["Once per day, you may return a creature that died within the last minute to life at 1 Hit Point."]) },
    ],
});

export const battleMender = talent({
    name: "Battle Mender",
    slug: SLUG,
    category: "ascendant-adept",
    img: IMG,
    description: `
${flavour("You work with steady hands in conditions that would make a surgeon weep. Wounds close under fire, poisons come out at a distance, and the ally you reached in time tends not to remember how close it was, which suits you, since you do.")}
${levelBlock("1st Level", ["Battle Medicine has no daily limit per target.", "You cannot critically fail a check to Treat Wounds or administer Battle Medicine."])}
${levelBlock("5th Level", ["You may administer Battle Medicine or First Aid at a range of 30 feet.", "Treat Wounds takes 1 minute rather than 10."])}
${levelBlock("10th Level", ["When you restore Hit Points by Treating Wounds or administering Battle Medicine, also reduce the target's Wounded value by 1 and remove one condition of your choice."])}
${levelBlock("15th Level", ["Once per day, you may return a creature that died within the last minute to life at 1 Hit Point."])}
<hr />
<p><strong>In Foundry:</strong> a critical failure on Treat Wounds or Battle Medicine is a failure on the roll, and PF2e's Battle Medicine immunity effect is removed from your patients as it is applied, so the daily limit never bites. Mender's Last Word is on your Actions tab from 15th.</p>
<p>For the table: the 30-foot range and 1-minute Treat Wounds from 5th, and the Wounded reduction and condition removal from 10th. A note under every Medicine check reminds you.</p>
`.trim(),
    rules: [
        {
            key: "AdjustDegreeOfSuccess",
            selector: "medicine",
            adjustment: { criticalFailure: "one-degree-better" },
            predicate: [{ or: ["action:treat-wounds", "action:battle-medicine"] }],
        },
        {
            key: "Note",
            selector: "medicine",
            title: "Battle Mender",
            text: "ASCENDANT.Note.BattleMender",
            predicate: [atLeast(5), { or: ["action:treat-wounds", "action:battle-medicine", "action:administer-first-aid"] }],
        },
        grantBetween(PACK, `${SLUG}-revive`, 15),
        ...grants,
    ],
});

export default [battleMender, mendersLastWord, ...subFeats];
