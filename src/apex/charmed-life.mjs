import { talent, uuidFor, GRANT_TAG } from "../lib/item.mjs";

const PACK = "ascendant-apex";
const SLUG = "charmed-life";
const IMG = "icons/magic/control/buff-luck-fortune-clover-green.webp";

/**
 * Apex: Charmed Life.
 *
 * Automated: the Hero Point maximum, immunity to misfortune effects, and the
 * 15th and 20th level degree improvements on saving throws (one AdjustDegreeOfSuccess,
 * whose adjustment widens at 20th).
 *
 * Table-run, each with a Note on the roll it bites: starting each session with
 * 4 Hero Points (PF2e resets them from the GM's own control), rerolling a
 * natural 1 (no rule element reacts to a die result after the roll; PF2e's own
 * reroll is a chat-card button), the 5th and 10th level flat check after a
 * failed save (a second roll after the first resolves), and rebounding a
 * misfortune effect onto its source.
 */
const LEVELS = [
    { level: 5, text: "When you fail or critically fail a saving throw, roll a DC 11 flat check. On a success, treat the save as one degree better.<ul><li>As with any check, you may spend a Hero Point to reroll this flat check.</li></ul>" },
    { level: 10, text: "The flat check DC becomes 6." },
    { level: 15, text: "You automatically succeed at all flat checks, including this one.</li><li>Your failed and critically failed saves always improve by one degree." },
    { level: 20, text: "This improvement applies to any saving throw result, including successes." },
];

const subFeats = LEVELS.map(({ level, text }) =>
    talent({
        name: `Charmed Life (${level}th)`,
        slug: `${SLUG}-${level}`,
        category: "ascendant-grant",
        otherTags: [GRANT_TAG],
        level,
        img: IMG,
        description: `<p><strong>${level}th Level</strong></p><ul><li>${text}</li></ul><p>Granted automatically by Charmed Life at ${level}th level.</p>`,
    }),
);

export const charmedLife = talent({
    name: "Charmed Life",
    slug: SLUG,
    category: "ascendant-apex",
    img: IMG,
    description: `
<blockquote><p><em>The odds do not refuse you so much as politely decline to be involved. Blades turn at the last instant, footing holds where it has no business holding, and those who travel with you learn not to comment on it, in case the comment is what breaks the spell.</em></p></blockquote>
<p><strong>1st Level</strong></p>
<ul>
<li>Your maximum Hero Points increase to 6, and you begin each session with 4.</li>
<li>Whenever you roll a natural 1 on any die, reroll it and take the new result.
<ul><li>If you roll another 1, continue rerolling until you do not.</li></ul></li>
<li>Immune to misfortune effects. When targeted by one, it instead rebounds on its source.</li>
</ul>
<p><strong>5th Level</strong></p>
<ul>
<li>When you fail or critically fail a saving throw, roll a DC 11 flat check. On a success, treat the save as one degree better.
<ul><li>As with any check, you may spend a Hero Point to reroll this flat check.</li></ul></li>
</ul>
<p><strong>10th Level</strong></p>
<ul><li>The flat check DC becomes 6.</li></ul>
<p><strong>15th Level</strong></p>
<ul>
<li>You automatically succeed at all flat checks, including this one.</li>
<li>Your failed and critically failed saves always improve by one degree.</li>
</ul>
<p><strong>20th Level</strong></p>
<ul><li>This improvement applies to any saving throw result, including successes.</li></ul>
<p><em>Resolve this talent's improvement before applying class features that further adjust your degree of success, such as Evasion, Juggernaut, or Resolve.</em></p>
<hr />
<p><strong>In Foundry:</strong> your Hero Point maximum reads 6, you are immune to misfortune effects, and from 15th level every failed or critically failed save is improved one degree on the roll itself, every save from 20th. The GM sets you to 4 Hero Points at the start of a session.</p>
<p>For the table: rerolling natural 1s (use the reroll button on the chat card, without spending a Hero Point), the flat check after a failed save at 5th and 10th level, and rebounding a misfortune effect. A note on every check reminds you of the first, and a note on every save of the second.</p>
`.trim(),
    rules: [
        {
            key: "ActiveEffectLike",
            mode: "upgrade",
            path: "system.resources.heroPoints.max",
            value: 6,
        },
        { key: "Immunity", type: "misfortune-effects" },
        {
            key: "Note",
            selector: "all",
            title: "Charmed Life",
            text: "ASCENDANT.Note.CharmedLifeNaturalOne",
            predicate: ["check:total:natural:1"],
        },
        {
            key: "Note",
            selector: "saving-throw",
            title: "Charmed Life",
            text: "ASCENDANT.Note.CharmedLifeFlatCheck",
            outcome: ["failure", "criticalFailure"],
            predicate: [{ gte: ["self:level", 5] }, { lt: ["self:level", 15] }],
        },
        {
            key: "AdjustDegreeOfSuccess",
            selector: "saving-throw",
            adjustment: { criticalFailure: "one-degree-better", failure: "one-degree-better" },
            predicate: [{ gte: ["self:level", 15] }, { lt: ["self:level", 20] }],
        },
        {
            key: "AdjustDegreeOfSuccess",
            selector: "saving-throw",
            adjustment: { criticalFailure: "one-degree-better", failure: "one-degree-better", success: "one-degree-better" },
            predicate: [{ gte: ["self:level", 20] }],
        },
        ...LEVELS.map(({ level }) => ({
            key: "GrantItem",
            uuid: uuidFor(PACK, `${SLUG}-${level}`),
            allowDuplicate: false,
            reevaluateOnUpdate: true,
            predicate: [{ gte: ["self:level", level] }],
        })),
    ],
});

export default [charmedLife, ...subFeats];
