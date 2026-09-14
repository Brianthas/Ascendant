/**
 * Shared PF2e rule element builders.
 *
 * The rules text repeats the same clauses across talents: the proficiency
 * ladder, the spell damage riders, the level ladders. Defining each once here
 * keeps them consistent and makes a correction a one-place edit. Every builder
 * below was verified live on PF2e 8.4.1 or 8.5.0.
 */

/** Proficiency bonus by rank, as the document states it: 4/6/8/10. */
export const RANK_BONUS = { expert: 4, master: 6, legendary: 8, mythic: 10 };

/** Numeric proficiency rank as PF2e stores it. There is no rank 5, see mythic(). */
export const RANK_VALUE = { trained: 1, expert: 2, master: 3, legendary: 4 };

/**
 * A resolvable value that steps through values at the given levels.
 *
 * PF2e 8.x no longer resolves the old `{brackets: [...]}` form. Migration 9xx
 * (pf2e.mjs:12653 #convertBracket) rewrites every bracket in the system's own
 * content into a `match(when(...), ...)` formula, and a bracket left in place
 * now resolves to NaN. Verified live: a bracketed Resistance gives "fire NaN",
 * the match form below gives the right value at every breakpoint.
 *
 * `steps` is [level, value] pairs in ascending level order. Below the first
 * step the formula yields nothing, so gate the rule with a predicate if the
 * absence of a value would be wrong.
 *
 * @param {Array<[number, number|string]>} steps
 * @param {string} [field] Value to switch on. Defaults to the actor's level.
 * @returns {string} A PF2e match() formula.
 */
export function byLevel(steps, field = "@actor.level") {
    const clauses = steps.map(([start, value], i) => {
        const next = steps[i + 1];
        return next
            ? `when(btwn(${field}, ${start}, ${next[0] - 1}), ${value})`
            : `when(gte(${field}, ${start}), ${value})`;
    });
    return `match(${clauses.join(", ")})`;
}

/**
 * Real Mythic proficiency.
 *
 * PF2e has no proficiency rank 5. `createProficiencyModifier` (pf2e.mjs:38235)
 * hard-clamps rank to 0-4 and reads its bonus from a local literal [0,2,4,6,8],
 * and every rank field caps at 4, so a stored rank of 5 is not reachable.
 *
 * What is reachable is the proficiency modifier itself. It carries
 * `slug: "proficiency"` and pulls adjustments from `synthetics.modifierAdjustments`,
 * so an AdjustModifier can override its value and relabel it. The result is not a
 * bonus stacked on top of Legendary: it replaces the proficiency modifier with
 * level + 10 and the breakdown reads "Mythic +N", which is what the document means.
 *
 * Verified live on PF2e 8.4.1: at level 1 with a level-15 gate the modifier is
 * untouched ("Untrained +0"); at level 15 it reads "Mythic +25".
 *
 * @param {object} options
 * @param {string[]} options.selectors Statistic domains to make Mythic, e.g. ["spell-attack", "spell-dc"].
 * @param {number} options.level Character level at which Mythic is gained.
 */
export function mythic({ selectors, level }) {
    return selectors.map((selector) => ({
        key: "AdjustModifier",
        selector,
        slug: "proficiency",
        mode: "override",
        value: "@actor.level + 10",
        relabel: "ASCENDANT.Proficiency.Mythic",
        predicate: [{ gte: ["self:level", level] }],
    }));
}

/**
 * A proficiency ladder: raise a stored rank at set levels, then go Mythic.
 *
 * @param {object} options
 * @param {string} options.path Data path of the stored rank, e.g. "system.proficiencies.classDC.rank".
 * @param {string[]} options.selectors Domains the Mythic step applies to.
 * @param {number} [options.expert] Level at which the rank becomes Expert.
 * @param {number} [options.master]
 * @param {number} [options.legendary]
 * @param {number} [options.mythicLevel] Level at which it becomes Mythic.
 * @param {string} [options.slug] Slug prefix for the generated rules.
 */
