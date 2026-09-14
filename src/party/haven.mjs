import { talent, idFor, PUBLICATION } from "../lib/item.mjs";
import { levelChain, grantNow, flavour, levelBlock } from "../lib/grants.mjs";

const PACK = "ascendant-party";
const SLUG = "haven";
const IMG = "icons/environment/settlement/house-two-stories-small.webp";
const STORAGE = "ascendant-haven-storage";

/**
 * Party: Haven. The refuge is a place the GM runs; what Foundry can hold is
 * the storage, as a container on each member's sheet sized at 20 Bulk per
 * member by scripts/containers.mjs (no rule element reaches a container's
 * capacity). Everything else is the journal text on the item and in the
 * Rules compendium.
 */
export const havenStorage = {
    _id: idFor(STORAGE),
    name: "Haven Storage",
    type: "backpack",
    img: IMG,
    system: {
        description: {
            value: `
<p>Your room in Haven. It holds 20 Bulk per party member, and nothing inside spoils, rots or ages.</p>
<hr />
<p>Drag items onto this container on your Inventory tab to leave them in Haven. Its capacity follows the party's size on its own.</p>
`.trim(),
            gm: "",
        },
        publication: PUBLICATION,
        rules: [],
        slug: STORAGE,
        traits: { otherTags: [], value: ["extradimensional", "magical"], rarity: "unique" },
        level: { value: 1 },
        quantity: 1,
        baseItem: null,
        bulk: { value: 0, heldOrStowed: 0, capacity: 20, ignored: 999 },
        hp: { value: 0, max: 0 },
        hardness: 0,
        price: { value: {} },
        equipped: { carryType: "worn", invested: null },
        containerId: null,
        size: "med",
        material: { type: null, grade: null },
        identification: { status: "identified", unidentified: { data: {}, img: "", name: "" }, misidentified: {} },
        collapsed: false,
        stowing: true,
        usage: { value: "worn" },
        subitems: [],
    },
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags: {},
    _stats: { systemId: "pf2e" },
};

const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "Haven",
    img: IMG,
    levels: [
        { level: 5, text: levelBlock("5th Level", ["Nothing within Haven ages, spoils, or decays. Afflictions do not progress, conditions with durations do not advance, and dying creatures remain stable.", "Haven's rooms include whatever workspace a member requires, such as a forge, a laboratory, a library, or a shrine, and count as a fully equipped workshop for any downtime or crafting activity."]) },
        { level: 10, text: levelBlock("10th Level", ["Opening the door is a single action rather than a 10-minute activity.", "In Fortress mode, creatures inside cannot be scried, tracked, or located by any magic."]) },
        { level: 15, text: levelBlock("15th Level", ["Haven and its contents persist between visits and may be entered from anywhere in the world.", "A creature that died within the last day may be brought inside. After a full rest there it returns to life at 1 Hit Point, once per week."]) },
    ],
});

export const haven = talent({
    name: "Haven",
    slug: SLUG,
    category: "ascendant-party",
    img: IMG,
    description: `
${flavour("Somewhere adjacent to everywhere, a door waits that only your company can open. Behind it is warmth, quiet, a room appointed to each of your tastes, and the particular luxury of a place where nothing that wants you dead is able to follow.")}
${levelBlock("1st Level", [
    "After 10 minutes, any party member may open a door to an extradimensional refuge.<ul><li>It holds a common room, a private room for each member furnished to their comfort, and storage for 20 Bulk per member.</li></ul>",
    "Time passes normally inside.",
    "You may bring in any creature you choose, though the common room comfortably holds no more than twice the party's number.<ul><li>Private rooms are accessible only to their owners.</li></ul>",
    "When you open the door, choose a mode.<ul><li><strong>Fortress</strong> The refuge is undetectable and unenterable from outside. You cannot perceive anything outside it. Reopening the door is a 10-minute activity.</li><li><strong>Peephole</strong> A door remains visible outside, and you can see and hear through it as though standing in the doorway. Creatures outside may find it with a Perception check against DC 10 + the highest Level + key ability modifier + proficiency bonus in the party. Once found, it can be opened with a successful counteract check against that DC.</li></ul>",
])}
${levelBlock("5th Level", ["Nothing within Haven ages, spoils, or decays. Afflictions do not progress, conditions with durations do not advance, and dying creatures remain stable.", "Haven's rooms include whatever workspace a member requires, such as a forge, a laboratory, a library, or a shrine, and count as a fully equipped workshop for any downtime or crafting activity."])}
${levelBlock("10th Level", ["Opening the door is a single action rather than a 10-minute activity.", "In Fortress mode, creatures inside cannot be scried, tracked, or located by any magic."])}
${levelBlock("15th Level", ["Haven and its contents persist between visits and may be entered from anywhere in the world.", "A creature that died within the last day may be brought inside. After a full rest there it returns to life at 1 Hit Point, once per week."])}
<p><em>You always exit Haven in the space where you entered it. When the last party member leaves, Haven closes; its contents remain, but any living creature still inside is ejected into the nearest open space. If you enter during an encounter, no one in the party gains the benefits of rest until an hour has passed outside.</em></p>
<p><em>Peephole proficiency scales with party level: Trained at 1, Expert at 3, Master at 7, Legendary at 11, Mythic at 15.</em></p>
<hr />
<p><strong>In Foundry:</strong> add this talent to every member. Each gets a <em>Haven Storage</em> container on their Inventory tab, sized to 20 Bulk per party member.</p>
<p>For the table: everything else. Haven is a place the GM runs; the Rules compendium carries the full text.</p>
`.trim(),
    rules: [grantNow(PACK, STORAGE), ...grants],
});

export default [haven, havenStorage, ...subFeats];
