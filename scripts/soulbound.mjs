import { MODULE_ID } from "./constants.mjs";

/**
 * Soulbound Arsenal: reshape the bonded weapon into a different form.
 *
 * ## Why this replaces the item rather than editing it
 *
 * Changing a guisarme into a greataxe changes damage dice, damage type, group,
 * traits, hands, reload and range. No rule element rewrites that set:
 * `ItemAlteration` reaches individual properties, not the identity of the
 * weapon. So the honest implementation is to create the new base weapon and
 * delete the old one, which is what this does.
 *
 * That is cheaper than it sounds, because the talent's runes do not live on
 * the weapon. Potency and striking come from `ItemAlteration` rules keyed on the
 * `soulbound-arsenal` tag, in `upgrade` mode, so a plain weapon from the SRD
 * carries the right fundamentals the moment it is tagged. Verified on a level 5
 * actor: an untouched Greatsword tagged and equipped came out as a
 * "+1 Striking Greatsword" with `runes.potency 1` and `runes.striking 1`.
 *
 * Only the property runes are stored on the item, and those are the player's
 * own choices, so they are what this carries across.
 *
 * ## Where the rune rules come from
 *
 * Nothing is transcribed. Every number and restriction below is read off the
 * running system:
 *
 * - A rune's level and its etching restriction come from its own item in
 *   `pf2e.equipment-srd`, where `system.usage.value` is a machine-readable
 *   string such as `etched-onto-piercing-or-slashing-melee-weapon`.
 * - The forms on offer are that pack's base weapons.
 *
 * Rune keys and rune item slugs are spelled differently and have to be mapped:
 * a weapon stores `ghostTouch` and `greaterFlaming`, while the items are
 * `ghost-touch` and `flaming-greater`. Measured against the 42 rune keys used by
 * the 190 shipped magic weapons, the mapping in `runeItemFor` resolves 37,
 * including every restricted one. The remaining five (dancing, disrupting,
 * greaterDisrupting, speed, spellStoring) have no matching item in that pack, so
 * they are reported as unknown rather than guessed at, and never blocked.
 *
 * ## What PF2e does not do, which is why the warnings matter
 *
 * There is no etching eligibility check anywhere in the system. Verified by
 * etching Keen, which requires a piercing or slashing weapon, onto a Warhammer:
 * it was accepted and the item renamed itself "+2 Greater Striking Keen Cunning
 * Warhammer". Keen then silently does nothing, because its effect carries its
 * own predicate (`pf2e.mjs:5997`) requiring `item:damage:type:slashing` or
 * `piercing`, tested at roll time. A rune that is dead rather than absent is the
 * failure worth warning about, since the weapon's own name advertises it.
 */

const MARK = "soulbound-arsenal";
const TALENT_SLUG = "ascendant-soulbound-arsenal";
const ACTION_SLUG = "ascendant-soulbound-arsenal-reshape";
const SRD = "pf2e.equipment-srd";

/**
 * Property runes allowed by level, from the talent's own ladder.
 *
 * One from 5th, two from 7th, three from 13th, four from 17th. Below 5th the
 * weapon has no property rune slot at all.
 */
function runeAllowance(level) {
    if (level >= 17) return 4;
    if (level >= 13) return 3;
    if (level >= 7) return 2;
    if (level >= 5) return 1;
    return 0;
}

/** A property rune may be up to the wielder's level plus two. */
const runeLevelCap = (level) => level + 2;

/** The weapon this actor has nominated, or null. */
function taggedWeapon(actor) {
    return actor?.itemTypes?.weapon?.find((i) => i.system.traits?.otherTags?.includes(MARK)) ?? null;
}

/**
 * The potency and striking the talent entitles this character to, read off
 * the talent's own rule elements rather than restated here.
 *
 * Rule elements are prepared on the actor, so `resolveValue` evaluates the same
 * level ladder the alteration uses. Keeping a second copy of that ladder in this
 * file would be a copy that silently drifts the first time the talent changes.
 */
function fundamentalsFor(actor) {
    const talent = actor?.itemTypes?.feat?.find((i) => i.slug === TALENT_SLUG);
    const rules = talent?.rules ?? [];
    const read = (property) => {
        const rule = rules.find((r) => r.key === "ItemAlteration" && r.property === property);
        if (!rule) return null;
        const value = rule.resolveValue(rule.value);
        return Number.isInteger(value) ? value : null;
    };
    return { potency: read("runes-potency"), striking: read("runes-striking") };
}

