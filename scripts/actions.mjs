import { flicker, TELEPORT_ACTIONS } from "./flicker.mjs";

/**
 * A Use button under every action this module grants.
 *
 * PF2e draws that button only for an action with a frequency, a self-applied effect or a
 * crafting use (pf2e.mjs:16655), and its handler posts the action's use message, applying the
 * effect and spending the use (17535). Our other actions had only the name to click. This adds
 * the same button to every action of ours that lacks one, with the same `data-action`, so
 * PF2e's own handler serves it. The teleport actions get their own handler instead: post the
 * card, then start the destination pick straight away.
 */

const isOurs = (item) => item?.type === "action" && (item.slug ?? "").startsWith("ascendant-") && item.system.actionType?.value !== "passive";

function glyphFor(item) {
    const type = item.system.actionType?.value;
    if (type === "reaction") return "R";
    if (type === "free") return "F";
    return String(item.system.actions?.value ?? 1);
}

export function registerActionButtons() {
    const onRender = (sheet, element) => {
        const actor = sheet?.actor;
        if (actor?.type !== "character" || !sheet.isEditable) return;
        const root = element instanceof HTMLElement ? element : element?.[0];
        if (!root) return;

        for (const row of root.querySelectorAll("li.action[data-item-id]")) {
            const item = actor.items.get(row.dataset.itemId);
            if (!isOurs(item)) continue;
            const group = row.querySelector(".button-group");
            if (!group) continue;
            const existing = group.querySelector("button.use-action");
            const teleport = TELEPORT_ACTIONS.has(item.slug);
            if (existing && !teleport) continue;
            // A teleport action that PF2e already gave a Use button (the free-action Flicker has a
            // per-round frequency) gets ours in its place, so pressing Use also starts the pick.
            if (existing && existing.dataset.ascendant === "1") continue;
            existing?.remove();

            const button = document.createElement("button");
            button.type = "button";
            button.className = "use-action";
            button.innerHTML = `<span>${game.i18n.localize("ASCENDANT.Actions.Use")}</span><span class="action-glyph">${glyphFor(item)}</span>`;
            if (teleport) {
                button.dataset.ascendant = "1";
                button.addEventListener("click", async (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    // The same bookkeeping PF2e's own Use does (pf2e.mjs:53662): spend a use.
                    const frequency = item.system.frequency;
                    if (frequency && frequency.value > 0) await item.update({ "system.frequency.value": frequency.value - 1 });
                    await item.toMessage(event, { create: true });
                    await flicker(actor, item.slug);
                });
            } else {
                button.dataset.action = "use-action";
            }
            group.append(button);
        }
    };
    Hooks.on("renderCharacterSheetPF2e", onRender);
    return true;
}
