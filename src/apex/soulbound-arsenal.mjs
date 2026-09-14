import { talent, actionItem } from "../lib/item.mjs";
import { byLevel } from "../lib/rules.mjs";
import { levelChain, grantNow, grantBetween, atLeast, flavour, levelBlock } from "../lib/grants.mjs";

const PACK = "ascendant-apex";
const SLUG = "soulbound-arsenal";
const MARK = "soulbound-arsenal";
const IMG = "icons/weapons/swords/sword-guard-purple.webp";
const CRIT_SPEC = "ascendant-soulbound-crit-spec";
const MATERIAL = "ascendant-soulbound-material";

/** The four attack proficiency ranks a class writes. */
const ATTACK_RANKS = ["simple", "martial", "advanced", "unarmed"].map((c) => `@actor.system.proficiencies.attacks.${c}.rank`);

const POTENCY = byLevel([[1, 1], [7, 2], [13, 3], [17, 4]]);
const STRIKING = byLevel([[1, 1], [9, 2], [15, 3]]);

/** Every weapon group with a critical specialization effect. */
const CRIT_SPEC_GROUPS = [
    "axe", "bow", "brawling", "club", "crossbow", "dart", "firearm", "flail",
    "hammer", "knife", "polearm", "shield", "sling", "spear", "sword",
];

/**
 * The three groups whose critical specialization is bleed rather than prose:
 * PF2e's `#getEffect` returns one die of persistent bleed plus an item bonus
 * equal to the weapon's potency for these and carries no localisation key.
 */
const BLEED_DIE = { crossbow: 8, dart: 6, knife: 6 };

/**
 * The materials that bypass something. The clause strips every other property
 * and fixes the grade, so the rest would be dropdown noise (Bryan's ruling,
 * 2026-09-14). Slugs and labels read off pf2e.mjs and lang/en.json.
 */
const MATERIALS = ["cold-iron", "silver", "adamantine", "dawnsilver", "sovereign-steel"];

/**
 * Apex: Soulbound Arsenal.
 *
 * The weapon is a real weapon item the player nominates by the
 * `soulbound-arsenal` tag on its Details tab (the tag is registered so the
 * picker offers it). Changing form is scripts/soulbound.mjs: it creates the
 * new base weapon, carries the tag, equipment state and property runes across,
 * and deletes the old one, because no rule element rewrites a weapon's
 * identity.
 *
 * Proficiency: a MartialProficiency scoped to the tag, whose rank is the
 * highest of the four attack ranks, read off the actor in the same phase.
 * Mythic from the Weapon Expertise track applies to every Strike and so to
 * this one. Potency and striking are ItemAlterations in `upgrade` mode on the
 * tagged weapon; the script also writes them into the stored item, because
 * PF2e clamps property runes against the stored potency while the weapon
 * prepares itself, before any rule element runs (measured: stored potency 0
 * gives zero rune slots whatever the derived potency).
 *
 * The material is a dial: one AdjustStrike per precious material adding it
 * to the tagged weapon's damage, predicated on the dropdown. The critical
 * specialization group is a second dial, granting access from 5th and the
 * chosen group's effect as an alternate. Deadly d12 from 15th is a trait
 * addition. Bonded Strike is a reaction item; the weapon's own reactions,
 * returning to hand, never being disarmed, acting independently and the
 * number of form changes per round are on the text.
 */
export const reshape = actionItem({
    slug: `${SLUG}-reshape`,
    name: "Reshape Bonded Weapon",
    actionType: "free",
    traits: [],
    img: IMG,
    description: `
<p>As a free action once per round, your bonded weapon takes the form of any simple, martial, or advanced melee or ranged weapon. Ranged forms generate their own ammunition and never need reloading.</p>
<ul>
<li>From 3rd level, whenever you change its form, choose one precious material. It counts as that material for overcoming resistances, weaknesses, and immunities.</li>
<li>From 5th level, choose a weapon group whose critical specialization effect it has, changeable whenever you change its form.</li>
<li>Twice per round from 11th; any number of times from 19th.</li>
</ul>
<hr />
<p>Press <strong>Reshape</strong> on the card this posts and pick the new form. Set the material and critical specialization group in the dropdowns in your effects panel.</p>
`.trim(),
});

