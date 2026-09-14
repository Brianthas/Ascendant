import { MODULE_ID } from "./constants.mjs";

/**
 * Haven's storage container, and how big it is for a party of a given size.
 *
 * "20 Bulk per member". The member count is the Party actor's, which PF2e
 * keeps as `game.actors.party.members`; without a Party actor it is 1. The
 * Ledger has no container: it is the Party stash itself.
 */
const CONTAINERS = {
    "ascendant-haven-storage": (level, members) => 20 * members,
};

/**
 * Keep the containers in step with the party.
 *
 * This cannot be a rule element: PF2e's `capacity` item alteration accepts
 * `itemType: "weapon"` only, because it is for a magazine's capacity rather than
 * a container's, and there is no alteration for a container's bulk at all. So
 * the capacity is written onto the item, and this keeps it correct as the
 * character levels and the party changes.
 *
 * Writing is deliberately narrow: only when the level or the party changes or
 * the container arrives, only when the stored value is already wrong, and only
 * on one client.
 */
export function capacityFor(slug, level, members) {
    const at = CONTAINERS[slug];
    if (!at) return null;
    // `createItem` can fire while the actor is still being prepared, where the
    // level is undefined; NaN would be clamped to a capacity of zero.
    const n = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
    const m = Number.isFinite(members) ? Math.max(1, Math.floor(members)) : 1;
    return at(n, m);
}

/** How many members the party has. */
export function partySize() {
    const party = game.actors?.party;
    const members = party?.members?.length;
    return Number.isFinite(members) && members > 0 ? members : 1;
}

/** Every container of ours this actor is carrying. */
const containersOf = (actor) =>
    actor?.itemTypes?.backpack?.filter((i) => i.slug && i.slug in CONTAINERS) ?? [];

/** Only one client should write; `activeGM` is Foundry's designated single writer. */
const shouldWrite = () => game.users.activeGM?.isSelf ?? false;

/** Set each container's capacity if it is not already right. */
export async function syncCapacity(actor) {
    const level = actor?.system?.details?.level?.value ?? actor?.level;
    if (!Number.isFinite(level)) return null;

    const written = {};
    for (const container of containersOf(actor)) {
        const wanted = capacityFor(container.slug, level, partySize());
        if (wanted === null || container.system.bulk.capacity === wanted) continue;

        // `system.stowing` has to travel with any bulk update. A container's
        // _preUpdate reads stowing out of the update payload rather than off
        // the item, so an update that changes only the capacity leaves it
        // undefined, and the guard zeroes both capacity and ignored bulk.
        await container.update({ "system.bulk.capacity": wanted, "system.stowing": true });
        written[container.slug] = wanted;
    }
    return Object.keys(written).length ? written : null;
}

/** Every character carrying one of our containers. */
const carriers = () => game.actors.filter((a) => a.type === "character" && containersOf(a).length);

export function registerContainers() {
    Hooks.on("updateActor", (actor, changes) => {
        if (!shouldWrite()) return;
        if (foundry.utils.hasProperty(changes, "system.details.level.value")) syncCapacity(actor);
        // The party roster changed: every carrier's capacity moves with it.
        if (actor.type === "party" && foundry.utils.hasProperty(changes, "system.details.members")) {
            for (const carrier of carriers()) syncCapacity(carrier);
        }
    });

    // Granted by the talent, so it can arrive on a character already past 1st level.
    Hooks.on("createItem", (item) => {
        if (!shouldWrite()) return;
        if (!item.slug || !(item.slug in CONTAINERS) || !item.actor) return;
        syncCapacity(item.actor);
    });

    console.log(`${MODULE_ID} | party containers registered`);
}
