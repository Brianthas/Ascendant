import { talent } from "../lib/item.mjs";
import { improveSave } from "../lib/degree.mjs";
import { byLevel } from "../lib/rules.mjs";
import { levelChain, atLeast, below, flavour, levelBlock } from "../lib/grants.mjs";

const PACK = "ascendant-paragon";
const SLUG = "sovereign-mind";
const IMG = "icons/magic/perception/eye-ringed-glow-angry-small-red.webp";

/**
 * Paragon: Sovereign Mind. Every rule element here was verified live. PF2e's
 * immunity to "incapacitation" is broader than "incapacitation effects that
 * call for a Will save", so the 10th level clause stays with the table.
 *
 * "Resistance 5 to mental damage, increasing by 5 every 4 levels": 5 at 1st,
 * 10 at 5th, 15 at 9th, 20 at 13th, then immunity from 15th.
 */
const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "Sovereign Mind",
    img: IMG,
    levels: [
        { level: 5, text: levelBlock("5th Level", ["Immune to Confused and Stupefied."]) },
        { level: 10, text: levelBlock("10th Level", ["Immune to Incapacitation effects that call for a Will save."]) },
        { level: 15, text: levelBlock("15th Level", ["Immune to mental damage.", "Immune to Emotion effects unless you choose otherwise."]) },
    ],
});

export const sovereignMind = talent({
    name: "Sovereign Mind",
    slug: SLUG,
    category: "ascendant-paragon",
    img: IMG,
    description: `
${flavour("Your thoughts are the one territory that has never been successfully invaded. Compulsions slide off, terrors find no purchase, and the whispered suggestion that would unmake another arrives in your head and is simply declined.")}
${levelBlock("1st Level", ["When you roll a Will save, improve the degree of success by one.", "Resistance 5 to mental damage, increasing by 5 every 4 levels.", "Immune to Controlled and Fascinated."])}
${levelBlock("5th Level", ["Immune to Confused and Stupefied."])}
${levelBlock("10th Level", ["Immune to Incapacitation effects that call for a Will save."])}
${levelBlock("15th Level", ["Immune to mental damage.", "Immune to Emotion effects unless you choose otherwise."])}
<hr />
<p><strong>In Foundry:</strong> the Will improvement, the mental resistance (5 at 1st, 10 at 5th, 15 at 9th, 20 at 13th) and every immunity apply automatically, including immunity to mental damage and emotion effects from 15th.</p>
<p>For the table: the 10th-level immunity to incapacitation effects that call for a Will save. PF2e's immunity type covers every incapacitation effect, including those with Fortitude and Reflex saves, so it is not applied; a note appears on your Will saves instead. To accept an emotion effect from 15th level, switch the immunity off in your effects panel for that roll.</p>
`.trim(),
    rules: [
        improveSave("will"),
        {
            key: "Resistance",
            type: "mental",
            value: byLevel([[1, 5], [5, 10], [9, 15], [13, 20]]),
            predicate: [below(15)],
        },
        { key: "Immunity", type: "controlled" },
        { key: "Immunity", type: "fascinated" },
        { key: "Immunity", type: "confused", predicate: [atLeast(5)] },
        { key: "Immunity", type: "stupefied", predicate: [atLeast(5)] },
        {
            key: "Note",
            selector: "will",
            title: "Sovereign Mind",
            text: "ASCENDANT.Note.SovereignMindIncapacitation",
            predicate: [atLeast(10), "item:trait:incapacitation"],
        },
        { key: "Immunity", type: "mental", predicate: [atLeast(15)] },
        {
            key: "RollOption",
            domain: "all",
            option: "ascendant-sovereign-mind-emotion",
            label: "ASCENDANT.Rules.SovereignMindEmotion",
            toggleable: true,
            value: true,
            predicate: [atLeast(15)],
        },
        { key: "Immunity", type: "emotion", predicate: [atLeast(15), "ascendant-sovereign-mind-emotion"] },
        ...grants,
    ],
});

export default [sovereignMind, ...subFeats];
