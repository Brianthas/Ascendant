import { talent, effectItem, uuidFor } from "../lib/item.mjs";
import { levelChain, atLeast, flavour, levelBlock } from "../lib/grants.mjs";

const PACK = "ascendant-apex";
const SLUG = "elemental-embodiment";
const IMG = "icons/creatures/magical/spirit-fire-orange.webp";
const CONVERT = "ascendant-elemental-convert";
const ELEMENT_OPTION = "ascendant-element";
const AURA_EFFECT = `${SLUG}-aura`;

/**
 * The six elements: their damage type, the property gained at 1st, and the
 * rider from 13th, quoted from the table.
 */
const ELEMENTS = [
    { value: "fire", label: "PF2E.TraitFire", damage: "fire", property: null, rider: "Persistent fire damage equal to your level" },
    { value: "water", label: "PF2E.TraitWater", damage: "cold", property: null, rider: "Slowed 1 until the end of their next turn" },
    { value: "air", label: "PF2E.TraitAir", damage: "electricity", property: null, rider: "Damage chains to one other creature within 15 feet" },
    { value: "earth", label: "PF2E.TraitEarth", damage: "bludgeoning", property: "You cannot be moved, pushed, pulled, or knocked Prone against your will", rider: "Speeds reduced by 10 feet and cannot Fly or Leap, until the end of your next turn" },
    { value: "metal", label: "ASCENDANT.Rules.ElementMetalSlashing", damage: "slashing", property: "Counts as cold iron, dawnsilver, or adamantine, your choice", rider: "Resistances and hardness halved until the end of your next turn" },
    { value: "metal-piercing", label: "ASCENDANT.Rules.ElementMetalPiercing", damage: "piercing", property: "Counts as cold iron, dawnsilver, or adamantine, your choice", rider: "Resistances and hardness halved until the end of your next turn", table: false },
    { value: "wood", label: "PF2E.TraitWood", damage: "bludgeoning", property: "Strikes gain grapple and trip; on a hit you may Grapple or Trip as a free action", rider: "Immobilized until they Escape, and you restore Hit Points equal to the damage dealt, once per turn" },
];

const DOMAINS = ["strike-damage", "spell-damage", "elemental-blast-damage"];

/**
 * Apex: Elemental Embodiment.
 *
 * The element is a ChoiceSet whose selection every other rule reads. Metal's
 * "slashing or piercing" is a permanent choice made with the element (Bryan's
 * ruling, 2026-09-14), so Metal is two entries in the one ChoiceSet rather
 * than a second ChoiceSet gated on the first: an unresolved ChoiceSet disables
 * every rule on its item.
 *
 * Immunity to the element's type reads the flag directly. Damage conversion
 * is a toggle driving a DamageAlteration on every damage domain (the same
 * construction PF2e's Oscillating Wave uses). Unarmed Strikes' element damage
 * and reach: one DamageDice per die size the unarmed Strike could have,
 * predicated on the Strike's own `item:damage:die:dN` option, of the same size
 * (or d6 where smaller), plus an AdjustStrike adding reach to unarmed Strikes.
 * Weapon Strikes: the same per-die construction on weapons.
 *
 * Earth's property is immunity to Prone and a note; Metal's materials are
 * AdjustStrike additions; Wood's grapple and trip are trait additions. Touch
 * damage from 5th, the end-of-turn aura damage from 10th (an aura whose
 * effect is the reminder), the riders from 13th and the gap-passing from 15th
 * are on the text.
 */
const DICE = ["d4", "d6", "d8", "d10", "d12"];
const atLeastD6 = (die) => (die === "d4" ? "d6" : die);

const auraEffect = effectItem({
    slug: AURA_EFFECT,
    name: "Elemental Embodiment: Scorched Ground",
    img: IMG,
    description: `<p>You are within 10 feet (20 from the owner's 20th level) of a creature that has become its element. If you end your turn here you take damage of its element equal to half its level.</p><hr /><p>This effect arrives and leaves with the aura. Apply the damage at the end of your turn.</p>`,
});

