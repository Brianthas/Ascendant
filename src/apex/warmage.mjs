import { talent, actionItem } from "../lib/item.mjs";
import { levelChain, grantBetween, atLeast, flavour, levelBlock } from "../lib/grants.mjs";
import { mythic } from "../lib/rules.mjs";
import { WEAPON_MYTHIC_OPTION } from "../../scripts/constants.mjs";

const PACK = "ascendant-apex";
const SLUG = "warmage";
const IMG = "icons/magic/fire/dagger-rune-enchant-flame-blue-yellow.webp";

/** Spell proficiency, weapon proficiencies, and the attack ranks a class writes. */
const SPELL_RANK = "system.proficiencies.spellcasting.rank";
const ATTACK_RANKS = ["simple", "martial", "advanced", "unarmed"].map((c) => `system.proficiencies.attacks.${c}.rank`);

/**
 * After Weapon Expertise's rule element (priority 100), so a Weapon Expertise Warmage's spell rank is
 * raised to the weapon rank with the track's +1 in it. At the `upgrade` default of 40 these ran
 * first and saw the class rank only: Expert, not Master, for a Fighter/Wizard at 1st.
 */
const CROSS_RAISE_PRIORITY = 110;

/**
 * Apex: Warmage.
 *
 * "Use the higher of your weapon statistics or your spell statistics" has two
 * halves. The proficiency half is written both ways: every attack rank is
 * upgraded to the spellcasting rank, and the spellcasting rank to the highest
 * attack rank, with `upgrade` so neither can lower the other. The value reads
 * the other field off the actor in the `applyAEs` phase, after PF2e has set
 * every rank from the class and after Weapon Expertise has raised them
 * (`CROSS_RAISE_PRIORITY`).
 *
 * The attribute half rides on PF2e's stacking rule: a statistic keeps only
 * the highest ability-typed modifier, so adding the other side's attribute as
 * an ability modifier is exactly "use the higher of". On spell attacks and
 * DCs, Strength and Dexterity are both offered and the higher wins against the
 * entry's own attribute. On Strikes, the spellcasting attribute is not a roll
 * option, so a ChoiceSet asks which it is and one ability modifier is added
 * for the answer; the breakdown then shows that attribute as the enabled one
 * where it is higher than the weapon's. A FlatModifier's `ability` field
 * cannot be fed indirectly, so it is one rule per attribute with a literal
 * value and a predicate on the choice.
 *
 * Spellstrike and Reactive Spellstrike are activities on the Actions tab; the
 * 5th-level cost is a swap of items. The critical-hit carry and the MAP
 * exemption from 10th, and casting two spells from 20th, are on the text with
 * a note on the Strike.
 */
const CASTER_OPTION = "ascendant-warmage-attribute";
const CASTER_ATTRIBUTES = ["int", "wis", "cha"];
export const spellstrike2 = actionItem({
    slug: `${SLUG}-spellstrike`,
    name: "Spellstrike",
    actionType: "action",
    actions: 2,
    traits: ["magical"],
    img: IMG,
    description: `
<p>Make a melee Strike and Cast a Spell as part of the same activity. The spell may be any spell you can cast with a casting time of 3 actions or fewer, targeting whatever it normally targets.</p>
<ul><li>If the spell requires a spell attack roll against the creature you Struck, use the Strike's attack roll for both.</li></ul>
<hr />
<p>Roll the Strike from your Actions tab, then cast the spell from your Spellcasting tab. From 10th a critical hit makes a spell delivered against that target critical too, and this Strike does not count against your multiple attack penalty; from 20th you may cast two spells.</p>
`.trim(),
});

export const spellstrike1 = actionItem({
    ...spellstrike2,
    _id: undefined,
    slug: `${SLUG}-spellstrike-swift`,
    name: "Spellstrike (1 action)",
    actionType: "action",
    actions: 1,
    traits: ["magical"],
    img: IMG,
    description: spellstrike2.system.description.value.replace("<hr />", "<p>From 5th level, Spellstrike costs 1 action.</p><hr />"),
});

