/**
 * Spells a class grants by name, added to its managed entry as the entry gains each rank.
 *
 * - Sorcerer: the bloodline's sorcerous gifts. "When you gain a new rank of spells, your first new
 *   spell is always the sorcerous gift spell for that rank" (Sorcerer, Spell Repertoire), so they
 *   count inside the class table, not on top of it.
 * - Cleric: the deity's spells. "You can prepare these just like you can any spell on the divine
 *   spell list once you can prepare spells of their rank as a cleric", so they go into the
 *   cleric's spellbook when the rank opens.
 * - Oracle: the mystery's granted spells, and Psychic: the conscious mind's granted spells and psi
 *   cantrips, each "in addition to" the class's own picks, so they count on top of the table.
 * - Bard: the muse spell, on top of the table.
 * - Magus: studious spells, into the spellbook at 7th, 11th and 13th level.
 *
 * PF2e grants none of these: each choice carries its spells only as links in its description, and
 * a deity carries `system.spells` as `{ rank: uuid }` (read off the packs on 2026-11-07).
 *
 * Each added spell carries `flags.ascendant.granted = { source, uuid, rank, onTop }`, and the entry
 * records `flags.ascendant.casting.grantedDone`, every `uuid@rank` it has added, so a spell the
 * player deletes is not added back.
 */
import { MODULE_ID } from "../constants.mjs";

const ORDINALS = { cantrip: 0, "1st": 1, "2nd": 2, "3rd": 3, "4th": 4, "5th": 5, "6th": 6, "7th": 7, "8th": 8, "9th": 9 };
// "cantrip: @UUID", "6th :see ...", and the mysteries' "<strong>cantrip:</strong> @UUID".
const ORDINAL_PATTERN = /(cantrip|1st|2nd|3rd|[4-9]th)\s*:\s*(?:<\/strong>\s*)?(@UUID\[([^\]]+)\])?/g;
const SPELL_LINK = /@UUID\[(Compendium\.pf2e\.spells-srd\.Item\.[A-Za-z0-9]+)\]/g;

/** `{ rank: uuid }` from one run of "cantrip: @UUID[...]; 1st: ..." text. A rank without a link is absent. */
function parseOrdinals(text) {
    const found = {};
    for (const match of text.matchAll(ORDINAL_PATTERN)) {
        if (match[3]) found[ORDINALS[match[1]]] = match[3];
    }
    return found;
}

/**
 * The markup under a bold heading, up to the next bold text that is not a rank label. A mystery's
 * "Granted Spells" puts each rank in its own bold label ("cantrip:", "1st:"), so those are skipped.
 */
function section(html, heading) {
    const head = html.search(new RegExp(`<strong>\\s*${heading}\\s*:?\\s*</strong>`));
    if (head < 0) return null;
    const after = html.indexOf("</strong>", head) + "</strong>".length;
    for (const match of html.slice(after).matchAll(/<strong>([^<]*)<\/strong>/g)) {
        const label = match[1].trim().replace(/:$/, "").toLowerCase();
        if (!(label in ORDINALS)) return html.slice(head, after + match.index);
    }
    return html.slice(head);
}

/** Every spell link in a piece of markup, in order. */
function spellLinks(text) {
    return [...(text ?? "").matchAll(SPELL_LINK)].map((m) => m[1]);
}

/**
 * A bloodline's gifts by rank, `{ gifts: { rank: uuid }, missing: [rank] }`.
 *
 * The list follows a bold "Sorcerous Gifts" or "Granted Spells" heading. Draconic, Elemental and
 * Genie leave some ranks to a second choice ("2nd: see Draconic Exemplars below"), listed as `<li>`
 * items whose bold label starts with that choice: the exemplar's tradition (the "Arcane" item), the
 * element (the "Air" item), or the genie ("Janni"). `variantKeys` are those, in order.
 */
export function parseBloodlineGifts(html, variantKeys = []) {
    const list = section(html, "(?:Sorcerous Gifts|Granted Spells)");
    if (list === null) return { gifts: {}, missing: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] };
    const gifts = parseOrdinals(list);

    const items = [...html.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1]);
    for (const key of variantKeys) {
        const block = items.find((item) => {
            const label = item.match(/<strong>([^<]*)<\/strong>/)?.[1]?.trim().toLowerCase() ?? "";
            return key && label.startsWith(String(key).toLowerCase());
        });
        if (!block) continue;
        for (const [rank, uuid] of Object.entries(parseOrdinals(block))) gifts[rank] ??= uuid;
        break;
    }
    const missing = Object.values(ORDINALS).filter((rank) => !gifts[rank]);
    return { gifts, missing };
}

