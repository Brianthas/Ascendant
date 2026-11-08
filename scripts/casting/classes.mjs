/**
 * How each casting class's spellcasting entry is shaped, read off its Archives of Nethys page on
 * 2026-11-07 (the same pages `tools/fetch-casting-tables.mjs` parses; ids are in `slot-tables.mjs`).
 *
 * `pools` names the entries a class gets, matching the pool keys in SLOT_TABLES. Animist is the
 * only class with two: its own prepared slots and its apparition slots, which "can't cast your
 * animist spells using your apparition spell slots or vice versa".
 *
 * `attribute` is the one the page names for spell attack and DC. Psychic's comes from its
 * subconscious mind, which sets the key attribute, so it is read off the actor (`"key"`).
 *
 * `tradition` is fixed, or names the choice that sets it: a sorcerer's bloodline, a witch's patron,
 * a summoner's eidolon. `scripts/casting/sync.mjs` reads those off the actor.
 */
export const CASTING_CLASSES = {
    bard: { attribute: "cha", tradition: "occult", pools: { bard: "spontaneous" } },
    // `font` is Divine Font's heal or harm slots, an entry of its own (`modifiers.mjs` fontRow).
    cleric: { attribute: "wis", tradition: "divine", pools: { cleric: "prepared", font: "prepared" } },
    druid: { attribute: "wis", tradition: "primal", pools: { druid: "prepared" } },
    witch: { attribute: "int", tradition: "patron", pools: { witch: "prepared" } },
    wizard: { attribute: "int", tradition: "arcane", pools: { wizard: "prepared" } },
    oracle: { attribute: "cha", tradition: "divine", pools: { oracle: "spontaneous" } },
    sorcerer: { attribute: "cha", tradition: "bloodline", pools: { sorcerer: "spontaneous" } },
    animist: { attribute: "wis", tradition: "divine", pools: { animist: "prepared", apparition: "spontaneous" } },
    psychic: { attribute: "key", tradition: "occult", pools: { psychic: "spontaneous" } },
    magus: { attribute: "int", tradition: "arcane", pools: { magus: "prepared" } },
    necromancer: { attribute: "int", tradition: "occult", pools: { necromancer: "prepared" } },
    summoner: { attribute: "cha", tradition: "eidolon", pools: { summoner: "spontaneous" } },
};

/**
 * The class-named spellcasting archetypes, read off each dedication and Basic Spellcasting feat in
 * the installed PF2e 8.6.1 feats pack on 2026-11-07. Each archetype's entry takes the class's
 * preparation type, attribute and tradition rule (the dedications say so: "Your key spellcasting
 * attribute for wizard archetype spells is Intelligence, and they are arcane wizard spells"), with
 * two exceptions recorded here:
 *
 * - `cantrips`: how many the dedication gives. Two for most; Witch Dedication "can prepare one
 *   cantrip each day from your familiar"; Psychic Dedication gives "one standard psi cantrip".
 * - `cantripsAt`: Summoner's come with Basic Summoner Spellcasting ("You gain a spell repertoire
 *   and two cantrips"), and its dedication grants no casting.
 * - Psychic's attribute is "the attribute you used to qualify for the archetype" (Intelligence or
 *   Charisma), read as the higher of the two.
 *
 * Feat slugs follow `<class>-dedication` and `basic-|expert-|master-<class>-spellcasting`.
 */
export const CASTING_ARCHETYPES = {
    bard: { cantrips: 2 },
    cleric: { cantrips: 2 },
    druid: { cantrips: 2 },
    witch: { cantrips: 1 },
    wizard: { cantrips: 2 },
    oracle: { cantrips: 2 },
    sorcerer: { cantrips: 2 },
    animist: { cantrips: 2 },
    psychic: { cantrips: 1, attribute: "qualify" },
    magus: { cantrips: 2 },
    necromancer: { cantrips: 2 },
    summoner: { cantrips: 2, cantripsAt: "basic" },
};

/** Traditions a choice can resolve to. Anything else read off an actor is treated as unresolved. */
export const TRADITIONS = ["arcane", "divine", "occult", "primal"];
