import { talent, actionItem } from "../lib/item.mjs";
import { levelChain, grantBetween, atLeast, flavour, levelBlock } from "../lib/grants.mjs";

const PACK = "ascendant-adept";
const SLUG = "uncanny-instinct";
const IMG = "icons/magic/perception/eye-ringed-glow-angry-red.webp";

/**
 * Adept: Uncanny Instinct. The two circumstance bonuses are FlatModifiers
 * (Seek is `action:seek` on the Perception check). "You cannot be flanked" is
 * an override of `system.attributes.flanking.flankable`, the attribute PF2e's
 * flanking check reads (pf2e.mjs:20152); "never Off-Guard to creatures you can
 * perceive" is the same attribute's `offGuardable`, which is what being
 * flanked would set. The 15th-level reaction is a real reaction item. Not being
 * surprised and the automatic Seek are table-run.
 */
export const instinctiveGuard = actionItem({
    slug: `${SLUG}-guard`,
    name: "Instinctive Guard",
    actionType: "reaction",
    traits: [],
    img: IMG,
    frequency: { value: 1, max: 1, per: "round" },
    description: `
<p><strong>Trigger</strong> You are hit by an attack.</p>
<p><strong>Effect</strong> Reduce the damage by half.</p>
<hr />
<p>Halve the damage when applying it. PF2e counts the once-per-round use here.</p>
`.trim(),
});

const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "Uncanny Instinct",
    img: IMG,
    levels: [
        { level: 5, text: levelBlock("5th Level", ["You automatically Seek in a 30-foot emanation at the start of each of your turns without spending an action."]) },
        { level: 10, text: levelBlock("10th Level", ["You are never Off-Guard to creatures you can perceive.", "You cannot be flanked."]) },
        { level: 15, text: levelBlock("15th Level", ["Once per round, when you are hit by an attack, you may reduce the damage by half as a reaction."]) },
    ],
});

export const uncannyInstinct = talent({
    name: "Uncanny Instinct",
    slug: SLUG,
    category: "ascendant-adept",
    img: IMG,
    description: `
${flavour("You have never once been genuinely surprised. The ambush announces itself in some small wrongness you could not name if pressed, and the blow arriving from behind finds you already turning, already moving, already somewhere less convenient to hit.")}
${levelBlock("1st Level", ["You cannot be surprised.", "+2 circumstance bonus to initiative and to Perception checks to Seek."])}
${levelBlock("5th Level", ["You automatically Seek in a 30-foot emanation at the start of each of your turns without spending an action."])}
${levelBlock("10th Level", ["You are never Off-Guard to creatures you can perceive.", "You cannot be flanked."])}
${levelBlock("15th Level", ["Once per round, when you are hit by an attack, you may reduce the damage by half as a reaction."])}
<hr />
<p><strong>In Foundry:</strong> the initiative and Seek bonuses apply, you cannot be flanked or made Off-Guard by flanking from 10th, and Instinctive Guard is on your Actions tab from 15th.</p>
<p>For the table: not being surprised, the free Seek each turn from 5th (roll Perception from your sheet), and Off-Guard from sources other than flanking against creatures you can perceive.</p>
`.trim(),
    rules: [
        { key: "FlatModifier", selector: "initiative", slug: `${SLUG}-initiative`, label: "ASCENDANT.Rules.UncannyInstinct", type: "circumstance", value: 2 },
        { key: "FlatModifier", selector: "perception", slug: `${SLUG}-seek`, label: "ASCENDANT.Rules.UncannyInstinct", type: "circumstance", value: 2, predicate: ["action:seek"] },
        { key: "ActiveEffectLike", mode: "override", path: "system.attributes.flanking.flankable", value: false, predicate: [atLeast(10)] },
        { key: "ActiveEffectLike", mode: "override", path: "system.attributes.flanking.offGuardable", value: false, predicate: [atLeast(10)] },
        grantBetween(PACK, `${SLUG}-guard`, 15),
        ...grants,
    ],
});

export default [uncannyInstinct, instinctiveGuard, ...subFeats];
