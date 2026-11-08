/**
 * How each casting class's spellcasting entry is shaped, read off its Archives of Nethys page on
 * 2026-11-07 (the same pages `tools/fetch-casting-tables.mjs` parses; ids are in `slot-tables.mjs`).
 *
 * `pools` names the entries a class gets, matching the pool keys in SLOT_TABLES. Animist is the
 * only class with two: its own prepared slots and its apparition slots, which "can't cast your
 * animist spells using your apparition spell slots or vice versa".
 *
 * `attribute` is the one the page names for spell attack and DC. Psychic's comes from its
 * subconscious mind (`"key"`), which states it only in its text; `sync.mjs` reads it there.
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
 * attribute for wizard archetype spells is Intelligence, and they are arcane wizard spells"). The
 * fields here record what differs per archetype:
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

/**
 * Spellcasting archetypes not named for a class, read off their dedications and tier feats in the
 * installed PF2e 8.6.1 feats pack on 2026-11-07. Each tier feat grants "the basic (expert, master)
 * spellcasting benefits", so the slots follow `archetypeRow` like the class archetypes.
 *
 * - `tiers`: the middle of the tier slugs, `basic-<tiers>-spellcasting` and so on; pervasive magic's
 *   are `basic-spellcasting`, `expert-spellcasting`, `master-spellcasting`.
 * - `tradition` / `attribute`: null where the dedication lets the player choose and PF2e records the
 *   choice nowhere (Hedge Mage: "a tradition associated with the skill chosen"; Beast Gunner:
 *   "either Charisma or Intelligence, chosen when you take this feat"). Those entries are not
 *   created; one the player builds is adopted (sync.mjs).
 * - `cantrips`: the dedication's. `noCantripsIfCaster`: "if you don't already cast spells from spell
 *   slots, you ... gain a spell repertoire with ..." cantrips, so a character with a casting class
 *   gets none here.
 *
 * Captivator is left out: its spells are innate ("You can cast this spell as an innate occult
 * spell"), with no slots.
 */
export const OTHER_ARCHETYPES = {
    "infernal-pactbreaker": { label: "Infernal Pactbreaker", tiers: "pactbreaker", type: "prepared", tradition: "divine", attribute: "int", cantrips: 2 },
    "prophet-of-kalistrade": { label: "Prophet of Kalistrade", tiers: "prophet", type: "spontaneous", tradition: "occult", attribute: "cha", cantrips: 3, noCantripsIfCaster: true },
    "rivethun-involutionist": { label: "Rivethun Involutionist", tiers: "rivethun", type: "spontaneous", tradition: "divine", attribute: "wis", cantrips: 2 },
    "hedge-mage": { label: "Hedge Mage", tiers: "hedge-mage", type: "prepared", tradition: null, attribute: null, cantrips: 2 },
    "beast-gunner": { label: "Beast Gunner", tiers: "beast-gunner", type: "spontaneous", tradition: null, attribute: null, cantrips: 1, noCantripsIfCaster: true },
    "cathartic-mage": { label: "Cathartic Mage", tiers: "cathartic", type: "spontaneous", tradition: null, attribute: "cha", cantrips: 1, noCantripsIfCaster: true },
    "eldritch-archer": { label: "Eldritch Archer", tiers: "eldritch-archer", type: "spontaneous", tradition: null, attribute: "cha", cantrips: 1, noCantripsIfCaster: true },
    "pervasive-magic": { label: "Pervasive Magic", dedication: "cantrip-casting", tiers: null, type: "spontaneous", tradition: null, attribute: null, cantrips: 2 },
};

/**
 * Breadth feats: "Increase the spell slots you gain from wizard archetype feats by 1 for each spell
 * rank other than your two highest"; the repertoire ones (Bloodline, Occult, Mysterious) add as many
 * spells to the repertoire too.
 */
export const BREADTH = {
    wizard: "arcane-breadth",
    sorcerer: "bloodline-breadth",
    witch: "patrons-breadth",
    cleric: "divine-breadth",
    bard: "occult-breadth",
    druid: "primal-breadth",
    oracle: "mysterious-breadth",
};

/** Traditions a choice can resolve to. Anything else read off an actor is treated as unresolved. */
export const TRADITIONS = ["arcane", "divine", "occult", "primal"];
