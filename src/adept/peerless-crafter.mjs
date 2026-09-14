import { talent, actionItem } from "../lib/item.mjs";
import { levelChain, grantBetween, atLeast, flavour, levelBlock } from "../lib/grants.mjs";

const PACK = "ascendant-adept";
const SLUG = "peerless-crafter";
const IMG = "icons/tools/smithing/anvil.webp";

/** PF2e's own skill feats, read off the installed system's packs. */
const FEATS = {
    "Alchemical Crafting": "Compendium.pf2e.feats-srd.Item.is3Oz9wt11lNq62K",
    "Magical Crafting": "Compendium.pf2e.feats-srd.Item.xWY5omyIcILNR7y1",
    "Snare Crafting": "Compendium.pf2e.feats-srd.Item.DMetdzt1VJL2Y62i",
};

/**
 * Adept: Peerless Crafter. The three feats are granted as PF2e's own, the
 * 5th-level critical success is an AdjustDegreeOfSuccess on Crafting, and
 * Reforging is an activity on the Actions tab. Everything else is the
 * crafting economy: formulas known, the level cap, workshop-free crafting,
 * material substitution, the 1-day/75% cost, salvage and rune transfer.
 * PF2e's crafting has no rule element reaching any of it, so those are on the
 * text with a note on Crafting checks.
 */
export const reforging = actionItem({
    slug: `${SLUG}-reforging`,
    name: "Reforging",
    actionType: "passive",
    traits: ["downtime", "manipulate"],
    img: IMG,
    frequency: { value: 1, max: 1, per: "day" },
    description: `
<p>Once per day, during a 10-minute rest, convert any item into any other item of equal or lower level that you know the formula for, at no cost. The original item is consumed.</p>
<ul><li>This includes runes, letting you convert one rune directly into another.</li></ul>
<hr />
<p>Delete the original and drag the new item from the compendium; PF2e counts the daily use here.</p>
`.trim(),
});

const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "Peerless Crafter",
    img: IMG,
    levels: [
        { level: 5, text: levelBlock("5th Level", ["When you would succeed at a Crafting check, you critically succeed instead.", "You may Craft without a workshop, using only what you carry.", "You may substitute any raw materials for any others of equal or greater value.", "Crafting an item takes 1 day and costs 75% of the item's Price.<ul><li>This cost is fixed and cannot be reduced by spending additional time.</li></ul>"]) },
        { level: 10, text: levelBlock("10th Level", ["You may Craft during a 10-minute rest.", "Salvaging an item recovers 75% of its value in materials rather than half.", "You may transfer or swap runes during a 10-minute rest at no cost, regardless of the rune's level or your proficiency rank."]) },
        { level: 15, text: levelBlock("15th Level", ["Gain Reforging.<ul><li><strong>Reforging</strong> Once per day, during a 10-minute rest, convert any item into any other item of equal or lower level that you know the formula for, at no cost. The original item is consumed.</li><li>This includes runes, letting you convert one rune directly into another.</li></ul>"]) },
    ],
});

export const peerlessCrafter = talent({
    name: "Peerless Crafter",
    slug: SLUG,
    category: "ascendant-adept",
    img: IMG,
    description: `
${flavour("Given materials, a surface, and a few uninterrupted minutes, there is not much you cannot produce. Your work does not fail, does not require a workshop, and does not much care whether you had the correct components to begin with.")}
${levelBlock("1st Level", ["You gain the Alchemical Crafting, Magical Crafting, and Snare Crafting skill feats.", "You may Craft any item whose level is no greater than your level + 2.", "Each level, you learn formulas equal to your Crafting proficiency rank: 2 Trained, 4 Expert, 6 Master, 8 Legendary."])}
${levelBlock("5th Level", ["When you would succeed at a Crafting check, you critically succeed instead.", "You may Craft without a workshop, using only what you carry.", "You may substitute any raw materials for any others of equal or greater value.", "Crafting an item takes 1 day and costs 75% of the item's Price.<ul><li>This cost is fixed and cannot be reduced by spending additional time.</li></ul>"])}
${levelBlock("10th Level", ["You may Craft during a 10-minute rest.", "Salvaging an item recovers 75% of its value in materials rather than half.", "You may transfer or swap runes during a 10-minute rest at no cost, regardless of the rune's level or your proficiency rank."])}
${levelBlock("15th Level", ["Gain Reforging.<ul><li><strong>Reforging</strong> Once per day, during a 10-minute rest, convert any item into any other item of equal or lower level that you know the formula for, at no cost. The original item is consumed.</li><li>This includes runes, letting you convert one rune directly into another.</li></ul>"])}
<hr />
<p><strong>In Foundry:</strong> the three skill feats are granted, a Crafting success is a critical success from 5th, and Reforging is on your Actions tab from 15th with its daily use counted.</p>
<p>For the table: the crafting economy. The level + 2 cap, formulas learned per level, crafting without a workshop, material substitution, the 1-day time and 75% cost, salvage at 75%, and free rune transfers are all applied when you craft; PF2e's crafting has no rule element for any of them. A note on Crafting checks lists them.</p>
`.trim(),
    rules: [
        ...Object.values(FEATS).map((uuid) => ({ key: "GrantItem", uuid, allowDuplicate: false })),
        {
            key: "AdjustDegreeOfSuccess",
            selector: "crafting",
            adjustment: { success: "one-degree-better" },
            predicate: [atLeast(5)],
        },
        {
            key: "Note",
            selector: "crafting",
            title: "Peerless Crafter",
            text: "ASCENDANT.Note.PeerlessCrafter",
        },
        grantBetween(PACK, `${SLUG}-reforging`, 15),
        ...grants,
    ],
});

export default [peerlessCrafter, reforging, ...subFeats];
