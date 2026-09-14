import { MODULE_ID } from "./constants.mjs";

const TALENT_SLUG = "second-wind";
const REGEN_SLUG = "second-wind-regeneration";
const SURGE_SLUG = "second-wind-surge";
const USES_FLAG = "secondWind";

/**
 * "Once per encounter, when you are reduced to 0 Hit Points, you immediately
 * regain Hit Points equal to half your maximum and are not knocked unconscious."
 *
 * Wraps `Actor.prototype.applyDamage`, the path every damage chat card takes,
 * so the check runs after PF2e has applied the damage and written the new hit
 * points. Damage typed straight into the sheet bypasses it, which the item
 * text says. The wrapper restores nothing and assumes nothing about other
 * wrappers: it calls whatever it found and adds its own step after.
 *
 * Uses are counted on an actor flag keyed by the combat's id, so a new
 * encounter starts fresh without anything to reset; outside a combat the
 * key is "none" and the count is cleared when a combat begins.
 */
function holdsSecondWind(actor) {
    return actor?.type === "character" && actor.itemTypes.feat.some((i) => i.slug === TALENT_SLUG);
}

const usesAllowed = (actor) => (actor.level >= 10 ? 2 : 1);

async function usesThisEncounter(actor) {
    const key = game.combat?.id ?? "none";
    const record = actor.getFlag(MODULE_ID, USES_FLAG) ?? {};
    return { key, used: Number(record[key]) || 0, record };
}

/** The two effects this module ships, fetched from the adept pack by slug. */
async function packEffect(slug) {
    const pack = game.packs.get(`${MODULE_ID}.ascendant-adept`);
    if (!pack) return null;
    const index = await pack.getIndex({ fields: ["system.slug"] });
    const entry = index.find((e) => e.system?.slug === slug);
    return entry ? (await pack.getDocument(entry._id))?.toObject() : null;
}

async function secondWind(actor) {
    const hp = actor.system.attributes.hp;
    if (!Number.isFinite(hp?.value) || hp.value > 0) return;

    const { key, used, record } = await usesThisEncounter(actor);
    if (used >= usesAllowed(actor)) return;

    const restored = Math.floor(hp.max / 2);
    await actor.update({ "system.attributes.hp.value": restored });
    await actor.setFlag(MODULE_ID, USES_FLAG, { ...record, [key]: used + 1 });

    const effects = [];
    if (actor.level >= 5) effects.push(await packEffect(REGEN_SLUG));
    if (actor.level >= 15) effects.push(await packEffect(SURGE_SLUG));
    const toCreate = effects.filter(Boolean);
    if (toCreate.length) await actor.createEmbeddedDocuments("Item", toCreate);

    // PF2e may already have added Dying when the hit points reached 0; that condition is
    // the "knocked unconscious" the talent prevents.
    const dying = actor.itemTypes.condition.filter((c) => c.slug === "dying" || c.slug === "unconscious");
    if (dying.length) await actor.deleteEmbeddedDocuments("Item", dying.map((c) => c.id));

    await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<p>${game.i18n.format("ASCENDANT.SecondWind.Triggered", { name: actor.name, hp: restored, used: used + 1, max: usesAllowed(actor) })}</p>`,
        flags: { [MODULE_ID]: { secondWind: true } },
    });
}

export function registerSecondWind() {
    const cls = CONFIG.Actor.documentClass;
    if (!cls?.prototype?.applyDamage) {
        console.error(`${MODULE_ID} | applyDamage not found; Second Wind is inactive`);
        return;
    }
    const original = cls.prototype.applyDamage;
    cls.prototype.applyDamage = async function (params) {
        const result = await original.call(this, params);
        try {
            if (holdsSecondWind(this)) await secondWind(this);
        } catch (error) {
            // Never let this break damage application.
            console.error(`${MODULE_ID} | Second Wind check failed`, error);
        }
        return result;
    };

    // A fresh combat: forget the out-of-combat count so it cannot carry over.
    Hooks.on("combatStart", async (combat) => {
        if (!(game.users.activeGM?.isSelf ?? false)) return;
        for (const combatant of combat.combatants) {
            const actor = combatant.actor;
            if (!holdsSecondWind(actor)) continue;
            const record = actor.getFlag(MODULE_ID, USES_FLAG);
            if (record && "none" in record) {
                const { none: _dropped, ...rest } = record;
                await actor.setFlag(MODULE_ID, USES_FLAG, rest);
            }
        }
    });
}