export function proficiencyLadder({ path, selectors, expert, master, legendary, mythicLevel, slug }) {
    const steps = [];
    if (expert !== undefined) steps.push([expert, RANK_VALUE.expert]);
    if (master !== undefined) steps.push([master, RANK_VALUE.master]);
    if (legendary !== undefined) steps.push([legendary, RANK_VALUE.legendary]);

    const rules = [];
    if (steps.length && path) {
        rules.push({
            key: "ActiveEffectLike",
            slug: slug ? `${slug}-rank` : undefined,
            mode: "upgrade",
            path,
            value: byLevel(steps),
        });
    }
    if (mythicLevel !== undefined) rules.push(...mythic({ selectors, level: mythicLevel }));
    return rules;
}

/**
 * The proficiency bonus the document tells you to add to a damage roll:
 * 4 for Expert, 6 for Master, 8 for Legendary, 10 for Mythic.
 *
 * @param {object} levels Level at which each rank is reached, e.g. {expert: 1, master: 5, legendary: 10, mythic: 15}.
 * @returns {string} A match() formula usable as a FlatModifier value.
 */
export function rankBonusByLevel({ expert, master, legendary, mythic: mythicLevel }) {
    const steps = [];
    if (expert !== undefined) steps.push([expert, RANK_BONUS.expert]);
    if (master !== undefined) steps.push([master, RANK_BONUS.master]);
    if (legendary !== undefined) steps.push([legendary, RANK_BONUS.legendary]);
    if (mythicLevel !== undefined) steps.push([mythicLevel, RANK_BONUS.mythic]);
    return byLevel(steps);
}

/** The six attributes, for choices that name one. */
export const ATTRIBUTES = ["str", "dex", "con", "int", "wis", "cha"];

/**
 * The recurring spell damage clause, quoted from the document:
 *
 *   "Spells you cast that deal damage add your spellcasting Stat's modifier as
 *    an Attribute Bonus plus the bonus you get from your Proficiency Rank
 *    (4 for Expert, 6 for Master, 8 for Legendary, and 10 for Mythic) as an
 *    Untyped Damage bonus to their damage roll."
 *
 * Two modifiers, because the document is explicit that they are different bonus
 * types: the attribute half is an Attribute bonus, the proficiency half untyped.
 *
 * The spellcasting attribute varies by class and by archetype, and cannot be fed
 * to FlatModifier's `ability` field indirectly: verified live, a literal
 * `ability: "cha"` applies "Charisma +4 [ability]" to spell damage, while
 * `ability: "{item|flags...}"` or
 * `ability: "{actor|system.details.keyability.value}"` silently applies nothing.
 * So there is one rule per attribute with a literal value, and the spell's own
 * roll options pick which one fires.
 *
 * `spellcasting:attribute:<attr>` is on every spell roll. The spellcasting entry
 * builds it in `getRollOptions` (pf2e.mjs:53343) for any tradition and any
 * category, and the spell folds its entry's options in with the `spellcasting`
 * prefix (pf2e.mjs:52878). Reading it beats asking: it follows the entry that
 * actually cast the spell, so a character with two entries on different
 * attributes gets the right one per spell, and it keeps up with a class or
 * archetype change on its own.
 *
 * This replaced a ChoiceSet that asked once at item creation, predicated on
 * `self:caster` so non-casters were not asked. That combination disabled the
 * whole item. An unresolved ChoiceSet does not skip only itself: its
 * constructor runs `for (let e of this.item.system.rules) e.ignored = !0`
 * (pf2e.mjs:42319), killing every rule on the item. Adding the item before
 * the spellcasting entry existed left the selection null and the predicate
 * false, so nothing prompted; adding the class afterwards made the predicate
 * true, and the kill-switch fired on every subsequent load.
 *
 * All six are registered and five are disabled at roll time, because the roll
 * option they test comes from the spell rather than the actor and so cannot be
 * decided while the item is prepared. `hideIfDisabled` keeps the five out of the
 * damage dialog, which otherwise lists every attribute struck through: the
 * dialog suppresses a modifier that was never enabled and carries the flag
 * (pf2e.mjs:18468), and PF2e uses it for the same purpose on Weapon
 * Specialization (pf2e.mjs:9423). Verified on a Charisma caster: without it the
 * dialog is handed six attribute rows, with it one.
 *
 * A single rule reading the attribute was tried first and does not work. With
 * `ability` or `value` set to an injected property - the class key attribute,
 * the spellcasting entry's attribute, the spell's own `@mod` - the rule element
 * is marked invalid and ignored, and no modifier reaches the roll at all. Four
 * such variants were tested live; only a literal attribute applies.
 *
 * Where two items both carry it, both attribute halves are `type: "ability"`
 * and PF2e keeps only the highest of a type, so they do not stack.
 *
 * @param {object} options
 * @param {string} options.slug The talent's slug, used to namespace the modifiers.
 * @param {object} options.ranks Levels at which each proficiency rank is reached.
 */
