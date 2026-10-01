import { MODULE_ID, WEAPON_MYTHIC_OPTION } from "./constants.mjs";
import { weaponRanks } from "./weapon-ranks.mjs";

/**
 * Weapon Expertise's ranks, as a rule element of our own.
 *
 * PF2e sets a weapon proficiency in two stages. Each class item writes the four categories, taking
 * the higher of the classes (`ClassPF2e#prepareActorData`, pf2e.mjs:52047 on 8.5.1; it loops over
 * the four categories only, so the Gunslinger's `attacks.other` is never applied). Then every rule
 * element's `onApplyActiveEffects` runs in priority order (pf2e.mjs:32016): MartialProficiency at 9
 * (pf2e.mjs:44116), ActiveEffectLike `add` at 20, `upgrade` at 40, `override` at 50
 * (pf2e.mjs:39503), and Slinger's Precision's copies at 41 (set on the class feature in PF2e's
 * pack). Class features such as Gunslinger Weapon Mastery are `upgrade`s in that pass. Straight
 * after it the actor's base spellcasting statistic is built (pf2e.mjs:33395), and Strikes later.
 *
 * The +1 has to see every class rank, so it runs after that pass; and it has to run before the
 * spellcasting statistic, because Warmage copies weapon rank into spell rank. No method wraps that
 * gap: `prepareDataFromItems` runs before the pass and `prepareMartialProficiencies` (pf2e.mjs:34300)
 * after the statistic. A rule element registered in `game.pf2e.RuleElements.custom` runs inside the
 * pass at the priority it is given: `RuleElements.fromOwnedItem` looks a key up there before the
 * built-ins (pf2e.mjs:45219). 100 is after every default above.
 *
 * An item copy that predates this keeps its old ActiveEffectLike rules and has no rule with this
 * key, so it keeps the old numbers until the GM refreshes it and is never given the +1 twice.
 *
 * Mythic is decided per weapon. The stored rank stops at 4, so each Mythic or Expert-start entry is
 * turned into a predicate matching the weapons it covers, the same matching PF2e's own
 * `getWeaponProficiencyRank` does (pf2e.mjs:14459): the category, `weapon-group-<g>`,
 * `weapon-base-<b>`, or the entry's `definition`. A weapon's roll options carry `item:base:` for
 * both its base type and that type's equivalent (pf2e.mjs:51560), so `item:base:<b>` matches what
 * PF2e's `weapon-base-<b>` lookup matches. `beforePrepareData` then builds PF2e's own AdjustModifier and DamageDice rule
 * elements with those predicates, so everything from there on is PF2e's code.
 */

const KEY = "AscendantWeaponExpertise";
const CATEGORIES = ["unarmed", "simple", "martial", "advanced"];
/** A MartialProficiency value that reads another attack rank, e.g. `@actor.system.proficiencies.attacks.simple.rank`. */
const RANK_READ = /proficiencies\.attacks\.([a-z0-9-]+)\.rank/g;

/** MartialProficiency rule elements on the actor that create attack entries. */
const attackProficiencyRules = (actor) =>
    actor.rules.filter((rule) => rule.key === "MartialProficiency" && rule.kind === "attack" && !rule.ignored);

/**
 * "If a class makes you Expert with a weapon at 1st level". A class item's own `attacks` are its
 * 1st-level categories (Fighter: simple, martial and unarmed at 2). Its own MartialProficiency rules
 * are its 1st-level keyed entries (Gunslinger: simple and martial firearms and crossbows at 2); the
 * Gunslinger's `attacks.other` is a display string PF2e never applies. Every class item counts, so
 * a dual-class character takes either class's.
 */
function expertStartKeys(actor) {
    const keys = new Set();
    const classes = actor.itemTypes.class;
    for (const category of CATEGORIES) {
        if (classes.some((item) => (item.system.attacks?.[category] ?? 0) >= 2)) keys.add(category);
    }
    for (const rule of attackProficiencyRules(actor)) {
        if (rule.item.type === "class" && Number(rule.value) >= 2) keys.add(rule.slug);
    }
    return keys;
}

/** Keyed entries whose rank is read off other attack entries, each with the keys it reads. */
function derivedKeys(actor) {
    const derived = new Map();
    for (const rule of attackProficiencyRules(actor)) {
        if (typeof rule.value !== "string") continue;
        const reads = [...rule.value.matchAll(RANK_READ)].map((match) => match[1]).filter((key) => key !== rule.slug);
        if (reads.length) derived.set(rule.slug, reads);
    }
    return derived;
}

