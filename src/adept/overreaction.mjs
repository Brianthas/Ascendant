import { talent, actionItem } from "../lib/item.mjs";
import { levelChain, grantBetween, atLeast, flavour, levelBlock } from "../lib/grants.mjs";

const PACK = "ascendant-adept";
const SLUG = "overreaction";
const IMG = "icons/skills/melee/strike-sword-slashing-red.webp";

/** PF2e's own Reactive Strike class feature, read off the installed system's packs. */
const REACTIVE_STRIKE = "Compendium.pf2e.classfeatures.Item.hmShTfPOcTaKgbf4";

/**
 * Adept: Overreaction. Reactive Strike is granted as PF2e's own feature and
 * skipped if already held. The 10th-level reaction is a real reaction item.
 * The extra reactions themselves, using reactions while Off-Guard, Prone or
 * Grabbed, reacting to spellcasting, and the 15th-level clauses are not
 * things PF2e counts or gates, so they are on the text with a note on
 * Reactive Strike rolls.
 */
export const interpose = actionItem({
    slug: `${SLUG}-interpose`,
    name: "Interpose",
    actionType: "reaction",
    traits: [],
    img: IMG,
    frequency: { value: 1, max: 1, per: "round" },
    description: `
<p><strong>Trigger</strong> An ally within 30 feet would be hit by an attack.</p>
<p><strong>Effect</strong> You Stride toward that ally and then make a Strike against the attacker.</p>
<ul><li>If you end this movement adjacent to the ally, the attack takes a -2 circumstance penalty.</li></ul>
<hr />
<p>Roll the Strike from your Actions tab. Apply the -2 to the attacker's roll by hand if you end adjacent to the ally.</p>
`.trim(),
});

const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "Overreaction",
    img: IMG,
    levels: [
        { level: 5, text: levelBlock("5th Level", ["You may use reactions even while Off-Guard, Prone, or Grabbed.", "You may use Reactive Strike when a creature within your reach Casts a Spell, whether or not that spell has the manipulate trait."]) },
        { level: 10, text: levelBlock("10th Level", ["You gain a second additional reaction.", "Once per round, when an ally within 30 feet would be hit by an attack, you may Stride toward that ally and then make a Strike against the attacker as a reaction.<ul><li>If you end this movement adjacent to the ally, the attack takes a -2 circumstance penalty.</li></ul>"]) },
        { level: 15, text: levelBlock("15th Level", ["You gain a third additional reaction.", "You may use reactions on other creatures' turns even when their triggers would normally be denied to you.", "You cannot be prevented from taking reactions by any effect."]) },
    ],
});

export const overreaction = talent({
    name: "Overreaction",
    slug: SLUG,
    category: "ascendant-adept",
    img: IMG,
    description: `
${flavour("Where others get one answer, you get several. The opening, the spell, the ally about to be struck: each of them gets a response, and the effects that normally take a person's reactions away discover they have not taken nearly enough.")}
${levelBlock("1st Level", ["You gain an additional reaction at the start of each of your turns.", "You gain Reactive Strike if you don't have it.<ul><li><strong>Reactive Strike</strong> [reaction] When a creature within your reach uses a manipulate or move action, or leaves a square during a move action, make a melee Strike against it.</li></ul>"])}
${levelBlock("5th Level", ["You may use reactions even while Off-Guard, Prone, or Grabbed.", "You may use Reactive Strike when a creature within your reach Casts a Spell, whether or not that spell has the manipulate trait."])}
${levelBlock("10th Level", ["You gain a second additional reaction.", "Once per round, when an ally within 30 feet would be hit by an attack, you may Stride toward that ally and then make a Strike against the attacker as a reaction.<ul><li>If you end this movement adjacent to the ally, the attack takes a -2 circumstance penalty.</li></ul>"])}
${levelBlock("15th Level", ["You gain a third additional reaction.", "You may use reactions on other creatures' turns even when their triggers would normally be denied to you.", "You cannot be prevented from taking reactions by any effect."])}
<p><em>Additional reactions from this talent stack with those granted by other sources, including Borrowed Time.</em></p>
<hr />
<p><strong>In Foundry:</strong> Reactive Strike is on your Actions tab (PF2e's own, skipped if you already have it), and Interpose joins it at 10th.</p>
<p>For the table: PF2e does not count reactions, so track the extra ones yourself: two per turn at 1st, three at 10th, four at 15th, plus any from Borrowed Time. Reacting while Off-Guard, Prone or Grabbed, to spellcasting, and through denial effects are yours to apply.</p>
`.trim(),
    rules: [
        { key: "GrantItem", uuid: REACTIVE_STRIKE, allowDuplicate: false },
        grantBetween(PACK, `${SLUG}-interpose`, 10),
        {
            key: "Note",
            selector: "strike-attack-roll",
            title: "Overreaction",
            text: "ASCENDANT.Note.OverreactionReactions",
            predicate: [atLeast(5), "action:reactive-strike"],
        },
        ...grants,
    ],
});

export default [overreaction, interpose, ...subFeats];
