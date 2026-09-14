/**
 * Build the distributable zip for a release.
 *
 * Foundry wants a zip whose single top-level folder is the module id, so the
 * archive holds `ascendant/...` and nothing else. Written by hand rather
 * than shelled out: Git Bash here has tar but no zip, and PowerShell's
 * Compress-Archive is a second shell to get the quoting wrong in.
 *
 * packs/ ships the compiled LevelDBs, minus LOCK, LOG and LOG.old, and never packs/_source.
 * Those are runtime state written by whichever Foundry last opened the pack;
 * shipping them hands every installer a stale lock and a log of this machine.
 *
 * Usage: node tools/package-release.mjs [outputDir]
 */
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import zlib from "node:zlib";

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const ID = "ascendant";
const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, "module.json"), "utf8")).version;

/** Top-level entries that ship. Everything else is build input or repo furniture. */
const INCLUDE = ["LICENSE", "module.json", "README.md", "CHANGELOG.md", "lang", "packs", "scripts", "styles"];
/** LevelDB runtime state, never shipped. */
const PACK_SKIP = new Set(["LOCK", "LOG", "LOG.old"]);

function walk(abs, rel, out) {
    for (const name of fs.readdirSync(abs).sort()) {
        const a = path.join(abs, name);
        const r = rel ? `${rel}/${name}` : name;
        if (fs.statSync(a).isDirectory()) walk(a, r, out);
        else if (r.startsWith("packs/_source/")) continue;
        else if (!(r.startsWith("packs/") && PACK_SKIP.has(name))) out.push({ abs: a, rel: r });
    }
}

const files = [];
for (const entry of INCLUDE) {
    const abs = path.join(ROOT, entry);
    if (!fs.existsSync(abs)) throw new Error(`missing from the module: ${entry}`);
    if (fs.statSync(abs).isDirectory()) walk(abs, entry, files);
    else files.push({ abs, rel: entry });
}

// Minimal ZIP writer: deflate each entry, then a central directory.
const CRC = (() => {
    const t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c;
    }
    return (buf) => {
        let c = -1;
        for (const b of buf) c = t[(c ^ b) & 0xff] ^ (c >>> 8);
        return (c ^ -1) >>> 0;
    };
})();

const local = [];
const central = [];
let offset = 0;

for (const f of files) {
    const name = Buffer.from(`${ID}/${f.rel}`, "utf8");
    const raw = fs.readFileSync(f.abs);
    const deflated = zlib.deflateRawSync(raw, { level: 9 });
    const useDeflate = deflated.length < raw.length;
    const data = useDeflate ? deflated : raw;
    const method = useDeflate ? 8 : 0;
    const crc = CRC(raw);

    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0x0800, 6); // UTF-8 names
    lh.writeUInt16LE(method, 8);
    lh.writeUInt32LE(0, 10); // dos time/date, fixed for a reproducible archive
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(data.length, 18);
    lh.writeUInt32LE(raw.length, 22);
    lh.writeUInt16LE(name.length, 26);
    local.push(lh, name, data);

    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4);
    ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0x0800, 8);
    ch.writeUInt16LE(method, 10);
    ch.writeUInt32LE(0, 12);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(data.length, 20);
    ch.writeUInt32LE(raw.length, 24);
    ch.writeUInt16LE(name.length, 28);
    ch.writeUInt32LE(offset, 42);
    central.push(ch, name);

    offset += lh.length + name.length + data.length;
}

const centralBuf = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralBuf.length, 12);
end.writeUInt32LE(offset, 16);

const outDir = process.argv[2] ? path.resolve(process.argv[2]) : ROOT;
const outPath = path.join(outDir, `${ID}-${VERSION}.zip`);
fs.writeFileSync(outPath, Buffer.concat([...local, centralBuf, end]));

const size = fs.statSync(outPath).size;
console.log(`Wrote ${path.basename(outPath)} (${files.length} files, ${(size / 1024).toFixed(0)} KB)`);
console.log(`  ${outPath}`);
