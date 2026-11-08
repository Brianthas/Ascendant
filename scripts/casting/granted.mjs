/**
 * Spells a class grants by name, added to its managed entry as the entry gains each rank.
 *
 * - Sorcerer: the bloodline's sorcerous gifts. "When you gain a new rank of spells, your first new
 *   spell is always the sorcerous gift spell for that rank" (Sorcerer, Spell Repertoire), so they
 *   count inside the class table, not on top of it.
 * - Cleric: the deity's spells. "You can prepare these just like you can any spell on the divine
 *   spell list once you can prepare spells of their rank as a cleric", so they go into the
 *   cleric's spellbook when the rank opens.
 *
 * PF2e grants neither: a bloodline carries its gifts only as links in its description, and a deity
 * carries `system.spells` as `{ rank: uuid }` (read off the packs on 2026-11-07).
 *
 * Each added spell carries `flags.ascendant.granted = { source, uuid, rank, onTop }`, and the entry
 * records `flags.ascendant.casting.grantedDone`, every `uuid@rank` it has added, so a spell the
 * player deletes is not added back.
 */
import { MODULE_ID } from "../constants.mjs";

const ORDINALS = { cantrip: 0, "1st": 1, "2nd": 2, "3rd": 3, "4th": 4, "5th": 5, "6th": 6, "7th": 7, "8th": 8, "9th": 9 };
const ORDINAL_PATTERN = /(cantrip|1st|2nd|3rd|[4-9]th)\s*:\s*(@UUID\[([^\]]+)\])?/g;

/** `{ rank: uuid }` from one run of "cantrip: @UUID[...]; 1st: ..." text. A rank without a link is absent. */
function parseOrdinals(text) {
    const found = {};
    for (const match of text.matchAll(ORDINAL_PATTERN)) {
        if (match[3]) found[ORDINALS[match[1]]] = match[3];
    }
    return found;
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
    const head = html.search(/<strong>\s*(Sorcerous Gifts|Granted Spells)\s*<\/strong>/);
    if (head < 0) return { gifts: {}, missing: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] };
    const end = html.indexOf("</p>", head);
    const gifts = parseOrdinals(html.slice(head, end < 0 ? undefined : end));

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
    for (const grant of wantedGrants(actor, want)) {
        const key = `${grant.uuid}@${grant.rank}`;
        if (done.has(key)) continue;
        const spell = await fromUuid(grant.uuid);
        if (!spell || spell.type !== "spell") {
            console.warn(`${MODULE_ID} | granted spell ${grant.uuid} did not resolve to a spell`);
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
    if (!creates.length) return [];
    await actor.createEmbeddedDocuments("Item", creates);
    await entry.update({ [`flags.${MODULE_ID}.casting.grantedDone`]: [...done] });
    return added;
}
