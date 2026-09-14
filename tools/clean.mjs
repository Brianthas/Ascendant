/**
 * Remove build output: the staged JSON, the compiled LevelDB packs and any extract.
 *
 * `packs/_source/` is left alone. It is the committed form of every document and
 * the build regenerates it; nothing here should be able to delete a source.
 *
 * Usage: node tools/clean.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import url from "node:url";

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const PACKS = path.join(ROOT, "packs");

for (const dir of [".build", ".extract"]) {
    await fs.rm(path.join(ROOT, dir), { recursive: true, force: true });
    console.log(`removed ${dir}/`);
}

for (const entry of await fs.readdir(PACKS, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === "_source") continue;
    await fs.rm(path.join(PACKS, entry.name), { recursive: true, force: true });
    console.log(`removed packs/${entry.name}/`);
}
