import { MODULE_ID } from "./constants.mjs";

const SHIELD_SLUG = "tireless-aegis-shield";

/** The level the Aegis starts regenerating. */
const REGEN_FROM = 10;

/**
 * Reform and regenerate the Aegis at the start of its owner's turn.
 *
 * "Reforms at full Hit Points at the start of your turn if destroyed" and,
 * from 10th, "Regeneration equal to your level". There is no rule element for
 * either: FastHealing belongs to an actor, and nothing alters an item's
 * current hit points. So this does both directly, on PF2e's own
 * `pf2e.startTurn` hook. A FastHealing rule on the shield is the wrong answer,
 * found by trying it: at the start of a turn it posts a chat message with an
 * "Apply Healing" button, and the actor that button heals is the wielder.
 */

/** How much the Aegis regains per turn at this level, or 0 before 10th. */
export function regenerationFor(level) {
    if (!Number.isFinite(level) || level < REGEN_FROM) return 0;
    return level;
}

const shieldOf = (actor) => actor?.itemTypes?.shield?.find((i) => i.slug === SHIELD_SLUG) ?? null;

/** Only one client should write, or a party of six repairs the shield six times. */
const shouldWrite = () => game.users.activeGM?.isSelf ?? false;

/**
 * Reform a destroyed Aegis, or repair a damaged one. Returns what happened, or null.
 *
 * Exported so it can be driven from a test or a macro without a combat running.
 */
export async function repairAegis(actor) {
    const shield = shieldOf(actor);
    if (!shield) return null;

    const { value, max } = shield.system.hp;
    if (!Number.isFinite(value) || !Number.isFinite(max)) return null;

    // Destroyed: back to full, at any level.
    if (value <= 0) {
        await shield.update({ "system.hp.value": max });
        return { reformed: true, healed: max };
    }

    const level = actor.system?.details?.level?.value ?? actor.level;
    const amount = regenerationFor(level);
    if (!amount || value >= max) return null;

    const healed = Math.min(amount, max - value);
    await shield.update({ "system.hp.value": value + healed });
    return { reformed: false, healed };
}

/** Say what happened, the way PF2e announces its own fast healing. */
async function announce(actor, result) {
    const key = result.reformed ? "ASCENDANT.Aegis.Reformed" : "ASCENDANT.Aegis.Regenerated";
    await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<p>${game.i18n.format(key, { amount: result.healed })}</p>`,
        flags: { [MODULE_ID]: { aegis: true } },
    });
}

export function registerAegis() {
    Hooks.on("pf2e.startTurn", async (combatant) => {
        if (!shouldWrite()) return;
        const actor = combatant?.actor;
        if (!actor) return;
        const result = await repairAegis(actor);
        if (result) await announce(actor, result);
    });
}
