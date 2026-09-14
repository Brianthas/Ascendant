import { MODULE_ID } from "./constants.mjs";

/**
 * Enhanced Attribute Boosts, as rows in PF2e's Attribute Boosts window.
 *
 * ## Storage
 *
 * `flags.ascendant.boosts` holds `{ 1: [...], 5: [...], 10: [...], 15: [...], 20: [...] }`,
 * each a list of attribute keys. PF2e's own `system.build.attributes.boosts` cannot hold them:
 * it is a typed schema with fixed keys (pf2e.mjs:36737), `prepareBaseData` allows exactly four
 * per level (33842) and slices any extra off (33856).
 *
 * ## Arithmetic
 *
 * A wrapper on `CharacterPF2e#prepareDataFromItems` applies the picks after the wrapped call.
 * That method runs `prepareBuildData` (34038), which applies the ordinary boosts, and it
 * returns before the rule elements' `onApplyActiveEffects` (31732) and before the modifiers are
 * truncated in `prepareEmbeddedDocuments` (33946). So the picks land on the same half-step
 * numbers PF2e's own boosts leave, the talent's cap rules still run after them, and the
 * truncation still turns a pair of half steps into a whole one.
 *
 * 1st-level picks use PF2e's own rule, `mod += mod >= 4 ? .5 : 1` (34054): "+2, or +1 if the
 * score is already 18 or higher". Later picks add 1 to the modifier: "always increases it by
 * exactly 2 regardless of its current value".
 *
 * ## Rows
 *
 * One row per level, cloned from the row PF2e rendered for that level so the Svelte styling
 * hashes carry over (see scripts/variants/boosts.mjs for why cloning beats markup). The window
 * is a Svelte app that rebuilds its own DOM without a Foundry hook, so a MutationObserver puts
 * the rows back whenever they go missing.
 *
 * 1st level: four picks, one per attribute. Later levels: two picks, and a button may be pressed
 * twice for "both on the same score"; it then shows a x2 mark.
 */

export const FEAT_SLUG = "ascendant-enhanced-attribute-boosts";
const FLAG = "boosts";
const LEVELS = [1, 5, 10, 15, 20];
const ALLOWED = { 1: 4, 5: 2, 10: 2, 15: 2, 20: 2 };
const ROW_MARKER = "data-ascendant-boosts";
const COUNT_CLASS = "ascendant-boost-count";
const observers = new WeakMap();

export function hasEnhancedBoosts(actor) {
    return actor?.itemTypes?.feat?.some((f) => f.slug === FEAT_SLUG) ?? false;
}

/** The stored picks, validated and trimmed to what each level allows. */
export function readPicks(actor) {
    const attributes = Object.keys(CONFIG.PF2E.abilities);
    const raw = actor.flags?.[MODULE_ID]?.[FLAG] ?? {};
    const picks = {};
    for (const level of LEVELS) {
        const list = Array.isArray(raw[level]) ? raw[level].filter((a) => attributes.includes(a)) : [];
        picks[level] = list.slice(0, ALLOWED[level]);
    }
    return picks;
}

/** Write the picks. Arrays replace wholesale in a Foundry update, so the whole object is sent. */
export async function writePicks(actor, picks) {
    return actor.update({ [`flags.${MODULE_ID}.${FLAG}`]: picks });
}

function applyPicks(actor) {
    const build = actor.system.build?.attributes;
    if (!build || build.manual || !hasEnhancedBoosts(actor)) return;

    const abilities = actor.system.abilities;
    const picks = readPicks(actor);
    for (const level of LEVELS) {
        if (actor.level < level) continue;
        for (const attribute of picks[level]) {
            const ability = abilities[attribute];
            if (!ability) continue;
            ability.mod += level === 1 && ability.mod >= 4 ? 0.5 : 1;
        }
    }
    // The same closing step as prepareBuildData (pf2e.mjs:34071), repeated so `base` follows.
    for (const ability of Object.values(abilities)) {
        ability.mod = Math.clamp(ability.mod, -5, 10);
        ability.base = Math.trunc(ability.mod);
    }
}

export function registerAttributeBoosts() {
    libWrapper.register(
        MODULE_ID,
        "CONFIG.PF2E.Actor.documentClasses.character.prototype.prepareDataFromItems",
        function (wrapped, ...args) {
            const result = wrapped(...args);
            try {
                applyPicks(this);
            } catch (error) {
                console.error(`${MODULE_ID} | applying Enhanced Attribute Boosts failed`, error);
            }
            return result;
        },
        "WRAPPER",
    );

    // The window is height auto and clamps to the viewport; ascendant.css makes its rows scroll
    // in that case, and a window that scrolls needs a resize handle. ApplicationV2 inserts the
    // handle in `_renderFrame` only when `options.window.resizable` is set, and keeps its
    // reference private, so the option has to be on before the first render. PF2e does not
    // export the class, so the option is set where every application resolves its options.
    libWrapper.register(
        MODULE_ID,
        "foundry.applications.api.ApplicationV2.prototype._initializeApplicationOptions",
        function (wrapped, options) {
            const resolved = wrapped(options);
            if (resolved?.id === "attribute-builder" && resolved.window) resolved.window.resizable = true;
            return resolved;
        },
        "WRAPPER",
    );

    Hooks.on("renderAttributeBuilder", (app, element) => {
        const actor = app.options?.actor;
        if (actor?.type !== "character") return;
        watch(app, element, actor);
        refresh(app, element, actor);
    });
    return true;
}

