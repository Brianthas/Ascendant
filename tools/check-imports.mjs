/**
 * Resolve every local import under scripts/ and src/ and fail on a name the target file does not
 * export.
 *
 * Neither `node --check` nor eslint catches this: the first is a syntax check per file, the second
 * does not resolve modules. A wrong name is only found when the browser refuses the import, and
 * because Foundry loads the module through one entry point, one bad name silently disables the
 * whole module rather than one feature.
 *
 * Deliberately narrow: local relative imports only, named and default. It does not follow into
 * node_modules or check that a call passes the right arguments.
 *
 * Run: node tools/check-imports.mjs
 */

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");

function walk(dir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const abs = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(abs, out);
        else if (entry.name.endsWith(".mjs")) out.push(abs);
    }
    return out;
}

const files = [...walk(path.join(ROOT, "scripts")), ...walk(path.join(ROOT, "src"))];

/** Every name a file exports, whether declared inline or in an export list. */
function exportsOf(source) {
    const names = new Set();
    for (const [, name] of source.matchAll(/^export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/gm)) names.add(name);
    for (const [, name] of source.matchAll(/^export\s+class\s+([A-Za-z0-9_$]+)/gm)) names.add(name);
    for (const [, name] of source.matchAll(/^export\s+(?:const|let|var)\s+([A-Za-z0-9_$]+)/gm)) names.add(name);
    for (const [, list] of source.matchAll(/^export\s*\{([^}]+)\}/gm)) {
        for (const part of list.split(",")) {
            const name = part.trim().split(/\s+as\s+/).pop().trim();
            if (name) names.add(name);
        }
    }
    if (/^export\s+default\b/m.test(source)) names.add("default");
    return names;
}

const exported = new Map();
for (const file of files) exported.set(file, exportsOf(fs.readFileSync(file, "utf8")));

const problems = [];
let checked = 0;

for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    const rel = path.relative(ROOT, file);
    for (const [, names, target] of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*["'](\.[^"']+)["']/g)) {
        const targetFile = path.resolve(path.dirname(file), target);
        if (!exported.has(targetFile)) {
            problems.push(`${rel}: imports from "${target}", which is not a file under scripts/ or src/`);
            continue;
        }
        for (const part of names.split(",")) {
            const name = part.trim().split(/\s+as\s+/)[0].trim();
            if (!name) continue;
            checked += 1;
            if (!exported.get(targetFile).has(name)) {
                problems.push(`${rel}: imports "${name}" from ${target}, which does not export it`);
            }
        }
    }
}

console.log(`files: ${files.length}, named imports resolved: ${checked}`);

if (problems.length) {
    console.error(`\nUnresolved imports (${problems.length}):`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
}

console.log("every local import resolves.");
