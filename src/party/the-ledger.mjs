import { talent } from "../lib/item.mjs";
import { levelChain, flavour, levelBlock } from "../lib/grants.mjs";

const PACK = "ascendant-party";
const SLUG = "the-ledger";
const IMG = "icons/sundries/books/book-worn-brown.webp";

/**
 * Party: The Ledger. A shared inventory is what PF2e's Party actor already
 * provides: its stash is one inventory every member can reach from anywhere,
 * and items in it count toward nobody's Bulk. So the talent is the party
 * stash (Bryan's ruling, 2026-09-14: a container on one member's sheet would
 * break "any member, from any distance"). The Bulk cap, retrieval at
 * distance, the identification, rune transfers, transformation, requisition
 * and the daily consumable are GM-run and on the text.
 */

const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "The Ledger",
    img: IMG,
    levels: [
        { level: 5, text: levelBlock("5th Level", ["Capacity increases to 30 Bulk per member.", "Retrieving or storing items is a free action once per round."]) },
        { level: 10, text: levelBlock("10th Level", ["During daily preparations, you may transfer a rune from one item in the inventory to another without a check or cost.", "You may transform any item into another of the same category of equal or lower level and price.", "Once per week, you may requisition an item of a level no greater than the party's average +2 at full price. This item may be uncommon or rare."]) },
        { level: 15, text: levelBlock("15th Level", ["Capacity increases to 40 Bulk per member.", "Requisition becomes a daily activity and costs three-quarters of the item's price.", "Once per day, one consumable expended from the inventory is restored to it."]) },
    ],
});

export const theLedger = talent({
    name: "The Ledger",
    slug: SLUG,
    category: "ascendant-party",
    img: IMG,
    description: `
${flavour("What one of you carries, all of you carry. Nothing rots, nothing is lost, nothing is ever in the wrong pack at the wrong moment, and any of you can reach into the shared weight of it from anywhere and come out holding exactly what was needed.")}
${levelBlock("1st Level", [
    "The party shares a single extradimensional inventory holding 20 Bulk per member, which does not count toward anyone's encumbrance.",
    "Any member may retrieve or store items as an Interact action from any distance, even when separated from the rest of the party.",
    "Nothing stored inside spoils, rots, rusts, decays, or ages.",
    "Living creatures cannot be placed inside.",
    "You may identify everything inside during daily preparations as though you had critically succeeded at Identify Magic.",
])}
${levelBlock("5th Level", ["Capacity increases to 30 Bulk per member.", "Retrieving or storing items is a free action once per round."])}
${levelBlock("10th Level", ["During daily preparations, you may transfer a rune from one item in the inventory to another without a check or cost.", "You may transform any item into another of the same category of equal or lower level and price.", "Once per week, you may requisition an item of a level no greater than the party's average +2 at full price. This item may be uncommon or rare."])}
${levelBlock("15th Level", ["Capacity increases to 40 Bulk per member.", "Requisition becomes a daily activity and costs three-quarters of the item's price.", "Once per day, one consumable expended from the inventory is restored to it."])}
<p><em>Categories are weapons, armor, shields, consumables, worn items, held items, and materials. An item can only be transformed into another of its own category.</em></p>
<hr />
<p><strong>In Foundry:</strong> the party stash on the Party sheet is the Ledger: every member can open it from anywhere, and items in it count toward nobody's Bulk. Add this talent to every member.</p>
<p>For the table: the Bulk cap on the stash (20 per member, 30 from 5th, 40 from 15th), retrieval at distance, identification at daily preparations, and from 10th the rune transfers, transformations, requisitions and the restored consumable.</p>
`.trim(),
    rules: [...grants],
});

export default [theLedger, ...subFeats];
