/**
 * Unpack every compiled LevelDB pack into `.extract/<pack>/` as one JSON file per
 * document, for inspection.
 *
 * This is a read-only view of what Foundry will load. Sources stay in `src/`,
 * and the committed form is `packs/_source/`; nothing edits an extract back.
 *
 * Usage: node tools/extract-packs.mjs
 */
import { extractPack } from "@foundryvtt/foundryvtt-cli";
import fs from "node:fs/promises";
import path from "node:path";
import url from "node:url";

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, ".extract");

const manifest = JSON.parse(await fs.readFile(path.join(ROOT, "module.json"), "utf8"));

await fs.rm(OUT, { recursive: true, force: true });
for (const pack of manifest.packs) {
    const src = path.join(ROOT, pack.path);
    const dest = path.join(OUT, pack.name);
    try {
        await fs.access(src);
    } catch {
        console.log(`${pack.name}: not built, skipped`);
        continue;
    }
    await extractPack(src, dest, { log: false, documentType: pack.type });
    const files = (await fs.readdir(dest)).filter((f) => f.endsWith(".json"));
    console.log(`${pack.name}: ${files.length} document(s) -> .extract/${pack.name}/`);
}
