import { talent, effectItem, idFor, PUBLICATION } from "../lib/item.mjs";
import { FOCUS_MAX_PATH, FOCUS_FLAGS } from "../lib/rules.mjs";
import { levelChain, grantNow, atLeast, flavour, levelBlock } from "../lib/grants.mjs";

const PACK = "ascendant-apex";
const SLUG = "lifeline";
const IMG = "icons/magic/life/heart-shadow-red.webp";
const SPELL = `${SLUG}-vital-bond`;
const BOND_EFFECT = `${SLUG}-bonded`;

const SPELL_RANK = "@actor.system.proficiencies.spellcasting.rank";

/**
 * Vital Bond, as a focus spell. Modelled on PF2e's own Lay on Hands
 * (spells-srd, read off the installed packs) with the healing overlay
 * removed: it has no roll, only a duration and targets.
 */
export const vitalBond = {
    _id: idFor(SPELL),
    name: "Vital Bond",
    type: "spell",
    img: IMG,
    system: {
        area: null,
        cost: { value: "" },
        counteraction: false,
        damage: {},
        defense: null,
        description: {
            value: `
<p>While a target is bonded, whenever it would take damage you may take any amount of that damage yourself instead. This requires no action and has no frequency limit.</p>
<ul>
<li>Damage taken this way applies your own immunities, resistances, and weaknesses rather than the target's.</li>
<li>The bond is suspended while a target is further than 60 feet from you, and ends entirely if you fall unconscious.</li>
</ul>
<p>From 5th level, bonded allies gain your resistances and immunities while within the bond's range. From 10th, the range is 120 feet, a spell you cast on a single creature that does not heal, damage or impose a condition affects every bonded ally too, and a 2-action healing spell on a single bonded ally costs 1 action and ignores range. From 15th, you may take a condition a bonded ally would gain, and bonded allies cannot be reduced below 1 Hit Point while you are conscious and above 0.</p>
<hr />
<p>Apply <em>Lifeline: Bonded</em> to each ally you bond. When one takes damage, reduce the number applied to them and apply the rest to yourself.</p>
`.trim(),
            gm: "",
        },
        duration: { sustained: false, value: "until your next daily preparations" },
        level: { value: 1 },
        overlays: {},
        publication: PUBLICATION,
        range: { value: "60 feet" },
        requirements: "",
        rules: [],
        target: { value: "any number of allies" },
        time: { value: "1" },
        traits: { rarity: "unique", traditions: [], value: ["concentrate", "focus"] },
        slug: SPELL,
    },
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags: {},
    _stats: { systemId: "pf2e" },
};

export const bondedEffect = effectItem({
    slug: BOND_EFFECT,
    name: "Lifeline: Bonded",
    img: IMG,
    duration: { value: 1, unit: "days", sustained: false, expiry: "turn-start" },
    description: `<p>You are bonded to a Lifeline character. Whenever you would take damage, they may take any amount of it instead. The bond is suspended while you are more than 60 feet from them (120 from their 10th level) and ends if they fall unconscious.</p>`,
});

/**
 * Apex: Lifeline. The healing bonus is a FlatModifier in the `spell-healing`
 * domain (where PF2e's own Healing Hands adds dice), twice the proficiency
 * bonus: four times the stored rank (Trained 1 to Legendary 4), plus 4 when
 * the rank is Mythic, which the Spellcasting Expertise track reaches at 15th
 * and which leaves the stored rank at 4. The focus pool gains 1 on
 * FOCUS_MAX_PATH. Vital Bond is a real focus spell with a marker effect for
 * bonded allies; the damage redirection, the shared resistances, the range,
 * the shared spells, the condition transfer and the 20th-level restoration
 * all act on other actors and are on the text.
 */
const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "Lifeline",
    img: IMG,
    levels: [
        { level: 5, text: levelBlock("5th Level", ["Bonded allies gain your resistances and immunities while within the bond's range."]) },
        { level: 10, text: levelBlock("10th Level", ["The bond's range increases to 120 feet.", "When you Cast a Spell that targets a single creature and does not restore Hit Points, deal damage, or impose a condition, every bonded ally gains its effects as well.", "A 2-action spell restoring Hit Points to a single bonded ally costs 1 action instead and ignores the spell's normal range."]) },
        { level: 15, text: levelBlock("15th Level", ["When a bonded ally would gain a condition, you may gain it yourself instead.", "Bonded allies cannot be reduced below 1 Hit Point while you are conscious and above 0 Hit Points."]) },
        { level: 20, text: levelBlock("20th Level", ["Once per day, as a free action, restore every ally within 60 feet to full Hit Points and remove all conditions from them."]) },
    ],
});

