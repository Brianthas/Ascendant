/**
 * Build `scripts/casting/slot-tables.mjs` from the Spells per Day tables on Archives of Nethys.
 *
 * PF2e stores no slot table anywhere: its classes carry `system.spellcasting` as a proficiency rank
 * only, and every "Spellcasting" class feature is description text. So the numbers come from the
 * published table, parsed here and never typed by hand.
 *
 * Each class page carries one `<table class="inner spells-per-day">`: a header row (Your Level,
 * Cantrips, 1st ... 10th), then one row per level 1 to 20. Cell forms seen on 2026-11-07:
 *   "4"     a count
 *   dash    none (the page writes `&mdash;`)
 *   "2*"    a count with a footnote marker (Cleric's font, a 10th-rank capstone slot, Psychic's
 *           amp cantrips); the marker never changes the count
 *   "2+1"   two pools, Animist's own slots then its apparition slots, which never mix
 * Magus and Summoner have no 10th column; it reads as 0.
 *
 * Anything else fails the run, as do a missing table, a row count other than 20, or levels out of
 * order. A layout change on the site stops the build instead of writing a wrong table.
 *
 * Usage: node tools/fetch-casting-tables.mjs [--from <dir>]
 *   --from reads saved pages named c<id>.html instead of fetching.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "scripts", "casting", "slot-tables.mjs");
const BASE = "https://2e.aonprd.com/Classes.aspx?ID=";

/** Class slug (as PF2e's class items carry it) to AoN page id, and the pool names for split cells. */
const CLASSES = {
    bard: { id: 32, pools: ["bard"] },
    cleric: { id: 33, pools: ["cleric"] },
    druid: { id: 34, pools: ["druid"] },
    witch: { id: 38, pools: ["witch"] },
    wizard: { id: 39, pools: ["wizard"] },
    oracle: { id: 61, pools: ["oracle"] },
    sorcerer: { id: 62, pools: ["sorcerer"] },
    animist: { id: 64, pools: ["animist", "apparition"] },
    psychic: { id: 68, pools: ["psychic"] },
    magus: { id: 74, pools: ["magus"] },
    necromancer: { id: 75, pools: ["necromancer"] },
    summoner: { id: 77, pools: ["summoner"] },
};

const RANK_HEADERS = ["Cantrips", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"];

const fromIndex = process.argv.indexOf("--from");
const fromDir = fromIndex >= 0 ? process.argv[fromIndex + 1] : null;

async function load(id) {
    if (fromDir) return fs.readFileSync(path.join(fromDir, `c${id}.html`), "utf8");
    const response = await fetch(`${BASE}${id}`, { headers: { "User-Agent": "ascendant-table-builder" } });
    if (!response.ok) throw new Error(`AoN page ${id}: HTTP ${response.status}`);
    return response.text();
}

// Built from code points so the source holds no dash or dagger character.
const EM_DASH = String.fromCharCode(0x2014);
const DAGGER = String.fromCharCode(0x2020);

function cellText(html) {
    return html.replace(/<[^>]*>/g, "").replaceAll("&mdash;", "-").replaceAll(EM_DASH, "-").trim();
}

/** One cell to one count per pool. */
function parseCell(text, poolCount, where) {
    if (text === "-") return Array(poolCount).fill(0);
    const parts = text.replaceAll(DAGGER, "").replace(/[*\s]/g, "").split("+");
    if (parts.length !== poolCount || !parts.every((p) => /^\d+$/.test(p))) {
        throw new Error(`${where}: unexpected cell "${text}" for ${poolCount} pool(s)`);
    }
    return parts.map(Number);
}

function parseTable(html, slug, pools) {
    const start = html.indexOf('<table class="inner spells-per-day">');
    if (start < 0) throw new Error(`${slug}: no spells-per-day table`);
    if (html.indexOf('<table class="inner spells-per-day">', start + 1) >= 0) throw new Error(`${slug}: more than one spells-per-day table`);
    const table = html.slice(start, html.indexOf("</table>", start));
    const rows = [...table.matchAll(/<tr>(.*?)<\/tr>/gs)]
        .map((m) => [...m[1].matchAll(/<td>(.*?)<\/td>/gs)].map((c) => cellText(c[1])))
        .filter((cells) => cells.length > 0);

    const [header, ...body] = rows;
    const columns = header.slice(1);
    if (header[0] !== "Your Level") throw new Error(`${slug}: first header cell is "${header[0]}"`);
    columns.forEach((c, i) => {
        if (c !== RANK_HEADERS[i]) throw new Error(`${slug}: header column ${i + 1} is "${c}", expected "${RANK_HEADERS[i]}"`);
    });
    if (columns.length < 10) throw new Error(`${slug}: only ${columns.length} rank columns`);
    if (body.length !== 20) throw new Error(`${slug}: ${body.length} level rows, expected 20`);

    const result = Object.fromEntries(pools.map((p) => [p, []]));
    body.forEach((cells, index) => {
        if (cells[0] !== String(index + 1)) throw new Error(`${slug}: row ${index + 1} is labelled "${cells[0]}"`);
        if (cells.length !== header.length) throw new Error(`${slug}: level ${index + 1} has ${cells.length} cells`);
        const perPool = pools.map(() => []);
        for (let column = 0; column < 11; column++) {
            const text = cells[column + 1];
            const counts = text === undefined ? Array(pools.length).fill(0) : parseCell(text, pools.length, `${slug} level ${index + 1} ${RANK_HEADERS[column]}`);
            counts.forEach((n, p) => perPool[p].push(n));
        }
        pools.forEach((p, i) => result[p].push(perPool[i]));
    });
    return result;
}

const tables = {};
for (const [slug, { id, pools }] of Object.entries(CLASSES)) {
    const html = await load(id);
    tables[slug] = { source: `${BASE}${id}`, pools: parseTable(html, slug, pools) };
}

const lines = [
    "// Generated by tools/fetch-casting-tables.mjs from the Spells per Day tables on Archives of Nethys.",
    "// Do not edit by hand; rerun the tool.",
    "//",
    "// SLOT_TABLES[class].pools[pool][level - 1][column]: column 0 is cantrips, 1 to 10 are spell ranks.",
    "// A spontaneous class adds one repertoire spell per slot, so the same row is its repertoire size.",
    "",
    "export const SLOT_TABLES = {",
];
for (const [slug, { source, pools }] of Object.entries(tables)) {
    lines.push(`    ${slug}: {`, `        source: "${source}",`, "        pools: {");
    for (const [pool, rows] of Object.entries(pools)) {
        lines.push(`            ${pool}: [`);
        rows.forEach((row, i) => lines.push(`                [${row.join(", ")}], // ${i + 1}`));
        lines.push("            ],");
    }
    lines.push("        },", "    },");
}
lines.push("};", "");

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, lines.join("\n"));
const written = fs.readFileSync(OUT, "utf8");
const rowCount = (written.match(/\], \/\/ \d+/g) ?? []).length;
console.log(`wrote ${path.relative(ROOT, OUT)}: ${Object.keys(tables).length} classes, ${rowCount} level rows, ${written.length} bytes`);
