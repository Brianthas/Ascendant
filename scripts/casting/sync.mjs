/**
 * Spellcasting entries for casting classes: create them, keep their slot maxima on the table, and
 * show on the sheet where a rank differs from it.
 *
 * PF2e creates no entry for a class and derives no slot maximum (`scripts/spell-slots.mjs` header),
 * so everything here writes stored data: the entry item, and `system.slots.slotN.max` on it.
 * Arithmetic lives in `expected.mjs`; this file reads the actor and writes.
 *
 * An entry Ascendant manages carries `flags.ascendant.casting`:
 *   { source: "class:<slug>[:<pool>]" | "archetype:<slug>", classSlug, pool, synced: { slotN: n }, grantedDone: [] }
 * `synced` is what was last written or accepted per rank; `planSync` uses it to tell a rank the
 * table moved from one a player edited. `grantedDone` is written by `granted.mjs`.
 */
import { MODULE_ID } from "../constants.mjs";
import { SECTION_PREFIX } from "../variants/constants.mjs";
import { hasTalent } from "../spell-slots.mjs";
import { CASTING_CLASSES, CASTING_ARCHETYPES, OTHER_ARCHETYPES, BREADTH, TRADITIONS } from "./classes.mjs";
import { expectedSlots, planSync, syncRank, nextValue, archetypeRow, archetypeSignatures, withBreadth, SLOT_KEYS } from "./expected.mjs";
import { castingAutomationOn } from "./settings.mjs";
import { grantSpells } from "./granted.mjs";
import { parseSlotTable, fontRow } from "./modifiers.mjs";

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

/**
 * A psychic's attribute is set by its subconscious mind, which says so only in its text ("Key
 * Attribute Your key attribute is Intelligence", Precise Discipline; "... is Charisma", Wandering
 * Reverie). PF2e applies none of it: the Psychic class item offers no key attribute
 * (`keyAbility.value` is empty), so a fresh psychic's derived key reads "str" (measured
 * 2026-11-07). The actor's own key is the fallback when it is one of the two.
 */
function resolveAttribute(actor, rule) {
    if (rule !== "key") return rule;
    const mind = actor.itemTypes.feat.find((f) => f.system.traits?.otherTags?.includes("psychic-subconscious-mind"));
    // The label is bold: "<strong>Key Attribute</strong> Your key attribute is Intelligence."
    const stated = (mind?.system.description.value ?? "").match(/Key Attribute(?:<[^>]*>|\s)*Your key attribute(?: score)? is (Intelligence|Charisma)/);
    if (stated) return stated[1] === "Intelligence" ? "int" : "cha";
    const key = actor.system.details?.keyability?.value;
    return key === "int" || key === "cha" ? key : null;
}

function sourceKey(classSlug, pool) {
    return pool === classSlug ? `class:${classSlug}` : `class:${classSlug}:${pool}`;
}

/**
 * The slugs of every feat and class feature, grouped by the class each belongs to.
 *
 * An item belongs to the actor's class named in its traits. A Dual Class character can hold two
 * classes sharing a feat (Cantrip Expansion carries eight class traits), so the feat's sheet slot
 * decides: an extra class's ladder slots are `<SECTION_PREFIX.CLASS>-<slug>-<level>`, the ids
 * variants/planner-slots.mjs builds. Otherwise it goes to the first matching class.
 */
function slugsByClass(actor, classSlugs) {
    const groups = new Map(classSlugs.map((s) => [s, new Set()]));
    for (const item of actor.itemTypes.feat) {
        const slug = item.slug ?? game.pf2e.system.sluggify(item.name);
        const owners = classSlugs.filter((s) => item.system.traits?.value?.includes(s));
        if (owners.length === 0) continue;
        const location = typeof item.system.location === "string" ? item.system.location : "";
        const owner = owners.find((s) => location.startsWith(`${SECTION_PREFIX.CLASS}-${s}-`)) ?? owners[0];
        groups.get(owner).add(slug);
    }
    return groups;
}

/** Every entry the actor's casting classes call for, with what each should hold now. */
export function wantedEntries(actor) {
    const tripled = hasTalent(actor);
    const wanted = [];
    const classItems = actor.itemTypes.class;
    const groups = slugsByClass(actor, classItems.map(classSlugOf));
    for (const classItem of classItems) {
        const classSlug = classSlugOf(classItem);
        const meta = CASTING_CLASSES[classSlug];
        if (!meta) continue;
        const slugs = groups.get(classSlug);
        const replaced = replacementRow(actor, classSlug, slugs);
        for (const [pool, type] of Object.entries(meta.pools)) {
            if (pool === "font" && !slugs.has("divine-font")) continue;
            // Battle Creed's own table stands in for the class's, and Divine Font sits at its highest rank.
            const row = replaced ? (pool === "font" ? fontRow(replaced, actor.level) : replaced) : undefined;
            wanted.push({
                row,
                source: sourceKey(classSlug, pool),
                classSlug,
                pool,
                type,
                className: classItem.name,
                slugs,
                tripled,
                tradition: resolveTradition(actor, meta.tradition),
                attribute: resolveAttribute(actor, meta.attribute),
                expected: expectedSlots({ classSlug, pool, type, level: actor.level, tripled, slugs, row }),
            });
        }
    }
    wanted.push(...wantedArchetypes(actor, tripled));
    return wanted;
}

