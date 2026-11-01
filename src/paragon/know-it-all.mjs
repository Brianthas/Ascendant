import { talent } from "../lib/item.mjs";
import { byLevel, RANK_VALUE } from "../lib/rules.mjs";
import { levelChain, flavour, levelBlock } from "../lib/grants.mjs";

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
 * (verified live), Trained at 1st, Expert at 2nd, Master at 7th, Legendary at
 * 15th. Universal Lore is an `override` write of a whole `system.skills` entry,
 * the construction PF2e's own Bardic Lore uses; the actor keeps an entry whose
 * key is slug-shaped and carries a label, and marks it a Lore because the key
 * is not a core skill (pf2e.mjs:34487). It climbs the same ladder. The two
 * skill feats per level are a feat group added to the character's sheet by
 * scripts/skill-feats.mjs. "You do not gain skill increases", the Lore DC and
 * the free Recall Knowledge are on the table.
 */
const LADDER = byLevel([
    [1, RANK_VALUE.trained],
    [2, RANK_VALUE.expert],
    [7, RANK_VALUE.master],
    [15, RANK_VALUE.legendary],
]);

const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "Know-It-All",
    img: IMG,
    levels: [
        { level: 2, text: levelBlock("2nd Level", ["Expert in all non-Lore skills and Universal Lore."]) },
        { level: 5, text: levelBlock("5th Level", ["Once per turn, you may Recall Knowledge as a free action."]) },
        { level: 7, text: levelBlock("7th Level", ["Master in all non-Lore skills and Universal Lore."]) },
        { level: 15, text: levelBlock("15th Level", ["Legendary in all non-Lore skills and Universal Lore."]) },
    ],
});

export const knowItAll = talent({
    name: "Know-It-All",
    slug: SLUG,
    category: "ascendant-paragon",
    img: IMG,
    description: `
${flavour("There is no subject on which you lack an opinion, and irritatingly, you are usually right. Locks, languages, lineages, poisons, the tensile strength of a rope bridge: you have read about all of it, and you will explain it now whether or not anyone asked.")}
${levelBlock("1st Level", ["You do not gain skill increases. Instead you are Trained in all non-Lore skills.", "You are Trained in Universal Lore, a Lore skill that can be used only to Recall Knowledge, but on any topic. It counts as an applicable Lore for Recall Knowledge DCs.", "You gain two extra skill feats every level."])}
${levelBlock("2nd Level", ["Expert in all non-Lore skills and Universal Lore."])}
${levelBlock("5th Level", ["Once per turn, you may Recall Knowledge as a free action."])}
${levelBlock("7th Level", ["Master in all non-Lore skills and Universal Lore."])}
${levelBlock("15th Level", ["Legendary in all non-Lore skills and Universal Lore."])}
<hr />
<p><strong>In Foundry:</strong> every non-Lore skill is at least Trained, Expert from 2nd, Master from 7th and Legendary from 15th. Universal Lore appears among your Lore skills, Intelligence-based, on the same ranks. A <em>Know-It-All</em> feat group with two skill feat slots per level appears on your Feats tab.</p>
<p>For the table: do not spend your class's skill increases. Use Universal Lore only to Recall Knowledge; against a creature, the GM picks one of the two applicable Lore DCs on its sheet. Recall Knowledge as a free action once per turn from 5th.</p>
`.trim(),
    rules: [
        ...SKILLS.map((skill) => ({
            key: "ActiveEffectLike",
            mode: "upgrade",
            path: `system.skills.${skill}.rank`,
            value: LADDER,
        })),
        {
            key: "ActiveEffectLike",
            mode: "override",
            path: "system.skills.universal-lore",
            value: { attribute: "int", label: "Universal Lore", rank: LADDER },
        },
        ...grants,
    ],
});

export default [knowItAll, ...subFeats];
