import crypto from "node:crypto";

const ID_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * A stable 16-character Foundry document id derived from the slug.
 *
 * Deterministic on purpose: rebuilding the pack must not change an item's id,
 * or every copy already sitting on a character becomes an orphan.
 *
 * @param {string} slug
 * @returns {string}
 */
/** The source line PF2e shows on every item sheet. */
export const PUBLICATION = Object.freeze({
    title: "Ascendant: Mythic Rebuilt",
    authors: "",
    license: "ORC",
    remaster: true,
});

/** Module id, baked into every compendium uuid. */
export const MODULE_ID = "ascendant";

/** Tag carried by every level sub-feat and pick item, so a chooser can leave them out. */
export const GRANT_TAG = "ascendant-grant";

/** Compendium uuid of an item in one of this module's packs. */
export const uuidFor = (pack, slug, type = "Item") => `Compendium.${MODULE_ID}.${pack}.${type}.${idFor(slug)}`;

export function idFor(slug) {
    const digest = crypto.createHash("sha256").update(slug).digest();
    let id = "";
    for (let i = 0; i < 16; i++) id += ID_ALPHABET[digest[i] % ID_ALPHABET.length];
    return id;
}

/**
 * Build a complete PF2e feat item for a talent, a level sub-feat or a pick.
 *
 * Defaults mirror what PF2e writes for its own feats, so the sheet, chat card
 * and Compendium Browser all treat a talent like any other feat.
 *
 * @param {object} options
 * @param {string} options.name
 * @param {string} options.slug
 * @param {string} options.category One of the ascendant-* feat categories.
 * @param {string} options.description HTML.
 * @param {number} [options.level] Level at which it is gained. Talents are chosen at 1; a sub-feat carries its own level.
 * @param {string[]} [options.traits]
 * @param {string} [options.rarity]
 * @param {object[]} [options.rules] PF2e rule elements.
 * @param {string} [options.img]
 * @param {number} [options.maxTakable]
 * @param {string} [options.actionType]
 * @param {number|null} [options.actions]
 * @param {string[]} [options.otherTags]
 */
export function talent({
    name,
    slug,
    category,
    description,
    level = 1,
    traits = [],
    rarity = "unique",
    rules = [],
    img = "icons/magic/light/explosion-star-glow-silhouette.webp",
    maxTakable = 1,
    actionType = "passive",
    actions = null,
    otherTags = [],
    flags = {},
}) {
    return {
        _id: idFor(slug),
        name,
        type: "feat",
        img,
        system: {
            description: { value: description, gm: "" },
            publication: PUBLICATION,
            rules,
            slug,
            traits: { otherTags, value: traits, rarity },
            level: { value: level },
            category,
            onlyLevel1: false,
            maxTakable,
            actionType: { value: actionType },
            actions: { value: actions },
            prerequisites: { value: [] },
            location: null,
        },
        folder: null,
        sort: 0,
        ownership: { default: 0 },
        flags,
        _stats: { systemId: "pf2e" },
    };
}

/**
 * An `effect` item: what an Aura transmits, what an EphemeralEffect applies, and
 * what a player drops on a token by hand.
 *
 * An Aura may only transmit an item of type `effect` or `affliction`; pointing
 * one at a condition fails validation and PF2e drops the whole rule silently.
 * Wrap the condition in one of these with a `GrantItem ... inMemoryOnly` rule,
 * the way every aura in PF2e's own packs does it.
 *
 * @param {object} options
 * @param {string} options.slug
 * @param {string} options.name
 * @param {string} options.description HTML.
 * @param {object[]} [options.rules]
 * @param {string[]} [options.traits]
 * @param {string} [options.img]
 * @param {number} [options.level]
 * @param {object} [options.duration] PF2e effect duration; defaults to unlimited.
 * @param {boolean} [options.showIcon] Whether the token shows the effect's icon.
 * @param {object|null} [options.badge]
 */
export function effectItem({
    slug,
    name,
    description,
    rules = [],
    traits = [],
    img = "icons/magic/light/explosion-star-glow-silhouette.webp",
    level = 1,
    duration = { value: -1, unit: "unlimited", sustained: false, expiry: null },
    showIcon = true,
    badge = null,
    flags = {},
}) {
    return {
        _id: idFor(slug),
        name,
        type: "effect",
        img,
        system: {
            description: { value: description, gm: "" },
            publication: PUBLICATION,
            rules,
            slug,
            traits: { otherTags: [], value: traits, rarity: "unique" },
            level: { value: level },
            duration,
            start: { value: 0, initiative: null },
            badge,
            tokenIcon: { show: showIcon },
            context: null,
        },
        folder: null,
        sort: 0,
        ownership: { default: 0 },
        flags,
        _stats: { systemId: "pf2e" },
    };
}

/**
 * An `action` item, for an activity a talent grants.
 *
 * @param {object} options
 * @param {string} options.slug
 * @param {string} options.name
 * @param {string} options.description HTML.
 * @param {string} options.actionType "action", "reaction", "free" or "passive".
 * @param {number|null} [options.actions] Action count for `actionType: "action"`.
 * @param {string[]} [options.traits]
 * @param {object[]} [options.rules]
 * @param {string} [options.img]
 * @param {object|null} [options.frequency] PF2e frequency, e.g. `{ max: 1, per: "round" }`.
 */
export function actionItem({
    slug,
    name,
    description,
    actionType,
    actions = null,
    traits = [],
    rules = [],
    img = "icons/skills/melee/strike-sword-slashing-red.webp",
    frequency = null,
    flags = {},
}) {
    return {
        _id: idFor(slug),
        name,
        type: "action",
        img,
        system: {
            description: { value: description, gm: "" },
            publication: PUBLICATION,
            rules,
            slug,
            traits: { otherTags: [], value: traits, rarity: "common" },
            actionType: { value: actionType },
            actions: { value: actions },
            category: null,
            frequency,
            selfEffect: null,
            deathNote: false,
        },
        folder: null,
        sort: 0,
        ownership: { default: 0 },
        flags,
        _stats: { systemId: "pf2e" },
    };
}