function refresh(app, element, actor) {
    const observer = observers.get(app);
    observer?.disconnect();
    try {
        if (hasEnhancedBoosts(actor) && !actor.system.build.attributes.manual) applyRows(app, element, actor);
        else clearRows(element);
    } finally {
        if (element.isConnected) observer?.observe(element, { childList: true, subtree: true });
    }
}

function clearRows(element) {
    for (const row of element.querySelectorAll(`[${ROW_MARKER}]`)) row.remove();
}

function watch(app, element, actor) {
    observers.get(app)?.disconnect();
    const observer = new MutationObserver(() => {
        if (!hasEnhancedBoosts(actor)) return;
        const present = LEVELS.every((level) => element.querySelector(`[${ROW_MARKER}="${level}"]`));
        if (!present) refresh(app, element, actor);
    });
    observers.set(app, observer);
    observer.observe(element, { childList: true, subtree: true });
}

function applyRows(app, element, actor) {
    clearRows(element);
    const attributes = Object.keys(CONFIG.PF2E.abilities);
    const picks = readPicks(actor);

    for (const level of LEVELS) {
        const source = element.querySelector(`section.row[data-level="${level}"]:not([${ROW_MARKER}])`);
        if (!source) continue;

        const chosen = picks[level];
        const eligible = actor.level >= level;
        const remaining = eligible ? ALLOWED[level] - chosen.length : 0;

        const row = source.cloneNode(true);
        row.setAttribute(ROW_MARKER, String(level));
        row.removeAttribute("data-level");
        row.setAttribute("aria-label", game.i18n.format("ASCENDANT.Boosts.RowLabel", { level }));

        const description = row.querySelector(".description");
        if (description) description.textContent = game.i18n.format("ASCENDANT.Boosts.Row", { level });

        setBadge(row, element, remaining);

        const columns = [...(row.querySelector(".attributes")?.children ?? [])];
        columns.forEach((column, index) => {
            const attribute = attributes[index];
            const button = column.querySelector("button.attribute-button.boost");
            if (!button || !attribute) return;

            const count = chosen.filter((a) => a === attribute).length;
            const replacement = button.cloneNode(true);
            replacement.classList.toggle("selected", count > 0);
            replacement.classList.remove("partial");
            replacement.setAttribute("aria-pressed", String(count > 0));
            replacement.setAttribute("aria-label", `${attribute} ${count}`);
            replacement.disabled = !eligible || (count === 0 && remaining === 0);

            replacement.querySelector(`.${COUNT_CLASS}`)?.remove();
            if (count > 1) {
                const mark = document.createElement("span");
                mark.className = COUNT_CLASS;
                mark.textContent = game.i18n.localize("ASCENDANT.Boosts.Twice");
                replacement.append(mark);
            }

            replacement.addEventListener("click", async (event) => {
                event.preventDefault();
                event.stopPropagation();
                const next = readPicks(actor);
                next[level] = toggled(next[level], attribute, level);
                await writePicks(actor, next);
                refresh(app, element, actor);
            });
            button.replaceWith(replacement);
        });

        source.after(row);
    }
}

/**
 * The list after a click on one attribute.
 *
 * 1st level: one pick per attribute, so a pressed button clears. Later levels: a click adds a
 * pick while the level has room, and clears every pick on that attribute once it has none.
 */
function toggled(list, attribute, level) {
    const count = list.filter((a) => a === attribute).length;
    const room = list.length < ALLOWED[level];
    if (level === 1) return count > 0 ? list.filter((a) => a !== attribute) : room ? [...list, attribute] : list;
    if (room) return [...list, attribute];
    return list.filter((a) => a !== attribute);
}

/**
 * The "N remaining" badge. Cloned from any badge PF2e has on screen so the styling hash matches;
 * built plain when every PF2e row is full, styled by ascendant.css in that case.
 */
function setBadge(row, element, remaining) {
    const heading = row.querySelector(".row-heading");
    if (!heading) return;
    heading.querySelector(".remaining")?.remove();
    if (remaining <= 0) return;

    const template = element.querySelector(`section.row:not([${ROW_MARKER}]) .row-heading .remaining`);
    const badge = template ? template.cloneNode(true) : document.createElement("div");
    if (!template) badge.className = "remaining extra ascendant-remaining";
    badge.innerHTML = "";
    const text = document.createElement("span");
    text.className = "sr-only";
    text.textContent = game.i18n.format("ASCENDANT.Boosts.Remaining", { count: remaining });
    const number = document.createElement("span");
    number.setAttribute("aria-hidden", "true");
    number.textContent = String(remaining);
    badge.append(text, " ", number);
    heading.prepend(badge);
}
