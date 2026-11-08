/**
 * A Prepare Spells window for prepared spellcasting entries, opened by the sheet's own Prepare
 * Spells button while spellcasting automation is on.
 *
 * PF2e's window (`SpellPreparationApp`, pf2e.mjs:22589) has one drop handler for the whole window,
 * which adds the dropped spell to the spellbook and re-sorts it (pf2e.mjs:22745); it never reads
 * the slot it was dropped on. Here every slot is its own drop target, and a spell can also be
 * picked in the spellbook and then clicked into a slot.
 *
 * Every write goes through PF2e's own SpellCollection methods (pf2e.mjs:33646-33668):
 * `addSpell` copies a spell into the spellbook, `prepareSpell(spell, rank, index)` fills a slot and
 * refuses a cantrip in a ranked slot or a spell above the slot's rank with the system's warning,
 * `prepareSpell(null, ...)` empties a slot, and `setSlotExpendedState` marks one spent. A spell in
 * a slot above its base rank is cast at the slot's rank, so dropping a 1st-rank spell on a
 * 2nd-rank slot prepares it heightened.
 *
 * A slot's position is its place in the list PF2e derives, which puts a rank's filled slots first
 * (`prepareBaseData`, pf2e.mjs:53590), and that is the position PF2e's slot methods take. So a
 * spell dropped on the third empty slot of a rank shows in the first row once the write lands.
 *
 * Flexible entries keep the system's window: their slots work differently.
 *
 * The class is built on first call, as in variants/permissions.mjs, so importing this file needs
 * no Foundry globals.
 */
import { castingAutomationOn } from "./settings.mjs";

let cached = null;

const escape = (text) => foundry.utils.escapeHTML(String(text ?? ""));
const groupIdFor = (rank) => (rank === 0 ? "cantrips" : rank);

