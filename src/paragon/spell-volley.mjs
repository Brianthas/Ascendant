import { talent } from "../lib/item.mjs";
import { levelChain, atLeast, below, flavour, levelBlock } from "../lib/grants.mjs";

const PACK = "ascendant-paragon";
const SLUG = "spell-volley";
const IMG = "icons/magic/fire/projectile-fireball-orange-yellow.webp";

/**
 * Paragon: Spell Volley.
 *
 * The multiple attack penalty on spell attacks is a MultipleAttackPenalty
 * rule on `spell-attack`, kept by `calculateMAPs` (pf2e.mjs:20071) whenever
 * its value is the smaller penalty, with the third attack at double. PF2e
 * applies MAP to spell attack rolls, so the values land. "And Spellstrikes":
 * a Spellstrike is a Strike with the `action:spellstrike` option, so the same
 * values are registered on `strike-attack-roll` predicated on it; that copy
 * only matters for a Warmage.
 *
 * The action cost changes are casting-time text. Nothing in PF2e alters what
 * a spell costs from outside the spell, so they stay with the table and a
 * note appears on attack-trait spells.
 */
const MAP = [
    { from: 5, to: 10, value: -4 },
    { from: 10, to: 15, value: -3 },
    { from: 15, to: 21, value: -2 },
];

const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "Spell Volley",
    img: IMG,
    levels: [
        { level: 5, text: levelBlock("5th Level", ["Your multiple attack penalty is -4 instead of -5, and -8 instead of -10."]) },
        { level: 10, text: levelBlock("10th Level", ["Your multiple attack penalty is -3 instead of -5, and -6 instead of -10."]) },
        { level: 15, text: levelBlock("15th Level", ["Your multiple attack penalty is -2 instead of -5, and -4 instead of -10.", "Any attack-trait spell costs 1 action."]) },
    ],
});

export const spellVolley = talent({
    name: "Spell Volley",
    slug: SLUG,
    category: "ascendant-paragon",
    img: IMG,
    description: `
${flavour("Casting was never meant to be this fast. The words compress, the gestures fall away, and what should have been one careful working becomes three, each arriving with the same unhurried accuracy as if you had taken your time.")}
${levelBlock("1st Level", ["Single-target spells and cantrips with the attack trait that cost 2 or more actions instead cost 1 action."])}
${levelBlock("5th Level", ["Your multiple attack penalty is -4 instead of -5, and -8 instead of -10."])}
${levelBlock("10th Level", ["Your multiple attack penalty is -3 instead of -5, and -6 instead of -10."])}
${levelBlock("15th Level", ["Your multiple attack penalty is -2 instead of -5, and -4 instead of -10.", "Any attack-trait spell costs 1 action."])}
<p><em>These reductions apply only to your spell attack rolls and Spellstrikes, not to ordinary Strikes, even though all of them share the same multiple attack penalty.</em></p>
<hr />
<p><strong>In Foundry:</strong> the reduced multiple attack penalty applies to your spell attack rolls (and to Spellstrikes, if you are a Warmage) from 5th level.</p>
<p>For the table: the action cost. PF2e cannot change what a spell costs, so cast the spell and spend one action. A note on every attack-trait spell reminds you which ones this covers.</p>
`.trim(),
    rules: [
        ...MAP.flatMap(({ from, to, value }) => [
            { key: "MultipleAttackPenalty", selector: "spell-attack", value, predicate: [atLeast(from), below(to)] },
            { key: "MultipleAttackPenalty", selector: "strike-attack-roll", value, predicate: [atLeast(from), below(to), "action:spellstrike"] },
        ]),
        {
            key: "Note",
            selector: "spell-attack",
            title: "Spell Volley",
            text: "ASCENDANT.Note.SpellVolleyCost",
            predicate: ["item:trait:attack"],
        },
        ...grants,
    ],
});

export default [spellVolley, ...subFeats];
