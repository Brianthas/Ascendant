import { idFor, effectItem, actionItem, uuidFor, PUBLICATION } from "../lib/item.mjs";
import { byLevel } from "../lib/rules.mjs";

/**
 * The six Bonded base forms, as NPC actors.
 *
 * Every statistic here is a placeholder: "Sync Bonded" on the owner's sheet
 * writes the owner's level, AC, saves, Perception and Hit Points over them,
 * and each Strike's attack bonus and damage modifier (scripts/bonded.mjs).
 * What the form itself contributes is its Speed, its Strike's dice and traits,
 * and the rules on its Base Form effect, which read `@actor.level` after the
 * sync has set it to the owner's.
 *
 * The actor shape is PF2e's own NPC shape, read off an npc-gallery document.
 */
const IMG = {
    elemental: "icons/magic/fire/elemental-fire-humanoid.webp",
    fiend: "icons/creatures/unholy/demon-horned-winged-laughing.webp",
    celestial: "icons/creatures/magical/humanoid-silhouette-glowing-pink.webp",
    beast: "icons/creatures/mammals/wolf-howl-moon-forest-blue.webp",
    aberration: "icons/creatures/magical/spirit-undead-horned-blue.webp",
    undead: "icons/creatures/magical/humanoid-silhouette-dashing-blue.webp",
};

const ELEMENTS = ["acid", "cold", "electricity", "fire", "sonic"];
const traitLabel = (type) => `PF2E.Trait${type.charAt(0).toUpperCase()}${type.slice(1)}`;

function strike({ name, die, type, traits = [], range = null }) {
    return {
        _id: idFor(`bonded-strike-${name.toLowerCase()}-${die}`),
        name,
        type: "melee",
        img: "systems/pf2e/icons/default-icons/melee.svg",
        system: {
            attack: { value: "" },
            attackEffects: { value: [] },
            bonus: { value: 0 },
            damageRolls: { 0: { damage: `1${die}`, damageType: type } },
            description: { value: "" },
            publication: PUBLICATION,
            range,
            rules: [],
            slug: null,
            traits: { rarity: "common", value: traits },
        },
        sort: 100000,
        flags: {},
        _stats: { systemId: "pf2e" },
    };
}

/** The action a Celestial Bonded gains at 5th. */
const celestialMend = actionItem({
    slug: "bonded-celestial-mend",
    name: "Radiant Touch",
    actionType: "action",
    actions: 1,
    traits: ["healing", "holy"],
    img: IMG.celestial,
    frequency: { value: 1, max: 1, per: "PT10M" },
    description: `<p>Once per encounter, restore Hit Points equal to your owner's level to an adjacent creature.</p><hr /><p>Apply the healing by hand; PF2e counts the use here, resetting every ten minutes.</p>`,
});

/** The Base Form effect each actor carries, holding the form's rules. */
function baseForm(slug, name, description, rules) {
    return effectItem({
        slug: `bonded-base-form-${slug}`,
        name: `Base Form: ${name}`,
        img: IMG[slug],
        showIcon: false,
        description,
        rules,
    });
}

