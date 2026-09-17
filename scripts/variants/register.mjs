import { MODULE_ID, LEGACY_MODULE_ID } from "./constants.mjs";
import { registerSettings } from "./settings.mjs";
import { registerCoexistence, onDeleteClassItem } from "./coexist.mjs";
import { registerMerge } from "./merge.mjs";
import { registerLadders } from "./ladders.mjs";
import { onUpdateActor } from "./features.mjs";
import { registerBoostRows } from "./boosts.mjs";
import { registerSheet } from "./sheet.mjs";
import { registerSkillCounter } from "./skills.mjs";
import { registerMismatchWarning } from "./mismatch.mjs";
import { registerLevelGate } from "./level-gate.mjs";
import { registerClassChoices } from "./class-choices.mjs";
import { registerPlannerSlots } from "./planner-slots.mjs";

/**
 * The three variant rules Ascendant is played with: Dual Class (with the third
 * class option), Ancestry Paragon and Free Archetype.
 *
 * Everything in this directory is copied file for file from the Dual Class
 * module (`pf2e-dual-class-items`), so a fix there is a file diff here. This
 * file replaces its module.mjs: the same registration, with one addition.
 *
 * ## Standing down
 *
 * When that module is itself active, none of the patches here are registered.
 * Two `coexist` wrappers would each filter the class purge, two `prepareFeats`
 * wrappers would push a ladder each, and the sheet would get two Second Class
 * cells. The settings still register, so the Free Archetype toggle works
 * either way, and `util.mjs` reads the other module's flags, so a talent that
 * asks whether a character is dual class gets the right answer.
 *
 * Registered at `init`. The libWrapper patches name their targets as strings and
 * libWrapper resolves them lazily, so this is safe even for PF2e classes that
 * are not on `CONFIG` yet.
 */
export function registerVariants() {
    registerSettings();

    // PF2e's own Free Archetype setting is the authority. A world that already has it on
    // (found live on 2026-09-14: system true, this toggle at its default of false) would
    // otherwise show the wrong state here, and the first person to tick this box would
    // find nothing changed. Taking the system's value at `ready` keeps the two in step;
    // the onChange then only ever pushes a deliberate change the other way.
    Hooks.once("ready", () => {
        if (!game.user.isGM) return;
        const system = game.settings.get("pf2e", "freeArchetypeVariant");
        if (game.settings.get(MODULE_ID, "freeArchetype") !== system) game.settings.set(MODULE_ID, "freeArchetype", system);
    });

    if (game.modules.get(LEGACY_MODULE_ID)?.active) {
        console.log(`${MODULE_ID} | ${LEGACY_MODULE_ID} is active; it provides the variant rules and Ascendant's copy stands down`);
        return false;
    }

    if (!game.modules.get("lib-wrapper")?.active) {
        console.error(`${MODULE_ID} | the "libWrapper" module is required but is not active.`);
        ui.notifications?.error(
            "Ascendant requires the \"libWrapper\" module to be installed and active. " +
                "The dual class and ancestry paragon rules will not work until it is enabled.",
            { permanent: true },
        );
        return false;
    }

    const patched = {
        coexistence: registerCoexistence(),
        merge: registerMerge(),
        ladders: registerLadders(),
        classChoices: registerClassChoices(),
    };
    registerBoostRows();
    registerSheet();
    registerSkillCounter();
    registerMismatchWarning();
    registerLevelGate();
    registerPlannerSlots();

    Hooks.on("deleteItem", onDeleteClassItem);
    Hooks.on("updateActor", onUpdateActor);

    const failed = Object.entries(patched).filter(([, ok]) => !ok).map(([name]) => name);
    if (failed.length) {
        console.error(`${MODULE_ID} | variants: failed to patch ${failed.join(", ")}`);
        return false;
    }
    console.log(`${MODULE_ID} | variants: all patches registered`);
    return true;
}
