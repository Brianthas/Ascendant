import { MODULE_ID } from "./constants.mjs";

/** Slug of the Paragon talent that grants two extra skill feats every level. */
const TALENT_SLUG = "know-it-all";

/**
 * The section id, and the root of every slot id under it.
 *
 * A slot id is written into each feat's `system.location` and persists there. Renaming one strands
 * every feat already placed in it: `assignToSlots` finds no group matching the stored location and
 * drops the feat into Bonus Feats. Fixed from this commit onwards.
 */
const SECTION_ID = "ascendant-know-it-all";

/** Two slots at every character level. PF2e characters stop at 20. */
const MAX_LEVEL = 20;

/** Does this character hold Know-It-All? */
function holdsKnowItAll(actor) {
    return actor?.type === "character" && actor.itemTypes.feat.some((i) => i.slug === TALENT_SLUG);
}

/**
 * The forty slot definitions, two per level.
 *
 * Each carries its own explicit id. `FeatGroup` turns a plain number into `{ id: "<group>-<level>" }`
 * and files it under `this.slots[id]` (pf2e.mjs:33506, 33519), so two slots at the same level would
 * collide on one id and share a single entry. Objects with distinct ids are the only way to put two
 * slots on one level.
 *
 * All twenty levels are declared regardless of the character's own. `FeatGroup` sets
 * `this.limit = actor.level` and skips any slot above it (pf2e.mjs:33501, 33510), so a level 3
 * character is shown six slots rather than forty.
 */
function buildSlots() {
    const slots = [];
    for (let level = 1; level <= MAX_LEVEL; level += 1) {
        for (const suffix of ["a", "b"]) {
            slots.push({ id: `${SECTION_ID}-${level}-${suffix}`, level, label: String(level) });
        }
    }
    return slots;
}

/**
 * The section definition for one Skill Savant character.
 *
 * `supported: ["skill"]` and no `filter`, matching PF2e's own skill group (pf2e.mjs:33644): these
 * are ordinary skill feat slots and browse to the same list.
 */
function buildSection() {
    return {
        id: SECTION_ID,
        label: game.i18n.localize("ASCENDANT.Section.KnowItAll"),
        supported: ["skill"],
        slots: buildSlots(),
    };
}

/**
 * Move the Skill Savant group directly beneath PF2e's own Skill Feats group.
 *
 * Groups from `campaign.feats.sections` are created after every built-in group (pf2e.mjs:34264 runs
 * after the constructor has made them all), so left alone this one renders at the foot of the feats
 * tab, below the talent sections and a long way from the skill feats it doubles.
 *
 * `CharacterFeats` is a Collection, which is a Map and so keeps insertion order, and the sheet
 * renders the groups in that order. Rebuilding it in the order wanted is therefore the whole of the
 * move.
 *
 * Done after `wrapped()`, so it is purely presentational: `assignToSlots` has already run and does
 * not consult group order.
 *
 * Another module reorders the same collection on a dual-class character, and now aims sections at
 * the built-in group whose categories they match - which for a `["skill"]` section is this same
 * position. The two passes commute rather than fight: this one moves a single group and leaves
 * every other pair's relative order alone, and both early-return on an order that is already
 * correct. Whichever wrapper runs outermost finds the group in place and leaves it.
 *
 * This pass is kept rather than deferred to that module, because it is the only one that runs when
 * that module is absent. Measured on a level 8 character with no second class: `skill` at index 5,
 * this group at 6.
 *
 * @param {Collection} feats The actor's prepared feat groups.
 */
function placeAfterSkillGroup(feats) {
    const entries = [...feats.entries()];
    const ours = entries.findIndex(([id]) => id === SECTION_ID);
    const skill = entries.findIndex(([id]) => id === "skill");

    // Nothing to do if either group is absent, or ours already sits directly below.
    if (ours < 0 || skill < 0 || ours === skill + 1) return;

    const [moved] = entries.splice(ours, 1);
    entries.splice(entries.findIndex(([id]) => id === "skill") + 1, 0, moved);

    // The collection is rebuilt from this list, so a group missing from it would vanish from the
    // sheet rather than merely move. Splice-out plus splice-in cannot change the length, and this
    // says so out loud rather than trusting it.
    if (entries.length !== feats.size) {
        console.error(
            `${MODULE_ID} | feat group reorder changed the group count ` +
                `(${feats.size} -> ${entries.length}); leaving the original order alone.`,
        );
        return;
    }

    feats.clear();
    for (const [id, group] of entries) feats.set(id, group);
}

/** Register a libWrapper patch, saying so loudly if libWrapper is absent or the target has moved. */
function registerLibWrapper(target, fn, type) {
    try {
        libWrapper.register(MODULE_ID, target, fn, type);
        return true;
    } catch (error) {
        console.error(`${MODULE_ID} | failed to patch ${target}`, error);
        ui.notifications?.error(
            `Ascendant could not patch the system (${target}). Know-It-All's extra skill ` +
                "feat slots will not appear - check the console (F12).",
            { permanent: true },
        );
        return false;
    }
}

/**
 * Give a Skill Savant character a feat group holding their two extra skill feats per level.
 *
 * `CharacterPF2e#prepareFeats` builds a `CharacterFeats`, loops
 * `game.pf2e.settings.campaign.feats.sections` calling `createGroup` on each entry, then calls
 * `assignToSlots()` (pf2e.mjs:34262-34265). That loop is unconditional - it does not consult the
 * `campaignFeats` setting - so a section pushed onto the array before `prepareFeats` runs becomes a
 * fully native feat group, rendered by PF2e's own template with its own styling and Browse button.
 *
 * ## The push has to be undone in the same call
 *
 * That array is one world-global object, not a per-actor one, so anything left in it reaches every
 * character in the world. Pushing immediately before `wrapped()` and splicing back out in a
 * `finally` is what confines the group to the one actor being prepared. Nothing is written to the
 * stored `campaignFeatSections` setting: that belongs to the GM, and `categories.mjs` records what
 * happens to entries that end up in it.
 *
 * ## Why not add the group after `wrapped()`
 *
 * `assignToSlots()` is not idempotent. For an unslotted group `assignFeat` pushes onto `feats[]`
 * with no check that the feat is already there (pf2e.mjs:33536), so creating a group afterwards and
 * re-running the assignment duplicates every feat not in a numbered slot. Pushing first is the only
 * safe order.
 */
export function registerKnowItAllSlots() {
    return registerLibWrapper(
        "CONFIG.PF2E.Actor.documentClasses.character.prototype.prepareFeats",
        function (wrapped, ...args) {
            const sections = game.pf2e?.settings?.campaign?.feats?.sections;
            if (!Array.isArray(sections) || !holdsKnowItAll(this)) return wrapped(...args);

            // Nothing here ever persists the section, but the array is shared and another module
            // saves it wholesale. If our id is already in it, that entry renders the group and
            // pushing a second would only give PF2e two definitions for one id.
            if (sections.some((s) => s?.id === SECTION_ID)) return wrapped(...args);

            const section = buildSection();
            sections.push(section);
            try {
                const result = wrapped(...args);
                placeAfterSkillGroup(this.feats);
                return result;
            } finally {
                const at = sections.indexOf(section);
                if (at >= 0) sections.splice(at, 1);
            }
        },
        "WRAPPER",
    );
}

export { SECTION_ID, TALENT_SLUG, MAX_LEVEL, holdsKnowItAll, buildSlots };