export const lifeline = talent({
    name: "Lifeline",
    slug: SLUG,
    category: "ascendant-apex",
    img: IMG,
    flags: FOCUS_FLAGS,
    description: `
${flavour("You have tied your life to theirs with something that cannot be cut from the outside. Their wounds arrive in your body, their afflictions find your veins, and every protection you raise for yourself settles over all of them at once, which works splendidly until you fall.")}
${levelBlock("1st Level", ["You gain the Vital Bond focus spell, and add 1 to your maximum focus pool as normal.", "When you restore Hit Points, add twice your spell proficiency bonus to each target: +4 Trained, +8 Expert, +12 Master, +16 Legendary, +20 Mythic.", "You may restore Hit Points at a range of 60 feet regardless of a spell's normal range."])}
<p><strong>Vital Bond</strong> [1 action] (concentrate, focus) <strong>Range</strong> 60 feet; <strong>Targets</strong> any number of allies; <strong>Duration</strong> until your next daily preparations.</p>
<ul>
<li>While a target is bonded, whenever it would take damage you may take any amount of that damage yourself instead. This requires no action and has no frequency limit.</li>
<li>Damage taken this way applies your own immunities, resistances, and weaknesses rather than the target's.</li>
<li>The bond is suspended while a target is further than 60 feet from you, and ends entirely if you fall unconscious.</li>
</ul>
${levelBlock("5th Level", ["Bonded allies gain your resistances and immunities while within the bond's range."])}
${levelBlock("10th Level", ["The bond's range increases to 120 feet.", "When you Cast a Spell that targets a single creature and does not restore Hit Points, deal damage, or impose a condition, every bonded ally gains its effects as well.", "A 2-action spell restoring Hit Points to a single bonded ally costs 1 action instead and ignores the spell's normal range."])}
${levelBlock("15th Level", ["When a bonded ally would gain a condition, you may gain it yourself instead.", "Bonded allies cannot be reduced below 1 Hit Point while you are conscious and above 0 Hit Points."])}
${levelBlock("20th Level", ["Once per day, as a free action, restore every ally within 60 feet to full Hit Points and remove all conditions from them."])}
<hr />
<p><strong>In Foundry:</strong> Vital Bond is added to your sheet (move it into a focus spellcasting entry) and your focus pool maximum rises by 1. Every healing spell you cast adds the bonus for your rank to its roll. Apply <em>Lifeline: Bonded</em> to each bonded ally as a reminder.</p>
<p>For the table: everything the bond does. Taking an ally's damage, the shared resistances from 5th, the shared spells and the range from 10th, the condition transfer and the floor of 1 Hit Point from 15th, and the daily restoration from 20th all reach other actors, where no rule element from your sheet can act.</p>
`.trim(),
    rules: [
        { key: "ActiveEffectLike", mode: "add", path: FOCUS_MAX_PATH, value: 1 },
        { key: "ActiveEffectLike", mode: "add", path: "system.resources.focus.cap", value: 1 },
        grantNow(PACK, SPELL),
        {
            key: "FlatModifier",
            selector: "spell-healing",
            slug: `${SLUG}-healing`,
            label: "ASCENDANT.Rules.Lifeline",
            type: "untyped",
            value: `4 * ${SPELL_RANK}`,
        },
        {
            key: "FlatModifier",
            selector: "spell-healing",
            slug: `${SLUG}-healing-mythic`,
            label: "ASCENDANT.Rules.LifelineMythic",
            type: "untyped",
            value: 4,
            predicate: ["feat:spellcasting-expertise", atLeast(15)],
        },
        {
            key: "Note",
            selector: "spell-healing",
            title: "Lifeline",
            text: "ASCENDANT.Note.LifelineRange",
        },
        ...grants,
    ],
});

export default [lifeline, vitalBond, bondedEffect, ...subFeats];
