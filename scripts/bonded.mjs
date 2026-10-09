import { MODULE_ID } from "./constants.mjs";

const TALENT_SLUG = "ascendant-bonded-soul";
/** Flag on the owner holding the Bonded actor's id, and on the Bonded holding the owner's. */
const LINK_FLAG = "bondedId";
const OWNER_FLAG = "bondedOwnerId";
/** Slug of the effect the sync writes onto the Bonded. */
const SYNC_SLUG = "ascendant-bonded-sync";
/** Update option marking a hit point write this script made, so it is not mirrored back. */
const MIRROR_OPTION = "ascendantBondedMirror";

/**
 * Bonded Soul: linking, syncing and the shared Hit Point pool.
 *
 * ## Sync
 *
 * "The Bonded is your level. It uses your AC, saving throw modifiers,
 * Perception, and class DC. Its Strikes use the higher of your weapon attack
 * modifier or your spell attack modifier, and add your highest attribute
 * modifier to damage." Nothing on one actor can read another, so the owner's
 * current numbers are written onto the Bonded: level, AC, the three saves and
 * Perception straight into the NPC's stored statistics, the Strike bonus and
 * damage modifier into every melee item, and the extra dice for level as a
 * DamageDice rule on a sync effect. The effect goes stale when the owner
 * levels, so the button re-syncs, and `updateActor` re-syncs on a level change.
 *
 * ## Shared Hit Points
 *
 * "You and the Bonded share a single Hit Point pool." PF2e shares nothing
 * between two actors (the only "eidolon" text in pf2e.mjs 8.5.0 is glossary
 * prose). So `updateActor` on either linked actor mirrors a hit point or
 * temporary hit point change to the partner, with an update option marking the
 * mirrored write so the partner's own hook does not mirror it back. The
 * Bonded's maximum is written to the owner's on every sync.
 *
 * "If your shared Hit Points drop to one quarter of maximum or lower, it
 * immediately unmanifests": the hook posts a chat reminder when a write
 * crosses that line. It does not remove the token.
 *
 * Only the active GM writes, so a party of six does not produce six mirrors.
 */
export function hasTalent(actor) {
    return actor?.type === "character" && actor.itemTypes.feat.some((i) => i.slug === TALENT_SLUG);
}

export function linkedBonded(owner) {
    const id = owner.getFlag(MODULE_ID, LINK_FLAG);
    return id ? game.actors.get(id) ?? null : null;
}

export function linkedOwner(bonded) {
    const id = bonded.getFlag(MODULE_ID, OWNER_FLAG);
    return id ? game.actors.get(id) ?? null : null;
}

/** NPCs that could be a Bonded: any NPC actor the user owns. */
function candidates(owner) {
    return game.actors.filter((a) => a.type === "npc" && a.id !== owner.id && a.isOwner);
}

const shouldWrite = () => game.users.activeGM?.isSelf ?? false;

/** The owner's numbers the Bonded copies. */
function statsOf(owner) {
    const s = owner.system;
    const attack = Math.max(
        ...owner.system.actions?.map?.((a) => a.totalModifier ?? -Infinity) ?? [],
        owner.attributes?.spellcasting?.mod ?? -Infinity,
        ...(owner.spellcasting?.contents ?? []).map((e) => e.statistic?.mod ?? -Infinity),
    );
    const highestAttribute = Math.max(...Object.values(s.abilities ?? {}).map((a) => a.mod ?? 0));
    return {
        level: owner.level,
        ac: owner.attributes.ac.value,
        fortitude: owner.saves.fortitude.mod,
        reflex: owner.saves.reflex.mod,
        will: owner.saves.will.mod,
        perception: owner.perception.mod,
        classDC: owner.classDC?.dc?.value ?? null,
        attack: Number.isFinite(attack) ? attack : 0,
        damageMod: highestAttribute,
        hpMax: owner.system.attributes.hp.max,
        hp: owner.system.attributes.hp.value,
        temp: owner.system.attributes.hp.temp ?? 0,
        athletics: Math.max(owner.skills?.athletics?.mod ?? 0, Number.isFinite(attack) ? attack : 0),
    };
}

