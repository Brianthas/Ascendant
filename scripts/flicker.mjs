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
    // Flicker: "a space you can see or have seen" until 10th, where "you may specify a direction
    // and distance instead". Shadowstep: "any shadow or area of dim light you can see", always.
    "ascendant-flicker-step-flicker": { range: flickerRange, allies: 4, sight: (level) => level < 10 },
    "ascendant-flicker-step-flicker-free": { range: flickerRange, allies: 4, sight: (level) => level < 10 },
    "ascendant-flicker-step-flicker-strike": { range: flickerRange, allies: 4, sight: (level) => level < 10 },
    "ascendant-living-shadow-shadowstep": { range: () => 120, allies: 0, sight: () => true },
};

/** The action slugs the destination picker serves, for the sheet's Use button. */
export const TELEPORT_ACTIONS = new Set(Object.keys(ACTIONS));

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
    const picked = destination ?? (await pickDestination(range, token));
    if (!picked) return null;

    const grid = canvas.grid;
    // A token an even number of squares wide has its centre on a grid vertex, not a cell centre;
    // measured 2026-09-15, a 2x2 Jotunborn snapped to a cell centre landed half a square off.
    const snapMode = (doc) => (doc.width % 2 === 0 ? CONST.GRID_SNAPPING_MODES.VERTEX : CONST.GRID_SNAPPING_MODES.CENTER);
    const center = grid.getSnappedPoint(picked, { mode: snapMode(token.document) });
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
    // Sight is judged from the active vision on this client: the controlled token's, so a player
    // picking for their own token is held to what that token can see. A GM with no vision source
    // active sees everything, which is Foundry's own rule for the GM.
    if (resolved.sight?.(actor.level) && !canvas.visibility.testVisibility(center, { tolerance: Math.floor(grid.size / 4) })) {
        ui.notifications.warn(game.i18n.localize("ASCENDANT.Flicker.NotVisible"));
        return null;
    }

    const topLeft = (doc, c) => ({
        x: c.x - (doc.width * grid.size) / 2,
        y: c.y - (doc.height * grid.size) / 2,
    });
    const instructions = { [token.id]: { waypoints: [{ ...topLeft(token.document, center), action: "blink" }] } };

    // Companions: targeted tokens within the mover's reach, up to the action's limit. Reach is
    // the actor's prepared value, so a talent that extends it (Grasping Reach) widens who can
    // come, and the distance is PF2e's own edge-to-edge token measure where it exists, so a
    // Large mover is not measured from its centre. Each is placed in a free square adjacent to
    // the arrival footprint, nearest the side it left from: "placing them in spaces adjacent to
    // your arrival". Keeping their old offset instead could put one off the map or onto another
    // token.
    const companions = [];
    if (resolved.allies > 0) {
        const reach = Math.max(grid.distance, actor.attributes?.reach?.base ?? 0);
        const candidates = [];
        for (const target of game.user.targets) {
            if (target.id === token.id || target.scene !== canvas.scene) continue;
            const apart = typeof token.distanceTo === "function" ? token.distanceTo(target) : grid.measurePath([from, centerOf(target)]).distance;
            if (apart > reach) continue;
            if (candidates.length >= resolved.allies) break;
            candidates.push(target);
        }
        const moving = new Set([token.id, ...candidates.map((c) => c.id)]);
        const taken = occupiedCells(moving);
        const moverTopLeft = topLeft(token.document, center);
        for (const cell of footprint(moverTopLeft, token.document)) taken.add(cell);
        for (const target of candidates) {
            const tc = centerOf(target);
            const dest = adjacentPlacement(moverTopLeft, token.document, target.document, { x: tc.x - from.x, y: tc.y - from.y }, taken);
            if (!dest) {
                ui.notifications.warn(game.i18n.format("ASCENDANT.Flicker.NoRoom", { name: target.name }));
                continue;
            }
            for (const cell of footprint(dest, target.document)) taken.add(cell);
            instructions[target.id] = { waypoints: [{ ...dest, action: "blink" }] };
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
const PUFF_DELAY_MS = 500;
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

/** Grid cells (as "col,row" keys) a token of this document's size covers from a top-left point. */
function footprint(topLeftPoint, doc) {
    const g = canvas.grid.size;
    const col = Math.round(topLeftPoint.x / g);
    const row = Math.round(topLeftPoint.y / g);
    const cells = [];
    for (let dx = 0; dx < Math.max(1, Math.round(doc.width)); dx += 1) {
        for (let dy = 0; dy < Math.max(1, Math.round(doc.height)); dy += 1) cells.push(`${col + dx},${row + dy}`);
    }
    return cells;
}

/** Every cell covered by a token on the scene that is not itself moving. */
function occupiedCells(moving) {
    const taken = new Set();
    for (const t of canvas.tokens.placeables) {
        if (moving.has(t.id)) continue;
        for (const cell of footprint({ x: t.document.x, y: t.document.y }, t.document)) taken.add(cell);
    }
    return taken;
}

/**
 * A top-left point for `doc` in a free spot adjacent to the mover's arrival footprint, or null
 * when the ring around it holds no room. Candidates are the cells touching the footprint, tried
 * in order of how close their direction from the mover is to the way the companion stood before.
 */
function adjacentPlacement(moverTopLeft, moverDoc, doc, offset, taken) {
    const g = canvas.grid.size;
    const rect = canvas.dimensions.sceneRect;
    const cols = Math.round(rect.width / g);
    const rows = Math.round(rect.height / g);
    const col0 = Math.round(rect.x / g);
    const row0 = Math.round(rect.y / g);
    const mc = Math.round(moverTopLeft.x / g);
    const mr = Math.round(moverTopLeft.y / g);
    const mw = Math.max(1, Math.round(moverDoc.width));
    const mh = Math.max(1, Math.round(moverDoc.height));
    const w = Math.max(1, Math.round(doc.width));
    const h = Math.max(1, Math.round(doc.height));
    const wanted = Math.atan2(offset.y, offset.x);
    const centre = { x: mc + mw / 2, y: mr + mh / 2 };

    const candidates = [];
    for (let c = mc - w; c <= mc + mw; c += 1) {
        for (let r = mr - h; r <= mr + mh; r += 1) {
            // Touching the footprint: overlapping neither it nor lying more than one cell away.
            const overlaps = c < mc + mw && c + w > mc && r < mr + mh && r + h > mr;
            const touches = c + w >= mc && c <= mc + mw && r + h >= mr && r <= mr + mh;
            if (overlaps || !touches) continue;
            if (c < col0 || r < row0 || c + w > col0 + cols || r + h > row0 + rows) continue;
            let free = true;
            for (let dx = 0; dx < w && free; dx += 1) for (let dy = 0; dy < h; dy += 1) if (taken.has(`${c + dx},${r + dy}`)) { free = false; break; }
            if (!free) continue;
            const angle = Math.atan2(r + h / 2 - centre.y, c + w / 2 - centre.x);
            let delta = Math.abs(angle - wanted);
            if (delta > Math.PI) delta = 2 * Math.PI - delta;
            candidates.push({ c, r, delta });
        }
    }
    candidates.sort((a, b) => a.delta - b.delta);
    const best = candidates[0];
    return best ? { x: best.c * g, y: best.r * g } : null;
}

/** The range as a ring on the interface layer, centred on the token's current square. */
function drawRangeRing(token, range) {
    const layer = canvas.interface ?? canvas.stage;
    if (!layer || !token) return null;
    const grid = canvas.grid;
    const radius = (range / grid.distance) * grid.size;
    const center = { x: token.document.x + (token.document.width * grid.size) / 2, y: token.document.y + (token.document.height * grid.size) / 2 };
    const ring = new PIXI.Graphics();
    ring.beginFill(0x66ccff, 0.08).drawCircle(center.x, center.y, radius).endFill();
    ring.lineStyle(3, 0x66ccff, 0.9).drawCircle(center.x, center.y, radius);
    layer.addChild(ring);
    return ring;
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

function nativePuff(point, duration = 900) {
    const layer = canvas.interface ?? canvas.stage;
    const container = new PIXI.Container();
    // Above the token layer (z 200 on Foundry 14), so the cloud hides the token rather than
    // sitting under it. The interface group sorts its children by z-index.
    container.zIndex = 10000;
    layer.addChild(container);
    layer.sortChildren?.();
    // A cloud about one square across, dark grey with lighter lobes, drifting outward and up.
    // The first version was a sixth of that and gone in half a second; measured 2026-09-15, the
    // player did not see it.
    const base = canvas.grid.size * 0.32;
    const blobs = [];
    for (let i = 0; i < 14; i += 1) {
        const blob = new PIXI.Graphics();
        const shade = [0x3c3c3c, 0x555555, 0x707070, 0x8c8c8c][i % 4];
        blob.beginFill(shade, 0.85).drawCircle(0, 0, base * (0.6 + Math.random() * 0.7)).endFill();
        const angle = (i / 14) * Math.PI * 2 + Math.random() * 0.4;
        const spread = base * (0.2 + Math.random() * 0.5);
        blob.position.set(point.x + Math.cos(angle) * spread, point.y + Math.sin(angle) * spread);
        blob.drift = { x: Math.cos(angle) * base * 0.035, y: Math.sin(angle) * base * 0.035 - base * 0.03 };
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

/**
 * The next left click on the canvas, or null on Escape. While picking, a ring around the token
 * shows the range; it is a plain circle, so on a square grid the diagonal reach is a little
 * inside it and the distance check afterwards is the one that decides.
 */
function pickDestination(range, token) {
    return new Promise((resolve) => {
        const note = ui.notifications.info(game.i18n.format("ASCENDANT.Flicker.Pick", { range, units: canvas.grid.units }), { permanent: true });
        const ring = drawRangeRing(token, range);
        // Listened for on the canvas element, in the capture phase: a plain DOM event with client
        // coordinates, converted with the canvas's own helper. PIXI's handlers see the same event
        // afterwards, so the click still selects or deselects as it normally would.
        const view = canvas.app.view;
        const done = (value) => {
            view.removeEventListener("pointerdown", onDown, true);
            window.removeEventListener("keydown", onKey, true);
            document.body.style.cursor = "";
            ui.notifications.remove?.(note);
            ring?.destroy({ children: true });
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

