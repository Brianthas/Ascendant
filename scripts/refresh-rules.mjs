import { MODULE_ID, ITEM_PACKS } from "./constants.mjs";

/**
 * Resync owned talents with the compendiums.
 *
 * Items on an actor are copies. Updating the module updates the compendium and
 * nothing else, so a character built before a fix keeps the old rules for as
 * long as they hold the item. This walks every actor, matches each owned item to
 * its compendium original by slug, and replaces `system.rules` where the two
 * differ.
 *
 * Only `system.rules` is written, and not even all of it: the toggle state and
 * grant links PF2e stores inside the rules are carried across, so a resync
 * cannot switch off a player's toggles or orphan what their talents granted.
 * See `runtimeStateOf` for what is preserved and why. Names, descriptions,
 * flags, choices already made and the item's own level are untouched. An item
 * whose rules already match is skipped, which makes a second run a no-op.
 */

/**
 * State PF2e writes into `system.rules` on the actor's copy.
 *
 * `system.rules` is not purely definition. A ChoiceSet stores the player's answer
 * as `selection` on the rule, a toggled RollOption stores `value` and
 * `selection`, and GrantItem writes back a `flag` naming the entry in
 * `flags.pf2e.itemGrants` that links the granted item. Replacing the array
 * wholesale destroys all three, so they are carried over.
 *
 * The ChoiceSet case is the one that bites hardest, and it did: an unresolved
 * ChoiceSet does not merely lose its answer, its constructor sets `ignored` on
 * every rule in the item (pf2e.mjs:42319), so a refresh that dropped `selection`
 * disabled Overpowered Class entirely - 27 of 27 rules - and took two attribute
 * boosts off a live character. The answer cannot be recovered from the flags
 * afterwards either: `flags.pf2e.rulesSelections` is rebuilt empty on every
 * prepare (pf2e.mjs:45041) and only refilled from a selection that still exists.
 *
 * Both were read off a live item rather than assumed: after setting a damage
 * type dial to fire, its RollOption carried `value: false, selection: "fire"`
 * and each GrantItem carried a `flag` naming the granted action, none of which
 * are in the compendium copy.
 *
 * `value` is deliberately only carried for a toggleable RollOption. Most rule
 * elements have a `value` that is part of the definition - a FlatModifier's
 * amount, an ActiveEffectLike's target rank - and carrying those would pin every
 * character to the numbers they were built with, which is the opposite of a
 * refresh.
 */
function runtimeStateOf(rule) {
    const state = {};
    // `selection` is an answer, never a definition: the suboption a toggle is
    // set to, and the choice a ChoiceSet was given. Preserved for every rule
    // that carries one.
    if ("selection" in rule) state.selection = rule.selection;
    // `value` is a definition almost everywhere - a FlatModifier's amount, an
    // ActiveEffectLike's target rank - and carrying those would pin a character
    // to the numbers they were built with. On a toggleable RollOption it is the
    // on/off state instead.
    if (rule.key === "RollOption" && rule.toggleable && "value" in rule) state.value = rule.value;
    if (rule.key === "GrantItem" && "flag" in rule) state.flag = rule.flag;
    return state;
}

/**
 * How a rule is recognised across versions.
 *
 * Not by index: the whole point of a refresh is that the array changed, and
 * Damage Dial went from two rules to seven in the release this was written for.
 */
function identityOf(rule) {
    if (rule.key === "RollOption") return `RollOption:${rule.option}`;
    if (rule.key === "GrantItem") return `GrantItem:${rule.uuid}`;
    const target = rule.selector ?? rule.selectors ?? rule.path ?? rule.property ?? "";
    return `${rule.key}:${rule.slug ?? ""}:${JSON.stringify(target)}`;
}

/** The pack's rules, with this item's own toggle and grant state put back. */
export function mergeRules(packRules, ownedRules) {
    const carried = new Map();
    for (const rule of ownedRules) {
        const state = runtimeStateOf(rule);
        if (Object.keys(state).length) carried.set(identityOf(rule), state);
    }
    return packRules.map((rule) => {
        const state = carried.get(identityOf(rule));
        return state ? { ...rule, ...state } : rule;
    });
}

/**
 * Current rules from the pack, keyed by slug.
 *
 * `getDocument()` per index entry, but all at once rather than awaited in turn.
 * Measured on the 180-item pack after a confirmed page reload: 2824ms awaited
 * one at a time, 1568ms in parallel, and 1ms on every call after the first,
 * because `getDocument()` reads the pack's cache once it is primed.
 *
 * Not `getDocuments()`. It is a little faster cold (1141ms) but never reads the
 * cache, so it costs the same 1100ms on every call, and a session presses this
 * button more than once.
 */
async function compendiumRules() {
    const bySlug = new Map();
    let found = 0;
    for (const name of ITEM_PACKS) {
        const pack = game.packs.get(`${MODULE_ID}.${name}`);
        if (!pack) continue;
        found += 1;
        const index = await pack.getIndex();
        const docs = await Promise.all([...index].map((entry) => pack.getDocument(entry._id)));
        for (const doc of docs) {
            const slug = doc?.system?.slug;
            if (slug) bySlug.set(slug, doc._source.system.rules ?? []);
        }
    }
    return found ? bySlug : null;
}