const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "Elemental Embodiment",
    img: IMG,
    levels: [
        { level: 5, text: levelBlock("5th Level", ["You no longer need to eat, drink, breathe, or sleep, and are unaffected by environmental conditions related to your element.", "Creatures that touch you, or hit you with an unarmed or melee attack, take damage equal to half your level."]) },
        { level: 10, text: levelBlock("10th Level", ["Your element's damage ignores resistance.", "Creatures within 10 feet take damage equal to half your level when they end their turn there."]) },
        { level: 13, text: levelBlock("13th Level", ["Creatures damaged by your element suffer your element's rider."]) },
        { level: 15, text: levelBlock("15th Level", ["You become your element. You are immune to precision damage and critical hits, and cannot be Grabbed or Restrained.", "You gain a fly Speed equal to your land Speed. The manner of this flight suits your element: borne on flame, carried on wind, riding a wave, floating on a plinth of stone.", "You may pass through any gap your element could."]) },
        { level: 20, text: levelBlock("20th Level", ["Your element's damage ignores immunity, dealing half damage instead of none.", "The damaging area around you extends to 20 feet."]) },
    ],
});

export const elementalEmbodiment = talent({
    name: "Elemental Embodiment",
    slug: SLUG,
    category: "ascendant-apex",
    img: IMG,
    description: `
${flavour("The distinction between the one who wields and the thing wielded has quietly collapsed. You do not summon your element or command it; you are what it does when it decides to take a shape and walk around.")}
${levelBlock("1st Level", ["Choose one element permanently. You are immune to your element's damage type.", "All damage you deal may be converted to your element as a free action.", "Your unarmed Strikes deal elemental damage equal to their own damage die, or 1d6 if that die is smaller, and gain the reach trait.", "Your weapon Strikes deal additional damage of your element equal to the weapon's damage die.", "You gain your element's property."])}
${levelBlock("5th Level", ["You no longer need to eat, drink, breathe, or sleep, and are unaffected by environmental conditions related to your element.", "Creatures that touch you, or hit you with an unarmed or melee attack, take damage equal to half your level."])}
${levelBlock("10th Level", ["Your element's damage ignores resistance.", "Creatures within 10 feet take damage equal to half your level when they end their turn there."])}
${levelBlock("13th Level", ["Creatures damaged by your element suffer your element's rider."])}
${levelBlock("15th Level", ["You become your element. You are immune to precision damage and critical hits, and cannot be Grabbed or Restrained.", "You gain a fly Speed equal to your land Speed.", "You may pass through any gap your element could."])}
${levelBlock("20th Level", ["Your element's damage ignores immunity, dealing half damage instead of none.", "The damaging area around you extends to 20 feet."])}
<table><thead><tr><th>Element</th><th>Damage</th><th>Property</th><th>Rider (13th)</th></tr></thead><tbody>
${ELEMENTS.filter((e) => e.table !== false).map((e) => `<tr><td>${e.value.charAt(0).toUpperCase() + e.value.slice(1)}</td><td>${e.value === "metal" ? "slashing or piercing" : e.damage}</td><td>${e.property ?? "-"}</td><td>${e.rider}</td></tr>`).join("")}
</tbody></table>
<hr />
<p><strong>In Foundry:</strong> choose your element when you take this talent; Metal is offered as slashing or as piercing, chosen once. You are immune to its damage type; switch <em>Convert damage</em> on in your effects panel to deal every Strike, spell and blast as your element. Unarmed Strikes gain reach and a die of element damage (d6 at least), weapon Strikes a die of element damage matching the weapon's. Earth is immune to Prone, Metal's Strikes count as cold iron, dawnsilver and adamantine, Wood's Strikes gain grapple and trip. From 10th an aura marks the creatures within 10 feet (20 from 20th). From 15th you are immune to precision damage and critical hits, to Grabbed and Restrained, and fly at your land Speed.</p>
<p>For the table: touch damage from 5th, the end-of-turn aura damage, resistance and immunity being ignored, the 13th-level riders, and passing through gaps. Notes on your damage rolls list them.</p>
`.trim(),
    rules: [
        {
            key: "ChoiceSet",
            slug: "element",
            rollOption: ELEMENT_OPTION,
            prompt: "ASCENDANT.Rules.ElementPrompt",
            adjustName: true,
            choices: ELEMENTS.map(({ value, label }) => ({ value, label })),
        },
        // Immunity to the element's damage type, one rule per element since the type is not the element's name.
        ...ELEMENTS.map(({ value, damage }) => ({ key: "Immunity", type: damage, predicate: [`${ELEMENT_OPTION}:${value}`] })),
        // Convert all damage: a toggle and one override per domain per element.
        { key: "RollOption", domain: "all", option: CONVERT, label: "ASCENDANT.Rules.ElementalConvert", toggleable: true, value: false },
        ...ELEMENTS.flatMap(({ value, damage }) =>
            DOMAINS.map((selector) => ({
                key: "DamageAlteration",
                selectors: [selector],
                mode: "override",
                property: "damage-type",
                value: damage,
                predicate: [CONVERT, `${ELEMENT_OPTION}:${value}`],
            })),
        ),
        // Unarmed: reach, and a die of element damage at least d6.
        { key: "AdjustStrike", mode: "add", property: "traits", definition: ["item:category:unarmed"], value: "reach" },
        ...ELEMENTS.flatMap(({ value, damage }) =>
            DICE.map((die) => ({
                key: "DamageDice",
                selector: "strike-damage",
                slug: `${SLUG}-unarmed-${die}`,
                label: "ASCENDANT.Rules.ElementalDamage",
                diceNumber: 1,
                dieSize: atLeastD6(die),
                damageType: damage,
                predicate: [`${ELEMENT_OPTION}:${value}`, "item:category:unarmed", `item:damage:die:${die}`],
            })),
        ),
        // Weapons: a die of element damage matching the weapon's own.
        ...ELEMENTS.flatMap(({ value, damage }) =>
            DICE.map((die) => ({
                key: "DamageDice",
                selector: "strike-damage",
                slug: `${SLUG}-weapon-${die}`,
                label: "ASCENDANT.Rules.ElementalDamage",
                diceNumber: 1,
                dieSize: die,
                damageType: damage,
                predicate: [`${ELEMENT_OPTION}:${value}`, { not: "item:category:unarmed" }, `item:damage:die:${die}`],
            })),
        ),
        // Properties.
        { key: "Immunity", type: "prone", predicate: [`${ELEMENT_OPTION}:earth`] },
        ...["cold-iron", "dawnsilver", "adamantine"].map((material) => ({
            key: "AdjustStrike",
            mode: "add",
            property: "materials",
            definition: [],
            value: material,
            predicate: [{ or: [`${ELEMENT_OPTION}:metal`, `${ELEMENT_OPTION}:metal-piercing`] }],
        })),
        ...["grapple", "trip"].map((trait) => ({
            key: "AdjustStrike",
            mode: "add",
            property: "traits",
            definition: [],
            value: trait,
            predicate: [`${ELEMENT_OPTION}:wood`],
        })),
        // 10th: the aura, as a marker on creatures inside it.
        {
            key: "Aura",
            slug: SLUG,
            radius: "ternary(gte(@actor.level, 20), 20, 10)",
            effects: [{ uuid: uuidFor(PACK, AURA_EFFECT), affects: "enemies", events: ["enter"], removeOnExit: true }],
            appearance: { border: { color: "#e07b00", alpha: 0.75 }, highlight: { color: "#e07b00", alpha: 0.2 } },
            predicate: [atLeast(10)],
        },
        // 15th.
        { key: "Immunity", type: "precision", predicate: [atLeast(15)] },
        { key: "Immunity", type: "critical-hits", predicate: [atLeast(15)] },
        { key: "Immunity", type: "grabbed", predicate: [atLeast(15)] },
        { key: "Immunity", type: "restrained", predicate: [atLeast(15)] },
        { key: "BaseSpeed", selector: "fly", value: "@actor.system.movement.speeds.land.value", predicate: [atLeast(15)] },
        {
            key: "Note",
            selector: ["strike-damage", "spell-damage"],
            title: "Elemental Embodiment",
            text: "ASCENDANT.Note.ElementalDamage",
            predicate: [atLeast(10)],
        },
        ...grants,
    ],
});

export default [elementalEmbodiment, auraEffect, ...subFeats];