export function prepareSpellsApp() {
    if (cached) return cached;
    const { ApplicationV2 } = foundry.applications.api;

    cached = class AscendantPrepareSpells extends ApplicationV2 {
        static DEFAULT_OPTIONS = {
            classes: ["ascendant-prepare"],
            position: { width: 760, height: 640 },
            window: { icon: "fa-solid fa-book-open-reader", resizable: true },
            actions: {
                pick: AscendantPrepareSpells.#onPick,
                assign: AscendantPrepareSpells.#onAssign,
                unprepare: AscendantPrepareSpells.#onUnprepare,
                expend: AscendantPrepareSpells.#onExpend,
            },
        };

        /** The spell picked in the spellbook, waiting for a slot click. */
        #picked = null;
        /** The search text, kept across re-renders. */
        #search = "";

        _initializeApplicationOptions(options) {
            const initialized = super._initializeApplicationOptions(options);
            initialized.id = `ascendant-prepare-${options.entry.actor.id}-${options.entry.id}`;
            return initialized;
        }

        get entry() {
            return this.options.entry.actor.items.get(this.options.entry.id) ?? this.options.entry;
        }

        get actor() {
            return this.options.entry.actor;
        }

        get title() {
            return game.i18n.format("ASCENDANT.Casting.Prepare.Title", { entry: this.entry.name, actor: this.actor.name });
        }

        async _onFirstRender(context, options) {
            await super._onFirstRender(context, options);
            // The same registration PF2e's window makes, so updates to the actor's items and to
            // the entry re-render this window.
            this.actor.apps[this.id] = this;
            this.entry.apps[this.id] = this;
        }

        _onClose(options) {
            delete this.actor.apps[this.id];
            delete this.entry.apps[this.id];
            super._onClose(options);
        }

        /** Ranks with slots, cantrips first, each slot with what it holds. */
        #slotGroups() {
            const entry = this.entry;
            const groups = [];
            for (let rank = 0; rank <= 10; rank++) {
                const data = entry.system.slots?.[`slot${rank}`];
                if (!data || !(data.max > 0)) continue;
                const slots = (data.prepared ?? []).slice(0, data.max).map((slot, index) => {
                    const spell = slot?.id ? this.actor.items.get(slot.id) : null;
                    return { index, spell, expended: !!slot?.expended };
                });
                groups.push({ rank, slots, filled: slots.filter((s) => s.spell).length });
            }
            return groups;
        }

        /** The entry's spellbook by base rank, each spell with how many slots hold it. */
        #spellbook(groups) {
            const uses = new Map();
            for (const group of groups) for (const slot of group.slots) if (slot.spell) uses.set(slot.spell.id, (uses.get(slot.spell.id) ?? 0) + 1);
            const byRank = new Map();
            for (const spell of this.entry.spells?.contents ?? []) {
                const rank = spell.isCantrip ? 0 : spell.baseRank;
                if (!byRank.has(rank)) byRank.set(rank, []);
                byRank.get(rank).push({ spell, uses: uses.get(spell.id) ?? 0 });
            }
            for (const list of byRank.values()) list.sort((a, b) => a.spell.name.localeCompare(b.spell.name, game.i18n.lang));
            return [...byRank.entries()].sort(([a], [b]) => a - b);
        }

        #rankLabel(rank) {
            return rank === 0
                ? game.i18n.localize("ASCENDANT.Casting.Prepare.Cantrips")
                : game.i18n.format("ASCENDANT.Casting.Prepare.Rank", { rank });
        }

        async _renderHTML() {
            const groups = this.#slotGroups();
            const t = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));

            const book = this.#spellbook(groups)
                .map(([rank, list]) => `<section class="book-rank">
                    <h4>${escape(this.#rankLabel(rank))}</h4>
                    <ol>${list.map(({ spell, uses }) => `<li class="book-spell${this.#picked === spell.id ? " picked" : ""}" draggable="true"
                        data-action="pick" data-spell-id="${spell.id}" data-uuid="${spell.uuid}" data-name="${escape(spell.name.toLowerCase())}"
                        data-tooltip="${escape(t("ASCENDANT.Casting.Prepare.PickHint"))}">
                        <img src="${escape(spell.img)}" alt="">
                        <span class="name">${escape(spell.name)}</span>
                        ${uses ? `<span class="uses" data-tooltip="${escape(t("ASCENDANT.Casting.Prepare.UsesTooltip", { count: uses }))}">${uses}</span>` : ""}
                    </li>`).join("")}</ol>
                </section>`)
                .join("") || `<p class="hint">${escape(t("ASCENDANT.Casting.Prepare.EmptyBook"))}</p>`;

            const slots = groups
                .map((group) => `<section class="slot-rank">
                    <h4>${escape(this.#rankLabel(group.rank))}<span class="count">${group.filled} / ${group.slots.length}</span></h4>
                    <ol>${group.slots.map((slot) => {
                        const heightened = slot.spell && !slot.spell.isCantrip && slot.spell.baseRank < group.rank;
                        const body = slot.spell
                            ? `<img src="${escape(slot.spell.img)}" alt=""><span class="name">${escape(slot.spell.name)}</span>
                               ${heightened ? `<span class="heightened" data-tooltip="${escape(t("ASCENDANT.Casting.Prepare.HeightenedTooltip", { base: slot.spell.baseRank, rank: group.rank }))}">${escape(t("ASCENDANT.Casting.Prepare.Heightened", { rank: group.rank }))}</span>` : ""}
                               <a class="expend${slot.expended ? " on" : ""}" data-action="expend" data-tooltip="${escape(t(slot.expended ? "ASCENDANT.Casting.Prepare.Unexpend" : "ASCENDANT.Casting.Prepare.Expend"))}"><i class="fa-solid fa-${slot.expended ? "circle-xmark" : "circle-check"}"></i></a>
                               <a class="unprepare" data-action="unprepare" data-tooltip="${escape(t("ASCENDANT.Casting.Prepare.Unprepare"))}"><i class="fa-solid fa-xmark"></i></a>`
                            : `<span class="empty">${escape(t("ASCENDANT.Casting.Prepare.EmptySlot"))}</span>`;
                        return `<li class="slot${slot.spell ? " filled" : ""}${slot.expended ? " expended" : ""}" data-action="assign" data-rank="${group.rank}" data-index="${slot.index}">${body}</li>`;
                    }).join("")}</ol>
                </section>`)
                .join("") || `<p class="hint">${escape(t("ASCENDANT.Casting.Prepare.NoSlots"))}</p>`;

            return `<div class="columns">
                <div class="column book">
                    <h3>${escape(t("ASCENDANT.Casting.Prepare.Spellbook"))}</h3>
                    <input type="search" class="search" placeholder="${escape(t("ASCENDANT.Casting.Prepare.Search"))}" value="${escape(this.#search)}">
                    <p class="hint">${escape(t("ASCENDANT.Casting.Prepare.Hint"))}</p>
                    <div class="scroll">${book}</div>
                </div>
                <div class="column slots">
                    <h3>${escape(t("ASCENDANT.Casting.Prepare.Slots"))}</h3>
                    <div class="scroll">${slots}</div>
                </div>
            </div>`;
        }

        _replaceHTML(result, content) {
            content.innerHTML = result;
        }

        _onRender(context, options) {
            super._onRender(context, options);
            const root = this.element;

            const search = root.querySelector("input.search");
            const filter = () => {
                this.#search = search.value;
                const needle = search.value.trim().toLowerCase();
                for (const row of root.querySelectorAll(".book-spell")) row.hidden = !!needle && !row.dataset.name.includes(needle);
            };
            search.addEventListener("input", filter);
            filter();

            for (const row of root.querySelectorAll(".book-spell")) {
                row.addEventListener("dragstart", (event) => {
                    event.dataTransfer.setData("text/plain", JSON.stringify({ type: "Item", uuid: row.dataset.uuid }));
                });
            }
            for (const slot of root.querySelectorAll("li.slot")) {
                slot.addEventListener("dragover", (event) => {
                    event.preventDefault();
                    slot.classList.add("drop-target");
                });
                slot.addEventListener("dragleave", () => slot.classList.remove("drop-target"));
                slot.addEventListener("drop", (event) => this.#onDrop(event, slot));
            }
        }

        /** Put a spell from anywhere (this spellbook, the compendium, another entry) into one slot. */
        async #onDrop(event, slot) {
            event.preventDefault();
            event.stopPropagation();
            slot.classList.remove("drop-target");
            const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
            const dropped = data?.type === "Item" ? await Item.implementation.fromDropData(data) : null;
            if (!dropped || dropped.type !== "spell") {
                ui.notifications.warn(game.i18n.localize("ASCENDANT.Casting.Prepare.NotASpell"));
                return;
            }
            await this.#prepare(dropped, Number(slot.dataset.rank), Number(slot.dataset.index));
        }

        async #prepare(spell, rank, index) {
            const entry = this.entry;
            // The same two refusals prepareSpell makes, checked before addSpell so a spell that cannot
            // go in this slot is not copied into the spellbook on the way.
            if ((rank === 0) !== spell.isCantrip || (!spell.isCantrip && spell.baseRank > rank)) {
                ui.notifications.warn(game.i18n.format("ASCENDANT.Casting.Prepare.WrongRank", { spell: spell.name, rank: spell.isCantrip ? 0 : spell.baseRank, slot: rank }));
                return;
            }
            let owned = spell;
            if (!(spell.actor === this.actor && spell.system.location?.value === entry.id)) {
                // addSpell copies the spell into this spellbook at its base rank (or moves it here from
                // another of the actor's entries) and returns the item in the spellbook.
                owned = await entry.spells.addSpell(spell, { groupId: groupIdFor(rank) });
                if (!owned) return;
            }
            this.#picked = null;
            await entry.spells.prepareSpell(owned, groupIdFor(rank), index);
        }

        static #onPick(event, target) {
            const id = target.dataset.spellId;
            this.#picked = this.#picked === id ? null : id;
            for (const row of this.element.querySelectorAll(".book-spell")) row.classList.toggle("picked", row.dataset.spellId === this.#picked);
        }

        static async #onAssign(event, target) {
            if (!this.#picked) return;
            const spell = this.actor.items.get(this.#picked);
            if (!spell) return;
            await this.#prepare(spell, Number(target.dataset.rank), Number(target.dataset.index));
        }

        static async #onUnprepare(event, target) {
            event.stopPropagation();
            const slot = target.closest("li.slot");
            await this.entry.spells.prepareSpell(null, groupIdFor(Number(slot.dataset.rank)), Number(slot.dataset.index));
        }

        static async #onExpend(event, target) {
            event.stopPropagation();
            const slot = target.closest("li.slot");
            const rank = Number(slot.dataset.rank);
            const index = Number(slot.dataset.index);
            const expended = !!this.entry.system.slots[`slot${rank}`]?.prepared?.[index]?.expended;
            await this.entry.spells.setSlotExpendedState(groupIdFor(rank), index, !expended);
        }
    };
    return cached;
}

