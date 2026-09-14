import { TIERS } from "./constants.mjs";

/**
 * Register the talent feat categories with PF2e.
 *
 * `CONFIG.Item.dataModels.feat.schema.fields.category.choices` is the same
 * object as `CONFIG.PF2E.featCategories` (verified by reference equality on
 * PF2e 8.4.1), so adding a key here does three things at
 * once: the category passes data model validation, it appears in the feat
 * sheet's category dropdown, and it appears as a Compendium Browser filter.
 */
export function registerFeatCategories() {
    if (!CONFIG.PF2E?.featCategories) return false;
    for (const tier of TIERS) {
        CONFIG.PF2E.featCategories[tier.id] = tier.categoryLabel;
    }
    return true;
}

/** Is another module already providing a section for the same feat categories? */
function providedElsewhere(sections, section) {
    const wanted = new Set(section.supported);
    return sections.some(
        (existing) =>
            Array.isArray(existing?.supported) &&
            existing.supported.length === wanted.size &&
            existing.supported.every((c) => wanted.has(c)),
    );
}

/**
 * Drop our own section if another module added an equivalent one later.
 *
 * Needed only for the first load after such a module is enabled: a module that
 * adds its sections on `ready` runs after we register. Every later load is
 * handled by providedElsewhere above.
 */
export function dropDuplicateSections() {
    const sections = game.pf2e?.settings?.campaign?.feats?.sections;
    if (!Array.isArray(sections)) return [];

    const dropped = [];
    for (const tier of TIERS) {
        const ours = sections.findIndex((s) => s?.id === tier.id);
        if (ours < 0) continue;
        const mine = sections[ours];
        const others = sections.filter((s, i) => i !== ours && providedElsewhere([s], mine));
        if (others.length === 0) continue;
        sections.splice(ours, 1);
        dropped.push(tier.id);
    }
    return dropped;
}

/**
 * Take our section ids back out of PF2e's persisted `campaignFeatSections` setting.
 *
 * The in-memory list this module pushes to is the same object PF2e persists in
 * that world setting, and any module that saves the list wholesale writes our
 * entries into it. Once persisted they outlive this module: on 2026-09-14 a
 * world showed five raw localization-key rows left by a module that was
 * off, and our six ids were sitting beside them. The GM alone writes the
 * setting, and the write happens only when one of our ids is stored.
 *
 * The check reads the setting document's `_source.value`, never
 * `game.settings.get`. That getter returns the document's derived value, which
 * is the same array object as the live list (reference equality measured on
 * Foundry 14.367), so by `ready` it already holds the sections this module
 * pushed at `init`; comparing against it would find our ids on every load and
 * write the setting each time. `_source.value` is the JSON string the server
 * holds, and it is a string on both v12 and v14.
 */
export async function pruneStoredSections() {
    if (!game.user.isGM) return false;
    const doc = game.settings.storage.get("world")?.getSetting("pf2e.campaignFeatSections");
    const source = doc?._source?.value;
    let stored;
    try {
        stored = typeof source === "string" ? JSON.parse(source) : source;
    } catch {
        return false;
    }
    if (!Array.isArray(stored)) return false;
    const ours = new Set(TIERS.map((t) => t.id));
    const kept = stored.filter((s) => !ours.has(s?.id));
    if (kept.length === stored.length) return false;
    await game.settings.set("pf2e", "campaignFeatSections", kept);
    // PF2e replaces the live array from the setting on change; put ours back.
    registerFeatSections();
    return true;
}

/**
 * Add a character sheet section per tier.
 *
 * CharacterPF2e#prepareFeats creates a FeatGroup for every entry in
 * `game.pf2e.settings.campaign.feats.sections` unconditionally, and the feats
 * tab template renders every group, so no core patching is needed.
 *
 * The chooseable tiers are slotted, one slot at level 1 each, because the rules
 * give a character exactly one of each. `ascendant-grant` is unslotted: level
 * sub-feats and picks arrive by GrantItem and are never chosen from a list.
 *
 * This writes to the in-memory array only and never calls `game.settings.set`:
 * that setting belongs to the GM. Another module that persists the array
 * wholesale will carry these entries into the world setting as a side effect,
 * so a renamed section id has to clean the setting up as well.
 */
export function registerFeatSections() {
    const sections = game.pf2e?.settings?.campaign?.feats?.sections;
    if (!Array.isArray(sections)) return false;

    for (const tier of TIERS) {
        if (sections.some((s) => s?.id === tier.id)) continue;
        const section = {
            id: tier.id,
            label: tier.sectionLabel,
            supported: [tier.id],
            sorted: true,
        };
        if (tier.slots) section.slots = tier.slots;
        sections.push(section);
    }
    return true;
}
