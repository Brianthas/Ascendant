/**
 * Static checks over the built sources, for the failure modes that are invisible
 * at runtime.
 *
 * PF2e drops a rule element that fails validation with a console warning and
 * carries on, and a predicate naming a roll option nothing ever sets simply
 * never matches. Both look exactly like "this clause is not implemented yet"
 * from the sheet, so neither surfaces without going looking.
 *
 * Usage: node tools/lint-rules.mjs   (after node tools/build-packs.mjs)
 */
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "packs", "_source");
const MODULE_ID = "ascendant";

/** Every document in every pack, with its embedded items flattened in. */
const docs = [];
for (const pack of fs.readdirSync(SOURCE)) {
    const dir = path.join(SOURCE, pack);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
        const doc = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
        docs.push({ ...doc, _pack: pack });
        for (const item of doc.items ?? []) docs.push({ ...item, _pack: pack, _parent: doc.name });
    }
}
const byId = new Map(docs.map((d) => [d._id, d]));
const findings = [];
const note = (doc, what) => findings.push(`${(doc.system?.slug ?? doc.name).padEnd(40)} ${what}`);

/** Every roll option the module can ever set. */
const defined = new Set();
for (const doc of docs) {
    for (const r of doc.system?.rules ?? []) {
        if (r.key === "RollOption" && r.option) defined.add(String(r.option).replace(/\{.*\}/, ""));
        // A ChoiceSet with a rollOption sets "<option>:<selection>".
        if (r.key === "ChoiceSet" && r.rollOption) defined.add(String(r.rollOption));
    }
}

// Options set by rules the module builds at runtime rather than shipping in a
// pack, e.g. a deactivation effect created by a script when damage lands.
const SCRIPTS = path.join(ROOT, "scripts");
for (const file of fs.readdirSync(SCRIPTS).filter((f) => f.endsWith(".mjs"))) {
    const source = fs.readFileSync(path.join(SCRIPTS, file), "utf8");
    for (const m of source.matchAll(/option:\s*(?:"([^"]+)"|`([^`]+)`)/g)) {
        if (m[1] || m[2]) defined.add(m[1] ?? m[2]);
    }
    for (const m of source.matchAll(/^export const [A-Z_]+ = "(ascendant-[^"]+)"/gm)) defined.add(m[1]);
}

/** Roll options PF2e itself provides, which must not be reported as undefined. */
const SYSTEM_PREFIXES = [
    "self:", "target:", "item:", "action:", "check:", "origin:", "parent:", "weapon:",
    "armor:", "spell:", "class:", "feat:", "feature:", "effect:", "condition:", "settings:",
    "modifier:", "bonus:", "penalty:", "damage:", "area:", "ally:", "enemy:", "in-encounter",
    "resistance:", "immunity:", "weakness:", "skill:", "proficiency:", "rank:", "trait:",
    "attribute:", "spellcasting:", "area-effect", "encounter:", "unarmed", "ranged", "melee",
];
const isSystem = (opt) => SYSTEM_PREFIXES.some((p) => opt.startsWith(p)) || !opt.startsWith("ascendant-");

function predicateOptions(pred, out = []) {
    if (typeof pred === "string") out.push(pred);
    else if (Array.isArray(pred)) for (const p of pred) predicateOptions(p, out);
    else if (pred && typeof pred === "object") for (const v of Object.values(pred)) predicateOptions(v, out);
    return out;
}

const ownUuid = new RegExp(`^Compendium\\.${MODULE_ID}\\.`);

for (const doc of docs) {
    for (const r of doc.system?.rules ?? []) {
        // 1. A predicate naming one of our own options that nothing sets.
        for (const opt of predicateOptions(r.predicate ?? [])) {
            if (typeof opt !== "string" || isSystem(opt)) continue;
            const base = opt.split(":")[0];
            if (!defined.has(opt) && !defined.has(base)) {
                note(doc, `[${r.key}] predicate needs "${opt}", which nothing in the packs sets`);
            }
        }

        // 2. reevaluateOnUpdate throws outright on an empty predicate.
        if (r.reevaluateOnUpdate && !(r.predicate ?? []).length) {
            note(doc, `[${r.key}] reevaluateOnUpdate with no predicate: this throws`);
        }

        // 3. A GrantItem pointing into our own packs at something not in them.
        if (r.key === "GrantItem" && ownUuid.test(String(r.uuid))) {
            const id = String(r.uuid).split(".").pop();
            if (!byId.has(id)) note(doc, `[GrantItem] uuid ${r.uuid} is not in any pack`);
        }

        // 4. Aura and EphemeralEffect targets must be effects. PF2e drops the whole rule otherwise.
        const targets = r.key === "Aura" ? (r.effects ?? []).map((e) => e.uuid)
            : r.key === "EphemeralEffect" ? [r.uuid] : [];
        for (const uuid of targets) {
            const id = String(uuid).split(".").pop();
            const target = byId.get(id);
            if (target && !["effect", "affliction"].includes(target.type)) {
                note(doc, `[${r.key}] transmits ${target.name} of type "${target.type}"; must be effect or affliction`);
            }
            if (!target && ownUuid.test(String(uuid))) note(doc, `[${r.key}] transmits ${uuid}, which is not in any pack`);
        }

        // 5. A level ladder with a gap: some level between 1 and 20 gets nothing.
        const value = typeof r.value === "string" ? r.value : null;
        if (value && value.startsWith("match(")) {
            const covered = new Set();
            for (const m of value.matchAll(/btwn\(@actor\.level,\s*(\d+),\s*(\d+)\)/g)) {
                for (let l = Number(m[1]); l <= Number(m[2]); l++) covered.add(l);
            }
            for (const m of value.matchAll(/gte\(@actor\.level,\s*(\d+)\)/g)) {
                for (let l = Number(m[1]); l <= 20; l++) covered.add(l);
            }
            for (const m of value.matchAll(/lte\(@actor\.level,\s*(\d+)\)/g)) {
                for (let l = 1; l <= Number(m[1]); l++) covered.add(l);
            }
            const gaps = [];
            for (let l = 1; l <= 20; l++) if (!covered.has(l)) gaps.push(l);
            const first = [...covered].sort((a, b) => a - b)[0];
            const inner = gaps.filter((l) => l > (first ?? 21));
            if (inner.length) note(doc, `[${r.key}] level ladder has no value at level(s) ${inner.join(", ")}`);
        }
    }

    // 6. A focus pool rule with the literal path PF2e's migration deletes on import.
    for (const r of doc.system?.rules ?? []) {
        if (r.key === "ActiveEffectLike" && r.path === "system.resources.focus.max") {
            note(doc, "[ActiveEffectLike] literal system.resources.focus.max is deleted by Migration889; use FOCUS_MAX_PATH");
        }
    }
}

console.log(findings.length ? findings.join("\n") : "no findings");
console.log(`\n${docs.length} document(s) checked, ${findings.length} finding(s)`);
if (findings.length) process.exitCode = 1;
