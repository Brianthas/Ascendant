export const MODULE_ID = "ascendant";

/**
 * The feat categories this module adds to PF2e.
 *
 * `id` doubles as the feat category key (written into CONFIG.PF2E.featCategories)
 * and as the character sheet section id, so a talent's `system.category` alone
 * decides which section it lands in.
 *
 * The four chooseable tiers get one slot each: a character has exactly one
 * Expertise Track, one Apex, one Paragon and one Adept Talent, all chosen at 1st
 * level, and the party one Party Talent. `ascendant-grant` collects every level
 * sub-feat and pick item, unslotted, so granted items have somewhere to land and
 * a chooser can leave them out by category.
 */
export const TIERS = [
    {
        id: "ascendant-core",
        categoryLabel: "ASCENDANT.Category.Core",
        sectionLabel: "ASCENDANT.Section.Core",
        // Unslotted: a character holds three core feats (the track, Enhanced Attribute Boosts,
        // Expanded Investment). With one slot, PF2e's slot finder seated the track and sent the
        // other two to Bonus Feats. Seen on the Wizard's sheet, 2026-09-14.
        slots: null,
    },
    {
        id: "ascendant-apex",
        categoryLabel: "ASCENDANT.Category.Apex",
        sectionLabel: "ASCENDANT.Section.Apex",
        slots: [1],
    },
    {
        id: "ascendant-paragon",
        categoryLabel: "ASCENDANT.Category.Paragon",
        sectionLabel: "ASCENDANT.Section.Paragon",
        slots: [1],
    },
    {
        id: "ascendant-adept",
        categoryLabel: "ASCENDANT.Category.Adept",
        sectionLabel: "ASCENDANT.Section.Adept",
        slots: [1],
    },
    {
        id: "ascendant-party",
        categoryLabel: "ASCENDANT.Category.Party",
        sectionLabel: "ASCENDANT.Section.Party",
        slots: [1],
    },
    {
        id: "ascendant-grant",
        categoryLabel: "ASCENDANT.Category.Grant",
        sectionLabel: "ASCENDANT.Section.Grant",
        slots: null,
    },
];

export const TIER_IDS = TIERS.map((t) => t.id);

/** Every Item pack, in the order the build and the refresh walk them. */
export const ITEM_PACKS = ["ascendant-core", "ascendant-apex", "ascendant-paragon", "ascendant-adept", "ascendant-party"];

/** A predicate matching a character who holds any of the given talents, by slug. */
export const holdsAny = (slugs) => ({ or: slugs.map((slug) => `feat:${slug}`) });
