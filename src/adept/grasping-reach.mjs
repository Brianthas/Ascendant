import { talent } from "../lib/item.mjs";
import { byLevel } from "../lib/rules.mjs";
import { levelChain, atLeast, flavour, levelBlock } from "../lib/grants.mjs";

const PACK = "ascendant-adept";
const SLUG = "grasping-reach";
const IMG = "icons/skills/melee/strike-polearm-glowing-white.webp";

/**
 * Adept: Grasping Reach. PF2e derives every melee Strike's reach from
 * `system.attributes.reach.base` plus the weapon's own reach trait, so adding
 * to the base reaches every melee weapon and unarmed Strike at once (verified
 * live). 5 feet at 1st, 10 at 5th, 15 at
 * 15th. Interacting at range, the forced movement and the free maneuver are
 * on the text, with a Note on melee hits from 10th.
 */
const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "Grasping Reach",
    img: IMG,
    levels: [
        { level: 5, text: levelBlock("5th Level", ["Your reach increases by another 5 feet.", "You may Interact with objects anywhere within your reach."]) },
        { level: 10, text: levelBlock("10th Level", ["Once per round, when you hit a creature within your reach, you may move it up to 10 feet in any direction as a free action."]) },
        { level: 15, text: levelBlock("15th Level", ["Your reach increases by another 5 feet.", "The forced movement increases to 15 feet.", "Once per round, you may Grab, Shove, Trip, or Disarm a creature within your reach as a free action."]) },
    ],
});

export const graspingReach = talent({
    name: "Grasping Reach",
    slug: SLUG,
    category: "ascendant-adept",
    img: IMG,
    description: `
${flavour("Your reach extends considerably past where your reach ought to end. Enemies who thought themselves safely spaced find themselves seized, dragged, and repositioned, and objects on the far side of a room are no longer meaningfully on the far side of anything.")}
${levelBlock("1st Level", ["Your melee unarmed Strikes and melee weapons you wield gain the reach trait, or increase their reach by 5 feet if they already have it."])}
${levelBlock("5th Level", ["Your reach increases by another 5 feet.", "You may Interact with objects anywhere within your reach."])}
${levelBlock("10th Level", ["Once per round, when you hit a creature within your reach, you may move it up to 10 feet in any direction as a free action."])}
${levelBlock("15th Level", ["Your reach increases by another 5 feet.", "The forced movement increases to 15 feet.", "Once per round, you may Grab, Shove, Trip, or Disarm a creature within your reach as a free action."])}
<hr />
<p><strong>In Foundry:</strong> your reach is raised automatically: 5 feet at 1st, 10 at 5th, 15 at 15th, on top of any reach a weapon already has.</p>
<p>For the table: Interacting at reach, the forced movement on a hit from 10th (a note on your melee hits reminds you), and the free maneuver from 15th.</p>
`.trim(),
    rules: [
        {
            key: "ActiveEffectLike",
            mode: "add",
            path: "system.attributes.reach.base",
            value: byLevel([[1, 5], [5, 10], [15, 15]]),
        },
        {
            key: "Note",
            selector: "strike-attack-roll",
            title: "Grasping Reach",
            text: "ASCENDANT.Note.GraspingReachMove",
            outcome: ["success", "criticalSuccess"],
            predicate: [atLeast(10), "item:melee"],
        },
        ...grants,
    ],
});

export default [graspingReach, ...subFeats];
