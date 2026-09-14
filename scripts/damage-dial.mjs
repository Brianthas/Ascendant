import { MODULE_ID } from "./constants.mjs";

/**
 * Shape of Harm: attune and reset from the action card.
 *
 * The attunement is a toggleable RollOption with suboptions on the talent, so
 * it is already settable from the effects panel dropdown. This adds the two
 * actions as the way in: Attune posts a card of type buttons and sets the dial
 * to the one pressed, Release posts a card with one button that switches it
 * off. Verified live on PF2e 8.5.0.
 *
 * The RollOption rule element owns the write. `rule.toggle(value, selection)`
 * both sets the roll option and stores the selection in the item flag that the
 * DamageAlteration reads, which is why nothing here writes a flag directly.
 */

const DIAL_OPTION = "ascendant-shape-of-harm";
const TALENT_SLUG = "shape-of-harm";
const ACTION_SET = "shape-of-harm-attune";
const ACTION_RESET = "shape-of-harm-release";

/** The rule element that owns the dial on this actor, or null. */
function dialRule(actor) {
    const talent = actor?.itemTypes?.feat?.find((i) => i.slug === TALENT_SLUG);
    if (!talent) return null;
    return talent.rules?.find((r) => r.key === "RollOption" && r.option === DIAL_OPTION) ?? null;
}

/** The types the dial offers this actor, read off the rule and filtered by each suboption's predicate. */
function dialChoices(rule, actor) {
    const options = new Set(actor?.getRollOptions?.() ?? []);
    return (rule?.suboptions ?? [])
        .filter((s) => !s.predicate || game.pf2e.Predicate.test(s.predicate, options))
        .map((s) => ({ value: s.value, label: game.i18n.localize(s.label ?? s.value) }));
}

/** What the dial is currently set to, or null when it is off. */
function currentSetting(actor) {
    const rule = dialRule(actor);
    if (!rule) return null;
    const selection = rule.item?.flags?.pf2e?.rulesSelections?.ascendantShapeOfHarm ?? null;
    const on = actor.getRollOptions().includes(DIAL_OPTION);
    return on ? selection : null;
}

async function setDial(actor, type) {
    const rule = dialRule(actor);
    if (!rule?.toggle) {
        ui.notifications.warn(game.i18n.localize("ASCENDANT.ShapeOfHarm.NoTalent"));
        return;
    }
    await rule.toggle(true, type);
    const label = dialChoices(rule, actor).find((c) => c.value === type)?.label ?? type;
    ui.notifications.info(game.i18n.format("ASCENDANT.ShapeOfHarm.Set", { type: label }));
}

async function resetDial(actor) {
    const rule = dialRule(actor);
    if (!rule?.toggle) {
        ui.notifications.warn(game.i18n.localize("ASCENDANT.ShapeOfHarm.NoTalent"));
        return;
    }
    await rule.toggle(false);
    ui.notifications.info(game.i18n.localize("ASCENDANT.ShapeOfHarm.Reset"));
}

/** Which of the two actions this card is, or null if it is neither. */
function dialActionOf(message) {
    const uuid = message.flags?.pf2e?.origin?.uuid;
    const item = uuid ? fromUuidSync(uuid) : message.item;
    const slug = item?.system?.slug ?? item?.slug;
    if (slug === ACTION_SET) return "set";
    if (slug === ACTION_RESET) return "reset";
    return null;
}

function addButtons(message, html) {
    const root = html instanceof HTMLElement ? html : html?.[0];
    if (!root) return;
    if (!game.user.isGM && !message.isAuthor) return;

    const which = dialActionOf(message);
    if (!which) return;

    const actor = message.actor;
    const rule = dialRule(actor);
    if (!rule) return;

    // V13 re-renders a message in place, so remove ours before adding it again.
    root.querySelector(".ascendant-dial-controls")?.remove();

    const wrap = document.createElement("div");
    wrap.className = "ascendant-dial-controls";

    if (which === "reset") {
        const button = document.createElement("button");
        button.type = "button";
        button.innerHTML = `<i class="fa-solid fa-rotate-left"></i> ${game.i18n.localize("ASCENDANT.ShapeOfHarm.ResetButton")}`;
        button.addEventListener("click", async (event) => {
            event.preventDefault();
            button.disabled = true;
            try { await resetDial(actor); } finally { button.disabled = false; }
        });
        wrap.append(button);
    } else {
        const active = currentSetting(actor);
        for (const choice of dialChoices(rule, actor)) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "ascendant-dial-type";
            button.dataset.type = choice.value;
            if (choice.value === active) button.classList.add("active");
            button.textContent = choice.label;
            button.addEventListener("click", async (event) => {
                event.preventDefault();
                for (const b of wrap.querySelectorAll("button")) b.disabled = true;
                try {
                    await setDial(actor, choice.value);
                    for (const b of wrap.querySelectorAll("button")) b.classList.remove("active");
                    button.classList.add("active");
                } finally {
                    for (const b of wrap.querySelectorAll("button")) b.disabled = false;
                }
            });
            wrap.append(button);
        }
    }

    (root.querySelector(".message-content") ?? root).append(wrap);
}

export function registerShapeOfHarm() {
    Hooks.on("renderChatMessageHTML", addButtons);
    console.log(`${MODULE_ID} | shape of harm controls registered`);
}
