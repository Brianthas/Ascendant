import { talent, idFor, PUBLICATION } from "../lib/item.mjs";
import { byLevel } from "../lib/rules.mjs";
import { levelChain, grantNow, atLeast, flavour, levelBlock } from "../lib/grants.mjs";

const PACK = "ascendant-paragon";
const SLUG = "tireless-aegis";
const SHIELD = "ascendant-tireless-aegis-shield";
const IMG = "icons/equipment/shield/round-wooden-boss-steel-brown.webp";

/** Hardness 5 + 2 per level above 1st; HP 30 + 10 per level above 1st. */
const HARDNESS = byLevel(Array.from({ length: 20 }, (_, i) => [i + 1, 5 + 2 * i]));
const HP = byLevel(Array.from({ length: 20 }, (_, i) => [i + 1, 30 + 10 * i]));

/**
 * Paragon: Tireless Aegis.
 *
 * The Aegis is a real shield item, granted with the talent, so Shield Block
 * works through PF2e's own damage buttons. Its hardness and maximum HP are
 * ItemAlterations on the talent keyed to the owner's level (verified live);
 * PF2e derives the Broken Threshold as half the
 * maximum itself. Reforming when destroyed and the regeneration from 10th are
 * scripts/aegis.mjs on `pf2e.startTurn`, because nothing alters an item's
 * current hit points.
 *
 * "+3 circumstance bonus to AC, permanently active, takes no hands": a
 * FlatModifier on the talent. The shield item carries the same +3, so raising
 * it changes nothing (two circumstance bonuses do not stack) and blocking is
 * still available. Blocking without a reaction, covering every direction, and
 * the reflected damage are on the text.
 */
export const aegisShield = {
    _id: idFor(SHIELD),
    name: "The Aegis",
    type: "shield",
    img: IMG,
    system: {
        description: {
            value: `
<p>A shield that is never lowered. +3 circumstance bonus to AC, permanently active; it takes no hands and functions with weapons in both hands. It cannot be sundered, disarmed, or left behind, and reforms at full Hit Points at the start of your turn if destroyed.</p>
<p>Its <strong>Hardness</strong> is 5 plus 2 per character level above 1st, and its <strong>Hit Points</strong> are 30 plus 10 per character level above 1st, with a Broken Threshold of half that.</p>
<hr />
<p>Hardness and Hit Points follow your level on their own. Shield Block with PF2e's button on a damage card as normal; you do not need to Raise it, the +3 is already on your AC.</p>
`.trim(),
            gm: "",
        },
        publication: PUBLICATION,
        rules: [],
        slug: SHIELD,
        traits: { otherTags: [], value: [], rarity: "unique", integrated: null },
        level: { value: 1 },
        quantity: 1,
        baseItem: null,
        bulk: { value: 0 },
        hp: { value: 30, max: 30 },
        hardness: 5,
        price: { value: {} },
        equipped: { carryType: "held", handsHeld: 1, invested: null },
        containerId: null,
        size: "med",
        material: { type: null, grade: null },
        identification: { status: "identified", unidentified: { data: {}, img: "", name: "" }, misidentified: {} },
        acBonus: 3,
        speedPenalty: 0,
        runes: { reinforcing: 0 },
        specific: null,
        subitems: [],
    },
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags: {},
    _stats: { systemId: "pf2e" },
};

const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "Tireless Aegis",
    img: IMG,
    levels: [
        { level: 5, text: levelBlock("5th Level", ["Once per turn, you may Shield Block without spending a reaction."]) },
        { level: 10, text: levelBlock("10th Level", ["The Aegis gains Regeneration equal to your level."]) },
        { level: 15, text: levelBlock("15th Level", ["The Aegis covers you from every direction. You cannot be flanked, and you gain its bonus against attacks from any source.", "When you Shield Block, the attacker takes damage equal to the amount the Aegis absorbed."]) },
    ],
});

export const tirelessAegis = talent({
    name: "Tireless Aegis",
    slug: SLUG,
    category: "ascendant-paragon",
    img: IMG,
    description: `
${flavour("The shield is not raised, because it was never lowered. It occupies no hand, demands no attention, turns aside what it can and endures what it cannot, and on the rare occasion something manages to shatter it, it is whole again before you have finished being surprised.")}
${levelBlock("1st Level", ["Gain the Aegis: a +3 circumstance bonus to AC, permanently active.", "It takes no hands and functions even with weapons in both hands.", "Hardness 5 + 2 per level above 1st. HP 30 + 10 per level above 1st, with a Broken Threshold of half.", "It cannot be sundered, disarmed, or left behind, and reforms at full Hit Points at the start of your turn if destroyed."])}
${levelBlock("5th Level", ["Once per turn, you may Shield Block without spending a reaction."])}
${levelBlock("10th Level", ["The Aegis gains Regeneration equal to your level."])}
${levelBlock("15th Level", ["The Aegis covers you from every direction. You cannot be flanked, and you gain its bonus against attacks from any source.", "When you Shield Block, the attacker takes damage equal to the amount the Aegis absorbed."])}
<hr />
<p><strong>In Foundry:</strong> the +3 circumstance bonus is on your AC at all times and <em>The Aegis</em> is in your inventory with hardness and Hit Points that follow your level. Shield Block from PF2e's damage-card button; a destroyed Aegis reforms at the start of your turn, and from 10th it regenerates then too. From 15th you cannot be flanked.</p>
<p>For the table: blocking once per turn without a reaction from 5th, and the reflected damage from 15th.</p>
`.trim(),
    rules: [
        grantNow(PACK, SHIELD),
        {
            key: "FlatModifier",
            selector: "ac",
            slug: "ascendant-aegis",
            label: "ASCENDANT.Rules.Aegis",
            type: "circumstance",
            value: 3,
        },
        { key: "ItemAlteration", itemType: "shield", mode: "override", property: "hardness", value: HARDNESS, predicate: [`item:slug:${SHIELD}`] },
        { key: "ItemAlteration", itemType: "shield", mode: "override", property: "hp-max", value: HP, predicate: [`item:slug:${SHIELD}`] },
        { key: "ActiveEffectLike", mode: "override", path: "system.attributes.flanking.flankable", value: false, predicate: [atLeast(15)] },
        {
            key: "Note",
            selector: "ac",
            title: "Tireless Aegis",
            text: "ASCENDANT.Note.AegisBlock",
            predicate: [atLeast(5)],
            visibility: "owner",
        },
        ...grants,
    ],
});

export default [tirelessAegis, aegisShield, ...subFeats];
