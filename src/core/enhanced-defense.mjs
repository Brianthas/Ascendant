import { byLevel } from "../lib/rules.mjs";

/**
 * Enhanced Defense, granted by both Expertise Tracks.
 *
 * "Your Armor Class increases by 1 at 1st level, 2 at 5th, 3 at 10th, and 4 at
 * 15th. This is not a bonus and stacks with all bonuses to Armor Class."
 *
 * Untyped, because PF2e's stacking rules exempt untyped modifiers
 * (`applyStackingRules`: an untyped modifier is always enabled and always
 * added), which is exactly "stacks with all bonuses".
 */
export const enhancedDefense = {
    key: "FlatModifier",
    selector: "ac",
    slug: "ascendant-enhanced-defense",
    label: "ASCENDANT.Rules.EnhancedDefense",
    type: "untyped",
    value: byLevel([[1, 1], [5, 2], [10, 3], [15, 4]]),
};

export const ENHANCED_DEFENSE_TEXT = `
<h3>Enhanced Defense</h3>
<ul>
<li>Your Armor Class increases by 1 at 1st level, 2 at 5th, 3 at 10th, and 4 at 15th.
<ul><li>This is not a bonus and stacks with all bonuses to Armor Class.</li></ul></li>
</ul>`.trim();

/** No documents of its own; the rule lives on each track. */
export default [];
