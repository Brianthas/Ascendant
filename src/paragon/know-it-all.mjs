import { talent } from "../lib/item.mjs";
import { byLevel, RANK_VALUE } from "../lib/rules.mjs";
import { levelChain, atLeast, flavour, levelBlock } from "../lib/grants.mjs";

const PACK = "ascendant-paragon";
const SLUG = "know-it-all";
const IMG = "icons/sundries/books/book-open-purple.webp";

/** PF2e's sixteen non-Lore skills, by the slug the rank paths use. */
const SKILLS = [
    "acrobatics", "arcana", "athletics", "crafting", "deception", "diplomacy", "intimidation", "medicine",
    "nature", "occultism", "performance", "religion", "society", "stealth", "survival", "thievery",
];

/**
 * Paragon: Know-It-All. Sixteen `upgrade` writes on `system.skills.<slug>.rank`
 * (verified live), Expert at 1st, Master at
 * 7th, Legendary at 15th. The two skill feats per level are a feat group
 * added to the character's sheet by scripts/skill-feats.mjs. Recall Knowledge
 * as a free action, and the success-to-critical from 5th, are an
 * AdjustDegreeOfSuccess on Recall Knowledge checks plus a note. "You do not
 * gain Skill Increases" and the background Lore ranks are on the player.
 */
const LADDER = byLevel([[1, RANK_VALUE.expert], [7, RANK_VALUE.master], [15, RANK_VALUE.legendary]]);

const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "Know-It-All",
    img: IMG,
    levels: [
        { level: 5, text: levelBlock("5th Level", ["Once per turn, you may Recall Knowledge as a free action.", "When you Recall Knowledge, treat a success as a critical success."]) },
        { level: 7, text: levelBlock("7th Level", ["Master in all non-Lore skills."]) },
        { level: 15, text: levelBlock("15th Level", ["Legendary in all non-Lore skills."]) },
    ],
});

export const knowItAll = talent({
    name: "Know-It-All",
    slug: SLUG,
    category: "ascendant-paragon",
    img: IMG,
    description: `
${flavour("There is no subject on which you lack an opinion, and irritatingly, you are usually right. Locks, languages, lineages, poisons, the tensile strength of a rope bridge: you have read about all of it, and you will explain it now whether or not anyone asked.")}
${levelBlock("1st Level", ["You do not gain Skill Increases. Instead you are Expert in all non-Lore skills.<ul><li>Lore skills from your background match these ranks.</li></ul>", "You gain two extra Skill Feats every level."])}
${levelBlock("5th Level", ["Once per turn, you may Recall Knowledge as a free action.", "When you Recall Knowledge, treat a success as a critical success."])}
${levelBlock("7th Level", ["Master in all non-Lore skills."])}
${levelBlock("15th Level", ["Legendary in all non-Lore skills."])}
<hr />
<p><strong>In Foundry:</strong> every non-Lore skill is at least Expert, Master from 7th and Legendary from 15th. A <em>Know-It-All</em> feat group with two skill feat slots per level appears on your Feats tab. From 5th a Recall Knowledge success is a critical success on the roll.</p>
<p>For the table: do not spend your class's skill increases; raise your background Lore skills to match by hand; and Recall Knowledge as a free action once per turn.</p>
`.trim(),
    rules: [
        ...SKILLS.map((skill) => ({
            key: "ActiveEffectLike",
            mode: "upgrade",
            path: `system.skills.${skill}.rank`,
            value: LADDER,
        })),
        {
            key: "AdjustDegreeOfSuccess",
            selector: "skill-check",
            adjustment: { success: "one-degree-better" },
            predicate: [atLeast(5), "action:recall-knowledge"],
        },
        ...grants,
    ],
});

export default [knowItAll, ...subFeats];
