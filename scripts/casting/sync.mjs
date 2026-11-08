/**
 * Spellcasting entries for casting classes: create them, keep their slot maxima on the table, and
 * show on the sheet where a rank differs from it.
 *
 * PF2e creates no entry for a class and derives no slot maximum (`scripts/spell-slots.mjs` header),
 * so everything here writes stored data: the entry item, and `system.slots.slotN.max` on it.
 * Arithmetic lives in `expected.mjs`; this file reads the actor and writes.
 *
 * An entry Ascendant manages carries `flags.ascendant.casting`:
 *   { source: "class:<slug>[:<pool>]", classSlug, pool, synced: { slotN: n } }
 * `synced` is what was last written or accepted per rank; `planSync` uses it to tell a rank the
 * table moved from one a player edited.
 */
import { MODULE_ID } from "../constants.mjs";
import { hasTalent } from "../spell-slots.mjs";
import { CASTING_CLASSES, TRADITIONS } from "./classes.mjs";
import { expectedSlots, planSync, syncRank, SLOT_KEYS } from "./expected.mjs";
import { castingAutomationOn } from "./settings.mjs";

const FLAG = "casting";

/** Item types whose arrival can change what an actor's entries should be. */
const TRIGGER_TYPES = new Set(["class", "feat", "deity"]);

function classSlugOf(item) {
    return item.slug ?? game.pf2e.system.sluggify(item.name);
}

/** The tradition a class casts from, or null while the choice that sets it is unmade. */
function resolveTradition(actor, rule) {
    let value = rule;
    if (rule === "bloodline") {
        // Each bloodline carries a RollOption `feature:bloodline:tradition:<t>` (Bloodline: Aberrant, read 2026-11-07).
        const option = actor.getRollOptions(["all"]).find((o) => o.startsWith("feature:bloodline:tradition:"));
        value = option?.split(":").at(-1);
    } else if (rule === "patron") {
        // Each patron writes `system.proficiencies.aliases.witch` (Faith's Flamekeeper: primal, Silence in Snow: divine).
        value = actor.system.proficiencies?.aliases?.witch;
    } else if (rule === "eidolon") {
        // Each eidolon writes `flags.system.eidolon.tradition` (Fey Eidolon: primal).
        value = actor.flags.system?.eidolon?.tradition;
    }
    return TRADITIONS.includes(value) ? value : null;
}

function resolveAttribute(actor, rule) {
    if (rule !== "key") return rule;
    const key = actor.system.details?.keyability?.value;
    return key === "int" || key === "cha" ? key : null;
}

function sourceKey(classSlug, pool) {
    return pool === classSlug ? `class:${classSlug}` : `class:${classSlug}:${pool}`;
}

/** Every entry the actor's casting classes call for, with what each should hold now. */
function wantedEntries(actor) {
    const tripled = hasTalent(actor);
    const wanted = [];
    for (const classItem of actor.itemTypes.class) {
        const classSlug = classSlugOf(classItem);
        const meta = CASTING_CLASSES[classSlug];
        if (!meta) continue;
        for (const [pool, type] of Object.entries(meta.pools)) {
            wanted.push({
                source: sourceKey(classSlug, pool),
                classSlug,
                pool,
                type,
                className: classItem.name,
                tradition: resolveTradition(actor, meta.tradition),
                attribute: resolveAttribute(actor, meta.attribute),
                expected: expectedSlots({ classSlug, pool, type, level: actor.level, tripled }),
            });
        }
    }
    return wanted;
}

function managedEntries(actor) {
    return actor.itemTypes.spellcastingEntry.filter((e) => typeof e.flags?.[MODULE_ID]?.[FLAG]?.source === "string");
}

function storedMaxima(entry) {
    const slots = entry._source.system?.slots ?? {};
    return Object.fromEntries(SLOT_KEYS.map((k) => [k, Number(slots[k]?.max) || 0]));
}

function entryName(want) {
    if (want.pool === "apparition") return game.i18n.localize("ASCENDANT.Casting.ApparitionEntryName");
    return game.i18n.format("ASCENDANT.Casting.EntryName", { class: want.className });
}

/** The update that writes these maxima, raising `value` by what each rank gained. */
function slotUpdate(entry, writes) {
    const update = {};
    const source = entry?._source.system?.slots ?? {};
    for (const [key, max] of Object.entries(writes)) {
        update[`system.slots.${key}.max`] = max;
        const oldMax = Number(source[key]?.max) || 0;
        const oldValue = Number(source[key]?.value) || 0;
        if (max > oldMax) update[`system.slots.${key}.value`] = oldValue + (max - oldMax);
    }
    return update;
}

