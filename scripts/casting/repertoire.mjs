/**
 * Spontaneous entries on the sheet: spells known against the class table per rank, signature
 * spells against the ranks the entry has, and a control to learn a known spell again at a higher
 * rank.
 *
 * Counts come from `expected.mjs` (`expectedKnown`, `countKnown`, `signatureAllowed`); this file
 * reads the actor and draws them. Only entries the sync manages, and not an Animist's apparition
 * entry, whose spells come from its attuned apparitions and are all signature spells.
 */
import { MODULE_ID } from "../constants.mjs";
import { castingAutomationOn } from "./settings.mjs";
import { wantedEntries, managedEntries } from "./sync.mjs";
import { expectedKnown, countKnown, signatureAllowed, SLOT_KEYS } from "./expected.mjs";

/** Spells a class feature added on top of the table, by rank, read off the spells' own flag. */
function grantedOnTop(entry) {
    const counts = {};
    for (const spell of entry.spells?.contents ?? []) {
        if (spell.flags?.[MODULE_ID]?.granted?.onTop !== true) continue;
        const key = spell.isCantrip ? "slot0" : `slot${spell.rank}`;
        counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
}

function repertoireOf(entry) {
    return (entry.spells?.contents ?? [])
        .filter((s) => !s.isFocusSpell && !s.isRitual)
        .map((s) => ({ isCantrip: s.isCantrip, rank: s.rank, signature: !!s.system.location?.signature }));
}

/** What each managed spontaneous entry should know, and what it holds. */
export function repertoireState(actor) {
    const wanted = wantedEntries(actor);
    const states = [];
    for (const entry of managedEntries(actor)) {
        const want = wanted.find((w) => w.source === entry.flags[MODULE_ID].casting.source);
        if (!want || want.type !== "spontaneous" || want.pool === "apparition") continue;
        const expected = expectedKnown({
            classSlug: want.classSlug, pool: want.pool, level: actor.level, tripled: want.tripled,
            slugs: want.slugs, granted: grantedOnTop(entry), row: want.row,
        });
        const { known, signature } = countKnown(repertoireOf(entry));
        // An archetype counts its own (one each from basic, expert, master); a class needs Signature Spells.
        const signatures = want.signatureCount !== undefined
            ? (want.signatureCount || null)
            : want.slugs.has("signature-spells") ? signatureAllowed(want.expected) : null;
        states.push({ entry, want, expected, known, signature, signatures });
    }
    return states;
}

function badge(text, tooltip, off) {
    const span = document.createElement("span");
    span.className = `ascendant-known${off ? " off" : ""}`;
    span.textContent = text;
    span.dataset.tooltip = tooltip;
    return span;
}

/** A copy of a known spell, learned at a higher rank: a separate repertoire entry, as the rules count it. */
async function learnAtRank(entry, spell, ranks) {
    const options = ranks.map((r) => `<option value="${r}">${game.i18n.format("ASCENDANT.Casting.Prepare.Rank", { rank: r })}</option>`).join("");
    const rank = await foundry.applications.api.DialogV2.prompt({
        window: { title: game.i18n.format("ASCENDANT.Casting.Learn.Title", { spell: spell.name }) },
        content: `<p>${game.i18n.localize("ASCENDANT.Casting.Learn.Hint")}</p><div class="form-group"><select name="rank">${options}</select></div>`,
        ok: { label: game.i18n.localize("ASCENDANT.Casting.Learn.Confirm"), callback: (_event, button) => Number(button.form.elements.rank.value) },
        rejectClose: false,
    });
    if (!rank) return;
    // The construction PF2e's addSpell uses for a spell entering a spontaneous rank (pf2e.mjs:33657):
    // the same spell, located in this entry, with `heightenedLevel` set to the rank it is known at.
    const data = spell.toObject();
    delete data._id;
    data.sort = 0;
    data.system.location = { value: entry.id, heightenedLevel: rank, signature: false };
    await entry.actor.createEmbeddedDocuments("Item", [data]);
}

function draw(sheet, element) {
    const actor = sheet?.actor;
    if (!castingAutomationOn() || actor?.type !== "character") return;
    const root = element instanceof HTMLElement ? element : element?.[0];
    if (!root) return;
    const t = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));

    for (const state of repertoireState(actor)) {
        const { entry, expected, known } = state;

        for (const [rank, key] of SLOT_KEYS.entries()) {
            const groupId = rank === 0 ? "cantrips" : String(rank);
            const header = root.querySelector(`li.header-row[data-item-id="${entry.id}"][data-group-id="${groupId}"] .item-name`);
            if (!header || header.querySelector(".ascendant-known")) continue;
            if (!expected[key] && !known[key]) continue;
            const off = known[key] !== expected[key];
            header.append(badge(
                t("ASCENDANT.Casting.Known.Badge", { known: known[key], expected: expected[key] }),
                t(off ? "ASCENDANT.Casting.Known.OffTooltip" : "ASCENDANT.Casting.Known.Tooltip", { known: known[key], expected: expected[key] }),
                off,
            ));
        }

        // Beside the Spell DC, built the way PF2e builds that one (a skill-data section in
        // .statistic-values), so it takes the same spacing.
        const block = root.querySelector(`[data-container-id="${entry.id}"] .spell-ability-data .statistic-values`);
        if (state.signatures !== null && block && !block.querySelector(".ascendant-signature")) {
            const off = state.signature > state.signatures;
            const section = document.createElement("section");
            section.className = `skill-data ascendant-signature${off ? " off" : ""}`;
            section.dataset.tooltip = t(off ? "ASCENDANT.Casting.Signature.OverTooltip" : "ASCENDANT.Casting.Signature.Tooltip", { count: state.signature, allowed: state.signatures });
            section.innerHTML = `<span class="skill-score value">${state.signature} / ${state.signatures}</span><h4>${t("ASCENDANT.Casting.Signature.Label")}</h4>`;
            block.append(section);
        }

        if (!sheet.isEditable) continue;
        const highest = Math.max(0, ...SLOT_KEYS.map((k, r) => (state.want.expected[k] > 0 && r > 0 ? r : 0)));
        for (const row of root.querySelectorAll(`li.spell[data-entry-id="${entry.id}"]:not(.virtual)`)) {
            const spell = actor.items.get(row.dataset.itemId);
            if (!spell || spell.isCantrip || spell.isFocusSpell || spell.system.location?.signature) continue;
            // Beside the name: PF2e's controls column is 48px, three icons, and a fourth pushed the
            // row's controls over the Cast button.
            const name = row.querySelector(".item-name h4.name");
            if (!name || name.querySelector(".ascendant-learn")) continue;
            const ranks = [];
            for (let r = spell.baseRank; r <= highest; r++) {
                if (r === spell.rank) continue;
                const already = entry.spells.some((s) => s.name === spell.name && s.rank === r);
                if (!already) ranks.push(r);
            }
            if (!ranks.length) continue;
            const link = document.createElement("a");
            link.className = "ascendant-learn";
            link.dataset.tooltip = t("ASCENDANT.Casting.Learn.Tooltip");
            link.innerHTML = `<i class="fa-solid fa-fw fa-layer-group" inert></i>`;
            link.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                learnAtRank(entry, spell, ranks);
            });
            name.append(link);
        }
    }
}

export function registerRepertoire() {
    Hooks.on("renderCharacterSheetPF2e", draw);
    return true;
}