/** Class features that replace a class's Spells per Day table with one in their own text. */
const REPLACING_TABLES = { cleric: "battle-creed" };
const unreadable = new Set();

/** This level's row of a replacing table the class holds, or undefined to use the class table. */
function replacementRow(actor, classSlug, slugs) {
    const slug = REPLACING_TABLES[classSlug];
    if (!slug || !slugs.has(slug)) return undefined;
    const feature = actor.itemTypes.feat.find((f) => f.slug === slug);
    const table = parseSlotTable(feature?.system.description.value);
    if (!table) {
        // Loud once per actor: the class table is used instead, and every rank it gets wrong shows a !.
        if (!unreadable.has(actor.id)) console.error(`${MODULE_ID} | ${actor.name}: no Spells per Day table could be read from ${feature?.name ?? slug}; using the ${classSlug} table`);
        unreadable.add(actor.id);
        return undefined;
    }
    return table[Math.min(Math.max(actor.level, 1), 20) - 1];
}

/** Psychic Dedication: "the attribute you used to qualify for the archetype", Intelligence or Charisma. */
function qualifyingAttribute(actor) {
    const int = actor.system.abilities?.int?.mod ?? 0;
    const cha = actor.system.abilities?.cha?.mod ?? 0;
    return cha > int ? "cha" : "int";
}

/** One entry per class-named spellcasting archetype the character has taken (classes.mjs CASTING_ARCHETYPES). */
function wantedArchetypes(actor, tripled) {
    const held = new Set(actor.itemTypes.feat.map((f) => f.slug ?? game.pf2e.system.sluggify(f.name)));
    const wanted = [];
    for (const [classSlug, archetype] of Object.entries(CASTING_ARCHETYPES)) {
        const basic = held.has(`basic-${classSlug}-spellcasting`);
        const dedication = held.has(`${classSlug}-dedication`);
        if (!(archetype.cantripsAt === "basic" ? basic : dedication)) continue;
        const meta = CASTING_CLASSES[classSlug];
        const type = Object.values(meta.pools)[0];
        const tiers = { basic, expert: held.has(`expert-${classSlug}-spellcasting`), master: held.has(`master-${classSlug}-spellcasting`) };
        const base = archetypeRow({ level: actor.level, cantrips: archetype.cantrips, ...tiers });
        const row = BREADTH[classSlug] && held.has(BREADTH[classSlug]) ? withBreadth(base) : base;
        wanted.push({
            source: `archetype:${classSlug}`,
            classSlug,
            pool: "archetype",
            type,
            // CONFIG.PF2E.classTraits maps a class slug to its label key ("bard" to PF2E.TraitBard).
            className: game.i18n.format("ASCENDANT.Casting.ArchetypeName", { class: game.i18n.localize(CONFIG.PF2E.classTraits?.[classSlug] ?? classSlug) }),
            slugs: new Set(),
            tripled,
            row,
            signatureCount: type === "spontaneous" ? archetypeSignatures({ level: actor.level, ...tiers }) : null,
            tradition: resolveTradition(actor, meta.tradition),
            attribute: archetype.attribute === "qualify" ? qualifyingAttribute(actor) : resolveAttribute(actor, meta.attribute),
            expected: expectedSlots({ classSlug, pool: "archetype", type, level: actor.level, tripled, row }),
        });
    }

    // Archetypes not named for a class (classes.mjs OTHER_ARCHETYPES).
    const castsFromSlots = actor.itemTypes.class.some((c) => CASTING_CLASSES[classSlugOf(c)]);
    for (const [key, archetype] of Object.entries(OTHER_ARCHETYPES)) {
        if (!held.has(archetype.dedication ?? `${key}-dedication`)) continue;
        const tier = (name) => held.has(archetype.tiers ? `${name}-${archetype.tiers}-spellcasting` : `${name}-spellcasting`);
        const tiers = { basic: tier("basic"), expert: tier("expert"), master: tier("master") };
        const cantrips = archetype.noCantripsIfCaster && castsFromSlots ? 0 : archetype.cantrips;
        const row = archetypeRow({ level: actor.level, cantrips, ...tiers });
        wanted.push({
            source: `archetype:${key}`,
            classSlug: key,
            pool: "archetype",
            type: archetype.type,
            className: game.i18n.format("ASCENDANT.Casting.ArchetypeName", { class: archetype.label }),
            slugs: new Set(),
            tripled,
            row,
            signatureCount: archetype.type === "spontaneous" ? archetypeSignatures({ level: actor.level, ...tiers }) : null,
            tradition: archetype.tradition,
            attribute: archetype.attribute,
            // Its tradition is a choice PF2e does not record: only an entry the player built is managed.
            adoptOnly: archetype.tradition === null,
            expected: expectedSlots({ classSlug: key, pool: "archetype", type: archetype.type, level: actor.level, tripled, row }),
        });
    }
    return wanted;
}

