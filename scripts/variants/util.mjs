import { MODULE_ID, LEGACY_MODULE_ID, SECONDARY_CLASS_FLAG, EXTRA_CLASSES_FLAG } from "./constants.mjs";
import { moduleEnabled } from "./settings.mjs";

/**
 * Register one libWrapper patch, catching a failure rather than letting it throw.
 *
 * An exception thrown out of a `libWrapper.register` call inside a hook callback aborts the rest of
 * that callback, so one bad target silently prevents every *later* registration in the same
 * function from happening at all. The visible symptom is not "one feature broken" but "most of the
 * module missing", which is a much harder thing to diagnose from a bug report.
 *
 * @param {string} target Dotted path libWrapper resolves.
 * @param {Function} fn The wrapper.
 * @param {"WRAPPER"|"MIXED"|"OVERRIDE"} type
 * @returns {boolean} Whether the patch registered.
 */
export function registerLibWrapper(target, fn, type) {
  try {
    libWrapper.register(MODULE_ID, target, fn, type);
    return true;
  } catch (error) {
    console.error(`${MODULE_ID} | failed to patch ${target}`, error);
    ui.notifications?.error(
      `Dual Class Items (PF2e) could not patch the system (${target}). Dual-class characters will not `
      + "work correctly - check the console (F12) and consider reporting this on the module's "
      + "GitHub issues.",
      { permanent: true }
    );
    return false;
  }
}

/**
 * Show a message as a toast and as a whisper to the acting user and all GMs.
 *
 * A toast is gone in a few seconds, which is exactly when someone goes looking for the wording of a
 * warning they half-read. The whisper leaves a scrollable record, and puts it in front of the GM
 * even when a player triggered it.
 *
 * @param {"info"|"warn"|"error"} level
 * @param {string} message
 */
export function notifyDualClass(level, message) {
  ui.notifications?.[level](message);

  const whisper = ChatMessage.getWhisperRecipients("GM").map((u) => u.id);
  if (!whisper.includes(game.user.id)) whisper.push(game.user.id);

  ChatMessage.create({
    content: message,
    whisper,
    flavor: game.i18n.localize("PF2EDC.ModuleName")
  });
}

/**
 * The ids of every class beyond the first, in the order they were added.
 *
 * Reads the flag rather than item order, because `actor.items` order decides which class PF2e
 * itself treats as the real one and that is not something the player chooses.
 *
 * Characters built before this module supported a third class carry a single id under the old
 * `secondaryClass` flag. That is read here and treated as a one-entry list, so nothing has to be
 * migrated on disk and a character whose flag is never rewritten keeps working.
 *
 * @param {ActorPF2e} actor
 * @returns {string[]}
 */
export function getExtraClassIds(actor) {
  if (!moduleEnabled()) return [];
  if (actor?.type !== "character") return [];

  // Ascendant's own flag first, then the flags the Dual Class module wrote. `getFlag` throws on a
  // scope that is not an active package, so the legacy scope is read off the flags object directly.
  const list = actor.getFlag(MODULE_ID, EXTRA_CLASSES_FLAG);
  if (Array.isArray(list)) return list.filter((id) => typeof id === "string");

  const legacyFlags = actor.flags?.[LEGACY_MODULE_ID] ?? {};
  const legacyList = legacyFlags[EXTRA_CLASSES_FLAG];
  if (Array.isArray(legacyList)) return legacyList.filter((id) => typeof id === "string");

  const legacy = actor.getFlag(MODULE_ID, SECONDARY_CLASS_FLAG) ?? legacyFlags[SECONDARY_CLASS_FLAG];
  return typeof legacy === "string" ? [legacy] : [];
}

/**
 * Ascendant addition to the copied file: record the extra classes under both flag scopes.
 *
 * `setFlag` refuses a scope that is not an active package, but a plain update writes any flag
 * key, and the Dual Class module reads only its own scope. Writing both keeps a character built
 * here recognisable there (verified live on 2026-09-14: the Wizard ladder and DC appeared the
 * moment the legacy key was written). `null` clears both.
 *
 * @param {ActorPF2e} actor
 * @param {string[]|null} ids
 */
