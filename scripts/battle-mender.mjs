import { MODULE_ID } from "./constants.mjs";

const TALENT_SLUG = "ascendant-battle-mender";

/** PF2e's own immunity effect, applied to a Battle Medicine patient by the system's macro. */
const IMMUNITY_SLUG = "effect-battle-medicine-immunity";

/**
 * "Battle Medicine has no daily limit per target."
 *
 * PF2e tracks the limit as an effect on the patient, created by its Battle
 * Medicine action with the medic recorded as the effect's origin. Deleting
 * that effect as it lands, when its origin actor holds Battle Mender, removes
 * the limit for that medic and leaves every other medic's limit alone.
 *
 * The medic is read off `system.context.origin.actor`, which is where PF2e
 * records who applied an effect. Not off the effect's `origin` getter
 * (pf2e.mjs:45470): that returns the effect's own actor when the context is
 * missing, so an effect dragged onto a patient who holds Battle Mender would
 * read as self-applied and be removed. An effect with no recorded origin is
 * left in place.
 */
function isBattleMender(actor) {
    return actor?.type === "character" && actor.itemTypes.feat.some((i) => i.slug === TALENT_SLUG);
}

const shouldWrite = () => game.users.activeGM?.isSelf ?? false;

export function registerBattleMender() {
    Hooks.on("createItem", async (item) => {
        if (!shouldWrite()) return;
        if (item.type !== "effect" || item.slug !== IMMUNITY_SLUG || !item.actor) return;
        const originUuid = item.system.context?.origin?.actor;
        if (!originUuid) return;
        const origin = await fromUuid(originUuid);
        const medic = origin?.actor ?? origin;
        if (!isBattleMender(medic)) return;
        await item.delete();
        console.log(`${MODULE_ID} | removed Battle Medicine immunity from ${item.actor.name} (medic ${medic.name} has Battle Mender)`);
    });
}