export function managedEntries(actor) {
    return actor.itemTypes.spellcastingEntry.filter((e) => typeof e.flags?.[MODULE_ID]?.[FLAG]?.source === "string");
}

function storedMaxima(entry) {
    const slots = entry._source.system?.slots ?? {};
    return Object.fromEntries(SLOT_KEYS.map((k) => [k, Number(slots[k]?.max) || 0]));
}

function entryName(want) {
    if (want.pool === "apparition") return game.i18n.localize("ASCENDANT.Casting.ApparitionEntryName");
    if (want.pool === "font") return game.i18n.localize("ASCENDANT.Casting.FontEntryName");
    return game.i18n.format("ASCENDANT.Casting.EntryName", { class: want.className });
}

/**
 * The update that writes these maxima, with each rank's remaining slots (`value`) moved too.
 *
 * PF2e clamps `value` to `max` only when the update carries `value` (`_preUpdate`, pf2e.mjs:53812),
 * so lowering a maximum alone leaves more slots remaining than the rank has: measured live, 12 of 4
 * after Inexhaustible Magics was removed, and the next cast then wrote 11 and was clamped to 4.
 */
function slotUpdate(entry, writes) {
    const update = {};
    const source = entry?._source.system?.slots ?? {};
    for (const [key, max] of Object.entries(writes)) {
        update[`system.slots.${key}.max`] = max;
        const value = nextValue(Number(source[key]?.max) || 0, Number(source[key]?.value) || 0, max);
        if (value !== (Number(source[key]?.value) || 0)) update[`system.slots.${key}.value`] = value;
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
 * Then adds the spells the class grants by name (`granted.mjs`).
 *
 * @returns {Promise<{created: string[], adopted: string[], ranksWritten: number, mismatched: number, waiting: string[], granted: string[]}>}
 */
export async function syncActor(actor) {
    const report = { created: [], adopted: [], ranksWritten: 0, mismatched: 0, waiting: [], granted: [] };
    if (!castingAutomationOn() || actor?.type !== "character" || !actor.isOwner) return report;

    const managed = managedEntries(actor);
    const claimed = new Set(managed.map((e) => e.id));
    const creates = [];
    const updates = [];

    for (const want of wantedEntries(actor)) {
        let entry = managed.find((e) => e.flags[MODULE_ID][FLAG].source === want.source);

        if (!entry) {
            if (want.adoptOnly) {
                // The player chose the tradition and PF2e did not record it: adopt the entry they
                // built, but only when it is the one unclaimed entry of this type, never a guess.
                const candidates = actor.itemTypes.spellcastingEntry.filter((e) => !claimed.has(e.id) && e.system.prepared?.value === want.type);
                entry = candidates.length === 1 ? candidates[0] : null;
                if (!entry) {
                    report.waiting.push(want.className);
                    continue;
                }
            } else if (!want.tradition || !want.attribute) {
                report.waiting.push(want.className);
                continue;
            } else {
                entry = actor.itemTypes.spellcastingEntry.find(
                    (e) => !claimed.has(e.id) && e.system.prepared?.value === want.type && e.system.tradition?.value === want.tradition,
                );
            }
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

    // Granted spells go in once the entry exists and its ranks are current.
    const wantedNow = wantedEntries(actor);
    for (const entry of managedEntries(actor)) {
        const want = wantedNow.find((w) => w.source === entry.flags[MODULE_ID][FLAG].source);
        if (want) report.granted.push(...(await grantSpells(actor, entry, want)));
    }
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
    if (report.granted.length) parts.push(game.i18n.format("ASCENDANT.Casting.Granted", { names: report.granted.join(", ") }));
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
            if (report.created.length || report.adopted.length || report.ranksWritten || report.waiting.length || report.granted.length) notifyReport(report, { always: false });
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