export async function writeExtraClasses(actor, ids) {
  const update = {};
  for (const scope of [MODULE_ID, LEGACY_MODULE_ID]) {
    if (ids) update[`flags.${scope}.${EXTRA_CLASSES_FLAG}`] = ids;
    else update[`flags.${scope}.-=${EXTRA_CLASSES_FLAG}`] = null;
    if (actor.flags?.[scope]?.[SECONDARY_CLASS_FLAG] !== undefined) update[`flags.${scope}.-=${SECONDARY_CLASS_FLAG}`] = null;
  }
  await actor.update(update);
}

/**
 * Ascendant addition: while the Dual Class module is active, copy its class list onto
 * Ascendant's scope.
 *
 * That module writes only its own scope, and Ascendant reads its own first. Without this, a class
 * swapped there leaves Ascendant's flag naming the deleted class, and the character loses its
 * second class the moment that module is turned off. Every character Ascendant has built carries
 * both scopes, so an absent list in that module's scope means it removed the classes.
 *
 * @param {ActorPF2e} actor
 */
export async function mirrorLegacyClasses(actor) {
  if (actor?.type !== "character") return false;
  const legacy = actor.flags?.[LEGACY_MODULE_ID]?.[EXTRA_CLASSES_FLAG];
  const own = actor.flags?.[MODULE_ID]?.[EXTRA_CLASSES_FLAG];
  const wanted = Array.isArray(legacy) ? legacy : undefined;
  if (JSON.stringify(wanted) === JSON.stringify(Array.isArray(own) ? own : undefined)) return false;
  await actor.update(
    wanted
      ? { [`flags.${MODULE_ID}.${EXTRA_CLASSES_FLAG}`]: wanted }
      : { [`flags.${MODULE_ID}.-=${EXTRA_CLASSES_FLAG}`]: null },
  );
  return true;
}

/**
 * Every class item beyond the first, in flag order, with any id that no longer resolves dropped.
 *
 * @param {ActorPF2e} actor
 * @returns {ItemPF2e[]}
 */
export function getExtraClasses(actor) {
  return getExtraClassIds(actor)
    .map((id) => actor.items.get(id))
    .filter((item) => item?.type === "class");
}

/**
 * The class item flagged as secondary, or null. The first extra class.
 *
 * @param {ActorPF2e} actor
 * @returns {ItemPF2e|null}
 */
export function getSecondaryClass(actor) {
  return getExtraClasses(actor)[0] ?? null;
}

/**
 * The class item that is not one of the extras, on an actor that has at least one.
 *
 * @param {ActorPF2e} actor
 * @returns {ItemPF2e|null}
 */
export function getPrimaryClass(actor) {
  const extraIds = new Set(getExtraClassIds(actor));
  if (extraIds.size === 0) return null;
  return actor.itemTypes.class.find((c) => !extraIds.has(c.id)) ?? null;
}

/**
 * Every class item on the actor in rules order: the primary first, then the extras as flagged.
 *
 * This is the list to fold over for anything the rules say to take across all classes - the higher
 * Hit Points, the highest proficiency, the larger skill count, a feat ladder each. Empty when the
 * module is off or the actor has no extra classes, so callers can treat empty as "not our business".
 *
 * @param {ActorPF2e} actor
 * @returns {ItemPF2e[]}
 */
export function getAllClasses(actor) {
  const primary = getPrimaryClass(actor);
  if (!primary) return [];
  return [primary, ...getExtraClasses(actor)];
}

/**
 * Whether this module's rules are active for this actor: the module is on, and the actor has a
 * primary class plus at least one extra.
 *
 * @param {ActorPF2e} actor
 * @returns {boolean}
 */
export function isMultiClassActor(actor) {
  return getAllClasses(actor).length >= 2;
}

/**
 * What to call the nth class after the first, wherever one is named to the player.
 *
 * Shared by the sheet cells and the Attribute Boosts rows so the two never drift apart. English has
 * ordinary words for the second and third; past that it falls back to numbering rather than
 * inventing "Quaternary Class".
 *
 * @param {number} index 0 for the second class, 1 for the third, and so on.
 * @returns {string}
 */
export function extraClassLabel(index) {
  if (index === 0) return game.i18n.localize("PF2EDC.Sheet.SecondClass");
  if (index === 1) return game.i18n.localize("PF2EDC.Sheet.ThirdClass");
  return game.i18n.format("PF2EDC.Sheet.NthClass", { n: index + 2 });
}

/** A class item's slug, falling back to its name the way PF2e's own code does. */
export function classSlug(classItem) {
  return classItem.slug ?? game.pf2e.system.sluggify(classItem.name);
}
