/**
 * Compile the sources into the module's compendium packs, then optionally
 * mirror the whole module into the live Foundry data directory.
 *
 * Sources are .mjs modules under src/, one per talent, so the clauses the rules
 * repeat (the proficiency ladder, the spell damage riders, level ladders) are
 * written once in src/lib and imported. Each source directory feeds one pack:
 *
 *   src/core     -> packs/ascendant-core      (Item)
 *   src/apex     -> packs/ascendant-apex      (Item)
 *   src/paragon  -> packs/ascendant-paragon   (Item)
 *   src/adept    -> packs/ascendant-adept     (Item)
 *   src/party    -> packs/ascendant-party     (Item)
 *   src/bonded   -> packs/ascendant-bonded    (Actor)
 *   src/journals -> packs/ascendant-journals  (JournalEntry, built from the rules markdown)
 *
 * Every document is first written to packs/_source/<pack>/<slug>.json, which is
 * the committed form and the compile input, then compiled to LevelDB.
 *
 * Usage:
 *   node tools/build-packs.mjs            build every pack
 *   node tools/build-packs.mjs --install  build, then copy the module to the live Foundry data dir
 */
import { compilePack } from "@foundryvtt/foundryvtt-cli";
import { ClassicLevel } from "classic-level";
import fs from "node:fs/promises";
import path from "node:path";
import url from "node:url";

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const SOURCE = path.join(ROOT, "packs", "_source");
const PACKS = path.join(ROOT, "packs");

/** Foundry's own icon library, for validating image paths. */
const FOUNDRY_PUBLIC = "C:/Program Files/Foundry Virtual Tabletop/resources/app/public";

const LIVE = path.join(process.env.LOCALAPPDATA ?? "", "FoundryVTT", "Data", "modules", "ascendant");

/** Everything that belongs in an installed copy of the module. */
const INSTALL = ["module.json", "scripts", "styles", "lang", "packs", "LICENSE", "README.md", "CHANGELOG.md"];

/** Source directory -> pack, with the LevelDB collection its keys use. */
const PACK_OF = {
    core: { pack: "ascendant-core", collection: "items" },
    apex: { pack: "ascendant-apex", collection: "items" },
    paragon: { pack: "ascendant-paragon", collection: "items" },
    adept: { pack: "ascendant-adept", collection: "items" },
    party: { pack: "ascendant-party", collection: "items" },
    bonded: { pack: "ascendant-bonded", collection: "actors" },
    journals: { pack: "ascendant-journals", collection: "journal" },
};

/**
 * Embedded collections the CLI packs under their own keys.
 *
 * `compilePack` walks its HIERARCHY table (package.mjs:153) and writes every
 * embedded document as `!<collection>.<embedded>!<parentId>.<childId>`, and it
 * reads that key off the child itself: a page or item without one throws "Key
 * cannot be null or undefined". So the keys are stamped here, on the parent and
 * on each child, before the document is staged.
 */
const EMBEDDED = { actors: ["items", "effects"], items: ["effects"], journal: ["pages", "categories"] };

function keyed(doc, collection) {
    const out = { ...doc, _key: `!${collection}!${doc._id}` };
    for (const embedded of EMBEDDED[collection] ?? []) {
        if (!Array.isArray(doc[embedded])) continue;
        out[embedded] = doc[embedded].map((child) => ({
            ...child,
            _key: `!${collection}.${embedded}!${doc._id}.${child._id}`,
        }));
    }
    return out;
}

/** A document's file name in packs/_source: the slug where there is one, else the name. */
function fileNameOf(doc) {
    const base = doc.system?.slug ?? doc.name;
    return `${String(base).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.json`;
}