const FORMS = [
    {
        slug: "elemental",
        name: "Bonded Elemental",
        speed: 30,
        senses: [],
        traits: ["elemental"],
        strikes: [strike({ name: "Slam", die: "d8", type: "bludgeoning" })],
        description: "<p>Strikes deal +1d6 of a chosen elemental type (acid, cold, electricity, fire, sonic). Immune to that type. At the owner's 10th level the rider becomes 2d6.</p>",
        rules: [
            // A dropdown, not a ChoiceSet: an effect embedded in an imported actor never prompts,
            // so a ChoiceSet on it stays unresolved and disables every rule on the effect (read
            // live on 2026-09-14: all eleven rules ignored). The toggle needs no answer and
            // sets `ascendant-bonded-element:<type>` from its selection.
            {
                key: "RollOption",
                domain: "all",
                option: "ascendant-bonded-element",
                label: "ASCENDANT.Bonded.ElementPrompt",
                toggleable: true,
                alwaysActive: true,
                selection: "fire",
                suboptions: ELEMENTS.map((value) => ({ value, label: traitLabel(value) })),
            },
            ...ELEMENTS.map((type) => ({
                key: "DamageDice",
                selector: "strike-damage",
                slug: "bonded-elemental-rider",
                diceNumber: byLevel([[1, 1], [10, 2]]),
                dieSize: "d6",
                damageType: type,
                predicate: [`ascendant-bonded-element:${type}`],
            })),
            ...ELEMENTS.map((type) => ({ key: "Immunity", type, predicate: [`ascendant-bonded-element:${type}`] })),
        ],
    },
    {
        slug: "fiend",
        name: "Bonded Fiend",
        speed: 25,
        senses: [{ type: "darkvision", acuity: "precise", range: null }],
        traits: ["fiend", "unholy"],
        strikes: [strike({ name: "Claws", die: "d6", type: "slashing", traits: ["agile"] })],
        description: "<p>Darkvision and the unholy trait. Resistance to fire 5, 10 at the owner's 10th. At their 5th its Strikes gain the unholy trait and deal +1d6 spirit to holy creatures.</p>",
        rules: [
            { key: "Resistance", type: "fire", value: byLevel([[1, 5], [10, 10]]) },
            {
                key: "DamageDice",
                selector: "strike-damage",
                slug: "bonded-fiend-spirit",
                diceNumber: 1,
                dieSize: "d6",
                damageType: "spirit",
                predicate: [{ gte: ["self:level", 5] }, "target:trait:holy"],
            },
            { key: "Note", selector: "strike-attack-roll", title: "Unholy Strikes", text: "ASCENDANT.Bonded.FiendStrikes", predicate: [{ gte: ["self:level", 5] }] },
        ],
    },
    {
        slug: "celestial",
        name: "Bonded Celestial",
        speed: 25,
        otherSpeeds: [{ type: "fly", value: 20 }],
        senses: [],
        traits: ["celestial", "holy"],
        strikes: [strike({ name: "Slam", die: "d8", type: "bludgeoning" })],
        description: "<p>The holy trait. At the owner's 5th, once per encounter it may restore Hit Points equal to their level to an adjacent creature as an action, and its Strikes deal +1d6 spirit to unholy creatures.</p>",
        rules: [
            {
                key: "DamageDice",
                selector: "strike-damage",
                slug: "bonded-celestial-spirit",
                diceNumber: 1,
                dieSize: "d6",
                damageType: "spirit",
                predicate: [{ gte: ["self:level", 5] }, "target:trait:unholy"],
            },
            { key: "GrantItem", uuid: uuidFor("ascendant-apex", "bonded-celestial-mend"), allowDuplicate: false, reevaluateOnUpdate: true, predicate: [{ gte: ["self:level", 5] }] },
        ],
    },
    {
        slug: "beast",
        name: "Bonded Beast",
        speed: 40,
        senses: [{ type: "scent", acuity: "imprecise", range: 60 }],
        traits: ["beast"],
        strikes: [strike({ name: "Jaws", die: "d8", type: "piercing" })],
        description: "<p>Imprecise scent 60 feet. On a hit against a creature it moved at least 20 feet toward, the target is Off-Guard until the end of its turn.</p>",
        rules: [
            { key: "Note", selector: "strike-attack-roll", title: "Pounce", text: "ASCENDANT.Bonded.BeastPounce", outcome: ["success", "criticalSuccess"] },
        ],
    },
    {
        slug: "aberration",
        name: "Bonded Aberration",
        speed: 25,
        otherSpeeds: [{ type: "climb", value: 25 }],
        senses: [],
        traits: ["aberration"],
        strikes: [strike({ name: "Tentacle", die: "d6", type: "bludgeoning", traits: ["grapple", "reach-10"] })],
        description: "<p>Climb. Tentacle Strikes have the grapple trait. At the owner's 5th, creatures it has Grabbed take mental damage equal to half their level at the start of their turn.</p>",
        rules: [
            { key: "Note", selector: "strike-attack-roll", title: "Constrict", text: "ASCENDANT.Bonded.AberrationGrab", outcome: ["success", "criticalSuccess"], predicate: [{ gte: ["self:level", 5] }] },
        ],
    },
    {
        slug: "undead",
        name: "Bonded Undead",
        speed: 25,
        senses: [],
        traits: ["undead"],
        strikes: [strike({ name: "Claws", die: "d6", type: "slashing", traits: ["agile"] })],
        description: "<p>Void healing: healed by void, harmed by vitality. Immune to disease and poison. Doesn't breathe.</p><p>Void healing follows from the undead trait, which PF2e reads for it.</p>",
        rules: [
            { key: "Immunity", type: "disease" },
            { key: "Immunity", type: "poison" },
        ],
    },
];

export function bondedActor(form) {
    const effect = baseForm(form.slug, form.name.replace("Bonded ", ""), form.description, form.rules);
    return {
        _id: idFor(`bonded-${form.slug}`),
        name: form.name,
        type: "npc",
        img: IMG[form.slug],
        system: {
            abilities: Object.fromEntries(["str", "dex", "con", "int", "wis", "cha"].map((a) => [a, { mod: 0 }])),
            attributes: {
                ac: { details: "", value: 10 },
                allSaves: { value: "" },
                hp: { details: "Shared with the owner; synced from their sheet.", max: 10, temp: 0, value: 10 },
                speed: { otherSpeeds: form.otherSpeeds ?? [], value: form.speed },
            },
            details: {
                blurb: "",
                languages: { details: "", value: [] },
                level: { value: 1 },
                privateNotes: "",
                publicNotes: `<p>A Bonded Soul companion in its ${form.name.replace("Bonded ", "")} base form. Link it to its owner with <strong>Sync Bonded</strong> on the owner's sheet: it then has the owner's level, AC, saves, Perception and Hit Points, and its Strikes use the owner's best attack modifier with their highest attribute to damage. Drag evolutions from the Apex Talents compendium onto it; the pool is 3 + the owner's level points, reallocated during daily preparations.</p>${form.description}`,
            },
            initiative: { statistic: "perception" },
            perception: { details: "", mod: 0, senses: form.senses },
            resources: {},
            saves: {
                fortitude: { saveDetail: "", value: 0 },
                reflex: { saveDetail: "", value: 0 },
                will: { saveDetail: "", value: 0 },
            },
            skills: { athletics: { base: 0 } },
            traits: { rarity: "unique", size: { value: "med" }, value: form.traits },
        },
        items: [...form.strikes, effect],
        effects: [],
        folder: null,
        sort: 0,
        ownership: { default: 0 },
        flags: {},
        _stats: { systemId: "pf2e" },
    };
}

export const forms = FORMS.map(bondedActor);

/** The Celestial's action lives in the apex Item pack, since an Actor pack holds only actors. */
export const bondedActions = [celestialMend];

export default forms;
