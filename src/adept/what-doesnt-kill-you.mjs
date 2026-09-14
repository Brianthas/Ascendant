import { talent } from "../lib/item.mjs";
import { levelChain, atLeast, flavour, levelBlock } from "../lib/grants.mjs";

const PACK = "ascendant-adept";
const SLUG = "what-doesnt-kill-you";
const IMG = "icons/magic/defensive/barrier-shield-dome-deflect-teal.webp";

/**
 * Adept: What Doesn't Kill You. The immunities and Speeds are rule elements,
 * verified live. PF2e has no immunity type
 * for drowning or suffocation and no notion of an environmental source, so
 * those clauses and the adaptation mechanic are on the item text.
 */
const speed = (selector, level) => ({
    key: "BaseSpeed",
    selector,
    value: "@actor.system.movement.speeds.land.value",
    predicate: [atLeast(level)],
});

const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "What Doesn't Kill You",
    img: IMG,
    levels: [
        {
            level: 5,
            text: levelBlock("5th Level", [
                "The first time each day you take environmental damage or gain an environmental condition, you adapt to it. For the next 24 hours you are immune to that source.<ul><li>You may be adapted to any number of sources at once.</li></ul>",
                "You gain a climb Speed and a swim Speed equal to your land Speed, and act normally underwater without penalty.",
            ]),
        },
        { level: 10, text: levelBlock("10th Level", ["You adapt instantly, before taking damage from a source for the first time.", "You gain a fly Speed equal to your land Speed."]) },
        { level: 15, text: levelBlock("15th Level", ["Adaptations you gain become permanent.", "You may travel through the void, the depths, or any environment you have previously survived indefinitely, without rest, shelter, or supplies."]) },
    ],
});

export const whatDoesntKillYou = talent({
    name: "What Doesn't Kill You",
    slug: SLUG,
    category: "ascendant-adept",
    img: IMG,
    description: `
${flavour("The first time something tries to kill you, it works about as well as it would on anyone else. The second time, your body has already taken notes, and it does not need your permission, or even your attention, to make sure that particular death never works again.")}
${levelBlock("1st Level", ["Your body is closed to the outside world. You do not need to breathe, eat, drink, or sleep, though you may still rest to regain resources.", "Immune to Drowning, Suffocation, disease, and poison."])}
${levelBlock("5th Level", ["The first time each day you take environmental damage or gain an environmental condition, you adapt to it. For the next 24 hours you are immune to that source.<ul><li>You may be adapted to any number of sources at once.</li></ul>", "You gain a climb Speed and a swim Speed equal to your land Speed, and act normally underwater without penalty."])}
${levelBlock("10th Level", ["You adapt instantly, before taking damage from a source for the first time.", "You gain a fly Speed equal to your land Speed."])}
${levelBlock("15th Level", ["Adaptations you gain become permanent.", "You may travel through the void, the depths, or any environment you have previously survived indefinitely, without rest, shelter, or supplies."])}
<p><em>You adapt to environmental types, such as extreme heat, vacuum, or crushing pressure, rather than to individual instances. You only adapt to sources that would meaningfully threaten a creature of your level.</em></p>
<hr />
<p><strong>In Foundry:</strong> immunity to disease and poison, and the climb, swim and fly Speeds, apply automatically.</p>
<p>For the table: drowning and suffocation (PF2e has no immunity type for either), acting underwater without penalty, and the adaptations. When you adapt to a source, add its damage type as a resistance or immunity effect on your sheet for the day, or permanently from 15th.</p>
`.trim(),
    rules: [
        { key: "Immunity", type: "disease" },
        { key: "Immunity", type: "poison" },
        speed("climb", 5),
        speed("swim", 5),
        speed("fly", 10),
        ...grants,
    ],
});

export default [whatDoesntKillYou, ...subFeats];
