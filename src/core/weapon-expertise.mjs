import { talent, uuidFor, GRANT_TAG } from "../lib/item.mjs";
import { byLevel, mythic, RANK_VALUE } from "../lib/rules.mjs";
import { enhancedDefense, ENHANCED_DEFENSE_TEXT } from "./enhanced-defense.mjs";

const PACK = "ascendant-core";
const SLUG = "weapon-expertise";
const IMG = "icons/skills/melee/blade-tips-triple-bent-white.webp";

/** The four stored weapon proficiency ranks. Class proficiencies land in these. */
const ATTACK_RANKS = ["simple", "martial", "advanced", "unarmed"].map(
    (category) => `system.proficiencies.attacks.${category}.rank`,
);

/**
 * Weapon Expertise (Expertise Track).
 *
 * Bryan's ruling on "begins one rank higher than normal" followed by "Master,
 * then Legendary, then Mythic" at 5th, 10th and 15th: the +1 applies from 1st
 * to 4th level, and from 5th the printed ranks are floors, raised with `upgrade`
 * so a class already higher keeps its own rank.
 *
 * "All weapon and unarmed attacks you are trained in": the +1 is written as
 * `ternary(gte(<rank>, 1), 1, 0)` so an untrained category stays untrained.
 * `ternary`, `gte` and the rest are PF2e's own additions to the resolver's
 * math (pf2e.mjs:119127). Runs in `applyAEs`, after the Dual Class merge has
 * raised each rank to the best of the classes.
 *
 * The damage bonus is the proficiency rider (4 Expert, 6 Master, 8 Legendary,
 * 10 Mythic), derived from the GM Notes table: rider 8 at 1st is Expert 4 plus
 * attribute 4, rider 18 at 15th is Mythic 10 plus attribute 8.
 */
const LEVELS = [
    { level: 5, name: "Master", text: "Your weapon proficiency rank becomes <strong>Master</strong>." },
    { level: 10, name: "Legendary", text: "Your weapon proficiency rank becomes <strong>Legendary</strong>." },
    { level: 15, name: "Mythic", text: "Your weapon proficiency rank becomes <strong>Mythic</strong>, a proficiency bonus equal to your level + 10." },
];

const subFeats = LEVELS.map(({ level, name, text }) =>
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

export const weaponExpertise = talent({
    name: "Weapon Expertise",
    slug: SLUG,
    category: "ascendant-core",
    img: IMG,
    description: `
<p><em>Expertise Track. Applies to all weapon and unarmed attacks you are trained in, regardless of group or category.</em></p>
<p><strong>1st Level</strong></p>
<ul>
<li>Your proficiency rank begins one rank higher than normal.</li>
<li>Add a damage bonus to your Strikes equal to your proficiency rank.</li>
</ul>
<p><strong>5th / 10th / 15th Level</strong></p>
<ul>
<li>Master, then Legendary, then Mythic.</li>
</ul>
${ENHANCED_DEFENSE_TEXT}
<h3>Mythic Proficiency</h3>
<p>Mythic is a new proficiency rank found only through this ruleset, granting a proficiency bonus equal to your level + 10.</p>
<hr />
<p><strong>In Foundry:</strong> from 1st to 4th level every weapon category you are trained in is one rank higher. From 5th level your rank is at least Master, from 10th at least Legendary, and from 15th your Strike attack rolls read <strong>Mythic</strong>, worth your level + 10. The damage bonus (4 Expert, 6 Master, 8 Legendary, 10 Mythic) and the Enhanced Defense increase apply automatically.</p>
`.trim(),
    rules: [
        // 1st to 4th: one rank higher, only where already trained.
        ...ATTACK_RANKS.map((path) => ({
            key: "ActiveEffectLike",
            slug: `${SLUG}-plus-one`,
            mode: "add",
            path,
            phase: "applyAEs",
            value: `ternary(gte(@actor.${path}, 1), 1, 0)`,
            predicate: [{ lte: ["self:level", 4] }],
        })),
        // 5th and 10th: floors.
        ...ATTACK_RANKS.map((path) => ({
            key: "ActiveEffectLike",
            slug: `${SLUG}-floor`,
            mode: "upgrade",
            path,
            phase: "applyAEs",
            value: byLevel([[5, RANK_VALUE.master], [10, RANK_VALUE.legendary]]),
            predicate: [{ gte: ["self:level", 5] }],
        })),
        // 15th: Mythic on the attack roll itself.
        ...mythic({ selectors: ["strike-attack-roll"], level: 15 }),
        // "Equal to your proficiency rank": twice the stored rank of the weapon's own
        // category (Trained 2 ... Legendary 8), read off the actor, keyed to the
        // category by the Strike's `item:category:<c>` option. Verified live on
        // 2026-09-14: a level-keyed ladder gave +4 to a fighter already Master at 1st.
        // Mythic leaves the stored rank at 4, so 15th adds the last 2.
        ...["simple", "martial", "advanced", "unarmed"].map((category) => ({
            key: "FlatModifier",
            selector: "strike-damage",
            slug: `${SLUG}-damage`,
            label: "ASCENDANT.Rules.WeaponDamage",
            type: "untyped",
            value: `2 * @actor.system.proficiencies.attacks.${category}.rank`,
            predicate: [`item:category:${category}`],
        })),
        {
            key: "FlatModifier",
            selector: "strike-damage",
            slug: `${SLUG}-damage-mythic`,
            label: "ASCENDANT.Rules.WeaponDamageMythic",
            type: "untyped",
            value: 2,
            predicate: [{ gte: ["self:level", 15] }],
        },
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