export const bondedStrike = actionItem({
    slug: `${SLUG}-bonded-strike`,
    name: "Bonded Strike",
    actionType: "reaction",
    traits: [],
    img: IMG,
    description: `
<p><strong>Trigger</strong> An enemy moves within the weapon's reach.</p>
<p><strong>Effect</strong> The weapon Strikes that enemy. This Strike neither counts toward nor against your multiattack penalty.</p>
<hr />
<p>The weapon has its own reaction each round for this, separate from yours; a second from 15th level. From 9th it may use Bonded Strike even while you are Grabbed, Restrained, Immobilized, or unconscious. Roll the Strike from your Actions tab and ignore the multiple attack penalty on it.</p>
`.trim(),
});

const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "Soulbound Arsenal",
    img: IMG,
    levels: [
        { level: 3, text: levelBlock("3rd Level", ["Whenever you change its form, choose one precious material. It counts as that material for overcoming resistances, weaknesses, and immunities.<ul><li>It gains none of that material's other properties, and its grade is the highest available at your level.</li></ul>", "The weapon gains its own reaction each round, separate from yours, usable only for Bonded Strike."]) },
        { level: 5, text: levelBlock("5th Level", ["+1 striking with one property rune.", "Choose a weapon group. You gain its critical specialization effect with this weapon in any form, and may change the group whenever you change its form."]) },
        { level: 7, text: levelBlock("7th Level", ["+2 striking, two property runes."]) },
        { level: 9, text: levelBlock("9th Level", ["+2 greater striking, two property runes.", "The weapon acts independently using your statistics, and may use Bonded Strike even while you are Grabbed, Restrained, Immobilized, or unconscious."]) },
        { level: 11, text: levelBlock("11th Level", ["You may change the weapon's form twice per round."]) },
        { level: 13, text: levelBlock("13th Level", ["+3 greater striking, three property runes."]) },
        { level: 15, text: levelBlock("15th Level", ["+3 major striking. Gains the deadly d12 trait.", "The weapon gains a second reaction each round, usable only for Bonded Strike."]) },
        { level: 17, text: levelBlock("17th Level", ["+4 major striking, four property runes."]) },
        { level: 19, text: levelBlock("19th Level", ["You may change the weapon's form any number of times per round."]) },
    ],
});

const capitalise = (s) => s.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

