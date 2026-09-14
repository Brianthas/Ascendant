import { talent, effectItem, uuidFor } from "../lib/item.mjs";
import { byLevel } from "../lib/rules.mjs";
import { levelChain, atLeast, flavour, levelBlock } from "../lib/grants.mjs";

const PACK = "ascendant-paragon";
const SLUG = "immovable";
const IMG = "icons/magic/earth/barrier-stone-explosion-debris.webp";
const TOGGLE = "ascendant-immovable";
const ENEMY_EFFECT = `${SLUG}-ground`;
const ALLY_EFFECT = `${SLUG}-anchored`;

/**
 * Paragon: Immovable.
 *
 * Automated: immunity to Prone, Grabbed and Restrained; "cannot be flanked"
 * as an override of `system.attributes.flanking.flankable` to false, which is
 * the attribute PF2e's flanking check reads (pf2e.mjs:20152) and Deny
 * Advantage's mechanism; and the aura, drawn at its radius and handing enemies
 * inside it an effect whose text carries the difficult terrain, Step ban,
 * end-of-turn Off-Guard and the anti-teleport clause, with a companion effect
 * on allies for their forced-movement immunity from 5th.
 *
 * Forced movement itself, difficult terrain, Step, the end-of-turn condition,
 * the damage for failing to move someone, and teleportation have no actor-side
 * hook in PF2e, so the effects are reminders on the creatures they apply to
 * and the table applies them.
 */
const groundEffect = effectItem({
    slug: ENEMY_EFFECT,
    name: "Immovable: Stubborn Ground",
    img: IMG,
    description: `
<p>You are inside an <strong>Immovable</strong> character's aura. Every square in it is difficult terrain for you.</p>
<p>From the owner's 10th level: you cannot Step here, and if you end your turn inside you are Off-Guard until the end of your next turn. If you fail to move the owner or an ally in the aura, you take damage equal to twice the owner's level. From their 15th level you cannot teleport into, out of, or within the aura.</p>
<hr />
<p>This effect arrives and leaves with the aura. It does not need removing by hand.</p>
`.trim(),
});

const anchoredEffect = effectItem({
    slug: ALLY_EFFECT,
    name: "Immovable: Anchored",
    img: IMG,
    showIcon: false,
    description: `
<p>You are inside an ally's <strong>Immovable</strong> aura and are immune to forced movement.</p>
<hr />
<p>This effect arrives and leaves with the aura. It does not need removing by hand.</p>
`.trim(),
});

const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "Immovable",
    img: IMG,
    levels: [
        { level: 5, text: levelBlock("5th Level", ["Immune to Grabbed and Restrained.", "You cannot be flanked.", "Aura increases to 15 feet, and allies within it are also immune to forced movement."]) },
        { level: 10, text: levelBlock("10th Level", ["Aura increases to 20 feet.", "A creature that fails to move you or an ally in your aura takes damage equal to twice your level.", "Enemies cannot Step within your aura.", "Enemies that end their turn in your aura are Off-Guard until the end of their next turn."]) },
        { level: 15, text: levelBlock("15th Level", ["Aura increases to 30 feet.", "You cannot be knocked from a surface, including while climbing or flying.", "Enemies cannot teleport into, out of, or within your aura."]) },
    ],
});

export const immovable = talent({
    name: "Immovable",
    slug: SLUG,
    category: "ascendant-paragon",
    img: IMG,
    description: `
${flavour("The world has agreed to stop asking you to move. Nothing shoves, drags, trips, or teleports you anywhere you did not intend to be, and the ground around you has taken on some of the same stubbornness, to the considerable inconvenience of anyone trying to cross it.")}
${levelBlock("1st Level", ["You cannot be pushed, pulled, or repositioned against your will.", "Immune to Prone.", "Aura 10 feet: enemies treat squares within it as difficult terrain."])}
${levelBlock("5th Level", ["Immune to Grabbed and Restrained.", "You cannot be flanked.", "Aura increases to 15 feet, and allies within it are also immune to forced movement."])}
${levelBlock("10th Level", ["Aura increases to 20 feet.", "A creature that fails to move you or an ally in your aura takes damage equal to twice your level.", "Enemies cannot Step within your aura.", "Enemies that end their turn in your aura are Off-Guard until the end of their next turn."])}
${levelBlock("15th Level", ["Aura increases to 30 feet.", "You cannot be knocked from a surface, including while climbing or flying.", "Enemies cannot teleport into, out of, or within your aura."])}
<hr />
<p><strong>In Foundry:</strong> the three condition immunities apply, you cannot be flanked from 5th, and <em>Immovable</em> in your effects panel draws the aura at the right radius. Enemies inside carry <em>Stubborn Ground</em>, which states what the aura does to them at your level, and allies carry <em>Anchored</em> from 5th.</p>
<p>For the table: forced movement, the difficult terrain, the Step ban, the end-of-turn Off-Guard, the damage for a failed move, and teleportation. None of these has an actor-side hook in PF2e; the effects on the creatures inside are the reminder.</p>
`.trim(),
    rules: [
        { key: "Immunity", type: "prone" },
        { key: "Immunity", type: "grabbed", predicate: [atLeast(5)] },
        { key: "Immunity", type: "restrained", predicate: [atLeast(5)] },
        { key: "ActiveEffectLike", mode: "override", path: "system.attributes.flanking.flankable", value: false, predicate: [atLeast(5)] },
        { key: "RollOption", domain: "all", option: TOGGLE, label: "ASCENDANT.Rules.ImmovableToggle", toggleable: true, value: true },
        {
            key: "Aura",
            slug: SLUG,
            radius: byLevel([[1, 10], [5, 15], [10, 20], [15, 30]]),
            effects: [
                { uuid: uuidFor(PACK, ENEMY_EFFECT), affects: "enemies", events: ["enter"], removeOnExit: true },
                { uuid: uuidFor(PACK, ALLY_EFFECT), affects: "allies", events: ["enter"], removeOnExit: true, predicate: [{ gte: ["origin:level", 5] }] },
            ],
            appearance: { border: { color: "#7a5c3a", alpha: 0.75 }, highlight: { color: "#7a5c3a", alpha: 0.2 } },
            predicate: [TOGGLE],
        },
        ...grants,
    ],
});

export default [immovable, groundEffect, anchoredEffect, ...subFeats];
