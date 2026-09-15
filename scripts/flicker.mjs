import { MODULE_ID } from "./constants.mjs";

/**
 * Flicker, Flicker Strike, the free-action Flicker and Shadowstep: pick a destination on the
 * map and teleport the token there.
 *
 * A button on the action's chat card starts a pick. The next left click on the canvas is the
 * destination, snapped to the grid; Escape cancels. The distance is measured with the scene's
 * own grid rules and refused when it is past the range for the character's level. The move is
 * a Foundry "blink" (`TokenDocument#move` with `action: "blink"`), which places the token
 * without a walk animation and without triggering movement along the way.
 *
 * Flicker may bring up to four willing adjacent creatures: every token the user has targeted
 * that is adjacent to the mover comes along, keeping its position relative to the mover.
 * Shadowstep brings nobody.
 *
 * A puff of smoke marks the departure square, the token jumps after a short beat, and a second
 * puff marks the arrival. Nothing here needs another module: the smoke is drawn on the canvas.
 * With Sequencer and JB2A present their smoke is used instead. The puffs are sent over the
 * module socket so every connected client sees them.
 */

/** Action slugs handled, with how far they reach and whether allies may come. */
const ACTIONS = {
    "ascendant-flicker-step-flicker": { range: flickerRange, allies: 4 },
    "ascendant-flicker-step-flicker-free": { range: flickerRange, allies: 4 },
    "ascendant-flicker-step-flicker-strike": { range: flickerRange, allies: 4 },
    "ascendant-living-shadow-shadowstep": { range: () => 120, allies: 0 },
};

/** "100 feet ... 250 at 5th ... 500 at 10th ... one mile at 15th." One mile is 5,280 feet. */
function flickerRange(level) {
    if (level >= 15) return 5280;
    if (level >= 10) return 500;
    if (level >= 5) return 250;
    return 100;
}

const SETTING = "flickerPicker";
const CONTROLS_CLASS = "ascendant-flicker-controls";

export function registerFlicker() {
    game.settings.register(MODULE_ID, SETTING, {
        name: "ASCENDANT.Flicker.SettingName",
        hint: "ASCENDANT.Flicker.SettingHint",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
    });
    Hooks.on("renderChatMessageHTML", addButton);
    registerFlickerSocket();
    return true;
}

function actionFor(message) {
    const uuid = message.flags?.pf2e?.origin?.uuid;
    const item = uuid ? fromUuidSync(uuid) : message.item;
    const slug = item?.system?.slug ?? item?.slug;
    return slug && ACTIONS[slug] ? { slug, ...ACTIONS[slug] } : null;
}

function addButton(message, html) {
    const root = html instanceof HTMLElement ? html : html?.[0];
    if (!root || !game.settings.get(MODULE_ID, SETTING)) return;
    if (!game.user.isGM && !message.isAuthor) return;
    const action = actionFor(message);
    if (!action) return;
    const actor = message.actor;
    if (!actor) return;

    root.querySelector(`.${CONTROLS_CLASS}`)?.remove();
    const wrap = document.createElement("div");
    wrap.className = CONTROLS_CLASS;
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = `<i class="fa-solid fa-person-running-fast"></i> ${game.i18n.localize("ASCENDANT.Flicker.Button")}`;
    button.addEventListener("click", async (event) => {
        event.preventDefault();
        button.disabled = true;
        try {
            await flicker(actor, action);
        } finally {
            button.disabled = false;
        }
    });
    wrap.append(button);
    (root.querySelector(".message-content") ?? root).append(wrap);
}

/**
 * Teleport the actor's token on the current scene. Exposed on the module API as `flicker(actor,
 * { slug, destination })`, where a destination skips the pick.
 */
export async function flicker(actor, action, { destination = null, token: chosen = null } = {}) {
    const resolved = typeof action === "string" ? { slug: action, ...ACTIONS[action] } : action;
    if (!resolved?.range) return null;
    // The controlled token of this actor first, so a scene holding two of them moves the one the
    // player has selected; else the first of the actor's tokens on the scene.
    const onScene = actor.getActiveTokens(true, false).filter((t) => t.scene === canvas.scene);
    const token = chosen ?? onScene.find((t) => t.controlled) ?? onScene[0] ?? null;
    if (!token) {
        ui.notifications.warn(game.i18n.format("ASCENDANT.Flicker.NoToken", { actor: actor.name }));
        return null;
    }
    const range = resolved.range(actor.level);
    const picked = destination ?? (await pickDestination(range));
    if (!picked) return null;

    const grid = canvas.grid;
    const center = grid.getSnappedPoint(picked, { mode: CONST.GRID_SNAPPING_MODES.CENTER });
    // Centres come off the documents, not the sprites: a sprite still animating from an earlier
    // move reports a point part-way along, and a distance measured from there is wrong.
    const centerOf = (t) => ({ x: t.document.x + (t.document.width * grid.size) / 2, y: t.document.y + (t.document.height * grid.size) / 2 });
    const from = centerOf(token);
    // Foundry drops a token update whose destination lies outside the scene rectangle without
    // saying so (measured 2026-09-15: moveTokens answered false, nothing moved), so say it here.
    const rect = canvas.dimensions.sceneRect;
    if (center.x < rect.x || center.y < rect.y || center.x > rect.x + rect.width || center.y > rect.y + rect.height) {
        ui.notifications.warn(game.i18n.localize("ASCENDANT.Flicker.OffMap"));
        return null;
    }
    const distance = grid.measurePath([from, center]).distance;
    if (distance > range) {
        ui.notifications.warn(game.i18n.format("ASCENDANT.Flicker.OutOfRange", { distance: Math.round(distance), range, units: grid.units }));
        return null;
    }

    const topLeft = (doc, c) => ({
        x: c.x - (doc.width * grid.size) / 2,
        y: c.y - (doc.height * grid.size) / 2,
    });
    const instructions = { [token.id]: { waypoints: [{ ...topLeft(token.document, center), action: "blink" }] } };

    // Companions: targeted tokens adjacent to the mover, up to the action's limit, keeping their
    // offset from the mover.
    const companions = [];
    if (resolved.allies > 0) {
        for (const target of game.user.targets) {
            if (target.id === token.id || target.scene !== canvas.scene) continue;
            const tc = centerOf(target);
            if (grid.measurePath([from, tc]).distance > grid.distance) continue;
            if (companions.length >= resolved.allies) break;
            const dest = grid.getSnappedPoint({ x: center.x + (tc.x - from.x), y: center.y + (tc.y - from.y) }, { mode: CONST.GRID_SNAPPING_MODES.CENTER });
            instructions[target.id] = { waypoints: [{ ...topLeft(target.document, dest), action: "blink" }] };
            companions.push(target);
        }
    }

    // Smoke at every departure square, a beat, the blink, then smoke at every arrival square.
    const departures = [from, ...companions.map((c) => centerOf(c))];
    const arrivals = [center, ...companions.map((c) => { const w = instructions[c.id].waypoints[0]; return { x: w.x + (c.document.width * grid.size) / 2, y: w.y + (c.document.height * grid.size) / 2 }; })];
    broadcast({ type: "puff", points: departures });
    await Promise.all([puffs(departures), wait(PUFF_DELAY_MS)]);
    await canvas.scene.moveTokens(instructions, {});
    broadcast({ type: "puff", points: arrivals });
    await puffs(arrivals);
    return { distance, companions: companions.map((c) => c.name) };
}

