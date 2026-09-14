import { talent, effectItem } from "../lib/item.mjs";
import { levelChain, atLeast, flavour, levelBlock } from "../lib/grants.mjs";

const PACK = "ascendant-paragon";
const SLUG = "ruinous-blows";
const IMG = "icons/skills/melee/strike-hammer-destructive-orange.webp";

/**
 * Paragon: Ruinous Blows.
 *
 * Every clause acts on the target's side: hardness and resistance are the
 * defender's, the AC penalty sits on the creature hit, and counteracting is a
 * roll against an effect on it. PF2e has no attacker-side "ignore resistance"
 * (resistance is applied on the defender's side only), so the automation
 * is the effect item for the AC penalty, which the player applies to the
 * target after a hit, scaling -1/-2/-3 with the attacker's level. The rest is
 * on the text, with a Note on every Strike.
 */
export const ruinousPenalty = effectItem({
    slug: `${SLUG}-penalty`,
    name: "Ruinous Blows: AC Penalty",
    img: IMG,
    duration: { value: 1, unit: "rounds", sustained: false, expiry: "turn-end" },
    description: `
<p>Hit by a creature with Ruinous Blows: -1 status penalty to AC until the end of that creature's next turn, -2 from its 5th level, -3 from its 15th. The penalty does not stack with itself; additional hits refresh its duration.</p>
<hr />
<p>Apply this to the creature you hit. The value follows the level of whoever applied it: set the badge to the penalty if it does not match.</p>
`.trim(),
    badge: { type: "counter", value: 1, min: 1, max: 3, labels: ["-1", "-2", "-3"] },
    rules: [
        {
            key: "FlatModifier",
            selector: "ac",
            slug: `${SLUG}-penalty`,
            label: "ASCENDANT.Rules.RuinousBlowsPenalty",
            type: "status",
            value: "-@item.badge.value",
        },
    ],
});

const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "Ruinous Blows",
    img: IMG,
    levels: [
        { level: 5, text: levelBlock("5th Level", ["Your Strikes against objects deal double damage to their Hit Points.<ul><li>Magical barriers and wall effects count as objects for this purpose, and you may Strike and damage them even if they are immune to physical damage, immune to being damaged, or otherwise impervious to attack.</li></ul>", "The AC penalty increases to -2."]) },
        { level: 10, text: levelBlock("10th Level", ["When you critically hit a creature, its resistances are halved against all damage until the end of your next turn.", "When you critically hit a creature or object, you may attempt to counteract one magical effect on it, once per round.<ul><li>Your counteract rank is half your level rounded up, and your counteract check is your attack roll modifier with the weapon you used.</li></ul>"]) },
        { level: 15, text: levelBlock("15th Level", ["Your Strikes ignore immunity to your damage type, dealing half damage instead of none.", "The AC penalty increases to -3."]) },
    ],
});

export const ruinousBlows = talent({
    name: "Ruinous Blows",
    slug: SLUG,
    category: "ascendant-paragon",
    img: IMG,
    description: `
${flavour("Every defense is an argument about what will and will not give way, and you have never lost one. Plate parts, wards unravel, and the wall that was meant to hold the line remembers that it was only ever stacked stone.")}
${levelBlock("1st Level", ["Your Strikes ignore hardness and resistance equal to your level.", "When you hit a creature with a Strike, it takes a -1 status penalty to AC until the end of your next turn."])}
${levelBlock("5th Level", ["Your Strikes against objects deal double damage to their Hit Points.<ul><li>Magical barriers and wall effects count as objects for this purpose, and you may Strike and damage them even if they are immune to physical damage, immune to being damaged, or otherwise impervious to attack.</li></ul>", "The AC penalty increases to -2."])}
${levelBlock("10th Level", ["When you critically hit a creature, its resistances are halved against all damage until the end of your next turn.", "When you critically hit a creature or object, you may attempt to counteract one magical effect on it, once per round.<ul><li>Your counteract rank is half your level rounded up, and your counteract check is your attack roll modifier with the weapon you used.</li></ul>"])}
${levelBlock("15th Level", ["Your Strikes ignore immunity to your damage type, dealing half damage instead of none.", "The AC penalty increases to -3."])}
<p><em>The AC penalty does not stack with itself; additional hits refresh its duration. Barriers without Hit Points are addressed by the 10th-level counteract rather than by Striking them.</em></p>
<hr />
<p><strong>In Foundry:</strong> after a hit, apply <em>Ruinous Blows: AC Penalty</em> to the target; set its badge to 1, 2 or 3 for your level. Every Strike carries a note listing what else this talent does to the target.</p>
<p>For the table: hardness and resistance ignored up to your level (reduce the target's resistance by hand when applying damage), double damage to objects, halved resistances and the counteract on a critical hit, and half damage through immunity from 15th. All of these act on the target's side, where no rule element from your sheet reaches.</p>
`.trim(),
    rules: [
        {
            key: "Note",
            selector: "strike-attack-roll",
            title: "Ruinous Blows",
            text: "ASCENDANT.Note.RuinousBlowsHit",
            outcome: ["success", "criticalSuccess"],
        },
        {
            key: "Note",
            selector: "strike-attack-roll",
            title: "Ruinous Blows",
            text: "ASCENDANT.Note.RuinousBlowsCritical",
            outcome: ["criticalSuccess"],
            predicate: [atLeast(10)],
        },
        {
            key: "Note",
            selector: "strike-damage",
            title: "Ruinous Blows",
            text: "ASCENDANT.Note.RuinousBlowsDamage",
        },
        ...grants,
    ],
});

export default [ruinousBlows, ruinousPenalty, ...subFeats];
