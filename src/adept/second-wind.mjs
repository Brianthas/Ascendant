import { talent, effectItem } from "../lib/item.mjs";
import { levelChain, flavour, levelBlock } from "../lib/grants.mjs";

const PACK = "ascendant-adept";
const SLUG = "second-wind";
const IMG = "icons/magic/life/heart-glowing-red.webp";

/**
 * Adept: Second Wind. The trigger is scripts/second-wind.mjs, wrapping
 * `applyDamage`: when damage leaves a Second Wind character at 0 Hit Points
 * and an encounter use remains, it sets them to half maximum, and applies the
 * effects below at the levels they arrive. Uses per encounter are counted on
 * a flag keyed by the combat.
 */
export const secondWindRegen = effectItem({
    slug: `${SLUG}-regeneration`,
    name: "Second Wind: Regeneration",
    img: IMG,
    duration: { value: 1, unit: "minutes", sustained: false, expiry: "turn-start" },
    description: `<p>Regeneration 5 for 1 minute, from Second Wind at 5th level.</p>`,
    rules: [{ key: "FastHealing", type: "regeneration", value: 5 }],
});

export const secondWindSurge = effectItem({
    slug: `${SLUG}-surge`,
    name: "Second Wind: Surge",
    img: IMG,
    duration: { value: 1, unit: "rounds", sustained: false, expiry: "turn-end" },
    description: `<p>+2 status bonus to attack rolls and saves until the end of your next turn, from Second Wind at 15th level.</p>`,
    rules: [
        { key: "FlatModifier", selector: "attack-roll", slug: `${SLUG}-surge`, label: "ASCENDANT.Rules.SecondWindSurge", type: "status", value: 2 },
        { key: "FlatModifier", selector: "saving-throw", slug: `${SLUG}-surge`, label: "ASCENDANT.Rules.SecondWindSurge", type: "status", value: 2 },
    ],
});

const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "Second Wind",
    img: IMG,
    levels: [
        { level: 5, text: levelBlock("5th Level", ["When this triggers, you also gain regeneration 5 for 1 minute.", "You do not increase your Wounded value."]) },
        { level: 10, text: levelBlock("10th Level", ["You may use Second Wind twice per encounter."]) },
        { level: 15, text: levelBlock("15th Level", ["When this triggers, you also reduce your Doomed value by 1.", "You gain a +2 status bonus to attack rolls and saves until the end of your next turn."]) },
    ],
});

export const secondWind = talent({
    name: "Second Wind",
    slug: SLUG,
    category: "ascendant-adept",
    img: IMG,
    description: `
${flavour("The blow lands, the world goes briefly white, and something in you objects. You are back on your feet before anyone has finished deciding you were down, with a great deal more left in you than the situation warranted.")}
${levelBlock("1st Level", ["Once per encounter, when you are reduced to 0 Hit Points, you immediately regain Hit Points equal to half your maximum and are not knocked unconscious.<ul><li>This triggers even against damage that would normally kill you outright.</li></ul>"])}
${levelBlock("5th Level", ["When this triggers, you also gain regeneration 5 for 1 minute.", "You do not increase your Wounded value."])}
${levelBlock("10th Level", ["You may use Second Wind twice per encounter."])}
${levelBlock("15th Level", ["When this triggers, you also reduce your Doomed value by 1.", "You gain a +2 status bonus to attack rolls and saves until the end of your next turn."])}
<hr />
<p><strong>In Foundry:</strong> when damage applied through a chat card leaves you at 0 Hit Points during an encounter, you are set to half your maximum and a message says so. From 5th the regeneration effect is applied with it, and from 15th the surge. Uses are counted per combat: one, or two from 10th.</p>
<p>For the table: damage applied by editing the sheet by hand does not trigger it; the Doomed reduction from 15th; and any use outside a tracked combat.</p>
`.trim(),
    rules: [...grants],
});

export default [secondWind, secondWindRegen, secondWindSurge, ...subFeats];
