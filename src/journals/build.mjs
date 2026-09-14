import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { marked } from "marked";
import { idFor, PUBLICATION } from "../lib/item.mjs";

/**
 * The rules text as journal entries, built from `ascendant-mythic-rebuilt.md`.
 *
 * The markdown file is the single source. Every `# Heading` becomes one
 * JournalEntry and every `## Heading` under it one page, so the four talent
 * chapters read one talent per page and the front matter reads one section per
 * page. Nothing here edits the text: the build regenerates the pack from the
 * file as it stands.
 */
const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..", "..");
const SOURCE = path.join(ROOT, "ascendant-mythic-rebuilt.md");

const slugify = (text) =>
    text
        .toLowerCase()
        .replace(/['’]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

/** Split the markdown into `# chapters`, each holding `## pages`. */
function chapters(markdown) {
    const lines = markdown.split(/\r?\n/);
    const out = [];
    let chapter = null;
    let page = null;
    let fence = false;

    for (const line of lines) {
        if (line.startsWith("```")) fence = !fence;
        if (!fence && /^# /.test(line)) {
            chapter = { title: line.slice(2).trim(), pages: [] };
            page = { title: chapter.title, lines: [] };
            chapter.pages.push(page);
            out.push(chapter);
            continue;
        }
        if (!fence && /^## /.test(line) && chapter) {
            page = { title: line.slice(3).trim(), lines: [] };
            chapter.pages.push(page);
            continue;
        }
        if (page) page.lines.push(line);
    }
    return out;
}

/** A chapter's first page holds only the text before its first `##`; drop it when that is nothing. */
const hasText = (page) => page.lines.some((l) => l.trim() && l.trim() !== "---");

export function buildJournals() {
    const markdown = fs.readFileSync(SOURCE, "utf8");
    return chapters(markdown).map((chapter, chapterIndex) => {
        const slug = `journal-${slugify(chapter.title)}`;
        const pages = chapter.pages
            .filter((page, i) => i > 0 || hasText(page))
            .map((page, i) => ({
                _id: idFor(`${slug}-${slugify(page.title)}`),
                name: page.title,
                type: "text",
                title: { show: i > 0, level: 1 },
                text: { content: marked.parse(page.lines.join("\n")), format: 1, markdown: "" },
                src: null,
                image: {},
                video: { controls: true, volume: 0.5 },
                system: {},
                category: null,
                sort: i * 100000,
                ownership: { default: -1 },
                flags: {},
                _stats: { systemId: "pf2e" },
            }));
        return {
            _id: idFor(slug),
            name: chapter.title,
            pages,
            folder: null,
            sort: chapterIndex * 100000,
            categories: [],
            ownership: { default: 0 },
            flags: { ascendant: { publication: PUBLICATION.title } },
            _stats: { systemId: "pf2e" },
        };
    });
}
