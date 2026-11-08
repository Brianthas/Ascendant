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
    cleric: { attribute: "wis", tradition: "divine", pools: { cleric: "prepared" } },
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

/** Traditions a choice can resolve to. Anything else read off an actor is treated as unresolved. */
export const TRADITIONS = ["arcane", "divine", "occult", "primal"];
