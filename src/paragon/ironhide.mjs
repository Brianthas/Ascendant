import { talent } from "../lib/item.mjs";
import { improveSave } from "../lib/degree.mjs";
import { levelChain, atLeast, flavour, levelBlock } from "../lib/grants.mjs";

const PACK = "ascendant-paragon";
const SLUG = "ironhide";
const IMG = "icons/skills/melee/shield-block-gray-orange.webp";

/**
 * Paragon: Ironhide. Every clause is a rule element (`improveSave`,
 * `Resistance all-damage`, and the three immunities), each verified live.
 */
const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "Ironhide",
    img: IMG,
    levels: [
        { level: 5, text: levelBlock("5th Level", ["Immune to Precision damage."]) },
        { level: 10, text: levelBlock("10th Level", ["Immune to Persistent damage."]) },
        { level: 15, text: levelBlock("15th Level", ["Critical hits against you are treated as normal hits."]) },
    ],
});

export const ironhide = talent({
    name: "Ironhide",
    slug: SLUG,
    category: "ascendant-paragon",
    img: IMG,
    description: `
${flavour("Harm reaches you at a discount. What would break another's ribs rearranges yours slightly, poisons thin to a bad taste, and the blow struck perfectly, at the perfect angle, at the perfect moment, lands about as well as any other.")}
${levelBlock("1st Level", ["When you roll a Fortitude save, improve the degree of success by one.", "Resist All equal to 2 + half your level."])}
${levelBlock("5th Level", ["Immune to Precision damage."])}
${levelBlock("10th Level", ["Immune to Persistent damage."])}
${levelBlock("15th Level", ["Critical hits against you are treated as normal hits."])}
<hr />
<p><strong>In Foundry:</strong> every clause applies automatically. Your Fortitude saves are improved one degree on the roll, the resistance to all damage scales with your level, and the three immunities arrive at their levels.</p>
`.trim(),
    rules: [
        improveSave("fortitude"),
        { key: "Resistance", type: "all-damage", value: "2 + floor(@actor.level / 2)" },
        { key: "Immunity", type: "precision", predicate: [atLeast(5)] },
        { key: "Immunity", type: "persistent-damage", predicate: [atLeast(10)] },
        { key: "Immunity", type: "critical-hits", predicate: [atLeast(15)] },
        ...grants,
    ],
});

export default [ironhide, ...subFeats];
