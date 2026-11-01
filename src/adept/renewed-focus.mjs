import { talent, actionItem } from "../lib/item.mjs";
import { byLevel, FOCUS_MAX_PATH, FOCUS_FLAGS } from "../lib/rules.mjs";
import { levelChain, grantBetween, atLeast, flavour, levelBlock } from "../lib/grants.mjs";

const PACK = "ascendant-adept";
const SLUG = "renewed-focus";
const IMG = "icons/magic/perception/third-eye-blue-red.webp";

/**
 * Adept: Renewed Focus. The pool increase is an `add` on FOCUS_MAX_PATH with
 * the cap lifted alongside (see Inexhaustible Magics for why the path is a
 * flag). The 5th-level Refocus is a real activity on the Actions tab. Refocus
 * time, restoring every point, and the action and Focus Point discounts from
 * 10th and 15th are table-run: PF2e's Refocus restores one point and has no
 * hook, and nothing alters a focus spell's cost from outside it.
 */
export const refocusActivity = actionItem({
    slug: `${SLUG}-refocus`,
    name: "Refocus (3 actions)",
    actionType: "action",
    actions: 3,
    traits: ["concentrate"],
    img: IMG,
    frequency: { value: 1, max: 1, per: "PT10M" },
    description: `
<p>Once per encounter, you may Refocus as a 3-action activity. It restores all your spent Focus Points.</p>
<hr />
<p>Set your focus points to the maximum on your sheet afterwards. The counter here resets every ten minutes, which PF2e uses as the length of an encounter for frequency purposes.</p>
`.trim(),
});

const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "Renewed Focus",
    img: IMG,
    levels: [
        { level: 5, text: levelBlock("5th Level", ["Your focus pool increases by 1 more.", "Once per encounter, you may Refocus as a 3-action activity."]) },
        { level: 10, text: levelBlock("10th Level", ["Once per round, reduce the action cost of a focus spell by 1.<ul><li>A focus spell that costs 1 action becomes a free action.</li></ul>"]) },
        { level: 15, text: levelBlock("15th Level", ["Once per round, casting a focus spell costs no Focus Points."]) },
    ],
});

export const renewedFocus = talent({
    name: "Renewed Focus",
    slug: SLUG,
    category: "ascendant-adept",
    img: IMG,
    flags: FOCUS_FLAGS,
    description: `
${flavour("The reserve that other practitioners must retreat and rebuild returns to you almost as fast as you spend it. You gather yourself in moments rather than minutes, mid-fight if the fight demands it, and the working that should have cost you dearly costs almost nothing at all.")}
${levelBlock("1st Level", ["Your focus pool increases by 1, exceeding the normal maximum.", "Refocus takes 1 minute instead of 10, and restores all spent Focus Points."])}
${levelBlock("5th Level", ["Your focus pool increases by 1 more.", "Once per encounter, you may Refocus as a 3-action activity."])}
${levelBlock("10th Level", ["Once per round, reduce the action cost of a focus spell by 1.<ul><li>A focus spell that costs 1 action becomes a free action.</li></ul>"])}
${levelBlock("15th Level", ["Once per round, casting a focus spell costs no Focus Points."])}
<hr />
<p><strong>In Foundry:</strong> your focus pool maximum is raised by 1, and by 2 from 5th, past PF2e's usual ceiling of three. The 3-action Refocus is on your Actions tab from 5th.</p>
<p>For the table: Refocus taking 1 minute and restoring every point (set your focus points to the maximum by hand), the once-per-round action discount from 10th, and the free cast from 15th. A note on every focus spell reminds you of the last two.</p>
`.trim(),
    rules: [
        { key: "ActiveEffectLike", mode: "add", path: FOCUS_MAX_PATH, value: byLevel([[1, 1], [5, 2]]) },
        { key: "ActiveEffectLike", mode: "add", path: "system.resources.focus.cap", value: byLevel([[1, 1], [5, 2]]) },
        grantBetween(PACK, `${SLUG}-refocus`, 5),
        {
            key: "Note",
            selector: ["spell-attack", "spell-dc", "spell-damage"],
            title: "Renewed Focus",
            text: "ASCENDANT.Note.RenewedFocusDiscount",
            predicate: [atLeast(10), "item:trait:focus"],
        },
        ...grants,
    ],
});

export default [renewedFocus, refocusActivity, ...subFeats];