/**
 * An oracle's mystery or a psychic's conscious mind: "Granted Spells" by rank, `{ rank: uuid }`.
 * Mystery: "At 1st level, you gain a cantrip and a 1st-rank spell. You learn the other spells on the
 * list as soon as you gain the ability to cast oracle spells of that rank." Conscious mind: "At 1st
 * level, you gain a 1st-rank spell, and you learn the other spells on the list as soon as you gain
 * the ability to cast psychic spells of that rank." Both "in addition to" the class's own picks.
 */
export function parseGrantedSpells(html) {
    return parseOrdinals(section(html, "Granted Spells") ?? "");
}

/**
 * A conscious mind's psi cantrips with the level each arrives at, `[{ level, uuid }]`.
 *
 * Conscious Mind: the two standard psi cantrips "you automatically gain at 1st level", and "You
 * automatically gain the surface psi cantrip at 1st level, automatically gain the deeper psi
 * cantrip at 6th level, and automatically gain the deepest psi cantrip at 10th level." The unique
 * ones are labelled "surface:", "deeper:", "deepest:" in each conscious mind; the amps between
 * them link actions and conditions, not spells.
 */
const PSI_LEVELS = { surface: 1, deeper: 6, deepest: 10 };
export function parsePsiCantrips(html) {
    const start = html.search(/<strong>\s*Standard Psi Cantrips\s*<\/strong>/);
    if (start < 0) return [];
    const unique = html.search(/<strong>\s*Unique Psi Cantrips\s*<\/strong>/);
    const found = spellLinks(html.slice(start, unique < 0 ? undefined : unique)).map((uuid) => ({ level: 1, uuid }));
    if (unique >= 0) {
        for (const m of html.slice(unique).matchAll(/(surface|deeper|deepest)\s*:\s*@UUID\[([^\]]+)\]/g)) found.push({ level: PSI_LEVELS[m[1]], uuid: m[2] });
    }
    return found;
}

/** A bard muse's "Muse Spell". */
export function parseMuseSpell(html) {
    return spellLinks(section(html, "Muse Spell"))[0] ?? null;
}

/**
 * Magus studious spells by the character level they arrive at, `[{ level, uuid }]`.
 *
 * The Studious Spells feature: "Your studious spells are Gecko Grip and an additional spell
 * depending on your hybrid study" at 7th, then "At 11th level, add Haste ... At 13th level, add
 * Fly". A hybrid study lists its own as "Studious Spells 7th: ...; 11th: ...; 13th: ...", where the
 * ordinals are levels.
 */
export function parseStudiousSpells(featureHtml, studyHtml) {
    const found = [];
    const first = (featureHtml ?? "").search(/At \d+th level/);
    for (const uuid of spellLinks(first < 0 ? featureHtml : featureHtml.slice(0, first))) found.push({ level: 7, uuid });
    for (const m of (featureHtml ?? "").matchAll(/At (\d+)th level, add @UUID\[([^\]]+)\]/g)) found.push({ level: Number(m[1]), uuid: m[2] });
    for (const m of (section(studyHtml ?? "", "Studious Spells") ?? "").matchAll(/(\d+)th\s*:\s*@UUID\[([^\]]+)\]/g)) found.push({ level: Number(m[1]), uuid: m[2] });
    return found;
}

/** The bloodline's second choice, as the keys `parseBloodlineGifts` matches labels against. */
function variantKeysOf(item) {
    const selections = item.flags?.system?.rulesSelections ?? {};
    const keys = [];
    for (const value of Object.values(selections)) {
        if (value && typeof value === "object") keys.push(value.slug, value.tradition);
        else if (typeof value === "string") keys.push(value);
    }
    return keys.filter(Boolean);
}