/**
 * Bring one actor's entries in line with its classes and level.
 *
 * Creates a missing entry, or adopts an unflagged one of the same preparation type and tradition
 * (an entry the player built before the setting was on), and moves every managed rank. Never
 * deletes an entry: a class that leaves takes its entry out of management only.
 *
 * @returns {Promise<{created: string[], adopted: string[], ranksWritten: number, mismatched: number, waiting: string[]}>}
 */
export async function syncActor(actor) {
    const report = { created: [], adopted: [], ranksWritten: 0, mismatched: 0, waiting: [] };
    if (!castingAutomationOn() || actor?.type !== "character" || !actor.isOwner) return report;

    const managed = managedEntries(actor);
    const claimed = new Set(managed.map((e) => e.id));
    const creates = [];
    const updates = [];

    for (const want of wantedEntries(actor)) {
        let entry = managed.find((e) => e.flags[MODULE_ID][FLAG].source === want.source);

        if (!entry) {
            if (!want.tradition || !want.attribute) {
                report.waiting.push(want.className);
                continue;
            }
            entry = actor.itemTypes.spellcastingEntry.find(
                (e) => !claimed.has(e.id) && e.system.prepared?.value === want.type && e.system.tradition?.value === want.tradition,
            );
            if (entry) {
                claimed.add(entry.id);
                const plan = planSync(storedMaxima(entry), {}, want.expected);
                updates.push({
                    _id: entry.id,
                    [`flags.${MODULE_ID}.${FLAG}`]: { source: want.source, classSlug: want.classSlug, pool: want.pool, synced: plan.synced },
                });
                report.adopted.push(entry.name);
                report.mismatched += plan.mismatches.length;
                continue;
            }
            const writes = Object.fromEntries(SLOT_KEYS.map((k) => [k, want.expected[k]]));
            creates.push({
                name: entryName(want),
                type: "spellcastingEntry",
                system: {
                    prepared: { value: want.type, ...(want.type === "prepared" ? { flexible: false } : {}) },
                    tradition: { value: want.tradition },
                    ability: { value: want.attribute },
                    proficiency: { slug: "" },
                    autoHeightenLevel: { value: null },
                    spelldc: { value: 0, dc: 0 },
                    // A new entry starts with every slot available.
                    slots: Object.fromEntries(SLOT_KEYS.map((k) => [k, { max: writes[k], value: writes[k], prepared: [] }])),
                },
                flags: { [MODULE_ID]: { [FLAG]: { source: want.source, classSlug: want.classSlug, pool: want.pool, synced: writes } } },
            });
            report.created.push(entryName(want));
            continue;
        }

        const flag = entry.flags[MODULE_ID][FLAG];
        const plan = planSync(storedMaxima(entry), flag.synced ?? {}, want.expected);
        report.mismatched += plan.mismatches.length;
        const changedRecord = JSON.stringify(plan.synced) !== JSON.stringify(flag.synced ?? {});
        if (Object.keys(plan.writes).length === 0 && !changedRecord) continue;
        report.ranksWritten += Object.keys(plan.writes).length;
        updates.push({ _id: entry.id, ...slotUpdate(entry, plan.writes), [`flags.${MODULE_ID}.${FLAG}.synced`]: plan.synced });
    }

    if (creates.length) await actor.createEmbeddedDocuments("Item", creates);
    if (updates.length) await actor.updateEmbeddedDocuments("Item", updates);
    return report;
}

/** The per-rank sync button: write the expected value for one rank of one managed entry. */
async function syncOneRank(actor, entry, key) {
    const flag = entry.flags?.[MODULE_ID]?.[FLAG];
    const want = wantedEntries(actor).find((w) => w.source === flag?.source);
    if (!want) {
        ui.notifications.warn(game.i18n.format("ASCENDANT.Casting.NoClass", { entry: entry.name }));
        return;
    }
    const { writes, synced } = syncRank(flag.synced ?? {}, want.expected, key);
    await entry.update({ ...slotUpdate(entry, writes), [`flags.${MODULE_ID}.${FLAG}.synced`]: synced });
}

