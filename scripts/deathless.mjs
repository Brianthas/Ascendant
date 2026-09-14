import { MODULE_ID } from "./constants.mjs";

/** Roll option the deactivation effect sets; Deathless's rules predicate on its absence. */
export const DEACTIVATED_OPTION = "ascendant-regen-deactivated";

/** Roll option prefix Deathless's ChoiceSet sets, naming the deactivating damage type. */
const DEACTIVATOR_PREFIX = "ascendant-regen-deactivator";

const EFFECT_SLUG = "ascendant-regeneration-deactivated";

/**
 * Automate the deactivation clause on Deathless.
 *
 * PF2e does not do this. `deactivatedBy` on the FastHealing rule element is used
 * only to build the reminder line under the healing message (pf2e.mjs:42924);
 * nothing reads it when damage lands. Verified live: after applying void damage
 * to a character whose regeneration is deactivated by void, the next turn start
 * still offered the healing.
 *
 * More than an HP check is needed: Deathless deactivates "when you take at
 * least 1 point of damage of your chosen type, or from an effect bearing a
 * matching trait", and "damage absorbed by temporary Hit Points counts", so
 * this inspects the damage roll's own instances rather than watching hit
 * points. Damage types and their traits both count. A save that reduces the
 * damage to 0 does not deactivate it, which is why a zero-total roll is skipped.
 *
 * Duration follows PF2e's own regeneration rule: deactivated until the end of
 * the creature's next turn.
 */
export function registerRegenerationDeactivation() {
    const cls = CONFIG.Actor.documentClass;
    if (!cls?.prototype?.applyDamage) {
        console.error(`${MODULE_ID} | applyDamage not found; regeneration deactivation is inactive`);
        return;
    }

    const original = cls.prototype.applyDamage;
    cls.prototype.applyDamage = async function (params) {
        const result = await original.call(this, params);
        try {
            await deactivateIfMatched(this, params?.damage);
        } catch (error) {
            // Never let this break damage application.
            console.error(`${MODULE_ID} | regeneration deactivation check failed`, error);
        }
        return result;
    };
}

/** The damage type this actor's regeneration is deactivated by, or null. */
function deactivatorFor(actor) {
    const option = Object.keys(actor.rollOptions?.all ?? {}).find((o) =>
        o.startsWith(`${DEACTIVATOR_PREFIX}:`),
    );
    return option ? option.slice(DEACTIVATOR_PREFIX.length + 1) : null;
}

/** Every damage type and trait present in a damage roll. */
function typesAndTraitsIn(damage) {
    const found = new Set();
    if (typeof damage === "number" || !damage) return found;

    for (const instance of damage.instances ?? []) {
        if (instance.type) found.add(instance.type);
        for (const trait of instance.traits ?? []) found.add(trait);
    }
    // A plain damage object rather than a roll.
    for (const type of damage.damageType ? [damage.damageType] : []) found.add(type);
    for (const trait of damage.traits ?? []) found.add(trait);
    return found;
}

/** The total of a damage roll, or the number handed to applyDamage. */
function totalOf(damage) {
    if (typeof damage === "number") return damage;
    if (typeof damage?.total === "number") return damage.total;
    return null;
}

async function deactivateIfMatched(actor, damage) {
    if (!actor?.isOfType?.("creature")) return;
    const deactivator = deactivatorFor(actor);
    if (!deactivator) return;
    if (!typesAndTraitsIn(damage).has(deactivator)) return;
    // "A save that reduces the damage to 0 does not" deactivate it.
    if (totalOf(damage) === 0) return;
    if (actor.itemTypes.effect.some((e) => e.slug === EFFECT_SLUG)) return;

    await actor.createEmbeddedDocuments("Item", [
        {
            name: game.i18n.localize("ASCENDANT.Effect.RegenerationDeactivated"),
            type: "effect",
            img: "icons/magic/life/cross-worn-green.webp",
            system: {
                slug: EFFECT_SLUG,
                description: {
                    value: game.i18n.format("ASCENDANT.Effect.RegenerationDeactivatedText", {
                        type: deactivator,
                    }),
                },
                // PF2e's regeneration rule: deactivated until the end of its next turn.
                duration: { value: 1, unit: "rounds", sustained: false, expiry: "turn-end" },
                tokenIcon: { show: true },
                rules: [{ key: "RollOption", domain: "all", option: DEACTIVATED_OPTION }],
            },
        },
    ]);
}