/** Import every source module and group its documents by pack. */
async function collect() {
    const byPack = new Map(Object.values(PACK_OF).map((p) => [p.pack, { ...p, docs: [] }]));
    const seenIds = new Map();
    const seenSlugs = new Map();

    for (const [dir, target] of Object.entries(PACK_OF)) {
        const abs = path.join(SRC, dir);
        let files;
        try {
            files = (await fs.readdir(abs)).filter((f) => f.endsWith(".mjs")).sort();
        } catch {
            continue;
        }
        for (const file of files) {
            const mod = await import(url.pathToFileURL(path.join(abs, file)).href);
            const exported = dir === "journals"
                ? mod.buildJournals()
                : Array.isArray(mod.default) ? mod.default : [mod.default];
            for (const doc of exported.filter(Boolean)) {
                const where = `${dir}/${file}`;
                // A duplicate id silently overwrites a document in the pack, and a
                // duplicate slug breaks PF2e's "times taken" counting. Fail loudly.
                if (seenIds.has(doc._id)) throw new Error(`Duplicate _id ${doc._id}: ${where} and ${seenIds.get(doc._id)}`);
                const slug = doc.system?.slug;
                if (slug && seenSlugs.has(slug)) throw new Error(`Duplicate slug "${slug}": ${where} and ${seenSlugs.get(slug)}`);
                seenIds.set(doc._id, where);
                if (slug) seenSlugs.set(slug, where);
                byPack.get(target.pack).docs.push(doc);
            }
        }
    }
    return [...byPack.values()];
}

/** Primary documents in a built pack: keys of the form !collection!id, no embedded ones. */
async function readPack(dir) {
    // Never create: a read of a pack that is not there must fail, not make an empty one.
    const db = new ClassicLevel(dir, { keyEncoding: "utf8", valueEncoding: "json", createIfMissing: false });
    // Opening a database compiled a moment earlier failed once on 2026-09-14 with "Database
    // failed to open" and passed on the next run, so the open is retried, and says so.
    for (let attempt = 1; ; attempt++) {
        try {
            await db.open();
            break;
        } catch (error) {
            if (attempt >= 3) throw error;
            console.warn(`  ${path.basename(dir)}: open failed (${error.message}), retrying`);
            await new Promise((resolve) => setTimeout(resolve, 300));
        }
    }
    try {
        const docs = [];
        for await (const [key, value] of db.iterator()) {
            const [, collection] = key.split("!");
            if (!collection.includes(".")) docs.push(value);
        }
        return docs;
    } finally {
        await db.close();
    }
}

async function copyDir(from, to) {
    await fs.cp(from, to, { recursive: true, force: true });
}

/** Windows reports a locked file as either of these, depending on the call. */
const isLocked = (error) => error.code === "EBUSY" || error.code === "EPERM";

/**
 * Replace a directory in the live module, or leave it exactly as it was.
 *
 * Removing the destination and copying over it is destructive when the
 * destination is locked: `fs.rm` deletes the files Foundry is not holding open
 * and throws on the one it is, and the compendium is gutted. So the destination
 * is moved aside first. Renaming a directory holding an open handle fails on
 * Windows before touching anything, and every failure path puts the original
 * back.
 */
async function replaceDir(from, to) {
    const parked = `${to}.replacing-${process.pid}`;
    await fs.rm(parked, { recursive: true, force: true });

    let moved = false;
    try {
        await fs.rename(to, parked);
        moved = true;
    } catch (error) {
        if (error.code !== "ENOENT") throw error;
    }

    try {
        await copyDir(from, to);
    } catch (error) {
        if (moved) {
            await fs.rm(to, { recursive: true, force: true });
            await fs.rename(parked, to);
        }
        throw error;
    }

    if (moved) await fs.rm(parked, { recursive: true, force: true });
}

/** Every `img` on a document and on its embedded items, for the icon check. */
function imagesOf(doc) {
    const out = [];
    if (doc.img) out.push(doc.img);
    if (doc.prototypeToken?.texture?.src) out.push(doc.prototypeToken.texture.src);
    for (const item of doc.items ?? []) if (item.img) out.push(item.img);
    return out;
}