/** Extra Strike dice by owner level: one more at 5th, 10th and 15th. */
const extraDice = (level) => (level >= 15 ? 3 : level >= 10 ? 2 : level >= 5 ? 1 : 0);

function buildSyncEffect(owner, stats) {
    const rules = [];
    if (extraDice(stats.level) > 0) {
        rules.push({
            key: "DamageDice",
            selector: "strike-damage",
            slug: "ascendant-bonded-extra-dice",
            label: "ASCENDANT.Bonded.ExtraDice",
            diceNumber: extraDice(stats.level),
        });
    }
    return {
        name: game.i18n.localize("ASCENDANT.Bonded.EffectName"),
        type: "effect",
        img: "icons/magic/life/heart-cross-strong-flame-purple-orange.webp",
        system: {
            slug: SYNC_SLUG,
            description: {
                value: game.i18n.format("ASCENDANT.Bonded.EffectText", { owner: owner.name, level: stats.level }),
                gm: "",
            },
            duration: { value: -1, unit: "unlimited", sustained: false, expiry: null },
            tokenIcon: { show: false },
            rules,
        },
    };
}

/** Write the owner's statistics onto the Bonded. */
export async function syncBonded(owner, bonded) {
    const stats = statsOf(owner);

    await bonded.update({
        "system.details.level.value": stats.level,
        "system.attributes.ac.value": stats.ac,
        "system.saves.fortitude.value": stats.fortitude,
        "system.saves.reflex.value": stats.reflex,
        "system.saves.will.value": stats.will,
        "system.perception.mod": stats.perception,
        "system.attributes.hp.max": stats.hpMax,
        "system.skills.athletics.base": stats.athletics,
        [`flags.${MODULE_ID}.${OWNER_FLAG}`]: owner.id,
    }, { [MIRROR_OPTION]: true });
    // The value in its own write: PF2e clamps a hit point value against the maximum the actor
    // had before the update, so max and value in one call left a fresh Bonded at 10/272
    // (read live on 2026-09-14).
    await bonded.update({
        "system.attributes.hp.value": Math.min(stats.hp, stats.hpMax),
        "system.attributes.hp.temp": stats.temp,
    }, { [MIRROR_OPTION]: true });

    // Every Strike: the owner's best attack modifier, and the highest attribute to damage.
    const strikes = bonded.itemTypes.melee.map((item) => {
        const rolls = foundry.utils.deepClone(item._source.system.damageRolls ?? {});
        for (const roll of Object.values(rolls)) {
            const dice = String(roll.damage ?? "").match(/^(\d+d\d+)/)?.[1];
            if (dice) roll.damage = stats.damageMod ? `${dice}+${stats.damageMod}` : dice;
        }
        return { _id: item.id, "system.bonus.value": stats.attack, "system.damageRolls": rolls };
    });
    if (strikes.length) await bonded.updateEmbeddedDocuments("Item", strikes);

    const existing = bonded.itemTypes.effect.filter((e) => e.slug === SYNC_SLUG);
    if (existing.length) await bonded.deleteEmbeddedDocuments("Item", existing.map((e) => e.id));
    await bonded.createEmbeddedDocuments("Item", [buildSyncEffect(owner, stats)]);

    await owner.setFlag(MODULE_ID, LINK_FLAG, bonded.id);
    bonded.reset();
    bonded.sheet?.render(false);
    ui.notifications.info(game.i18n.format("ASCENDANT.Bonded.Synced", { bonded: bonded.name, level: stats.level }));
}

export async function unlinkBonded(owner) {
    const bonded = linkedBonded(owner);
    if (bonded) {
        const existing = bonded.itemTypes.effect.filter((e) => e.slug === SYNC_SLUG);
        if (existing.length) await bonded.deleteEmbeddedDocuments("Item", existing.map((e) => e.id));
        await bonded.unsetFlag(MODULE_ID, OWNER_FLAG);
        bonded.reset();
    }
    await owner.unsetFlag(MODULE_ID, LINK_FLAG);
    ui.notifications.info(game.i18n.localize("ASCENDANT.Bonded.Unlinked"));
}