export const soulboundArsenal = talent({
    name: "Soulbound Arsenal",
    slug: SLUG,
    category: "ascendant-apex",
    img: IMG,
    description: `
${flavour("The weapon is not carried so much as recalled. It answers to a shape you hold in mind rather than a shape it was forged into, it cannot be taken from you by any means, and on the days you are too broken to lift it, it has been known to fight on without you.")}
${levelBlock("1st Level", ["Gain a bonded weapon. As a free action once per round it takes the form of any simple, martial, or advanced melee or ranged weapon.<ul><li>Ranged forms generate their own ammunition and never need reloading.</li></ul>", "It cannot be disarmed, stolen, or left behind, and returns to your hand at the start of your turn.", "It is a +1 striking weapon.", "Your proficiency rank with it equals your highest weapon or unarmed proficiency rank, regardless of its current form."])}
${levelBlock("3rd Level", ["Whenever you change its form, choose one precious material. It counts as that material for overcoming resistances, weaknesses, and immunities.<ul><li>It gains none of that material's other properties, and its grade is the highest available at your level.</li></ul>", "The weapon gains its own reaction each round, separate from yours, usable only for Bonded Strike.<ul><li><strong>Bonded Strike</strong> [reaction] <strong>Trigger</strong> An enemy moves within the weapon's reach. <strong>Effect</strong> The weapon Strikes that enemy. This Strike neither counts toward nor against your multiattack penalty.</li></ul>"])}
${levelBlock("5th Level", ["+1 striking with one property rune.", "Choose a weapon group. You gain its critical specialization effect with this weapon in any form, and may change the group whenever you change its form."])}
${levelBlock("7th Level", ["+2 striking, two property runes."])}
${levelBlock("9th Level", ["+2 greater striking, two property runes.", "The weapon acts independently using your statistics, and may use Bonded Strike even while you are Grabbed, Restrained, Immobilized, or unconscious."])}
${levelBlock("11th Level", ["You may change the weapon's form twice per round."])}
${levelBlock("13th Level", ["+3 greater striking, three property runes."])}
${levelBlock("15th Level", ["+3 major striking. Gains the deadly d12 trait.", "The weapon gains a second reaction each round, usable only for Bonded Strike."])}
${levelBlock("17th Level", ["+4 major striking, four property runes."])}
${levelBlock("19th Level", ["You may change the weapon's form any number of times per round."])}
<p><em>Property runes are determined whenever you change the weapon's form and must be of a level equal to or less than your level + 2.</em></p>
<hr />
<p><strong>In Foundry:</strong> put any weapon in your inventory and add the <em>Soulbound Arsenal</em> tag under Other Tags on its Details tab. It then uses your highest weapon proficiency, carries the potency and striking runes for your level, counts as the precious material set in your effects panel (from 3rd), has the critical specialization of the group set there (from 5th), and gains deadly d12 at 15th. Use <strong>Reshape Bonded Weapon</strong> from your Actions tab to change its form; the dialog carries your property runes across and warns about any that would not work on the new form. Bonded Strike is on your Actions tab from 3rd.</p>
<p>For the table: the weapon's own reactions (one from 3rd, two from 15th), never being disarmed and returning to your hand, acting while you cannot from 9th, and the number of form changes per round. The property rune count (one at 5th, two at 7th, three at 13th, four at 17th) and their level cap are yours to keep; the reshape dialog states both.</p>
`.trim(),
    rules: [
        {
            key: "MartialProficiency",
            slug: SLUG,
            label: "ASCENDANT.Rules.SoulboundProficiency",
            definition: [`item:tag:${MARK}`],
            value: `max(${ATTACK_RANKS.join(", ")})`,
        },
        { key: "ItemAlteration", itemType: "weapon", mode: "upgrade", property: "runes-potency", value: POTENCY, predicate: [`item:tag:${MARK}`] },
        { key: "ItemAlteration", itemType: "weapon", mode: "upgrade", property: "runes-striking", value: STRIKING, predicate: [`item:tag:${MARK}`] },
        // Material, from 3rd: a dial and one AdjustStrike per material. The
        // weapon half is `definition`, the level and the dial are `predicate`:
        // AdjustStrike tests its predicate against the actor's options at
        // prepare time, and only `definition` is tested per weapon.
        {
            key: "RollOption",
            domain: "all",
            option: MATERIAL,
            label: "ASCENDANT.Rules.SoulboundMaterial",
            toggleable: true,
            alwaysActive: true,
            selection: "cold-iron",
            suboptions: MATERIALS.map((m) => ({ value: m, label: `PF2E.PreciousMaterial${capitalise(m).replace(/ /g, "")}` })),
            predicate: [atLeast(3)],
        },
        ...MATERIALS.map((material) => ({
            key: "AdjustStrike",
            mode: "add",
            property: "materials",
            definition: [`item:tag:${MARK}`],
            value: material,
            predicate: [atLeast(3), `${MATERIAL}:${material}`],
        })),
        // Critical specialization, from 5th: access, then the chosen group as an alternate.
        { key: "CriticalSpecialization", predicate: [`item:tag:${MARK}`, atLeast(5)] },
        {
            key: "RollOption",
            domain: "all",
            option: CRIT_SPEC,
            label: "ASCENDANT.Rules.SoulboundCritSpec",
            toggleable: true,
            alwaysActive: true,
            selection: "sword",
            suboptions: CRIT_SPEC_GROUPS.map((group) => ({ value: group, label: `PF2E.WeaponGroup${group[0].toUpperCase()}${group.slice(1)}` })),
            predicate: [atLeast(5)],
        },
        ...CRIT_SPEC_GROUPS.map((group) => ({
            key: "CriticalSpecialization",
            alternate: true,
            ...(BLEED_DIE[group]
                ? {
                    damageDice: { number: 1, faces: BLEED_DIE[group], damageType: "bleed" },
                    modifier: { type: "item", damageType: "bleed", value: POTENCY },
                }
                : { text: `PF2E.Item.Weapon.CriticalSpecialization.${group}` }),
            predicate: [`item:tag:${MARK}`, atLeast(5), `${CRIT_SPEC}:${group}`],
        })),
        { key: "ItemAlteration", itemType: "weapon", mode: "add", property: "traits", value: "deadly-d12", predicate: [`item:tag:${MARK}`, atLeast(15)] },
        grantNow(PACK, `${SLUG}-reshape`),
        grantBetween(PACK, `${SLUG}-bonded-strike`, 3),
        {
            key: "Note",
            selector: "strike-attack-roll",
            title: "Soulbound Arsenal",
            text: "ASCENDANT.Note.SoulboundReactions",
            predicate: [atLeast(3), `item:tag:${MARK}`],
            visibility: "owner",
        },
        ...grants,
    ],
});

export default [soulboundArsenal, reshape, bondedStrike, ...subFeats];