async function main() {
    const packs = await collect();
    const total = packs.reduce((n, p) => n + p.docs.length, 0);
    if (total === 0) throw new Error("No documents found under src/. Refusing to write empty packs.");

    for (const { pack, collection, docs } of packs) {
        const stage = path.join(SOURCE, pack);
        const out = path.join(PACKS, pack);

        // Rewrite the source dir wholesale so a deleted document does not linger.
        await fs.rm(stage, { recursive: true, force: true });
        await fs.mkdir(stage, { recursive: true });
        const names = new Set();
        for (const doc of docs) {
            const name = fileNameOf(doc);
            if (names.has(name)) throw new Error(`${pack}: two documents would be written as ${name}`);
            names.add(name);
            // `_key` is mandatory. compilePack skips any source document without
            // one, with no error and no log, and produces a valid empty pack.
            await fs.writeFile(path.join(stage, name), JSON.stringify(keyed(doc, collection), null, 2) + "\n", "utf-8");
        }

        await fs.rm(out, { recursive: true, force: true });
        if (docs.length === 0) {
            console.log(`${pack}: no documents, pack not built`);
            continue;
        }
        await compilePack(stage, out, { log: false, recursive: false });

        // Read the pack back rather than reporting the count just computed.
        // compilePack reports success whether or not it wrote anything.
        const packed = await readPack(out);
        if (packed.length !== docs.length) {
            throw new Error(`${pack}: staged ${docs.length} document(s) but the pack holds ${packed.length}. Left in place for inspection.`);
        }

        // A bad icon path is a 404 the player sees as a blank image and nothing
        // else reports, so check every one against Foundry's shipped icons.
        const missing = [];
        for (const doc of packed) {
            for (const img of imagesOf(doc)) {
                if (!img.startsWith("icons/") && !img.startsWith("systems/")) continue;
                const onDisk = img.startsWith("icons/")
                    ? path.join(FOUNDRY_PUBLIC, img)
                    : path.join(process.env.LOCALAPPDATA ?? "", "FoundryVTT", "Data", img);
                try {
                    await fs.access(onDisk);
                } catch {
                    missing.push(`${doc.name}: ${img}`);
                }
            }
        }
        if (missing.length) throw new Error(`${pack}: image path(s) do not exist: ${missing.join("; ")}`);

        console.log(`${pack}: built and verified ${packed.length} document(s)`);
        for (const doc of packed.sort((a, b) => String(a.name).localeCompare(String(b.name)))) {
            const kind = doc.system?.category ?? doc.type ?? "";
            console.log(`  ${String(kind).padEnd(18)} ${doc.name}`);
        }
    }

    if (process.argv.includes("--install")) {
        if (!process.env.LOCALAPPDATA) throw new Error("LOCALAPPDATA not set; cannot locate Foundry data.");
        await fs.mkdir(LIVE, { recursive: true });
        const skipped = [];
        for (const entry of INSTALL) {
            const from = path.join(ROOT, entry);
            try {
                await fs.access(from);
            } catch {
                continue;
            }
            const to = path.join(LIVE, entry);
            try {
                if ((await fs.stat(from)).isDirectory()) await replaceDir(from, to);
                else await fs.copyFile(from, to);
            } catch (error) {
                // Foundry holds an open handle on every compendium LevelDB while
                // it runs, so packs/ cannot be replaced under a live instance.
                if (isLocked(error)) {
                    skipped.push(entry);
                    continue;
                }
                throw error;
            }
        }
        // The committed sources ship nothing to Foundry; keep the live copy lean.
        await fs.rm(path.join(LIVE, "packs", "_source"), { recursive: true, force: true });

        if (skipped.length) {
            // Loud on purpose. A silently skipped pack looks exactly like a clean
            // install until the next restart reads an old pack off disk.
            console.warn("");
            console.warn(`  NOT INSTALLED: ${skipped.join(", ")}`);
            console.warn("  A running Foundry holds these open. The previous copy is");
            console.warn("  still in place, untouched. Close Foundry and rerun, or use");
            console.warn("  `npm run push` to write the items in through the client.");
            console.warn("");
        }
        console.log(`Installed to ${LIVE}`);
    }
}

main().catch((error) => {
    console.error(error.stack ?? error.message);
    process.exitCode = 1;
});