/**
 * What this item's rules should become, and whether that differs from what is
 * stored.
 *
 * Read off `_source` rather than `toObject()`: the same data, without a deep
 * clone per item, checked equal on a live 27-rule item. The comparison is on
 * the stored copy, not the prepared rules: a rule element disabled during
 * preparation is still present in `_source`, and it is the stored copy that
 * needs replacing. `mergeRules` builds fresh objects, so nothing here mutates
 * the source it read.
 */
function planRefresh(item, packRules) {
    const current = item._source.system?.rules ?? [];
    const merged = mergeRules(packRules, current);
    const stale = JSON.stringify(current) !== JSON.stringify(merged);
    return { stale, merged };
}

/**
 * @param {object} [options]
 * @param {boolean} [options.dryRun] Report what would change without writing.
 * @param {Map<string, object[]>} [options.rules] A map from a previous call's
 *   `result.rules`, so the dialog's dry run and the write that follows it read
 *   the pack once between them rather than once each.
 * @returns {Promise<{updated: string[], scanned: number, failed: string[], rules: Map}>}
 */
export async function refreshTalentRules({ dryRun = false, rules = null } = {}) {
    const bySlug = rules ?? (await compendiumRules());
    if (!bySlug) throw new Error(`${MODULE_ID} | compendium not found`);

    const updated = [];
    const failed = [];
    let scanned = 0;
    // Only what was written gets read back and re-prepared. The first version
    // re-checked every item on every actor and reset the whole world, most of
    // which it had never touched.
    const written = [];

    for (const actor of game.actors) {
        const updates = [];
        for (const item of actor.items) {
            const slug = item.system?.slug;
            if (!slug || !bySlug.has(slug)) continue;
            scanned += 1;
            const { stale, merged } = planRefresh(item, bySlug.get(slug));
            if (!stale) continue;
            updates.push({ _id: item.id, "system.rules": merged });
            updated.push(`${actor.name}: ${item.name}`);
        }
        if (updates.length && !dryRun) {
            try {
                await actor.updateEmbeddedDocuments("Item", updates);
                written.push({ actor, ids: updates.map((u) => u._id) });
            } catch (error) {
                console.error(`${MODULE_ID} | refresh failed on ${actor.name}`, error);
                failed.push(actor.name);
            }
        }
    }

    // Read back off the actors rather than trusting the update call. The
    // update already re-prepared each actor it touched; the reset is for any
    // open sheet, so it redraws from the new rules.
    for (const { actor, ids } of written) {
        for (const id of ids) {
            const item = actor.items.get(id);
            if (!item) { failed.push(`${actor.name}: ${id}`); continue; }
            const slug = item.system?.slug;
            if (slug && planRefresh(item, bySlug.get(slug)).stale) failed.push(`${actor.name}: ${item.name}`);
        }
        actor.reset();
    }

    return { updated, scanned, failed: [...new Set(failed)], rules: bySlug };
}

/**
 * The settings-menu button. Counts first, confirms, then writes.
 *
 * A settings menu entry is a class Foundry instantiates and renders, so the work
 * hangs off `render()` rather than off a constructor or a static. Nothing is
 * ever drawn: the flow is two dialogs and a notification, and returning `this`
 * keeps the caller's chained `.render(true)` happy.
 */
class RefreshTalentsApp {
    render() {
        RefreshTalentsApp.open();
        return this;
    }

    static async open() {
        let preview;
        try {
            preview = await refreshTalentRules({ dryRun: true });
        } catch (error) {
            ui.notifications.error(game.i18n.localize("ASCENDANT.Refresh.NoCompendium"));
            console.error(error);
            return;
        }

        if (preview.updated.length === 0) {
            ui.notifications.info(
                game.i18n.format("ASCENDANT.Refresh.NothingToDo", { scanned: preview.scanned }),
            );
            return;
        }

        const list = preview.updated.map((line) => `<li>${foundry.utils.escapeHTML(line)}</li>`).join("");
        const confirmed = await foundry.applications.api.DialogV2.confirm({
            window: { title: game.i18n.localize("ASCENDANT.Refresh.Title") },
            content:
                `<p>${game.i18n.format("ASCENDANT.Refresh.Found", { count: preview.updated.length })}</p>` +
                `<ul class="ascendant-refresh-list">${list}</ul>`,
            yes: { label: game.i18n.localize("ASCENDANT.Refresh.Confirm") },
        });
        if (!confirmed) return;

        // Reuse the dry run's compendium read rather than fetching the pack again.
        const result = await refreshTalentRules({ rules: preview.rules });
        if (result.failed.length) {
            ui.notifications.warn(
                game.i18n.format("ASCENDANT.Refresh.PartiallyFailed", { count: result.failed.length }),
            );
            console.warn(`${MODULE_ID} | still stale after refresh:`, result.failed);
        } else {
            ui.notifications.info(
                game.i18n.format("ASCENDANT.Refresh.Done", { count: result.updated.length }),
            );
        }
        console.log(`${MODULE_ID} | refreshed:\n  ${result.updated.join("\n  ")}`);
    }
}

/**
 * Registered as a settings menu so it appears as a button in the module's
 * settings, which is a place a GM can find without being told where to look.
 */
export function registerRefreshButton() {
    game.settings.registerMenu(MODULE_ID, "refreshRules", {
        name: "ASCENDANT.Refresh.Name",
        label: "ASCENDANT.Refresh.Label",
        hint: "ASCENDANT.Refresh.Hint",
        icon: "fa-solid fa-arrows-rotate",
        type: RefreshTalentsApp,
        restricted: true,
    });
}