/**
 * Keep the tagged weapon's *stored* fundamentals in step with the talent.
 *
 * The talent's `ItemAlteration` rules raise potency and striking in derived
 * data, which is enough for attack and damage but not for property runes.
 * `getPropertyRuneSlots` (pf2e.mjs:3981) returns `system.runes.potency`, and the
 * clamp that uses it (pf2e.mjs:51280) runs while the weapon prepares itself,
 * before any of the actor's rule elements have raised anything. It therefore
 * reads the weapon's own stored potency, which on a plain weapon is 0.
 *
 * Measured on a level 13 character with the talent, storing three property
 * runes on the weapon source each time:
 *
 *   stored potency 0 -> derived potency 3, property runes []
 *   stored potency 1 -> derived potency 3, property runes [keen]
 *   stored potency 2 -> derived potency 3, property runes [keen, flaming]
 *   stored potency 3 -> derived potency 3, property runes [keen, flaming, shockwave]
 *
 * So a talent that says "a +3 greater striking weapon with three property
 * runes" gave zero rune slots, and runes added to it vanished on preparation
 * with nothing said. Writing the stored value fixes that at the source, which is
 * the only place it can be fixed: there is no `runes-property` alteration.
 *
 * Only ever raises, matching the alteration's own `upgrade` mode, so a weapon
 * carrying better runes of its own keeps them.
 */
export async function syncFundamentals(actor) {
    const weapon = taggedWeapon(actor);
    if (!weapon) return false;

    const { potency, striking } = fundamentalsFor(actor);
    if (potency === null && striking === null) return false;

    const stored = weapon._source.system.runes;
    const update = {};
    if (potency !== null && potency > (stored.potency ?? 0)) update["system.runes.potency"] = potency;
    if (striking !== null && striking > (stored.striking ?? 0)) update["system.runes.striking"] = striking;
    if (!Object.keys(update).length) return false;

    await weapon.update(update);
    return true;
}

/**
 * Rune key to its item in the equipment pack.
 *
 * A weapon stores runes in camelCase; the items are kebab-case, and the greater
 * versions invert ("greaterFlaming" is the item "flaming-greater"). Both forms
 * are tried, most literal first.
 */
function runeItemFor(key, bySlug) {
    const flat = key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
    const greater = /^greater-(.+)$/.exec(flat);
    for (const slug of greater ? [flat, `${greater[1]}-greater`] : [flat]) {
        if (bySlug.has(slug)) return bySlug.get(slug);
    }
    return null;
}

/**
 * Index the equipment pack by slug: name, usage and level.
 *
 * Every entry, not only those whose usage reads "etched-onto": a few rune items
 * carry a different usage in the pack (Bloodbane and Serrating say
 * "held-in-one-hand", Called says "applied-to-any-item..."), and dropping them
 * lost their level. An unreadable usage is reported to the player as such by
 * restrictionMet.
 */
async function loadRuneIndex() {
    const pack = game.packs.get(SRD);
    const index = await pack.getIndex({ fields: ["type", "system.usage", "system.level", "system.slug"] });
    const bySlug = new Map();
    for (const entry of index) {
        if (!entry.system?.slug) continue;
        bySlug.set(entry.system.slug, {
            name: entry.name,
            usage: String(entry.system?.usage?.value ?? ""),
            level: entry.system?.level?.value ?? null,
        });
    }
    return bySlug;
}

/**
 * Every weapon property rune the system knows, with its level and restriction.
 *
 * The rune table itself is internal to the system bundle and not on CONFIG.
 * The system's own list of keys is its translation table, which is what the
 * weapon sheet's labels come from, and the level and etching restriction come
 * from the rune's item in the equipment pack. Five keys have no item in the
 * pack on PF2e 8.5.0 (dancing, disrupting, greaterDisrupting, speed,
 * spellStoring); they are listed with an unknown level and left for the
 * player to check.
 */
