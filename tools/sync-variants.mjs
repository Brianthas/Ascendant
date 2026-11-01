/**
 * Bring the variant rules in scripts/variants/ up to date with the Dual Class module they are
 * copied from.
 *
 * The copy carries Ascendant's own changes: the module id, setting keys, extra-class flags written
 * under both scopes, the Free Archetype setting, and section builders for Know-It-All. A three-way
 * merge keeps them. For each file, the change the Dual Class repo made since the commit last
 * synced (tools/variants-base.json) is applied on top of Ascendant's copy with `git merge-file`,
 * the merge `git merge` itself uses. A line both sides changed is left in the file as a conflict
 * block and the base is not advanced. Language keys under PF2EDC merge the same way, key by key;
 * a key both sides changed keeps Ascendant's value and is reported.
 *
 * Reads the Dual Class repo's committed HEAD, never its working tree. Refuses to run over
 * uncommitted changes in the files it writes, so `git checkout` undoes any run.
 *
 * Files only in Ascendant (register.mjs) are left alone. A file new upstream is copied in and
 * reported; a file deleted upstream is reported and kept.
 *
 * Usage: node tools/sync-variants.mjs [Dual Class repo, default ../PF2e-Dual-Class]
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.resolve(ROOT, process.argv[2] ?? "../PF2e-Dual-Class");
const BASE_FILE = path.join(ROOT, "tools", "variants-base.json");
const LANG = "lang/en.json";
const LANG_SCOPE = "PF2EDC";

const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const show = (rev, file) => {
  try {
    return git(SOURCE, "show", `${rev}:${file}`);
  } catch {
    return null;
  }
};

const base = JSON.parse(fs.readFileSync(BASE_FILE, "utf8")).commit;
const head = git(SOURCE, "rev-parse", "HEAD").trim();
if (head === base) {
  console.log(`Already in sync with ${head.slice(0, 7)}.`);
  process.exit(0);
}

// Upstream path -> Ascendant path. Every script but the upstream entry point, plus the stylesheet.
const pairs = git(SOURCE, "ls-tree", "--name-only", base, "scripts/")
  .split("\n")
  .concat(git(SOURCE, "ls-tree", "--name-only", head, "scripts/").split("\n"))
  .filter((f, i, all) => f.endsWith(".mjs") && f !== "scripts/module.mjs" && all.indexOf(f) === i)
  .map((f) => [f, `scripts/variants/${path.basename(f)}`]);
pairs.push(["styles/dual-class.css", "styles/dual-class.css"]);

const dirty = git(ROOT, "status", "--porcelain", "--", ...pairs.map(([, ours]) => ours), LANG).trim();
if (dirty) {
  console.error(`Uncommitted changes in files this writes; commit or discard them first:\n${dirty}`);
  process.exit(1);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sync-variants-"));
const notes = [];
let conflicts = 0;

for (const [theirsPath, oursPath] of pairs) {
  const baseText = show(base, theirsPath);
  const theirsText = show(head, theirsPath);
  const oursFile = path.join(ROOT, oursPath);
  const oursExists = fs.existsSync(oursFile);

  if (theirsText === null) {
    if (baseText !== null) notes.push(`${oursPath}: deleted upstream, kept here; review`);
    continue;
  }
  if (baseText === theirsText) continue;
  if (!oursExists) {
    fs.writeFileSync(oursFile, theirsText);
    notes.push(`${oursPath}: new upstream, copied in; check its imports and MODULE_ID use`);
    continue;
  }

  const baseTmp = path.join(tmp, "base");
  const theirsTmp = path.join(tmp, "theirs");
  fs.writeFileSync(baseTmp, baseText ?? "");
  fs.writeFileSync(theirsTmp, theirsText);
  let count = 0;
  try {
    execFileSync("git", ["merge-file", "-L", "ascendant", "-L", "base", "-L", "dual-class", oursFile, baseTmp, theirsTmp], { stdio: "pipe" });
  } catch (error) {
    // Exit status is the conflict count; anything above 127 is a failure of git itself.
    if (!(error.status > 0 && error.status < 128)) throw error;
    count = error.status;
  }
  conflicts += count;
  notes.push(`${oursPath}: merged${count ? `, ${count} conflict(s)` : ""}`);
}

// Language keys: flatten the PF2EDC subtree on each side and merge by dotted key.
const flatten = (obj, prefix = "", out = {}) => {
  for (const [k, v] of Object.entries(obj ?? {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") flatten(v, key, out);
    else out[key] = v;
  }
  return out;
};
const setKey = (obj, key, value) => {
  const parts = key.split(".");
  let node = obj;
  for (const part of parts.slice(0, -1)) node = node[part] ??= {};
  node[parts.at(-1)] = value;
};

const langFile = path.join(ROOT, LANG);
const langText = fs.readFileSync(langFile, "utf8");
const lang = JSON.parse(langText);
if (JSON.stringify(lang, null, 4) + "\n" !== langText) throw new Error(`${LANG} is not in 4-space JSON form; rewriting it would reformat it`);
const langBase = flatten(JSON.parse(show(base, LANG) ?? "{}")[LANG_SCOPE]);
const langTheirs = flatten(JSON.parse(show(head, LANG) ?? "{}")[LANG_SCOPE]);
const langOurs = flatten(lang[LANG_SCOPE]);
let langChanged = 0;
for (const [key, value] of Object.entries(langTheirs)) {
  if (langBase[key] === value) continue;
  if (!(key in langOurs) && key in langBase) {
    notes.push(`${LANG}: ${LANG_SCOPE}.${key} changed upstream but removed here; skipped`);
  } else if (!(key in langOurs) || langOurs[key] === langBase[key]) {
    setKey(lang[LANG_SCOPE], key, value);
    langChanged++;
  } else if (langOurs[key] !== value) {
    notes.push(`${LANG}: ${LANG_SCOPE}.${key} changed on both sides; kept Ascendant's "${langOurs[key]}", upstream has "${value}"`);
  }
}
for (const key of Object.keys(langBase)) {
  if (!(key in langTheirs) && key in langOurs) notes.push(`${LANG}: ${LANG_SCOPE}.${key} removed upstream, kept here; review`);
}
if (langChanged) {
  fs.writeFileSync(langFile, JSON.stringify(lang, null, 4) + "\n");
  notes.push(`${LANG}: ${langChanged} key(s) added or updated`);
}

fs.rmSync(tmp, { recursive: true, force: true });

console.log(`Dual Class ${base.slice(0, 7)} -> ${head.slice(0, 7)}`);
for (const note of notes) console.log(`  ${note}`);
if (conflicts) {
  console.error(`${conflicts} conflict(s) left in place. Resolve them, then set tools/variants-base.json to ${head}.`);
  process.exit(1);
}
fs.writeFileSync(BASE_FILE, JSON.stringify({ commit: head }, null, 4) + "\n");
console.log(`Base advanced to ${head.slice(0, 7)}. Run npm run check and npm test.`);
