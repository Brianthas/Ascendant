import { MODULE_ID } from "../constants.mjs";

const SETTING = "automateSpellcasting";

/** Off by default: a world opts in (Bryan, 2026-11-07). */
export function registerCastingSetting() {
    game.settings.register(MODULE_ID, SETTING, {
        name: "ASCENDANT.Casting.SettingName",
        hint: "ASCENDANT.Casting.SettingHint",
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        onChange: () => {
            for (const actor of game.actors ?? []) if (actor.sheet?.rendered) actor.sheet.render(false);
        },
    });
    return true;
}

export function castingAutomationOn() {
    try {
        return game.settings.get(MODULE_ID, SETTING) === true;
    } catch {
        // Read before `init` registered it: nothing is automated yet.
        return false;
    }
}
