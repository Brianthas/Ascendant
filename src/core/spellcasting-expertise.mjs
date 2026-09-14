import { talent, uuidFor, GRANT_TAG } from "../lib/item.mjs";
import { proficiencyLadder, spellDamageBonus } from "../lib/rules.mjs";
import { enhancedDefense, ENHANCED_DEFENSE_TEXT } from "./enhanced-defense.mjs";

const PACK = "ascendant-core";
const SLUG = "spellcasting-expertise";
const IMG = "icons/magic/symbols/runes-star-pentagon-blue.webp";

/**
 * Spellcasting Expertise (Expertise Track).
 *
 * The ladder writes `system.proficiencies.spellcasting.rank`, which every spell
 * attack and DC reads whatever the tradition, source or entry: innate, focus and
 * item spells included. Mythic at 15th is `mythic()` on `spell-attack` and
 * `spell-dc`.
 *
 * The two damage riders are `spellDamageBonus()`: the attribute half is six
 * FlatModifiers keyed on the `spellcasting:attribute:<a>` roll option the
 * casting entry puts on every spell (so it follows the entry that cast it), the
 * proficiency half is one untyped modifier on the rank ladder. Both are per
 * creature because `spell-damage` is rolled once per spell and applied to each
 * target. "If a spell damages the same creature in multiple instances, total
 * that damage first, then add the modifier once": a spell with two damage
 * instances still adds each rider once, because PF2e adds flat modifiers to the
 * roll, not to each instance.
 */
const LEVELS = [
    { level: 5, text: "Your spell attack and spell DC proficiency becomes <strong>Master</strong>." },
    { level: 10, text: "Your spell attack and spell DC proficiency becomes <strong>Legendary</strong>." },
    { level: 15, text: "Your spell attack and spell DC proficiency becomes <strong>Mythic</strong>, a proficiency bonus equal to your level + 10." },
];

const subFeats = LEVELS.map(({ level, text }) =>
    talent({
        name: `Spellcasting Expertise (${level}th)`,
        slug: `${SLUG}-${level}`,
        category: "ascendant-grant",
        otherTags: [GRANT_TAG],
        level,
        img: IMG,
        description: `<p><strong>${level}th Level</strong></p><ul><li>${text}</li></ul><p>Granted automatically by Spellcasting Expertise at ${level}th level. The rank change is applied by the track itself; this feat records that it has arrived.</p>`,
    }),
);

export const spellcastingExpertise = talent({
    name: "Spellcasting Expertise",
    slug: SLUG,
    category: "ascendant-core",
    img: IMG,
    description: `
<p><em>Expertise Track. Applies to spell attack rolls and spell DCs for all spells you can cast, from any tradition or source, including innate spells, focus spells, and spells cast from items.</em></p>
<p><strong>1st Level</strong></p>
<ul>
<li>Your proficiency rank is Expert.</li>
<li>Add a damage bonus to each creature damaged by your spells equal to your proficiency rank.</li>
<li>Add your spellcasting attribute modifier to the damage your spells deal to each creature.
<ul>
<li>If a spell damages the same creature in multiple instances, total that damage first, then add the modifier once.</li>
<li>For basic saving throws, both bonuses count as part of the spell's basic damage.</li>
</ul></li>
</ul>
<p><strong>5th / 10th / 15th Level</strong></p>
<ul>
<li>Master, then Legendary, then Mythic.</li>
</ul>
${ENHANCED_DEFENSE_TEXT}
<h3>Mythic Proficiency</h3>
<p>Mythic is a new proficiency rank found only through this ruleset, granting a proficiency bonus equal to your level + 10.</p>
<hr />
<p><strong>In Foundry:</strong> your spell attack and DC are at least Expert from 1st, Master from 5th and Legendary from 10th, and read <strong>Mythic</strong> from 15th, worth your level + 10. Both damage riders (4/6/8/10 for the rank, plus your spellcasting attribute) are added to every damaging spell's roll automatically and follow whichever spellcasting entry cast the spell. Enhanced Defense applies automatically.</p>
`.trim(),
    rules: [
        ...proficiencyLadder({
            path: "system.proficiencies.spellcasting.rank",
            selectors: ["spell-attack", "spell-dc"],
            expert: 1,
            master: 5,
            legendary: 10,
            mythicLevel: 15,
            slug: SLUG,
        }),
        ...spellDamageBonus({ slug: SLUG, ranks: { expert: 1, master: 5, legendary: 10, mythic: 15 } }),
        enhancedDefense,
        ...LEVELS.map(({ level }) => ({
            key: "GrantItem",
            uuid: uuidFor(PACK, `${SLUG}-${level}`),
            allowDuplicate: false,
            reevaluateOnUpdate: true,
            predicate: [{ gte: ["self:level", level] }],
        })),
    ],
});

export default [spellcastingExpertise, ...subFeats];