export function spellDamageBonus({ slug, ranks }) {
    return [
        ...ATTRIBUTES.map((attribute) => ({
            key: "FlatModifier",
            selector: "spell-damage",
            slug: `${slug}-attribute`,
            label: "ASCENDANT.Rules.SpellDamageAttribute",
            type: "ability",
            ability: attribute,
            predicate: [`spellcasting:attribute:${attribute}`],
            hideIfDisabled: true,
        })),
        {
            key: "FlatModifier",
            selector: "spell-damage",
            slug: `${slug}-proficiency`,
            label: "ASCENDANT.Rules.SpellDamageProficiency",
            type: "untyped",
            value: rankBonusByLevel(ranks),
        },
    ];
}

/**
 * The path for a focus pool maximum, assembled so PF2e's migration cannot see it.
 *
 * `Migration889RemoveFocusMaxIncreases` deletes every rule element whose `path`
 * is exactly the string "system.resources.focus.max", from every item except
 * four of PF2e's own feats. It matches the literal stored string, and it runs
 * when an item is imported from a compendium, which is every time one of these
 * talents is added to a character. Verified on a live Sorcerer whose copy of
 * an item carried 13 rules where the pack had 15, with only the `.cap` rule left.
 *
 * The last path segment therefore comes from a flag on the item, which PF2e
 * resolves at runtime. The stored string does not match the filter, the resolved
 * one is the path we want, and it stays that way regardless of what PF2e's
 * schema version does later.
 *
 * Any item using this must carry FOCUS_FLAGS.
 */
export const FOCUS_MAX_PATH = "system.resources.focus.{item|flags.ascendant.focusField}";

/** The flag FOCUS_MAX_PATH resolves against. */
export const FOCUS_FLAGS = { ascendant: { focusField: "max" } };

/**
 * An attribute write, applied to the modifier and to the value behind it.
 *
 * PF2e builds `system.abilities.<attr>.mod` from the allocated boosts and then
 * ends with `base = Math.trunc(mod)` (pf2e.mjs:34071), before rule elements run
 * in the applyAEs phase. Writing only `mod` therefore leaves `base` holding the
 * number the character had before the boost, and the attribute builder draws
 * `base` (pf2e.mjs:23463). The result is a sheet reading +2 next to a builder
 * reading +5 on the same attribute.
 *
 * Nothing mechanical reads `base`: the skill statistic that looks like it does
 * is reading a skill's own base and falls back to `abilities[n].mod`
 * (pf2e.mjs:35186). This is about the two numbers agreeing.
 *
 * Verified live on a character built with ordinary boosts: with the modifier
 * alone the builder showed 1/1/1/0/1/0 against a sheet of 2/2/4/4/2/5, and with
 * both it showed 2/2/4/4/2/5.
 *
 * It does not reach a character whose attributes were typed in rather than
 * boosted. The builder reads `_source.system.abilities.<attr>.mod` for those
 * (pf2e.mjs:23463), which is stored data no rule element can write.
 *
 * @param {object} rule The ActiveEffectLike to write, without its `path`.
 * @param {string} attribute
 */
export function attributeWrite(rule, attribute) {
    return [
        { ...rule, path: `system.abilities.${attribute}.mod` },
        { ...rule, path: `system.abilities.${attribute}.base` },
    ];
}
