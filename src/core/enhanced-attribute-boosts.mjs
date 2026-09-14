import { talent } from "../lib/item.mjs";
import { ATTRIBUTES, ATTRIBUTE_CHOICES, attributeWrite, boostPick, byLevel } from "../lib/rules.mjs";

const SLUG = "enhanced-attribute-boosts";
const IMG = "icons/magic/life/heart-cross-strong-blue.webp";

/**
 * Enhanced Attribute Boosts.
 *
 * ## 1st level: four boosts under the normal rules
 *
 * "+2, or +1 if the score is already 18 or higher" and "you cannot apply more
 * than one to the same ability score". PF2e stores only the modifier, so the
 * value written is `ternary(lt(<mod>, 4), 1, 0)`: +1 to the modifier below 18,
 * nothing at 18 or above. Dropping the half step changes no number the sheet
 * shows: every later boost is a whole +2 to the score, an odd score never rounds
 * up (19/21/23 give +4/+5/+6, the same as 18/20/22), and the caps are stated
 * as modifiers.
 *
 * One score per pick is enforced in the choice list: each of the four picks
 * hides any attribute a sibling has already taken, by predicating each choice
 * on the absence of the sibling's roll option.
 *
 * ## 5th, 10th, 15th, 20th: two boosts, no restrictions
 *
 * `add 1` each, and the two picks at a level may name the same attribute.
 *
 * ## Caps
 *
 * One `downgrade` per attribute, +5 / +6 / +7 / +8 / +9 at 1st / 5th / 10th /
 * 15th / 20th (scores 20 / 22 / 24 / 26 / 28), at priority 90 so it runs after
 * every boost, which sit at 60.
 *
 * Each pick is its own item granted at its level, so the question arrives when
 * the level does (see `boostPick`).
 */
const FIRST = ["a", "b", "c", "d"];

const firstLevelPicks = FIRST.map((letter) => {
    const siblings = FIRST.filter((other) => other !== letter).map((other) => `ascendant-boost-${SLUG}-1-${other}`);
    return boostPick({
        slug: `${SLUG}-1-${letter}`,
        name: `Enhanced Attribute Boost (1st, ${letter.toUpperCase()})`,
        prompt: "ASCENDANT.Rules.Boost1st",
        level: 1,
        mode: "add",
        value: 1,
        choices: ATTRIBUTE_CHOICES.map((choice) => ({
            ...choice,
            predicate: [{ nor: siblings.map((gate) => `${gate}:${choice.value}`) }],
        })),
        description: `<p>One of the four additional ability boosts gained at 1st level. It follows the normal rules for ability boosts: it increases a score by 2, or by 1 if the score is already 18 or higher, and no two of the four may apply to the same score.</p><p><strong>In Foundry:</strong> choose the attribute when prompted. A score already at 18 gains nothing on the sheet, because an odd score has the same modifier as the even one below it and every later boost is a whole +2.</p>`,
    });
});

// The +1-below-18 rule is the value; boostPick writes the same value to every
// attribute rule, so the ternary is substituted per attribute here. It tests
// `.base`, not `.mod`: each pick writes `.mod` first and `.base` second, and
// PF2e sets `.base` from the ordinary boosts before any rule element runs
// (pf2e.mjs:34071), so both rules see the same pre-boost number.
for (const pick of firstLevelPicks) {
    for (const rule of pick.item.system.rules) {
        if (rule.key !== "ActiveEffectLike") continue;
        const attribute = rule.path.match(/abilities\.(\w+)\./)[1];
        rule.value = `ternary(lt(@actor.system.abilities.${attribute}.base, 4), 1, 0)`;
    }
}

/** Literal keys, so tools/check-lang.mjs can see them. */
const PROMPTS = {
    5: "ASCENDANT.Rules.Boost5th",
    10: "ASCENDANT.Rules.Boost10th",
    15: "ASCENDANT.Rules.Boost15th",
    20: "ASCENDANT.Rules.Boost20th",
};

const laterPicks = [5, 10, 15, 20].flatMap((level) =>
    ["a", "b"].map((letter) =>
        boostPick({
            slug: `${SLUG}-${level}-${letter}`,
            name: `Enhanced Attribute Boost (${level}th, ${letter.toUpperCase()})`,
            prompt: PROMPTS[level],
            level,
            mode: "add",
            value: 1,
            description: `<p>One of the two additional ability boosts gained at ${level}th level. These follow no restrictions: both may apply to the same score, and each always increases it by exactly 2 regardless of its current value.</p><p><strong>In Foundry:</strong> choose the attribute when prompted; the modifier rises by 1.</p>`,
        }),
    ),
);

const picks = [...firstLevelPicks, ...laterPicks];

export const enhancedAttributeBoosts = talent({
    name: "Enhanced Attribute Boosts",
    slug: SLUG,
    category: "ascendant-core",
    img: IMG,
    description: `
<p>Characters gain their normal ability boosts from ancestry, background, class, and free boosts exactly as described in the Core Rulebook. In addition, they gain the following.</p>
<h3>Initial Boosts</h3>
<ul>
<li>At 1st level you gain four additional ability boosts.
<ul><li>These follow the normal rules for ability boosts. You cannot apply more than one to the same ability score, and each increases a score by 2, or by 1 if the score is already 18 or higher.</li></ul></li>
</ul>
<h3>Continuing Boosts</h3>
<ul>
<li>At 5th, 10th, 15th, and 20th level you gain two additional ability boosts.
<ul><li>These follow no restrictions. Both may apply to the same score, and each always increases it by exactly 2 regardless of its current value.</li></ul></li>
</ul>
<h3>Attribute Caps</h3>
<p>No ability score may exceed the following values. This cap applies to all boosts.</p>
<table><thead><tr><th>Level</th><th>Cap</th><th>Modifier</th></tr></thead><tbody>
<tr><td>1st</td><td>20</td><td>+5</td></tr>
<tr><td>5th</td><td>22</td><td>+6</td></tr>
<tr><td>10th</td><td>24</td><td>+7</td></tr>
<tr><td>15th</td><td>26</td><td>+8</td></tr>
<tr><td>20th</td><td>28</td><td>+9</td></tr>
</tbody></table>
<p><em>At 1st level the cap of 20 is a soft ceiling. Because the four initial boosts follow normal rules, a score already at 18 gains only +1 from each. Most characters begin play with a primary score of 18, matching standard Pathfinder.</em></p>
<hr />
<p><strong>In Foundry:</strong> build the character's ordinary boosts in the Attribute Boosts window first. This feat then grants four boost picks at 1st level and two more at 5th, 10th, 15th and 20th, each asking which attribute when it arrives. The caps are applied automatically. A 1st-level pick on a score already at 18 adds nothing on the sheet: the sheet stores modifiers, an odd score has the same modifier as the even score below it, and every later boost is a whole +2.</p>
`.trim(),
    rules: [
        ...picks.map((pick) => pick.grant),
        ...ATTRIBUTES.flatMap((attribute) =>
            attributeWrite(
                {
                    key: "ActiveEffectLike",
                    slug: `${SLUG}-cap`,
                    mode: "downgrade",
                    phase: "applyAEs",
                    priority: 90,
                    value: byLevel([[1, 5], [5, 6], [10, 7], [15, 8], [20, 9]]),
                },
                attribute,
            ),
        ),
    ],
});

export default [enhancedAttributeBoosts, ...picks.map((pick) => pick.item)];
