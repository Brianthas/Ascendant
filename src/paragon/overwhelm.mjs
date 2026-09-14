import { talent, effectItem, uuidFor } from "../lib/item.mjs";
import { levelChain, atLeast, below, flavour, levelBlock } from "../lib/grants.mjs";

const PACK = "ascendant-paragon";
const SLUG = "overwhelm";
const IMG = "icons/magic/fire/explosion-fireball-large-orange.webp";
const TOGGLE = "ascendant-overwhelm";

/**
 * Paragon: Overwhelm.
 *
 * The 5th and 15th level degradation acts on the target's save, so it cannot
 * live on the caster's item. PF2e's EphemeralEffect applies an effect to the
 * target for the duration of a roll, pulling from the origin actor's
 * synthetics keyed by the check's domains, and an effect registered under
 * `saving-throw` on the caster reaches a save rolled against that caster
 * (verified live by rolling a Fighter's Reflex save with and without a caster
 * as origin). Two effects, one per
 * level band, since the effect's own AdjustDegreeOfSuccess cannot read the
 * caster's level. Both are predicated on the spell having an area, which the
 * save's roll options carry as `area-effect` when a spell's area is set.
 *
 * "Once per round" is a toggle the caster switches on for that spell.
 * Excluding creatures from an area, converting bursts to cones and lines, and
 * doubling areas are spell targeting, which no rule element reaches; a note on
 * every area spell lists them.
 */
const degrade = (adjustment, key, name, text) =>
    effectItem({
        slug: `${SLUG}-degrade-${key}`,
        name,
        img: IMG,
        showIcon: false,
        description: text,
        rules: [{ key: "AdjustDegreeOfSuccess", selector: "saving-throw", adjustment, predicate: ["area-effect"] }],
    });

export const overwhelmEffects = [
    degrade({ success: "one-degree-worse" }, "5", "Overwhelm (save degraded)",
        "<p>Applied automatically while you save against an area spell from a character using Overwhelm. A success is treated as a failure. Critical successes and critical failures are unaffected.</p>"),
    degrade({ success: "one-degree-worse", criticalSuccess: "one-degree-worse" }, "15", "Overwhelm (save degraded, 15th+)",
        "<p>Applied automatically while you save against an area spell from a character using Overwhelm. A success is treated as a failure and a critical success as a success.</p>"),
];

const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "Overwhelm",
    img: IMG,
    levels: [
        { level: 5, text: levelBlock("5th Level", ["Once per round, when you Cast a Spell with an area, creatures in that area treat their degree of success as one lower, to a minimum of a failure.<ul><li>Creatures that critically succeed or critically fail are unaffected.</li></ul>"]) },
        { level: 10, text: levelBlock("10th Level", ["Double the size of your spell areas."]) },
        { level: 15, text: levelBlock("15th Level", ["The effect from 5th level now also applies to creatures that critically succeed, reducing their result to a success."]) },
    ],
});

export const overwhelm = talent({
    name: "Overwhelm",
    slug: SLUG,
    category: "ascendant-paragon",
    img: IMG,
    description: `
${flavour("Your magic does not target so much as occupy. It fills the room, folds around the people you would rather it spared, and leaves everyone else with the discovery that there was nowhere in the room that would have helped.")}
${levelBlock("1st Level", ["When you Cast a Spell with an area, you may exclude a number of creatures from that area equal to your spellcasting attribute modifier.", "You may convert a burst into a cone or line of equivalent size, or the reverse."])}
${levelBlock("5th Level", ["Once per round, when you Cast a Spell with an area, creatures in that area treat their degree of success as one lower, to a minimum of a failure.<ul><li>Creatures that critically succeed or critically fail are unaffected.</li></ul>"])}
${levelBlock("10th Level", ["Double the size of your spell areas."])}
${levelBlock("15th Level", ["The effect from 5th level now also applies to creatures that critically succeed, reducing their result to a success."])}
<hr />
<p><strong>In Foundry:</strong> from 5th, switch <em>Overwhelm</em> on in your effects panel before casting the round's area spell. While it is on, every creature saving against an area spell of yours has a success treated as a failure, and from 15th a critical success as a success. Switch it off after.</p>
<p>For the table: excluding creatures, reshaping and doubling areas. Place the template by hand; a note on every area spell lists what this talent lets you do with it.</p>
`.trim(),
    rules: [
        { key: "RollOption", domain: "all", option: TOGGLE, label: "ASCENDANT.Rules.OverwhelmToggle", toggleable: true, value: false, predicate: [atLeast(5)] },
        {
            key: "EphemeralEffect",
            affects: "target",
            selectors: ["saving-throw", "fortitude", "reflex", "will"],
            uuid: uuidFor(PACK, `${SLUG}-degrade-5`),
            predicate: [TOGGLE, atLeast(5), below(15)],
        },
        {
            key: "EphemeralEffect",
            affects: "target",
            selectors: ["saving-throw", "fortitude", "reflex", "will"],
            uuid: uuidFor(PACK, `${SLUG}-degrade-15`),
            predicate: [TOGGLE, atLeast(15)],
        },
        {
            key: "Note",
            selector: ["spell-dc", "spell-attack", "spell-damage"],
            title: "Overwhelm",
            text: "ASCENDANT.Note.OverwhelmArea",
            predicate: ["area-effect"],
        },
        ...grants,
    ],
});

export default [overwhelm, ...overwhelmEffects, ...subFeats];