const SOCKET = `module.${MODULE_ID}`;
/** How long the departure smoke shows before the token jumps. */
const PUFF_DELAY_MS = 350;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Other clients see the smoke too; the mover's own client draws it directly. */
function broadcast(data) {
    game.socket?.emit(SOCKET, data);
}

export function registerFlickerSocket() {
    game.socket?.on(SOCKET, (data) => {
        if (data?.type === "puff" && Array.isArray(data.points) && canvas.ready) puffs(data.points);
    });
}

/**
 * A puff of smoke at each point. JB2A's smoke through Sequencer when both are present; otherwise
 * a handful of grey circles drawn on the interface layer that drift outward and fade over half
 * a second, which needs no assets at all.
 */
async function puffs(points) {
    const S = globalThis.Sequencer;
    const file = "jb2a.smoke.puff.centered.grey.2";
    if (S?.Database?.entryExists?.(file)) {
        try {
            const seq = new S();
            for (const p of points) seq.effect().file(file).atLocation(p).scale(0.6);
            await seq.play();
            return;
        } catch (error) {
            console.warn(`${MODULE_ID} | smoke effect failed`, error);
        }
    }
    await Promise.all(points.map((p) => nativePuff(p)));
}

function nativePuff(point, duration = 550) {
    const layer = canvas.interface ?? canvas.stage;
    const container = new PIXI.Container();
    layer.addChild(container);
    const base = canvas.grid.size * 0.16;
    const blobs = [];
    for (let i = 0; i < 9; i += 1) {
        const blob = new PIXI.Graphics();
        const shade = [0x8a8a8a, 0xa0a0a0, 0xb8b8b8][i % 3];
        blob.beginFill(shade, 0.6).drawCircle(0, 0, base * (0.7 + Math.random() * 0.6)).endFill();
        const angle = (i / 9) * Math.PI * 2 + Math.random() * 0.5;
        blob.position.set(point.x + Math.cos(angle) * base * 0.4, point.y + Math.sin(angle) * base * 0.4);
        blob.drift = { x: Math.cos(angle) * base * 0.05, y: Math.sin(angle) * base * 0.05 - base * 0.02 };
        container.addChild(blob);
        blobs.push(blob);
    }
    const start = performance.now();
    return new Promise((resolve) => {
        const tick = () => {
            const t = (performance.now() - start) / duration;
            if (t >= 1) {
                canvas.app.ticker.remove(tick);
                container.destroy({ children: true });
                resolve();
                return;
            }
            for (const blob of blobs) {
                blob.x += blob.drift.x;
                blob.y += blob.drift.y;
                blob.scale.set(1 + t * 1.6);
                blob.alpha = 0.75 * (1 - t) * (1 - t);
            }
        };
        canvas.app.ticker.add(tick);
    });
}

/** The next left click on the canvas, or null on Escape. */
function pickDestination(range) {
    return new Promise((resolve) => {
        const note = ui.notifications.info(game.i18n.format("ASCENDANT.Flicker.Pick", { range, units: canvas.grid.units }), { permanent: true });
        // Listened for on the canvas element, in the capture phase: a plain DOM event with client
        // coordinates, converted with the canvas's own helper. PIXI's handlers see the same event
        // afterwards, so the click still selects or deselects as it normally would.
        const view = canvas.app.view;
        const done = (value) => {
            view.removeEventListener("pointerdown", onDown, true);
            window.removeEventListener("keydown", onKey, true);
            document.body.style.cursor = "";
            ui.notifications.remove?.(note);
            resolve(value);
        };
        const onDown = (event) => {
            if (event.button !== 0) return;
            const point = canvas.canvasCoordinatesFromClient({ x: event.clientX, y: event.clientY });
            done({ x: point.x, y: point.y });
        };
        const onKey = (event) => {
            if (event.key === "Escape") { event.stopPropagation(); done(null); }
        };
        view.addEventListener("pointerdown", onDown, true);
        window.addEventListener("keydown", onKey, true);
        document.body.style.cursor = "crosshair";
    });
}

