import { talent, uuidFor, GRANT_TAG } from "../lib/item.mjs";
import { RANK_BONUS, RANK_VALUE } from "../lib/rules.mjs";
import { enhancedDefense, ENHANCED_DEFENSE_TEXT } from "./enhanced-defense.mjs";

const PACK = "ascendant-core";
const SLUG = "weapon-expertise";
const IMG = "icons/skills/melee/blade-tips-triple-bent-white.webp";

/**
 * Weapon Expertise (Expertise Track).
 *
 * The ranks are set by the `AscendantWeaponExpertise` rule element (`scripts/weapon-expertise.mjs`):
 * every trained weapon proficiency, keyed entries such as the Gunslinger's firearms included, goes one
 * rank above what the classes grant and never below the minimum, with the faster ladder for a
 * proficiency a class made Expert at 1st. It also adds Mythic and the 15th-level die per weapon.
 * Static ActiveEffectLike paths cannot do this: keyed entries are named by class and by choice, and
 * the +1 must follow class features that raise ranks in the same rule pass.
 *
 * The damage bonus "equal to your proficiency rank" (4 Expert, 6 Master, 8 Legendary, 10 Mythic) is
 * PF2e's own Weapon Specialization construction (Migration857): a FlatModifier for the lowest step and
 * AdjustModifier upgrades keyed on `item:proficiency:rank:N`, the Strike's rank after every entry that
 * covers the weapon has been compared. The rule element adds the Mythic step.
 */
const LEVELS = [
    { level: 5, name: "Master", text: "Your weapon proficiency rank is at least <strong>Master</strong>." },
    { level: 10, name: "Legendary", text: "Your weapon proficiency rank is at least <strong>Legendary</strong>." },
    { level: 15, name: "Mythic", text: "Your weapon proficiency rank is at least <strong>Mythic</strong>, a proficiency bonus equal to your level + 10." },
];

const subFeats = LEVELS.map(({ level, text }) =>
    talent({
        name: `Weapon Expertise (${level}th)`,
        slug: `${SLUG}-${level}`,
        category: "ascendant-grant",
        otherTags: [GRANT_TAG],
        level,
        img: IMG,
        description: `<p><strong>${level}th Level</strong></p><ul><li>${text}</li></ul><p>Granted automatically by Weapon Expertise at ${level}th level. The rank change is applied by the track itself; this feat records that it has arrived.</p>`,
    }),
);

const damageRider = {
    key: "FlatModifier",
    selector: "strike-damage",
    slug: `${SLUG}-damage`,
    label: "ASCENDANT.Rules.WeaponDamage",
    type: "untyped",
    value: RANK_BONUS.expert,
    predicate: [{ gte: ["item:proficiency:rank", RANK_VALUE.expert] }],
    hideIfDisabled: true,
};

const riderStep = (rank, value) => ({
    key: "AdjustModifier",
    selector: "strike-damage",
    slug: `${SLUG}-damage`,
    mode: "upgrade",
    value,
    predicate: [`item:proficiency:rank:${rank}`],
});

export const weaponExpertise = talent({
    name: "Weapon Expertise",
    slug: SLUG,
    category: "ascendant-core",
    img: IMG,
    description: `
<p><em>Expertise Track. Applies to all weapon and unarmed attacks you are trained in, regardless of group or category.</em></p>
<p><strong>From 1st Level</strong></p>
<ul>
<li>Your proficiency rank is one rank higher than your classes would normally grant, up to Mythic.</li>
<li>Add a damage bonus to your Strikes equal to your proficiency rank.</li>
</ul>
<p><strong>Minimum Rank</strong></p>
<ul>
<li>Your proficiency rank is at least Master at 5th level, Legendary at 10th, and Mythic at 15th.</li>
</ul>
<p><strong>Classes That Begin at Expert</strong></p>
<ul>
<li>If a class makes you Expert with a weapon at 1st level, as the Fighter and Gunslinger do, you stay a rank ahead of the minimum with it: Master at 1st, Legendary at 5th, and Mythic at 13th.</li>
<li>At 15th level, your Strikes with those weapons gain one additional weapon damage die. This stacks with striking runes.</li>
</ul>
${ENHANCED_DEFENSE_TEXT}
<h3>Mythic Proficiency</h3>
<p>Mythic is a new proficiency rank found only through this ruleset, granting a proficiency bonus equal to your level + 10.</p>
<hr />
<p><strong>In Foundry:</strong> every weapon proficiency you are trained in is one rank above what your classes give and never below the minimum, including weapon-group proficiencies such as the Gunslinger's firearms and crossbows. A proficiency either class made Expert at 1st level follows the Master, Legendary, Mythic ladder from 1st, 5th and 13th. Mythic shows on the Strike's attack breakdown as <strong>Mythic</strong>, worth your level + 10; the sheet's proficiency list stops at Legendary, which is the highest rank PF2e stores. The damage bonus follows the rank of the weapon you strike with: 4 Expert, 6 Master, 8 Legendary, 10 Mythic. From 15th, a Strike with an Expert-start weapon adds one die of that weapon's own damage die, which stacks with striking runes and doubles on a critical hit. The Enhanced Defense increase applies automatically. A character built before version 0.1.3 keeps the old ranks until the GM runs <strong>Refresh talent rules</strong>.</p>
`.trim(),
    rules: [
        { key: "AscendantWeaponExpertise" },
        damageRider,
        riderStep(RANK_VALUE.master, RANK_BONUS.master),
        riderStep(RANK_VALUE.legendary, RANK_BONUS.legendary),
        enhancedDefense,
        ...LEVELS.map(({ level }) => ({
            key: "GrantItem",
            uuid: uuidFor(PACK, `${SLUG}-${level}`),
            allowDuplicate: false,
            reevaluateOnUpdate: true,
            predicate: [{ gte: ["self:level", level] }],
        })),
    ],
});

export default [weaponExpertise, ...subFeats];