/** What one managed entry should be granted now, as `[{ uuid, rank, source, onTop }]`. */
function wantedGrants(actor, want) {
    const open = (rank) => (rank === 0 ? true : (want.expected[`slot${rank}`] ?? 0) > 0);
    const grants = [];
    if (want.classSlug === "sorcerer" && want.pool === "sorcerer") {
        const bloodline = actor.itemTypes.feat.find((f) => f.system.traits?.otherTags?.includes("sorcerer-bloodline"));
        if (bloodline) {
            const { gifts, missing } = parseBloodlineGifts(bloodline.system.description.value ?? "", variantKeysOf(bloodline));
            for (const [rank, uuid] of Object.entries(gifts)) if (open(Number(rank))) grants.push({ uuid, rank: Number(rank), source: bloodline.slug, onTop: false });
            const due = missing.filter(open);
            if (due.length) console.warn(`${MODULE_ID} | ${bloodline.name}: no sorcerous gift found for rank(s) ${due.join(", ")}`);
        }
    }
    if (want.classSlug === "cleric" && want.pool === "cleric") {
        const deity = actor.itemTypes.deity?.[0];
        for (const [rank, uuid] of Object.entries(deity?.system?.spells ?? {})) {
            if (typeof uuid === "string" && open(Number(rank))) grants.push({ uuid, rank: Number(rank), source: deity.slug ?? "deity", onTop: false });
        }
    }
    if (want.pool !== want.classSlug) return grants;

    const tagged = (tag) => actor.itemTypes.feat.find((f) => f.system.traits?.otherTags?.includes(tag));
    // Oracle, psychic and bard grants are "in addition to" the class's own picks: on top of the table.
    const choice = want.classSlug === "oracle" ? tagged("oracle-mystery") : want.classSlug === "psychic" ? tagged("psychic-conscious-mind") : null;
    if (choice) {
        const html = choice.system.description.value ?? "";
        for (const [rank, uuid] of Object.entries(parseGrantedSpells(html))) if (open(Number(rank))) grants.push({ uuid, rank: Number(rank), source: choice.slug, onTop: true });
        if (want.classSlug === "psychic") {
            for (const { level, uuid } of parsePsiCantrips(html)) {
                if (actor.level >= level) grants.push({ uuid, rank: 0, source: choice.slug, onTop: true, cantripOnly: true });
            }
        }
    }
    if (want.classSlug === "bard") {
        const muse = tagged("bard-muse");
        const uuid = muse ? parseMuseSpell(muse.system.description.value ?? "") : null;
        if (uuid) grants.push({ uuid, rank: 1, source: muse.slug, onTop: true });
    }
    if (want.classSlug === "magus") {
        const feature = actor.itemTypes.feat.find((f) => f.slug === "studious-spells");
        const study = tagged("magus-hybrid-study");
        if (feature) {
            for (const { level, uuid } of parseStudiousSpells(feature.system.description.value, study?.system.description.value)) {
                // "Add any studious spell you gain to your spellbook if you don't know it already." The rank is the spell's own.
                if (actor.level >= level) grants.push({ uuid, rank: null, source: "studious-spells", onTop: false, ifUnknown: true });
            }
        }
    }
    return grants;
}

/**
 * Add every due grant the entry has not had yet.
 *
 * @returns {Promise<string[]>} the names of the spells added
 */
export async function grantSpells(actor, entry, want) {
    const done = new Set(entry.flags?.[MODULE_ID]?.casting?.grantedDone ?? []);
    const creates = [];
    const added = [];
    for (const wanted of wantedGrants(actor, want)) {
        if (done.has(`${wanted.uuid}@${wanted.rank}`)) continue;
        const spell = await fromUuid(wanted.uuid);
        if (!spell || spell.type !== "spell") {
            console.warn(`${MODULE_ID} | granted spell ${wanted.uuid} did not resolve to a spell`);
            continue;
        }
        if (wanted.cantripOnly && !spell.isCantrip) continue;
        // A studious spell has no rank of its own in the list: it goes in at the spell's.
        const grant = { ...wanted, rank: wanted.rank ?? (spell.isCantrip ? 0 : spell.baseRank) };
        const key = `${grant.uuid}@${grant.rank}`;
        if (done.has(key)) continue;
        // Already in the entry from the same source (taken by hand, or "if you don't know it already"):
        // nothing to add, and nothing to add later either.
        const source = (s) => s._stats?.compendiumSource ?? s.sourceId;
        const known = entry.spells?.some((s) => source(s) === grant.uuid && (wanted.ifUnknown || s.isCantrip || s.rank === grant.rank));
        if (known) {
            done.add(key);
            continue;
        }
        const data = spell.toObject();
        delete data._id;
        data.sort = 0;
        // As PF2e's addSpell places a spell in an entry (pf2e.mjs:33646): located here, and for a
        // spontaneous entry known at the rank it was granted for when that is above its own.
        const heighten = want.type === "spontaneous" && !spell.isCantrip && grant.rank > spell.baseRank;
        data.system.location = { value: entry.id, ...(heighten ? { heightenedLevel: grant.rank } : {}) };
        foundry.utils.setProperty(data, `flags.${MODULE_ID}.granted`, { source: grant.source, uuid: grant.uuid, rank: grant.rank, onTop: grant.onTop });
        foundry.utils.setProperty(data, "_stats.compendiumSource", grant.uuid);
        creates.push(data);
        done.add(key);
        added.push(spell.name);
    }
    const before = entry.flags?.[MODULE_ID]?.casting?.grantedDone ?? [];
    if (creates.length) await actor.createEmbeddedDocuments("Item", creates);
    if (done.size !== before.length) await entry.update({ [`flags.${MODULE_ID}.casting.grantedDone`]: [...done] });
    return added;
}
