import { MODULE_ID } from "./constants.mjs";
import { registerFeatCategories, registerFeatSections, dropDuplicateSections, pruneStoredSections } from "./categories.mjs";
import { registerVariants } from "./variants/register.mjs";
import { registerRefreshButton, refreshTalentRules } from "./refresh-rules.mjs";
import { registerRegenerationDeactivation } from "./deathless.mjs";
import { registerSpellSlotButton, tripleSlots, restoreSlots } from "./spell-slots.mjs";
import { registerKnowItAllSlots } from "./skill-feats.mjs";
import { registerShapeOfHarm } from "./damage-dial.mjs";
import { registerBonded, syncBonded, unlinkBonded } from "./bonded.mjs";
import { registerSoulboundArsenal, syncFundamentals } from "./soulbound.mjs";
import { registerAegis, repairAegis } from "./aegis.mjs";
import { registerSecondWind } from "./second-wind.mjs";
import { registerBattleMender } from "./battle-mender.mjs";
import { registerContainers, syncCapacity } from "./containers.mjs";
import { registerAttributeBoosts } from "./attribute-boosts.mjs";
import { registerFlicker, flicker } from "./flicker.mjs";
import { registerActionButtons } from "./actions.mjs";
import { registerWeaponExpertise } from "./weapon-expertise.mjs";

/**
 * Registration timing.
 *
 * PF2e assigns CONFIG.PF2E and builds game.pf2e.settings inside its own `init`
 * listener, so whether our `init` runs first depends on package load order.
 * Rather than depend on that, try at `init` and fall back to `setup`, which is
 * guaranteed to be after it.
 *
 * Feat sections need a reset when registered at `setup`, because world documents
 * are prepared before the `setup` hook fires and so were prepared without them.
 *
 * The two `applyDamage` wrappers (Deathless, Second Wind) go on at `setup`,
 * after PF2e's document classes are final.
 */
let categoriesRegistered = false;
let weaponExpertiseRegistered = false;
let sectionsRegistered = false;

/** Run one registration, reporting a throw loudly instead of aborting the hook. */
function attempt(name, register) {
    try {
        return register();
    } catch (error) {
        console.error(`${MODULE_ID} | registering ${name} failed`, error);
        ui.notifications?.error(`Ascendant: registering ${name} failed; see the console (F12).`, { permanent: true });
        return false;
    }
}

Hooks.once("init", () => {
    if (game.system?.id !== "pf2e") {
        console.error(`${MODULE_ID} | the pf2e system is not active. This module requires it.`);
        return;
    }

    // Each registration on its own, so one that throws cannot take the rest down. On
    // 2026-09-14 the settings-menu registration threw on Foundry v14 as the second call
    // here, every hook after it was never registered, and nothing said so because the
    // `setup` fallback below still registered the categories.
    const variantsActive = attempt("variants", registerVariants) === true;
    attempt("refresh button", registerRefreshButton);
    attempt("spell slots", registerSpellSlotButton);
    attempt("know-it-all slots", () => registerKnowItAllSlots({ variantsActive }));
    attempt("shape of harm", registerShapeOfHarm);
    attempt("bonded soul", registerBonded);
    attempt("soulbound arsenal", registerSoulboundArsenal);
    attempt("aegis", registerAegis);
    attempt("battle mender", registerBattleMender);
    attempt("containers", registerContainers);
    attempt("attribute boosts", registerAttributeBoosts);
    attempt("flicker", registerFlicker);
    attempt("action buttons", registerActionButtons);
    weaponExpertiseRegistered = attempt("weapon expertise", registerWeaponExpertise) === true;
    categoriesRegistered = registerFeatCategories();
    sectionsRegistered = registerFeatSections();
    console.log(
        `${MODULE_ID} | init: categories ${categoriesRegistered ? "registered" : "deferred"}, ` +
            `sections ${sectionsRegistered ? "registered" : "deferred"}`,
    );
});

Hooks.once("setup", () => {
    registerRegenerationDeactivation();
    registerSecondWind();

    // game.pf2e is built in PF2e's own `init`, which may run after ours. Actors were prepared
    // before `setup` without the rule element, so they are prepared again with it.
    if (!weaponExpertiseRegistered) {
        weaponExpertiseRegistered = attempt("weapon expertise", registerWeaponExpertise) === true;
        if (weaponExpertiseRegistered) {
            for (const actor of game.actors.filter((a) => a.type === "character")) actor.reset();
        } else {
            console.error(`${MODULE_ID} | Weapon Expertise rule element not registered: game.pf2e.RuleElements is missing`);
            ui.notifications?.error("Ascendant: Weapon Expertise could not register; see the console (F12).", { permanent: true });
        }
    }

    if (!categoriesRegistered) categoriesRegistered = registerFeatCategories();
    if (!sectionsRegistered) {
        sectionsRegistered = registerFeatSections();
        if (sectionsRegistered) {
            for (const actor of game.actors.filter((a) => a.type === "character")) actor.reset();
        }
    }

    if (!categoriesRegistered || !sectionsRegistered) {
        console.error(
            `${MODULE_ID} | Failed to register with PF2e. ` +
                `categories: ${categoriesRegistered}, sections: ${sectionsRegistered}. ` +
                `Talents will not appear on character sheets.`,
        );
    } else {
        console.log(`${MODULE_ID} | setup complete`);
    }
});

Hooks.once("ready", async () => {
    if (await pruneStoredSections()) console.log(`${MODULE_ID} | removed this module's section ids from the persisted campaignFeatSections setting`);

    // Another module may add a section matching one of ours after we register,
    // since `ready` is later than our registration. On the first load after that
    // happens we may have added a duplicate; stand down and let theirs be the one.
    const dropped = dropDuplicateSections();
    if (dropped.length) {
        console.log(`${MODULE_ID} | another module provides ${dropped.join(", ")}; using theirs`);
        for (const actor of game.actors.filter((a) => a.type === "character")) actor.reset();
    }

    // Exposed so each mechanic can be driven from a macro or the console as well as from the sheet.
    game.modules.get(MODULE_ID).api = {
        refreshTalentRules,
        tripleSlots,
        restoreSlots,
        syncBonded,
        unlinkBonded,
        syncFundamentals,
        repairAegis,
        syncCapacity,
        flicker,
    };
});
