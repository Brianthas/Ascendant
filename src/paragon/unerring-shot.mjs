import { talent } from "../lib/item.mjs";
import { levelChain, atLeast, flavour, levelBlock } from "../lib/grants.mjs";

const PACK = "ascendant-paragon";
const SLUG = "unerring-shot";
const IMG = "icons/weapons/ammunition/arrow-head-war-flight.webp";
const AIM = "ascendant-aim";

/**
 * Paragon: Unerring Shot.
 *
 * Doubling range increments is PF2e's own Far Shot construction, read off
 * the installed feats pack: `AdjustStrike`, `property: "range-increment"`,
 * `mode: "multiply"`, `value: 2`, `definition: ["item:ranged"]`. Spell
 * ranges have no such alteration and stay on the text.
 *
 * Aim is a toggle plus an AdjustDegreeOfSuccess turning a failure into a
 * success on ranged Strikes and spell attacks; a critical failure is left
 * alone, as the rules say. Once per round until 15th is on the player.
 *
 * The concealment flat check, cover penalties, ignoring resistance on a second
 * hit, targeting unseen creatures, and the 15th-level reaction immunity act on
 * the attack's resolution or on the target and have no attacker-side rule
 * element; a note on every ranged attack lists them.
 */
const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "Unerring Shot",
    img: IMG,
    levels: [
        { level: 5, text: levelBlock("5th Level", ["Gain Aim.<ul><li><strong>Aim</strong> [free action, once per round] Your next ranged Strike or spell attack this turn treats a failure as a success.</li></ul>"]) },
        { level: 10, text: levelBlock("10th Level", ["Ignore greater cover entirely.", "Target creatures you can sense but not see with no flat check."]) },
        { level: 15, text: levelBlock("15th Level", ["Aim has no frequency limit.", "Your ranged Strikes and spell attacks cannot be blocked, redirected, or targeted by reactions."]) },
    ],
});

export const unerringShot = talent({
    name: "Unerring Shot",
    slug: SLUG,
    category: "ascendant-paragon",
    img: IMG,
    description: `
${flavour("Cover, darkness, distance, and the frantic dodging of a target who knows what is coming: you have stopped regarding any of it as relevant. You decide where the shot lands, and then it lands there.")}
${levelBlock("1st Level", ["Your ranged Strikes and spell attacks ignore the flat check from concealment and take no circumstance penalty from cover less than greater cover.", "Range increments for your ranged weapons and spells double.", "When you hit the same creature with a second or later ranged Strike or spell attack in the same round, that attack ignores the target's resistances."])}
${levelBlock("5th Level", ["Gain Aim.<ul><li><strong>Aim</strong> [free action, once per round] Your next ranged Strike or spell attack this turn treats a failure as a success.</li></ul>"])}
${levelBlock("10th Level", ["Ignore greater cover entirely.", "Target creatures you can sense but not see with no flat check."])}
${levelBlock("15th Level", ["Aim has no frequency limit.", "Your ranged Strikes and spell attacks cannot be blocked, redirected, or targeted by reactions."])}
<p><em>Aim upgrades a failure only. A critical failure still misses.</em></p>
<hr />
<p><strong>In Foundry:</strong> your ranged weapons' range increments are doubled on the sheet. From 5th, switch <em>Aim</em> on in your effects panel before the attack: a failed ranged Strike or spell attack is a success on the roll. Switch it off after, once per round until 15th.</p>
<p>For the table: spell ranges (double the printed range), the concealment flat check (skip it), cover penalties (do not apply them; from 10th not even greater cover), targeting a creature you sense but cannot see, ignoring resistance on a second hit, and the reaction immunity from 15th. A note on every ranged attack lists them.</p>
`.trim(),
    rules: [
        { key: "AdjustStrike", definition: ["item:ranged"], mode: "multiply", property: "range-increment", value: 2 },
        { key: "RollOption", domain: "all", option: AIM, label: "ASCENDANT.Rules.Aim", toggleable: true, value: false, predicate: [atLeast(5)] },
        {
            key: "AdjustDegreeOfSuccess",
            selector: "strike-attack-roll",
            adjustment: { failure: "one-degree-better" },
            predicate: [AIM, "item:ranged"],
        },
        {
            key: "AdjustDegreeOfSuccess",
            selector: "spell-attack",
            adjustment: { failure: "one-degree-better" },
            predicate: [AIM],
        },
        {
            key: "Note",
            selector: ["strike-attack-roll", "spell-attack"],
            title: "Unerring Shot",
            text: "ASCENDANT.Note.UnerringShot",
            predicate: [{ or: ["item:ranged", "item:type:spell"] }],
        },
        ...grants,
    ],
});

export default [unerringShot, ...subFeats];
