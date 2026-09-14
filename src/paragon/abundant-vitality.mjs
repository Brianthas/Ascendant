import { talent } from "../lib/item.mjs";
import { levelChain, atLeast, flavour, levelBlock } from "../lib/grants.mjs";

const PACK = "ascendant-paragon";
const SLUG = "abundant-vitality";
const IMG = "icons/magic/life/heart-cross-strong-flame-purple-orange.webp";

const SPELL_RANK = "@actor.system.proficiencies.spellcasting.rank";
const MEDICINE_RANK = "@actor.system.skills.medicine.rank";

/**
 * Paragon: Abundant Vitality.
 *
 * Healing spells roll in the `spell-healing` domain (PF2e's own Healing Hands
 * targets `["spell-damage", "spell-healing"]`, read off the installed feats
 * pack), so the bonus is a FlatModifier there. Its value is four times the
 * higher of the spellcasting and Medicine ranks (Trained 1 through Legendary 4
 * give +4 through +16), plus 4 more when the spellcasting rank is Mythic,
 * which the Spellcasting Expertise track reaches at 15th; Mythic is an
 * override of the proficiency modifier and leaves the stored rank at 4, so
 * it is tested by the track and level.
 *
 * Treat Wounds and Battle Medicine build their healing inside the action and
 * roll in no domain, so the Medicine half is a note on those checks. Extra
 * targets, including yourself, doubled durations, free Sustains and the
 * composition changes are spell targeting and cost, which no rule element
 * reaches; they are on the text with a note on healing and buff spells.
 */
const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "Abundant Vitality",
    img: IMG,
    levels: [
        { level: 5, text: levelBlock("5th Level", ["When you Cast a Spell that targets a single willing creature, you may include yourself as an additional target at no cost."]) },
        { level: 10, text: levelBlock("10th Level", ["Beneficial spells you cast with a duration of 1 minute or less last twice as long.", "Sustaining a spell is a free action once per round.", "Compositions you cast last 1 minute rather than until the end of your next turn, and once per round you may cast a composition as a free action.<ul><li>This does not stack with other effects that reduce the action cost of focus spells.</li></ul>"]) },
        { level: 15, text: levelBlock("15th Level", ["When you Cast a Spell that targets willing creatures, you may target any number of willing creatures within range."]) },
    ],
});

export const abundantVitality = talent({
    name: "Abundant Vitality",
    slug: SLUG,
    category: "ascendant-paragon",
    img: IMG,
    description: `
${flavour("What you give, you give in quantities that embarrass more careful healers. A wound you close stays closed, a blessing meant for one settles over two, and the party has learned to stop asking whether you have enough left for them.")}
${levelBlock("1st Level", ["When you restore Hit Points to a creature, whether through a spell or through Medicine, restore an additional amount based on your spell proficiency rank or your Medicine proficiency rank, whichever is higher: +4 Trained, +8 Expert, +12 Master, +16 Legendary, +20 Mythic.", "When you Cast a Spell that targets a single willing creature other than yourself, you may target a second willing creature within range at no additional cost."])}
${levelBlock("5th Level", ["When you Cast a Spell that targets a single willing creature, you may include yourself as an additional target at no cost."])}
${levelBlock("10th Level", ["Beneficial spells you cast with a duration of 1 minute or less last twice as long.", "Sustaining a spell is a free action once per round.", "Compositions you cast last 1 minute rather than until the end of your next turn, and once per round you may cast a composition as a free action.<ul><li>This does not stack with other effects that reduce the action cost of focus spells.</li></ul>"])}
${levelBlock("15th Level", ["When you Cast a Spell that targets willing creatures, you may target any number of willing creatures within range."])}
<hr />
<p><strong>In Foundry:</strong> every healing spell you cast adds the bonus for your rank to its roll.</p>
<p>For the table: the same bonus on Treat Wounds and Battle Medicine (a note on those checks reminds you), the extra targets, the doubled durations, the free Sustain and the composition changes.</p>
`.trim(),
    rules: [
        {
            key: "FlatModifier",
            selector: "spell-healing",
            slug: `${SLUG}-healing`,
            label: "ASCENDANT.Rules.AbundantVitality",
            type: "untyped",
            value: `4 * max(${SPELL_RANK}, ${MEDICINE_RANK})`,
        },
        {
            key: "FlatModifier",
            selector: "spell-healing",
            slug: `${SLUG}-healing-mythic`,
            label: "ASCENDANT.Rules.AbundantVitalityMythic",
            type: "untyped",
            value: 4,
            predicate: ["feat:spellcasting-expertise", atLeast(15)],
        },
        {
            key: "Note",
            selector: "medicine",
            title: "Abundant Vitality",
            text: "ASCENDANT.Note.AbundantVitalityMedicine",
            predicate: [{ or: ["action:treat-wounds", "action:battle-medicine"] }],
        },
        {
            key: "Note",
            selector: ["spell-healing", "spell-dc"],
            title: "Abundant Vitality",
            text: "ASCENDANT.Note.AbundantVitalityTargets",
        },
        ...grants,
    ],
});

export default [abundantVitality, ...subFeats];
