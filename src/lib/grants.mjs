import { talent, uuidFor, GRANT_TAG } from "./item.mjs";

/**
 * The level chain every talent carries.
 *
 * Each `**Nth Level**` header in the rules is one sub-feat, named
 * `Talent (Nth)`, in the `ascendant-grant` category, granted by the base talent
 * with a level predicate and `reevaluateOnUpdate` so it arrives when the
 * character reaches that level (verified live: the grant fires on levelling
 * past the predicate, and the granted item's ChoiceSet prompts then, watched
 * through the render hooks). The sub-feat carries the printed text for its level and
 * any rule that only makes sense there, such as a ChoiceSet the player answers
 * at that level. Numeric ladders stay on the base talent as `byLevel()` formulas.
 *
 * @param {object} options
 * @param {string} options.pack
 * @param {string} options.slug Base talent slug.
 * @param {string} options.name Base talent name.
 * @param {string} options.img
 * @param {Array<{level:number, text:string, rules?:object[], extra?:object}>} options.levels
 *   `text` is the HTML for the bullet list at that level; `rules` any rule elements that live on
 *   the sub-feat; `extra` any further talent() options (e.g. flags).
 * @returns {{ subFeats: object[], grants: object[] }}
 */
export function levelChain({ pack, slug, name, img, levels }) {
    const subFeats = levels.map(({ level, text, rules = [], extra = {} }) =>
        talent({
            name: `${name} (${ordinal(level)})`,
            slug: `${slug}-${level}`,
            category: "ascendant-grant",
            otherTags: [GRANT_TAG],
            level,
            img,
            description: `<p><strong>${ordinal(level)} Level</strong></p>${text}<p>Granted automatically by ${name} at ${ordinal(level)} level.</p>`,
            rules,
            ...extra,
        }),
    );
    const grants = levels.map(({ level }) => ({
        key: "GrantItem",
        uuid: uuidFor(pack, `${slug}-${level}`),
        allowDuplicate: false,
        reevaluateOnUpdate: true,
        predicate: [{ gte: ["self:level", level] }],
    }));
    return { subFeats, grants };
}

/** A grant that arrives with the base talent and needs no level gate. */
export const grantNow = (pack, slug) => ({ key: "GrantItem", uuid: uuidFor(pack, slug), allowDuplicate: false });

/**
 * A grant bounded to a level range, so one of several alternatives is present.
 *
 * When a reevaluated grant's predicate stops matching, the granted item is
 * removed (verified live: a grant bounded to levels 5 through 9 appeared at
 * 5th and vanished at 10th), so bounding does a swap.
 */
export function grantBetween(pack, slug, from, to) {
    const predicate = [{ gte: ["self:level", from] }];
    if (to !== undefined) predicate.push({ lt: ["self:level", to] });
    return { key: "GrantItem", uuid: uuidFor(pack, slug), allowDuplicate: false, reevaluateOnUpdate: true, predicate };
}

/** "1st", "5th", "13th". */
export function ordinal(n) {
    const suffix = n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th";
    return `${n}${suffix}`;
}

/** A level-gate predicate term. */
export const atLeast = (level) => ({ gte: ["self:level", level] });
export const below = (level) => ({ lt: ["self:level", level] });

/** The rules quote block: the italic flavour line under every talent heading. */
export const flavour = (text) => `<blockquote><p><em>${text}</em></p></blockquote>`;

/** A level header plus its bullets, as the rules lay them out. */
export const levelBlock = (label, items) => `<p><strong>${label}</strong></p><ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