export const reactiveSpellstrike = actionItem({
    slug: `${SLUG}-reactive-spellstrike`,
    name: "Reactive Spellstrike",
    actionType: "reaction",
    traits: ["magical"],
    img: IMG,
    description: `<p><strong>Trigger</strong> A creature within your reach uses an action that would trigger a Reactive Strike, or moves within your reach.</p><p><strong>Effect</strong> You Spellstrike that creature.</p>`,
});

const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "Warmage",
    img: IMG,
    levels: [
        { level: 5, text: levelBlock("5th Level", ["Spellstrike costs 1 action."]) },
        { level: 10, text: levelBlock("10th Level", ["On a critical hit with the Strike, a spell delivered against that target is also critical.", "Spellstrike no longer counts against your multiattack penalty."]) },
        { level: 15, text: levelBlock("15th Level", ["Gain Reactive Spellstrike.<ul><li><strong>Reactive Spellstrike</strong> [reaction] <strong>Trigger</strong> A creature within your reach uses an action that would trigger a Reactive Strike, or moves within your reach. <strong>Effect</strong> You Spellstrike that creature.</li></ul>"]) },
        { level: 20, text: levelBlock("20th Level", ["When you Spellstrike, you may Cast two spells rather than one."]) },
    ],
});

const cap = (a) => a.charAt(0).toUpperCase() + a.slice(1);

