/**
 * Look up documents in the installed PF2e system's packs by name, printing the uuid.
 *
 * The compendium ids a GrantItem or Aura needs are read off the packs on disk
 * rather than remembered. Needs Foundry closed, since it holds the LevelDBs.
 *
 * Usage: node tools/find-uuid.mjs <pack> <name> [<name> ...]
 *   e.g. node tools/find-uuid.mjs conditionitems "Off-Guard" Invisible Quickened
 *        node tools/find-uuid.mjs feats-srd "Alchemical Crafting"
 * Pass "*" as the name to list every document in the pack.
 */
import { ClassicLevel } from "classic-level";
import fs from "node:fs";
import path from "node:path";

const showRules = process.argv.includes("--rules");
const showJson = process.argv.includes("--json");
const [pack, ...names] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!pack || names.length === 0) {
    console.error("usage: node tools/find-uuid.mjs <pack> <name> [<name> ...]");
    process.exit(2);
}

// The compendium id in a uuid (`conditionitems`, `feats-srd`) is not the directory
// name on disk (`conditions`, `feats`); system.json maps one to the other. Opening the
// id as a path with LevelDB's default `createIfMissing` created four empty databases
// inside the system's packs folder on 2026-09-13, so the path is read from the
// manifest and creation is refused.
const SYSTEM = path.join(process.env.LOCALAPPDATA ?? "", "FoundryVTT", "Data", "systems", "pf2e");
const manifest = JSON.parse(fs.readFileSync(path.join(SYSTEM, "system.json"), "utf8"));
const entry = manifest.packs.find((p) => p.name === pack);
if (!entry) {
    console.error(`no pack named "${pack}" in system.json. Names: ${manifest.packs.map((p) => p.name).join(", ")}`);
    process.exit(2);
}
const dir = path.join(SYSTEM, entry.path);
const db = new ClassicLevel(dir, { keyEncoding: "utf8", valueEncoding: "json", createIfMissing: false });
await db.open();
try {
    const wanted = new Set(names.map((n) => n.toLowerCase()));
    const all = names.includes("*");
    for await (const [key, doc] of db.iterator()) {
        const [, collection] = key.split("!");
        if (collection.includes(".")) continue;
        if (all || wanted.has(String(doc.name).toLowerCase())) {
            const type = collection === "items" ? "Item" : collection === "actors" ? "Actor" : collection;
            console.log(`${String(doc.name).padEnd(36)} ${doc.type ?? ""}`.padEnd(48) + ` Compendium.pf2e.${pack}.${type}.${doc._id}`);
            // --rules: print the document's rule elements, to copy PF2e's own construction of a mechanic.
            if (showRules) console.log(JSON.stringify(doc.system?.rules ?? [], null, 2));
            // --json: print the whole document, to model a new one of the same type on it.
            if (showJson) console.log(JSON.stringify(doc, null, 2));
        }
    }
} finally {
    await db.close();
}