/** Open ours for one entry, or bring an open one forward. */
export function openPrepareSpells(entry) {
    const App = prepareSpellsApp();
    const existing = foundry.applications.instances.get(`ascendant-prepare-${entry.actor.id}-${entry.id}`);
    if (existing) {
        existing.bringToFront();
        return existing;
    }
    return new App({ entry }).render({ force: true });
}

/**
 * Take over the sheet's Prepare Spells button while automation is on. The listener runs in the
 * capture phase on the sheet element, ahead of PF2e's own click handling, and only for an entry
 * that is prepared and not flexible; anything else falls through to the system's window.
 */
export function registerPrepareSpells() {
    Hooks.on("renderCharacterSheetPF2e", (sheet, element) => {
        const root = element instanceof HTMLElement ? element : element?.[0];
        const outer = root?.closest(".app, .application") ?? root;
        if (!outer || outer.dataset.ascendantPrepare === "1") return;
        outer.dataset.ascendantPrepare = "1";
        outer.addEventListener("click", (event) => {
            if (!castingAutomationOn()) return;
            const button = event.target.closest?.("[data-action=open-spell-preparation]");
            if (!button) return;
            const containerId = button.closest("[data-container-id]")?.dataset.containerId;
            const entry = containerId ? sheet.actor.items.get(containerId) : null;
            if (!entry?.isOfType?.("spellcastingEntry") || !entry.isPrepared || entry.isFlexible) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            openPrepareSpells(entry);
        }, { capture: true });
    });
    return true;
}