async function promptBonded(owner) {
    const list = candidates(owner);
    if (list.length === 0) {
        ui.notifications.warn(game.i18n.localize("ASCENDANT.Bonded.NoCandidates"));
        return;
    }
    const current = linkedBonded(owner);
    const options = list
        .map((a) => `<option value="${a.id}"${a.id === current?.id ? " selected" : ""}>${foundry.utils.escapeHTML(a.name)}</option>`)
        .join("");

    const chosen = await foundry.applications.api.DialogV2.prompt({
        window: { title: game.i18n.localize("ASCENDANT.Bonded.DialogTitle") },
        content: `
            <p>${game.i18n.format("ASCENDANT.Bonded.DialogIntro", { owner: owner.name, level: owner.level })}</p>
            <p><select name="bonded" style="width:100%">${options}</select></p>
            <p>${game.i18n.localize("ASCENDANT.Bonded.DialogNote")}</p>
        `,
        ok: {
            label: game.i18n.localize("ASCENDANT.Bonded.DialogConfirm"),
            callback: (_event, button) => button.form.elements.bonded.value,
        },
        rejectClose: false,
    });
    if (!chosen) return;
    const bonded = game.actors.get(chosen);
    if (bonded) await syncBonded(owner, bonded);
}

/** The partner of a linked actor, or null. */
function partnerOf(actor) {
    if (actor.type === "character") return linkedBonded(actor);
    if (actor.type === "npc") return linkedOwner(actor);
    return null;
}

/** Mirror a hit point change to the partner. */
async function mirrorHitPoints(actor, changes, options) {
    if (options?.[MIRROR_OPTION]) return;
    const hp = changes?.system?.attributes?.hp;
    if (!hp || (hp.value === undefined && hp.temp === undefined)) return;
    const partner = partnerOf(actor);
    if (!partner) return;

    const update = {};
    if (hp.value !== undefined) update["system.attributes.hp.value"] = Math.min(hp.value, partner.system.attributes.hp.max);
    if (hp.temp !== undefined) update["system.attributes.hp.temp"] = hp.temp;
    await partner.update(update, { [MIRROR_OPTION]: true });

    // The quarter line: said once, when a write crosses it downward.
    if (hp.value !== undefined) {
        const bonded = actor.type === "npc" ? actor : partner;
        const max = bonded.system.attributes.hp.max;
        const before = actor._source.system.attributes.hp.value;
        if (max > 0 && hp.value <= max / 4 && before > max / 4) {
            await ChatMessage.create({
                speaker: ChatMessage.getSpeaker({ actor: bonded }),
                content: `<p>${game.i18n.format("ASCENDANT.Bonded.Unmanifest", { bonded: bonded.name })}</p>`,
                flags: { [MODULE_ID]: { bondedUnmanifest: true } },
            });
        }
    }
}

export function registerBonded() {
    // PF2e's character sheet is an ApplicationV1, so this is the V1 header button hook.
    Hooks.on("getActorSheetPF2eHeaderButtons", (sheet, buttons) => {
        const actor = sheet.actor;
        if (actor?.type !== "character" || !actor.isOwner || !hasTalent(actor)) return;
        const bonded = linkedBonded(actor);
        buttons.unshift({
            label: game.i18n.localize(bonded ? "ASCENDANT.Bonded.ResyncButton" : "ASCENDANT.Bonded.LinkButton"),
            class: "ascendant-bonded",
            icon: "fa-solid fa-link",
            onclick: () => promptBonded(actor),
        });
    });

    Hooks.on("preUpdateActor", (actor, changes, options) => {
        // Record the pre-write value for the quarter-line check; `updateActor` sees the new one.
        if (changes?.system?.attributes?.hp?.value !== undefined) {
            options.ascendantHpBefore = actor.system.attributes.hp.value;
        }
    });

    Hooks.on("updateActor", async (actor, changes, options) => {
        if (!shouldWrite()) return;
        try {
            await mirrorHitPoints(actor, changes, options);
            // The owner levelled: the Bonded is their level.
            if (actor.type === "character" && foundry.utils.hasProperty(changes, "system.details.level.value")) {
                const bonded = linkedBonded(actor);
                if (bonded) await syncBonded(actor, bonded);
            }
        } catch (error) {
            console.error(`${MODULE_ID} | bonded sync failed`, error);
        }
    });

    console.log(`${MODULE_ID} | bonded soul registered`);
}
