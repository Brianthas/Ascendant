import { talent } from "../lib/item.mjs";
import { byLevel, FOCUS_MAX_PATH, FOCUS_FLAGS } from "../lib/rules.mjs";
import { levelChain, flavour, levelBlock } from "../lib/grants.mjs";

const PACK = "ascendant-apex";
const SLUG = "inexhaustible-magics";
const IMG = "icons/magic/symbols/rune-sigil-black-pink.webp";

/**
 * Apex: Inexhaustible Magics.
 *
 * Spell slots are stored data on each spellcasting entry that PF2e never
 * derives from level or class (verified by walking a caster from 1st to 20th
 * with no change), and no rule element reaches
 * them: an ActiveEffectLike on `system.slots.slotN.max` and an ItemAlteration
 * were both tried against a real entry and changed nothing. So the tripling
 * is a header button on the sheet, scripts/spell-slots.mjs, which multiplies
 * every entry's stored maxima (cantrips included) and can restore them.
 *
 * The focus pool is an ActiveEffectLike ladder on FOCUS_MAX_PATH, whose last
 * segment resolves from an item flag because PF2e's Migration889 deletes any
 * rule whose path is literally `system.resources.focus.max` when the item is
 * imported from a compendium. The `.cap` beside it lifts PF2e's own ceiling of
 * three.
 *
 * Refocus restoring every point, and the shorter Refocus times, are table-run:
 * PF2e's Refocus restores one point and has no hook.
 */
const POOL = byLevel([[1, 3], [4, 4], [7, 5], [10, 6], [13, 7], [16, 8], [19, 9]]);

const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "Inexhaustible Magics",
    img: IMG,
    levels: [
        { level: 7, text: levelBlock("7th Level", ["Refocus takes 5 minutes."]) },
        { level: 12, text: levelBlock("12th Level", ["Refocus takes 1 minute."]) },
        { level: 17, text: levelBlock("17th Level", ["Refocus takes 1 round."]) },
    ],
});

export const inexhaustibleMagics = talent({
    name: "Inexhaustible Magics",
    slug: SLUG,
    category: "ascendant-apex",
    img: IMG,
    flags: FOCUS_FLAGS,
    description: `
${flavour("Other casters ration. They count what remains, weigh the encounter against the road ahead, and hold something back for whatever comes next. You have never had to learn the habit, and it shows in the careless generosity with which you spend.")}
${levelBlock("1st Level", [
    "Triple the spell slots and cantrips you gain from every spellcasting class or archetype.",
    "Your focus pool is 3 regardless of how many focus spells you have.<ul><li>It increases to 4 at 4th, 5 at 7th, 6 at 10th, 7 at 13th, 8 at 16th, and 9 at 19th level.</li></ul>",
    "Refocus restores all spent Focus Points.",
])}
${levelBlock("7th Level", ["Refocus takes 5 minutes."])}
${levelBlock("12th Level", ["Refocus takes 1 minute."])}
${levelBlock("17th Level", ["Refocus takes 1 round."])}
<hr />
<p><strong>In Foundry:</strong> press <strong>Triple Spell Slots</strong> in your character sheet's header once your spellcasting entries are set up. It multiplies every slot and cantrip maximum by three and can be undone with the same button. Run it again after adding a new spellcasting entry. Your focus pool maximum follows the ladder automatically.</p>
<p>For the table: Refocus restores every Focus Point rather than one, and takes 5 minutes from 7th, 1 minute from 12th and 1 round from 17th. Set your focus points to the maximum by hand after refocusing.</p>
`.trim(),
    rules: [
        { key: "ActiveEffectLike", mode: "upgrade", path: FOCUS_MAX_PATH, value: POOL },
        { key: "ActiveEffectLike", mode: "upgrade", path: "system.resources.focus.cap", value: POOL },
        ...grants,
    ],
});

export default [inexhaustibleMagics, ...subFeats];