function notifyReport(report, { always }) {
    const parts = [];
    if (report.created.length) parts.push(game.i18n.format("ASCENDANT.Casting.Created", { names: report.created.join(", ") }));
    if (report.adopted.length) parts.push(game.i18n.format("ASCENDANT.Casting.Adopted", { names: report.adopted.join(", ") }));
    if (report.ranksWritten) parts.push(game.i18n.format("ASCENDANT.Casting.RanksWritten", { count: report.ranksWritten }));
    if (report.waiting.length) parts.push(game.i18n.format("ASCENDANT.Casting.Waiting", { names: report.waiting.join(", ") }));
    if (report.mismatched) parts.push(game.i18n.format("ASCENDANT.Casting.Mismatched", { count: report.mismatched }));
    if (parts.length === 0 && always) parts.push(game.i18n.localize("ASCENDANT.Casting.UpToDate"));
    if (parts.length) ui.notifications.info(`Ascendant: ${parts.join(" ")}`);
}

/**
 * One sync per actor at a time, after a burst of item creations settles: adding a class creates its
 * features one GrantItem at a time, and the entry should be built once from the final state.
 */
const pending = new Map();
function scheduleSync(actor) {
    clearTimeout(pending.get(actor.id));
    pending.set(actor.id, setTimeout(async () => {
        pending.delete(actor.id);
        try {
            const report = await syncActor(actor);
            if (report.created.length || report.adopted.length || report.ranksWritten || report.waiting.length) notifyReport(report, { always: false });
        } catch (error) {
            console.error(`${MODULE_ID} | spellcasting sync failed for ${actor.name}`, error);
            ui.notifications.error(game.i18n.format("ASCENDANT.Casting.SyncFailed", { actor: actor.name }));
        }
    }, 300));
}

function onItemChange(item, userId) {
    if (game.user.id !== userId || !castingAutomationOn()) return;
    const actor = item?.parent;
    if (actor?.type !== "character" || !TRIGGER_TYPES.has(item.type)) return;
    scheduleSync(actor);
}

function addRankControls(sheet, element) {
    const actor = sheet?.actor;
    if (!castingAutomationOn() || actor?.type !== "character" || !sheet.isEditable) return;
    const root = element instanceof HTMLElement ? element : element?.[0];
    if (!root) return;

    const wanted = wantedEntries(actor);
    for (const entry of managedEntries(actor)) {
        const want = wanted.find((w) => w.source === entry.flags[MODULE_ID][FLAG].source);
        if (!want) continue;
        const stored = storedMaxima(entry);
        for (const key of SLOT_KEYS) {
            if (stored[key] === want.expected[key]) continue;
            const input = root.querySelector(`input[data-item-id="${entry.id}"][data-item-property="system.slots.${key}.max"]`);
            const anchor = input?.closest(".spell-max-input");
            if (!anchor || anchor.parentElement.querySelector(".ascendant-slot-sync")) continue;

            const marker = document.createElement("span");
            marker.className = "ascendant-slot-mismatch";
            marker.textContent = "!";
            marker.dataset.tooltip = game.i18n.format("ASCENDANT.Casting.MismatchTooltip", { expected: want.expected[key] });

            const button = document.createElement("a");
            button.className = "ascendant-slot-sync";
            button.dataset.tooltip = game.i18n.format("ASCENDANT.Casting.SyncRankTooltip", { expected: want.expected[key] });
            button.innerHTML = `<i class="fa-solid fa-arrows-rotate"></i>`;
            button.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                syncOneRank(actor, entry, key);
            });
            anchor.after(marker, button);
        }
    }
}

export function registerCastingSync() {
    Hooks.on("createItem", (item, _options, userId) => onItemChange(item, userId));
    Hooks.on("deleteItem", (item, _options, userId) => onItemChange(item, userId));
    Hooks.on("updateActor", (actor, changes, _options, userId) => {
        if (game.user.id !== userId || !castingAutomationOn()) return;
        if (changes?.system?.details?.level === undefined) return;
        if (actor.type === "character") scheduleSync(actor);
    });
    Hooks.on("renderCharacterSheetPF2e", addRankControls);
    Hooks.on("getActorSheetPF2eHeaderButtons", (sheet, buttons) => {
        const actor = sheet.actor;
        if (!castingAutomationOn() || actor?.type !== "character" || !actor.isOwner) return;
        buttons.unshift({
            label: game.i18n.localize("ASCENDANT.Casting.SyncButton"),
            class: "ascendant-sync-casting",
            icon: "fa-solid fa-wand-sparkles",
            onclick: async () => notifyReport(await syncActor(actor), { always: true }),
        });
    });
    return true;
}
