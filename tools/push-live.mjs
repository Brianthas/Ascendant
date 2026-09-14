/**
 * Push the built packs into a running Foundry's compendiums through the client.
 *
 * Foundry holds a lock on every compendium LevelDB while it runs, so the normal
 * install cannot replace packs/ under a live instance. This writes the documents
 * in through the running page instead, which is the working dev loop.
 *
 * Always regenerates its payload from packs/_source, so it cannot push stale
 * documents. Needs Foundry started from foundry-console-tools' debug launcher.
 *
 * Usage: node tools/push-live.mjs [pack ...]   (default: every pack)
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "packs", "_source");
const BUILD = path.join(ROOT, ".build");
const CDP = path.resolve(ROOT, "..", "foundry-console-tools", "cdp-eval.mjs");
const MODULE_ID = "ascendant";

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "module.json"), "utf8"));
const wanted = process.argv.slice(2);
const packs = manifest.packs.filter((p) => wanted.length === 0 || wanted.includes(p.name));

fs.mkdirSync(BUILD, { recursive: true });

for (const pack of packs) {
    const dir = path.join(SOURCE, pack.name);
    if (!fs.existsSync(dir)) {
        console.log(`${pack.name}: no sources, skipped`);
        continue;
    }
    const docs = fs.readdirSync(dir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => {
            const doc = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
            delete doc._key;
            return doc;
        });
    if (docs.length === 0) {
        console.log(`${pack.name}: empty, skipped`);
        continue;
    }

    const script = `(async()=>{
  const DATA = ${JSON.stringify(docs)};
  const pack = game.packs.get('${MODULE_ID}.${pack.name}');
  if (!pack) return 'ERROR: compendium ${pack.name} not found';
  const cls = pack.documentClass;
  const wasLocked = pack.locked;
  if (wasLocked) await pack.configure({locked:false});
  const existing = (await pack.getIndex()).map(i=>i._id);
  if (existing.length) await cls.deleteDocuments(existing,{pack:pack.collection});
  await cls.createDocuments(DATA,{pack:pack.collection,keepId:true});
  if (wasLocked) await pack.configure({locked:true});
  const idx = await pack.getIndex();
  return '${pack.name}: pushed ' + (idx.size ?? idx.length) + ' document(s)';
})()`;

    const tmp = path.join(BUILD, `push-${pack.name}.js`);
    fs.writeFileSync(tmp, script, "utf-8");
    process.stdout.write(execFileSync("node", [CDP, "-f", tmp], { encoding: "utf-8" }));
}

// Foundry caches translations at startup, so language keys added since the last
// world load are absent from the running client even though the file on disk has
// them. Rules referencing them would show the raw key. Compare and say so.
const langKeys = (obj, prefix = "") =>
    Object.entries(obj).flatMap(([k, v]) =>
        typeof v === "object" && v !== null ? langKeys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
    );
const keys = langKeys(JSON.parse(fs.readFileSync(path.join(ROOT, "lang", "en.json"), "utf-8")));
const checkScript = `(()=>{const K=${JSON.stringify(keys)};return JSON.stringify(K.filter(k=>!game.i18n.has(k)));})()`;
const checkFile = path.join(BUILD, "lang-check.js");
fs.writeFileSync(checkFile, checkScript, "utf-8");
try {
    const missing = JSON.parse(execFileSync("node", [CDP, "-f", checkFile], { encoding: "utf-8" }).trim());
    if (missing.length) {
        console.warn(`\n  ${missing.length} language key(s) are not in the running client yet, e.g. ${missing.slice(0, 3).join(", ")}.\n  Reload Foundry (F5) or those rules will show raw keys.`);
    }
} catch {
    // The check is a convenience; never fail a push over it.
}
