import { talent } from "../lib/item.mjs";
import { ATTRIBUTES, attributeWrite, byLevel } from "../lib/rules.mjs";

const SLUG = "enhanced-attribute-boosts";
const IMG = "icons/magic/life/heart-cross-strong-blue.webp";

/**
 * Enhanced Attribute Boosts.
 *
 * The boosts themselves are picked in PF2e's Attribute Boosts window, on rows
 * this module adds, and applied by scripts/attribute-boosts.mjs. That file
 * carries the arithmetic: the 1st-level picks use PF2e's own boost rule, the
 * later picks add exactly one to the modifier.
 *
 * This feat is the gate the script checks for, and it carries the caps: one
 * `downgrade` per attribute, +5 / +6 / +7 / +8 / +9 at 1st / 5th / 10th /
 * 15th / 20th (scores 20 / 22 / 24 / 26 / 28), at priority 90 so it runs after
 * every boost on the actor.
 */
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
<p><strong>In Foundry:</strong> open the <strong>Attribute Boosts</strong> window. Under each of PF2e's level rows there is a row labelled <em>(Ascendant)</em>: four picks at Level 1, one per attribute, and two picks at Levels 5, 10, 15 and 20, where pressing an attribute twice puts both on it. A 1st-level pick on a score already at 18 adds half a modifier point, exactly as PF2e's own boosts do, so two such half steps make a whole one. The caps are applied automatically.</p>
`.trim(),
    rules: ATTRIBUTES.flatMap((attribute) =>
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
});

export default [enhancedAttributeBoosts];