/** A predicate statement matching the weapons an entry covers, or null if it cannot be matched. */
function matchStatement(key, entry) {
    if (CATEGORIES.includes(key)) return `item:category:${key}`;
    if (key.startsWith("weapon-group-")) return `item:group:${key.slice("weapon-group-".length)}`;
    if (key.startsWith("weapon-base-")) return `item:base:${key.slice("weapon-base-".length)}`;
    if (entry?.definition?.length) return { and: [...entry.definition] };
    return null;
}

/** The same record ActiveEffectLike leaves, so the sheet can say where a rank came from. */
function logChange(rule, path, value) {
    const changes = rule.actor.system.autoChanges;
    (changes[path] ??= []).push({ mode: "upgrade", level: rule.item.level ?? null, value, source: rule.item.name });
}

function defineRuleElement() {
    const { RuleElement } = game.pf2e;

    return class AscendantWeaponExpertiseRuleElement extends RuleElement {
        static validActorTypes = ["character"];

        /** Predicate statements for the weapons that are Mythic, and those a class made Expert at 1st. */
        #mythic = [];
        #expertStart = [];

        constructor(source, options) {
            super({ priority: 100, ...source }, options);
        }

        onApplyActiveEffects() {
            this.#mythic = [];
            this.#expertStart = [];
            if (!this.test()) return;

            const actor = this.actor;
            const attacks = actor.system.proficiencies.attacks;
            const results = weaponRanks({
                level: actor.level,
                entries: attacks,
                expertStart: expertStartKeys(actor),
                derived: derivedKeys(actor),
            });

            for (const [key, result] of results) {
                const entry = attacks[key];
                const stored = Math.min(result.rank, 4);
                if (!result.sameAs && stored !== entry.rank) {
                    entry.rank = stored;
                    logChange(this, `system.proficiencies.attacks.${key}.rank`, stored);
                }
                const match = matchStatement(key, entry);
                if (!match) continue;
                if (result.rank === 5) this.#mythic.push(match);
                if (result.expertStart) this.#expertStart.push(match);
            }
            if (this.#mythic.length) actor.rollOptions.all[WEAPON_MYTHIC_OPTION] = true;
        }

        beforePrepareData() {
            if (this.ignored) return;
            const { AdjustModifier, DamageDice } = game.pf2e.RuleElements.builtin;
            const sources = [];

            if (this.#mythic.length) {
                const predicate = [{ or: this.#mythic }];
                // Mythic on the attack: the proficiency modifier becomes level + 10 (see `mythic()`).
                sources.push([AdjustModifier, {
                    key: "AdjustModifier",
                    selector: "strike-attack-roll",
                    slug: "proficiency",
                    mode: "override",
                    value: "@actor.level + 10",
                    relabel: "ASCENDANT.Proficiency.Mythic",
                    predicate,
                }]);
                // Mythic on the damage rider: 10, above the static ladder's 8 for Legendary.
                sources.push([AdjustModifier, {
                    key: "AdjustModifier",
                    selector: "strike-damage",
                    slug: "weapon-expertise-damage",
                    mode: "upgrade",
                    value: 10,
                    predicate,
                }]);
            }

            // "At 15th level, your Strikes with those weapons gain one additional weapon damage die."
            // No dieSize: PF2e then takes the faces of the weapon's base damage after its die-size
            // changes (pf2e.mjs:547), so the die follows the weapon as a striking rune's does. Deadly
            // counts the dice striking adds to the weapon's own damage (pf2e.mjs:19816), which this
            // die is not part of, so it does not raise deadly's dice. It is its own term,
            // so it stacks with striking, and with no `critical` it doubles on a critical hit.
            if (this.actor.level >= 15 && this.#expertStart.length) {
                sources.push([DamageDice, {
                    key: "DamageDice",
                    selector: "strike-damage",
                    slug: "weapon-expertise-die",
                    label: "ASCENDANT.Rules.WeaponExpertiseDie",
                    diceNumber: 1,
                    predicate: [{ or: this.#expertStart }],
                }]);
            }

            for (const [RuleClass, source] of sources) {
                try {
                    const rule = new RuleClass(source, { parent: this.item });
                    if (!rule.ignored) rule.beforePrepareData();
                } catch (error) {
                    console.error(`${MODULE_ID} | Weapon Expertise could not register its ${source.key} on ${this.actor.name}`, error);
                }
            }
        }
    };
}

/** @returns {boolean} whether PF2e was ready to take the rule element. */
export function registerWeaponExpertise() {
    const pf2e = game.pf2e;
    if (!pf2e?.RuleElement || !pf2e.RuleElements?.custom) return false;
    pf2e.RuleElements.custom[KEY] = defineRuleElement();
    return true;
}