function runeCatalogue(bySlug) {
    const table = game.i18n.translations.PF2E?.WeaponPropertyRune ?? {};
    return Object.keys(table)
        .map((key) => {
            const info = runeItemFor(key, bySlug);
            return {
                key,
                name: game.i18n.localize(`PF2E.WeaponPropertyRune.${key}.Name`),
                level: info?.level ?? null,
                usage: info?.usage ?? null,
            };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
}

/** The base weapons this weapon can take the form of, sorted for a dropdown. */
async function loadForms() {
    const pack = game.packs.get(SRD);
    const index = await pack.getIndex({
        fields: ["type", "system.category", "system.group", "system.specific", "system.runes", "system.level"],
    });
    return index
        .filter((e) =>
            e.type === "weapon"
            && ["simple", "martial", "advanced"].includes(e.system?.category)
            && !e.system?.specific
            && (e.system?.runes?.potency ?? 0) === 0
            && (e.system?.level?.value ?? 0) === 0)
        .map((e) => ({ id: e._id, name: e.name, category: e.system.category, group: e.system.group ?? "" }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Whether a rune's etching restriction is met by a weapon, read from its usage
 * string rather than a list kept here.
 *
 * Returns `null` when the restriction is not one this understands, which is
 * reported to the player as unknown. Guessing would be worse than saying so:
 * a false "not allowed" blocks a legal rune, and a false "fine" is the silent
 * death this exists to prevent.
 */
function restrictionMet(usage, weapon) {
    // The document's own getters rather than a reading of the data: checked on
    // four forms, where Longsword and Warhammer are melee, Longbow ranged, and
    // Javelin is both ranged and thrown.
    const damage = weapon.system.damage?.damageType ?? "";
    const { isMelee, isThrown } = weapon;

    switch (usage) {
        case "etched-onto-a-weapon": return true;
        case "etched-onto-melee-weapon": return isMelee;
        case "etched-onto-thrown-weapon": return isThrown;
        case "etched-onto-bludgeoning-weapon": return damage === "bludgeoning";
        case "etched-onto-slashing-melee-weapon": return damage === "slashing" && isMelee;
        case "etched-onto-piercing-or-slashing-weapon": return ["piercing", "slashing"].includes(damage);
        case "etched-onto-piercing-or-slashing-melee-weapon":
            return ["piercing", "slashing"].includes(damage) && isMelee;
        // "without a holy rune" and its unholy twin are about the other runes on
        // the weapon, not its form, so a reshape never changes the answer.
        case "etched-onto-weapon-wo-holy-rune":
        case "etched-onto-weapon-wo-unholy-rune":
            return true;
        default: return null;
    }
}

/**
 * Every rune in the catalogue, assessed against the form the weapon would take:
 * whether it fits that form, whether it is over the level cap, and whether it
 * is on the weapon now.
 */
function assessRunes(weapon, form, level, catalogue) {
    const cap = runeLevelCap(level);
    const current = new Set(weapon.system.runes?.property ?? []);
    return catalogue.map((rune) => ({
        ...rune,
        fits: rune.usage ? restrictionMet(rune.usage, form) : null,
        overLevel: rune.level != null && rune.level > cap,
        current: current.has(rune.key),
    }));
}

/**
 * Replace the tagged weapon with a new form.
 *
 * Order matters: the new item is created before the old is deleted, so a
 * failure anywhere leaves the character holding the weapon they started with.
 */
async function reshape(actor, oldWeapon, formId, keepRunes) {
    const pack = game.packs.get(SRD);
    const source = (await pack.getDocument(formId)).toObject();

    source.system.traits.otherTags = [...new Set([...(source.system.traits.otherTags ?? []), MARK])];
    source.system.equipped = foundry.utils.deepClone(oldWeapon.system.equipped);

    // Only the identification *status* carries across, never the block itself.
    // `identification.identified` holds a name, image and description, and PF2e
    // derives the displayed name from it: copying the whole block produced a
    // warhammer, correct in every stat, still calling itself
    // "+3 Greater Striking Keen Flaming Shockwave Longsword".
    source.system.identification.status = oldWeapon.system.identification.status;

    // The fundamentals are written into the new weapon rather than left to the
    // talent's alteration, because the property runes below are clamped
    // against the stored value while the weapon prepares itself. See
    // syncFundamentals for the measurement.
    const { potency, striking } = fundamentalsFor(actor);
    if (potency !== null) source.system.runes.potency = Math.max(potency, source.system.runes.potency ?? 0);
    if (striking !== null) source.system.runes.striking = Math.max(striking, source.system.runes.striking ?? 0);
    source.system.runes.property = keepRunes;

    const [created] = await actor.createEmbeddedDocuments("Item", [source]);
    if (!created) {
        ui.notifications.error(game.i18n.localize("ASCENDANT.Soulbound.CreateFailed"));
        return null;
    }

    await actor.deleteEmbeddedDocuments("Item", [oldWeapon.id]);
    return created;
}

function describeRune(rune) {
    const level = rune.level == null ? "" : ` (level ${rune.level})`;
    if (rune.overLevel) return `${rune.name}${level} is above your level + 2 cap`;
    if (rune.fits === false) return `${rune.name}${level} cannot be etched on this form and would do nothing`;
    if (rune.fits === null) return `${rune.name}${level} has a restriction this cannot read: check it yourself`;
    return `${rune.name}${level}`;
}

/**
 * The dialog reads its own form on submit.
 *
 * DialogV2's `submit` receives the button action rather than the form data when
 * buttons are declared this way, so the selections are captured in the click
 * handler below instead of after the dialog closes.
 */
async function promptReshape(actor) {
    const weapon = taggedWeapon(actor);
    if (!weapon) {
        ui.notifications.warn(game.i18n.localize("ASCENDANT.Soulbound.NoTaggedWeapon"));
        return;
    }

    const level = actor.level;
    const [forms, bySlug] = await Promise.all([loadForms(), loadRuneIndex()]);
    const catalogue = runeCatalogue(bySlug);
    const allowance = runeAllowance(level);

    const options = forms
        .map((f) => `<option value="${f.id}">${f.name} (${f.category}${f.group ? `, ${f.group}` : ""})</option>`)
        .join("");

    const content = `
<p>Your weapon is currently <strong>${foundry.utils.escapeHTML(weapon.name)}</strong>. Choosing a new
form creates that weapon, tagged and equipped as this one is, and deletes this one. Potency and
striking come from the talent and follow automatically.</p>
<p>At level ${level} you may carry <strong>${allowance}</strong> property rune${allowance === 1 ? "" : "s"},
each of item level ${runeLevelCap(level)} or lower.</p>
<p><label>New form <select name="form" style="width:100%">${options}</select></label></p>
<div class="ascendant-rune-report"></div>
`;

    let chosenForm = null;
    let chosenRunes = [];

    await foundry.applications.api.DialogV2.wait({
        window: { title: game.i18n.localize("ASCENDANT.Soulbound.DialogTitle") },
        position: { width: 540 },
        content,
        buttons: [
            {
                action: "reshape",
                label: game.i18n.localize("ASCENDANT.Soulbound.Reshape"),
                default: true,
                callback: (_event, _button, dialogApp) => {
                    const root = dialogApp.element;
                    chosenForm = root.querySelector("select[name=form]")?.value ?? null;
                    chosenRunes = [...root.querySelectorAll("input[name=rune]:checked")].map((i) => i.value);
                },
            },
            { action: "cancel", label: game.i18n.localize("ASCENDANT.Soulbound.Cancel") },
        ],
        // DialogV2 passes the application as the second argument, not an
        // element: checked against a probe dialog, where it arrived as a
        // DialogV2 with no querySelector of its own. Reading `.element` is what
        // reaches the DOM, and the element form is accepted too so this does not
        // depend on that staying true.
        render: (_event, app) => {
            const root = app instanceof HTMLElement ? app : app?.element;
            const select = root?.querySelector("select[name=form]");
            const report = root?.querySelector(".ascendant-rune-report");
            if (!select || !report) return;

            // Each refresh loads the chosen form from the pack, so a quick second
            // change can resolve after the first and leave the report describing
            // a form the dropdown no longer shows. The player would then tick
            // boxes against the wrong weapon, so a late result is discarded.
            let latest = 0;
            const refresh = async () => {
                const token = ++latest;
                const form = await game.packs.get(SRD).getDocument(select.value);
                if (token !== latest) return;
                const runes = assessRunes(weapon, form, level, catalogue);
                // Runes the weapon carries now stay ticked where they still fit, so
                // a reshape that keeps them is the default and a change is a choice.
                const rows = runes.map((r) => {
                    const blocked = r.overLevel || r.fits === false;
                    const checked = r.current && !blocked;
                    return `<label style="display:block; margin:2px 0;${blocked ? " opacity:0.6;" : ""}">
<input type="checkbox" name="rune" value="${r.key}" ${checked ? "checked" : ""} ${blocked ? "disabled data-blocked=\"1\"" : ""}>
${foundry.utils.escapeHTML(describeRune(r))}
</label>`;
                }).join("");
                report.innerHTML = `<p><strong>Property runes</strong> <span class="ascendant-rune-count"></span></p>
<div class="ascendant-rune-list" style="max-height: 16em; overflow-y: auto; border: 1px solid var(--color-border-light-2, #999); padding: 0.25em 0.5em;">${rows}</div>`;

                // The allowance is the rule's hard count: once it is reached the
                // unticked boxes lock until one is cleared.
                const boxes = [...report.querySelectorAll("input[name=rune]")];
                const count = report.querySelector(".ascendant-rune-count");
                const enforce = () => {
                    const chosen = boxes.filter((b) => b.checked).length;
                    for (const box of boxes) {
                        if (box.checked) continue;
                        box.disabled = box.dataset.blocked === "1" || chosen >= allowance;
                    }
                    if (count) count.textContent = `(${chosen} of ${allowance} chosen)`;
                };
                for (const box of boxes) box.addEventListener("change", enforce);
                enforce();
            };

            select.addEventListener("change", refresh);
            refresh();
        },
        rejectClose: false,
    });

    if (!chosenForm) return;

    const created = await reshape(actor, weapon, chosenForm, chosenRunes);
    if (created) {
        ui.notifications.info(game.i18n.format("ASCENDANT.Soulbound.Reshaped", { weapon: created.name }));
    }
}

/** True when this chat card is the Reshape Weapon action. */
function isReshapeCard(message) {
    const uuid = message.flags?.pf2e?.origin?.uuid;
    const item = uuid ? fromUuidSync(uuid) : message.item;
    return (item?.system?.slug ?? item?.slug) === ACTION_SLUG;
}

function addButton(message, html) {
    const root = html instanceof HTMLElement ? html : html?.[0];
    if (!root) return;
    if (!game.user.isGM && !message.isAuthor) return;
    if (!isReshapeCard(message)) return;

    const actor = message.actor;
    if (!actor?.itemTypes?.feat?.some((i) => i.slug === TALENT_SLUG)) return;

    // V13 re-renders a message in place, so remove ours before adding it again.
    root.querySelector(".ascendant-reshape-controls")?.remove();

    const wrap = document.createElement("div");
    wrap.className = "ascendant-reshape-controls";

    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = `<i class="fa-solid fa-hammer"></i> ${game.i18n.localize("ASCENDANT.Soulbound.Reshape")}`;
    button.addEventListener("click", async (event) => {
        event.preventDefault();
        button.disabled = true;
        try { await promptReshape(actor); } finally { button.disabled = false; }
    });

    wrap.append(button);
    (root.querySelector(".message-content") ?? root).append(wrap);
}

/**
 * Re-sync after anything that can move the ladder or change which weapon is
 * tagged: a level change, and a weapon being created, tagged or untagged.
 *
 * GM-only, because a player cannot update another actor's items and every seat
 * would otherwise race to write the same value.
 */
function watchFundamentals() {
    const resync = (actor) => {
        if (!game.user.isGM) return;
        if (!actor?.isOfType?.("character")) return;
        syncFundamentals(actor).catch((error) => {
            console.error(`${MODULE_ID} | soulbound arsenal fundamentals sync failed`, error);
        });
    };

    Hooks.on("updateActor", (actor, changed) => {
        if (foundry.utils.hasProperty(changed, "system.details.level.value")) resync(actor);
    });
    Hooks.on("createItem", (item) => resync(item.actor));
    Hooks.on("updateItem", (item, changed) => {
        if (foundry.utils.hasProperty(changed, "system.traits.otherTags")) resync(item.actor);
    });
}

/**
 * Offer the mark in the weapon sheet's other tags picker.
 *
 * The picker behind the pencil next to "Other Tags" on a weapon's Details tab
 * lists `CONFIG.PF2E.otherWeaponTags`, and the weapon's `otherTags` field
 * validates against the same list (pf2e.mjs:41449). PF2e ships three entries:
 * handwraps-of-mighty-blows, improvised and shoddy. A tag written by
 * `item.update` is stored without complaint but never offered, so the mark is
 * registered here before any text tells the player to pick it.
 *
 * PF2e assigns CONFIG.PF2E inside its own `init` listener, so this tries at
 * `init` and falls back to `setup`, the same as the feat categories.
 */
function registerTag() {
    const tags = CONFIG.PF2E?.otherWeaponTags;
    if (!tags) return false;
    tags[MARK] = "ASCENDANT.Soulbound.Tag";
    return true;
}

export function registerSoulboundArsenal() {
    Hooks.on("renderChatMessageHTML", addButton);
    watchFundamentals();
    if (!registerTag()) {
        Hooks.once("setup", () => {
            if (!registerTag()) console.error(`${MODULE_ID} | could not add the ${MARK} tag to CONFIG.PF2E.otherWeaponTags`);
        });
    }
    console.log(`${MODULE_ID} | soulbound arsenal reshape registered`);
}
