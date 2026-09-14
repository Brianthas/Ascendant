import { talent } from "../lib/item.mjs";
import { levelChain, atLeast, below, flavour, levelBlock } from "../lib/grants.mjs";

const PACK = "ascendant-adept";
const SLUG = "trail-breaker";
const IMG = "icons/skills/movement/figure-running-gray.webp";

/**
 * Adept: Trail Breaker. The Speeds are BaseSpeed rules; half land Speed at
 * 1st, full from 5th, fly from 10th. Allies borrowing your Speeds outside
 * encounters, the automatic successes against DCs of your level or lower, and
 * Hover are on the text, with a Note on Balance, Climb and Swim checks.
 */
const speed = (selector, value, predicate) => ({ key: "BaseSpeed", selector, value, predicate });
const LAND = "@actor.system.movement.speeds.land.value";

const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "Trail Breaker",
    img: IMG,
    levels: [
        { level: 5, text: levelBlock("5th Level", ["Your climb and swim Speeds equal your land Speed.", "You automatically succeed at Acrobatics checks to Balance and Athletics checks to Climb or Swim against DCs of your level or lower."]) },
        { level: 10, text: levelBlock("10th Level", ["You gain a fly Speed equal to your land Speed."]) },
        { level: 15, text: levelBlock("15th Level", ["You may Hover as a free action.", "Allies traveling with you may use your fly Speed."]) },
    ],
});

export const trailBreaker = talent({
    name: "Trail Breaker",
    slug: SLUG,
    category: "ascendant-adept",
    img: IMG,
    description: `
${flavour("You go first, and the route exists behind you. Cliffs, currents, and trackless country slow you very little, and the people following in your line find the passage rather easier than it has any right to be.")}
${levelBlock("1st Level", ["You gain a climb Speed and a swim Speed equal to half your land Speed.", "During exploration and travel, allies who remain within 30 feet of you may use your movement Speeds in place of their own."])}
${levelBlock("5th Level", ["Your climb and swim Speeds equal your land Speed.", "You automatically succeed at Acrobatics checks to Balance and Athletics checks to Climb or Swim against DCs of your level or lower."])}
${levelBlock("10th Level", ["You gain a fly Speed equal to your land Speed."])}
${levelBlock("15th Level", ["You may Hover as a free action.", "Allies traveling with you may use your fly Speed."])}
<p><em>Allies only borrow your Speeds outside of encounters. If an encounter begins while allies are using them, they retain them until the end of their first turn. An ally still airborne after that descends 60 feet per round until they land, taking no falling damage.</em></p>
<hr />
<p><strong>In Foundry:</strong> the climb, swim and fly Speeds are on your sheet at the right values for your level.</p>
<p>For the table: allies borrowing your Speeds, the automatic successes from 5th (a note on your Balance, Climb and Swim checks reminds you), and Hover.</p>
`.trim(),
    rules: [
        speed("climb", `floor(${LAND} / 2)`, [below(5)]),
        speed("swim", `floor(${LAND} / 2)`, [below(5)]),
        speed("climb", LAND, [atLeast(5)]),
        speed("swim", LAND, [atLeast(5)]),
        speed("fly", LAND, [atLeast(10)]),
        {
            key: "Note",
            selector: ["acrobatics", "athletics"],
            title: "Trail Breaker",
            text: "ASCENDANT.Note.TrailBreakerAutoSuccess",
            predicate: [atLeast(5), { or: ["action:balance", "action:climb", "action:swim"] }],
        },
        ...grants,
    ],
});

export default [trailBreaker, ...subFeats];
