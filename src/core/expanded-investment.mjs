import { talent } from "../lib/item.mjs";

/**
 * Expanded Investment: "The normal limit of 10 invested magic items increases to 20."
 *
 * PF2e keeps the limit at `system.resources.investiture.max`, which its own
 * Incredible Investiture feat raises with an ActiveEffectLike `add`. Read off
 * the live client before this shipped (see the project notes).
 */
export const expandedInvestment = talent({
    name: "Expanded Investment",
    slug: "expanded-investment",
    category: "ascendant-core",
    img: "icons/commodities/currency/coin-embossed-crown-gold.webp",
    description: `
<p>The normal limit of 10 invested magic items increases to 20.</p>
<hr />
<p><strong>In Foundry:</strong> the investiture limit on your inventory reads 20. Applied automatically.</p>
`.trim(),
    rules: [
        {
            key: "ActiveEffectLike",
            mode: "upgrade",
            path: "system.resources.investiture.max",
            value: 20,
        },
    ],
});

export default [expandedInvestment];