export const warmage = talent({
    name: "Warmage",
    slug: SLUG,
    category: "ascendant-apex",
    img: IMG,
    description: `
${flavour("You were never able to see why the choice was necessary. The blade goes where the spell goes, arrives in the same instant, and draws on the same trained certainty, and the enemy who prepared for one of them prepared for half a problem.")}
${levelBlock("1st Level", ["For all Strikes, spell attack rolls, and spell DCs, use the higher of your weapon statistics or your spell statistics, covering both proficiency rank and attribute modifier.", "Gain Spellstrike.<ul><li><strong>Spellstrike</strong> [2 actions] Make a melee Strike and Cast a Spell as part of the same activity. The spell may be any spell you can cast with a casting time of 3 actions or fewer, targeting whatever it normally targets.</li><li>If the spell requires a spell attack roll against the creature you Struck, use the Strike's attack roll for both.</li></ul>"])}
${levelBlock("5th Level", ["Spellstrike costs 1 action."])}
${levelBlock("10th Level", ["On a critical hit with the Strike, a spell delivered against that target is also critical.", "Spellstrike no longer counts against your multiattack penalty."])}
${levelBlock("15th Level", ["Gain Reactive Spellstrike.<ul><li><strong>Reactive Spellstrike</strong> [reaction] <strong>Trigger</strong> A creature within your reach uses an action that would trigger a Reactive Strike, or moves within your reach. <strong>Effect</strong> You Spellstrike that creature.</li></ul>"])}
${levelBlock("20th Level", ["When you Spellstrike, you may Cast two spells rather than one."])}
<hr />
<p><strong>In Foundry:</strong> name your spellcasting attribute when you take this talent. Your weapon proficiency ranks and your spellcasting rank are each raised to the higher of the two; your Strikes use the higher of the weapon's attribute and your spellcasting attribute, and your spell attack and DC the higher of your spellcasting attribute and Strength or Dexterity. The attack breakdown names whichever attribute won. Mythic crosses over too: with Weapon Expertise your spell attack and DC are Mythic once any weapon you are trained in is, and with Spellcasting Expertise your Strikes with weapons you are trained in are Mythic from 15th. Spellstrike is on your Actions tab, replaced by the 1-action version at 5th, and Reactive Spellstrike arrives at 15th.</p>
<p>For the table: the critical-hit carry and MAP exemption from 10th, and the second spell from 20th. A note on every Strike reminds you.</p>
`.trim(),
    rules: [
        // Rank: each side raised to the other, never lowered.
        // Every rank is raised to the highest of all five, not to the other side's rank as it
        // stands when the rule runs. The rules on one item apply in order, so an attack rank
        // read the spell rank before the spell-rank rule below had raised it: measured on
        // 2026-09-14, a character at trained spellcasting with martial at master kept advanced
        // at expert. "The higher of" each side, applied to both sides, is the maximum of all.
        ...ATTACK_RANKS.map((path) => ({
            key: "ActiveEffectLike",
            mode: "upgrade",
            path,
            phase: "applyAEs",
            priority: CROSS_RAISE_PRIORITY,
            value: `ternary(gte(@actor.${path}, 1), max(@actor.${SPELL_RANK}, ${ATTACK_RANKS.map((p) => `@actor.${p}`).join(", ")}), 0)`,
        })),
        {
            key: "ActiveEffectLike",
            mode: "upgrade",
            path: SPELL_RANK,
            phase: "applyAEs",
            priority: CROSS_RAISE_PRIORITY,
            value: `max(@actor.${SPELL_RANK}, ${ATTACK_RANKS.map((p) => `@actor.${p}`).join(", ")})`,
        },
        // Mythic crosses over too. The stored rank stops at 4, so a track's Mythic is not in the
        // rank the rules above copy: the weapon track overrides the Strike's proficiency modifier
        // and the spell track adds a flat +2 (see the two track files). Each is applied to the
        // other side here, keyed to the track the character has. Measured before this existed,
        // 2026-09-14: a 15th-level Wizard's spell attack read 33 with Mythic and the Staff Strike
        // 31 without it.
        // Spell track to Strikes: weapons you are trained in only, as on the weapon track.
        ...mythic({ selectors: ["strike-attack-roll"], level: 15 }).map((rule) => ({
            ...rule,
            predicate: [...rule.predicate, "feat:ascendant-spellcasting-expertise", { gte: ["item:proficiency:rank", 1] }],
        })),
        // Weapon track to spells: when any trained weapon is Mythic, which is 13th for a weapon a
        // class made Expert at 1st and 15th otherwise. The weapon track's rule element sets the option.
        {
            key: "FlatModifier",
            selector: "spell-attack-dc",
            slug: `ascendant-${SLUG}-mythic`,
            label: "ASCENDANT.Proficiency.Mythic",
            type: "untyped",
            value: 2,
            predicate: [WEAPON_MYTHIC_OPTION],
        },
        // Attribute: on spell attacks and DCs, the best attack attribute as an ability modifier.
        // Str and Dex are the only attributes a Strike uses, so those two are offered.
        ...["str", "dex"].map((attribute) => ({
            key: "FlatModifier",
            selector: ["spell-attack", "spell-dc"],
            slug: `${SLUG}-${attribute}`,
            label: `PF2E.Ability${cap(attribute)}`,
            type: "ability",
            ability: attribute,
            hideIfDisabled: true,
        })),
        // And on Strikes, the spellcasting attribute the player named.
        {
            key: "ChoiceSet",
            slug: "warmageAttribute",
            rollOption: CASTER_OPTION,
            prompt: "ASCENDANT.Rules.WarmageAttributePrompt",
            adjustName: false,
            choices: CASTER_ATTRIBUTES.map((a) => ({ value: a, label: `PF2E.Ability${cap(a)}` })),
        },
        ...CASTER_ATTRIBUTES.map((attribute) => ({
            key: "FlatModifier",
            selector: "strike-attack-roll",
            slug: `${SLUG}-strike-${attribute}`,
            label: `PF2E.Ability${cap(attribute)}`,
            type: "ability",
            ability: attribute,
            predicate: [`${CASTER_OPTION}:${attribute}`],
            hideIfDisabled: true,
        })),
        grantBetween(PACK, `${SLUG}-spellstrike`, 1, 5),
        grantBetween(PACK, `${SLUG}-spellstrike-swift`, 5),
        grantBetween(PACK, `${SLUG}-reactive-spellstrike`, 15),
        {
            key: "Note",
            selector: "strike-attack-roll",
            title: "Warmage",
            text: "ASCENDANT.Note.Warmage",
            predicate: [atLeast(10), "item:melee"],
        },
        ...grants,
    ],
});

export default [warmage, spellstrike2, spellstrike1, reactiveSpellstrike, ...subFeats];
