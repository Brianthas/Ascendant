import { talent, actionItem } from "../lib/item.mjs";
import { levelChain, grantNow, grantBetween, atLeast, flavour, levelBlock } from "../lib/grants.mjs";

const PACK = "ascendant-paragon";
const SLUG = "flicker-step";
const IMG = "icons/magic/movement/trail-streak-zigzag-teal.webp";

/**
 * Paragon: Flicker Step. Each activity is a real `action` item granted at
 * its level (verified live), and the range is
 * on the item text. Flicker as a free action from 10th is a second entry with
 * a per-round frequency PF2e counts. The 15th-level Will save against an
 * unwilling passenger is rolled at the table; a note on the free-action entry
 * and on Flicker Strike's Strike reminds you.
 */
const RANGES = "100 feet at 1st, 250 at 5th, 500 at 10th and one mile at 15th";

const activity = (slug, name, extra) =>
    actionItem({ slug: `${SLUG}-${slug}`, name, img: IMG, traits: ["concentrate", "teleportation"], ...extra });

export const flicker = activity("flicker", "Flicker", {
    actionType: "action",
    actions: 1,
    description: `
<p>Teleport up to 100 feet to a space you can see or have seen. You do not need line of effect, only knowledge of the destination. Your arrival does not trigger reactions.</p>
<p>You may bring up to four willing creatures within your reach with you, placing them in spaces adjacent to your arrival.</p>
<ul>
<li>5th: range 250 feet.</li>
<li>10th: range 500 feet. You no longer need knowledge of your destination; you may specify a direction and distance instead. As you pass through, you perceive the destination. If it cannot hold you, the GM tells you before you commit, and you may redirect or abort without spending the action.</li>
<li>15th: range one mile. You may bring one creature within your reach against its will. It attempts a Will save against your Class DC or Spell DC, whichever is higher. On a failure it is teleported with you and is Off-Guard until the end of your next turn.</li>
</ul>
<hr />
<p>The range is ${RANGES}.</p>
`.trim(),
});

export const flickerFree = activity("flicker-free", "Flicker (Free Action)", {
    actionType: "free",
    frequency: { value: 1, max: 1, per: "round" },
    description: `
<p>From 10th level, Flicker is a free action once per round. Everything else about it is the same as the single-action entry, which you keep for a second use in a round.</p>
<hr />
<p>PF2e counts the use here; the number beside this entry is how many you have left this round.</p>
`.trim(),
});

export const flickerStrike = activity("flicker-strike", "Flicker Strike", {
    actionType: "action",
    actions: 1,
    description: `
<p>Flicker, then Strike.</p>
<hr />
<p>Roll the Strike from your Actions tab. The range is ${RANGES}.</p>
`.trim(),
});

const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "Flicker Step",
    img: IMG,
    levels: [
        { level: 5, text: levelBlock("5th Level", ["Gain Flicker Strike.<ul><li><strong>Flicker Strike</strong> [1 action] (concentrate, teleportation) Flicker, then Strike.</li></ul>", "Range increases to 250 feet."]) },
        { level: 10, text: levelBlock("10th Level", ["Range increases to 500 feet.", "Flicker is a free action once per round.", "You no longer need knowledge of your destination; you may specify a direction and distance instead.<ul><li>As you pass through, you perceive the destination. If it cannot hold you, the GM tells you before you commit, and you may redirect or abort without spending the action.</li></ul>"]) },
        { level: 15, text: levelBlock("15th Level", ["Range increases to one mile.", "When you Flicker, you may bring one creature within your reach against its will. It attempts a Will save against your Class DC or Spell DC, whichever is higher.<ul><li>On a failure it is teleported with you and is Off-Guard until the end of your next turn.</li></ul>"]) },
    ],
});

export const flickerStep = talent({
    name: "Flicker Step",
    slug: SLUG,
    category: "ascendant-paragon",
    img: IMG,
    description: `
${flavour("Distance has become a formality you observe only when convenient. You step out of one place and into another without troubling the space between, and those who travel with you have grown used to arriving somewhere they did not walk to.")}
${levelBlock("1st Level", ["Gain Flicker.<ul><li><strong>Flicker</strong> [1 action] (concentrate, teleportation) Teleport up to 100 feet to a space you can see or have seen. You do not need line of effect, only knowledge of the destination. Your arrival does not trigger reactions.</li></ul>", "You may bring up to four willing creatures within your reach with you, placing them in spaces adjacent to your arrival."])}
${levelBlock("5th Level", ["Gain Flicker Strike.<ul><li><strong>Flicker Strike</strong> [1 action] (concentrate, teleportation) Flicker, then Strike.</li></ul>", "Range increases to 250 feet."])}
${levelBlock("10th Level", ["Range increases to 500 feet.", "Flicker is a free action once per round.", "You no longer need knowledge of your destination; you may specify a direction and distance instead.<ul><li>As you pass through, you perceive the destination. If it cannot hold you, the GM tells you before you commit, and you may redirect or abort without spending the action.</li></ul>"])}
${levelBlock("15th Level", ["Range increases to one mile.", "When you Flicker, you may bring one creature within your reach against its will. It attempts a Will save against your Class DC or Spell DC, whichever is higher.<ul><li>On a failure it is teleported with you and is Off-Guard until the end of your next turn.</li></ul>"])}
<hr />
<p><strong>In Foundry:</strong> Flicker is on your Actions tab from 1st, Flicker Strike from 5th, and a free-action Flicker with a per-round counter from 10th. Each entry states the range for your level. Press <strong>Use</strong> on one, or the <strong>Choose destination</strong> button on its chat card, and a ring shows your range on the map: click a square inside it and your token teleports there, with a puff of smoke at each end. Until 10th the square must be one your token can see; from 10th any square in range will do. To bring allies, <strong>target</strong> them before you pick: up to four targeted creatures within your reach come with you, keeping their places around you. Reach is your own, so a talent that extends it (Grasping Reach) widens who can come. The 15th-level unwilling passenger and its Will save are yours to run.</p>
<p>For the table: the teleport itself (move the tokens), passengers, and the 15th-level Will save against an unwilling one.</p>
`.trim(),
    rules: [
        grantNow(PACK, `${SLUG}-flicker`),
        grantBetween(PACK, `${SLUG}-flicker-strike`, 5),
        grantBetween(PACK, `${SLUG}-flicker-free`, 10),
        {
            key: "Note",
            selector: "strike-attack-roll",
            title: "Flicker Step",
            text: "ASCENDANT.Note.FlickerStepUnwilling",
            predicate: [atLeast(15), "action:ascendant-flicker-step-flicker-strike"],
        },
        ...grants,
    ],
});

export default [flickerStep, flicker, flickerFree, flickerStrike, ...subFeats];
