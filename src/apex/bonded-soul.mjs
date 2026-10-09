import { talent, effectItem, idFor, PUBLICATION, uuidFor } from "../lib/item.mjs";
import { levelChain, flavour, levelBlock } from "../lib/grants.mjs";
import { bondedActions } from "../bonded/forms.mjs";

const PACK = "ascendant-apex";
const SLUG = "bonded-soul";
const IMG = "icons/magic/life/heart-cross-strong-flame-purple-orange.webp";

/**
 * Apex: Bonded Soul.
 *
 * The Bonded itself is an NPC actor from the Bonded Souls compendium, one per
 * base form. Linking, syncing its statistics to the owner's and the shared Hit
 * Point pool are scripts/bonded.mjs. Evolutions are items in this pack that
 * are dragged onto the Bonded: a `melee` item for each extra Strike (one per
 * base die, since the extra Strike's die matches the base Strike's), and an
 * `effect` for each other evolution, carrying its rules where PF2e has them.
 * The evolution point pool (3 + level) is stated, not enforced. Conditions
 * shared between the two, dismissing and manifesting, and the 4-point
 * evolutions' effects are on the text.
 */
const STRIKES = [
    ["bite", "Bite", "piercing", []],
    ["claws", "Claws", "slashing", ["agile"]],
    ["gore", "Gore", "piercing", ["deadly-d8"]],
    ["slam", "Slam", "bludgeoning", ["shove"]],
    ["stinger", "Stinger", "piercing", ["finesse"]],
    ["tail", "Tail", "bludgeoning", ["sweep"]],
    ["tentacle", "Tentacle", "bludgeoning", ["grapple", "reach-10"]],
];

const extraStrike = ([slug, name, type, traits], die) => ({
    _id: idFor(`bonded-evolution-strike-${slug}-${die}`),
    name: `Evolution 1: Extra Strike, ${name} (${die})`,
    type: "melee",
    img: "systems/pf2e/icons/default-icons/melee.svg",
    system: {
        attack: { value: "" },
        attackEffects: { value: [] },
        bonus: { value: 0 },
        damageRolls: { 0: { damage: `1${die}`, damageType: type } },
        description: { value: `<p>Extra Strike (1 point, maximum 2). Deals damage equal to your base Strike's die: this is the ${die} version. Re-run Sync Bonded after adding it so it takes the owner's attack modifier and damage bonus.</p>` },
        publication: PUBLICATION,
        range: null,
        rules: [],
        slug: `bonded-evolution-strike-${slug}-${die}`,
        traits: { rarity: "common", value: traits },
    },
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags: {},
    _stats: { systemId: "pf2e" },
});

const evolution = (points, slug, name, description, rules = [], extra = {}) =>
    effectItem({
        slug: `bonded-evolution-${slug}`,
        name: `Evolution ${points}: ${name}`,
        img: IMG,
        showIcon: false,
        description: `<p><strong>${points} point${points === 1 ? "" : "s"}.</strong> ${description}</p>`,
        rules,
        ...extra,
    });

const LAND = "@actor.system.attributes.speed.value";

const dreadFormEffect = effectItem({
    slug: "bonded-dread-form-frightened",
    name: "Dread Form",
    img: IMG,
    traits: ["emotion", "fear", "mental"],
    description: `<p>You are within 30 feet of a Bonded with Dread Form. At the start of each of your turns here, your Will save against its owner's class DC is rolled automatically, and on a failure you become <strong>Frightened 1</strong>.</p><p>This effect arrives and leaves with the aura. It does not need removing by hand.</p>`,
    rules: [],
});

export const evolutions = [
    ...STRIKES.flatMap((s) => ["d6", "d8"].map((die) => extraStrike(s, die))),
    evolution(1, "improved-damage", "Improved Damage", "One Strike's damage die increases one step, to a maximum of d12. Maximum 2, each on a different Strike. Edit the Strike's damage on the sheet."),
    evolution(1, "climb", "Climb", "Gain a climb Speed equal to its land Speed.", [{ key: "BaseSpeed", selector: "climb", value: LAND }]),
    evolution(1, "swim", "Swim", "Gain a swim Speed equal to its land Speed.", [{ key: "BaseSpeed", selector: "swim", value: LAND }]),
    evolution(1, "swift", "Swift", "+10 feet to all Speeds. Maximum 2: add this effect twice.", [{ key: "FlatModifier", selector: "all-speeds", slug: "bonded-swift", type: "untyped", value: 10 }]),
    evolution(1, "swift-2", "Swift (second)", "The second Swift: another +10 feet to all Speeds.", [{ key: "FlatModifier", selector: "all-speeds", slug: "bonded-swift-2", type: "untyped", value: 10 }]),
    evolution(1, "keen-senses", "Keen Senses", "Darkvision and imprecise scent to 60 feet.", [
        { key: "Sense", selector: "darkvision" },
        { key: "Sense", selector: "scent", acuity: "imprecise", range: 60 },
    ]),
    evolution(2, "limbs", "Limbs", "A pair of arms with hands. It can wield weapons and Interact with objects."),
    evolution(2, "burrow", "Burrow", "Burrow Speed equal to half its land Speed, leaving no tunnel.", [{ key: "BaseSpeed", selector: "burrow", value: `floor(${LAND} / 2)` }]),
    ...["acid", "cold", "electricity", "fire", "sonic", "force", "spirit", "void"].map((type) =>
        evolution(2, `energy-${type}`, `Energy Attacks (${type})`, `Strikes deal additional ${type} damage equal to its base Strike's damage die. This is the d6 version; use the d8 one for a d8 base Strike.`, [
            { key: "DamageDice", selector: "strike-damage", slug: `bonded-energy-${type}`, diceNumber: 1, dieSize: "d6", damageType: type },
        ]),
    ),
    ...["acid", "cold", "electricity", "fire", "sonic", "force", "spirit", "void"].map((type) =>
        evolution(2, `energy-${type}-d8`, `Energy Attacks (${type}, d8)`, `Strikes deal additional ${type} damage equal to its base Strike's damage die, for a d8 base Strike.`, [
            { key: "DamageDice", selector: "strike-damage", slug: `bonded-energy-${type}`, diceNumber: 1, dieSize: "d8", damageType: type },
        ]),
    ),
    evolution(2, "large", "Large", "Becomes Large, gaining reach 10 feet and +2 to Athletics.", [
        { key: "CreatureSize", value: "large", reach: { add: 5 } },
        { key: "FlatModifier", selector: "athletics", slug: "bonded-large", type: "untyped", value: 2 },
    ]),
    ...[1, 2, 3].map((n) => evolution(2, `ironform-${n}`, `Ironform ${"I".repeat(n)}`, `+1 to its AC. Maximum 3: add Ironform I, II and III.`, [
        { key: "FlatModifier", selector: "ac", slug: `bonded-ironform-${n}`, type: "untyped", value: 1 },
    ])),
    evolution(2, "grab", "Grab", "Choose a Strike. It gains the grapple trait, and on a hit the Bonded may attempt to Grapple as a free action. Add the grapple trait to that Strike on the sheet.", [
        { key: "Note", selector: "strike-attack-roll", title: "Grab", text: "ASCENDANT.Bonded.Grab", outcome: ["success", "criticalSuccess"] },
    ]),
    evolution(2, "knockdown", "Knockdown", "Choose a Strike. On a hit the Bonded may attempt to Trip as a free action.", [
        { key: "Note", selector: "strike-attack-roll", title: "Knockdown", text: "ASCENDANT.Bonded.Knockdown", outcome: ["success", "criticalSuccess"] },
    ]),
    evolution(3, "flight", "Flight", "Fly Speed equal to its land Speed.", [{ key: "BaseSpeed", selector: "fly", value: LAND }]),
    evolution(3, "immunity", "Immunity", "Immune to one damage type or one condition. Choose when adding this.", [
        {
            key: "ChoiceSet",
            slug: "bondedImmunity",
            rollOption: "ascendant-bonded-immunity",
            prompt: "ASCENDANT.Bonded.ImmunityPrompt",
            adjustName: true,
            choices: ["acid", "bludgeoning", "cold", "electricity", "fire", "force", "mental", "piercing", "poison", "slashing", "sonic", "spirit", "vitality", "void", "blinded", "clumzy", "confused", "dazzled", "deafened", "drained", "enfeebled", "fatigued", "frightened", "grabbed", "immobilized", "paralyzed", "prone", "sickened", "slowed", "stunned", "stupefied"]
                .filter((c) => c !== "clumzy")
                .concat(["clumsy"])
                .map((value) => ({ value, label: value.includes("-") ? value : `PF2E.Trait${value.charAt(0).toUpperCase()}${value.slice(1)}` })),
        },
        { key: "Immunity", type: "{item|flags.pf2e.rulesSelections.bondedImmunity}" },
    ]),
    evolution(3, "regeneration", "Regeneration", "Regeneration equal to half the owner's level, deactivated by the damage type matching the base form: spirit for Fiend and Celestial, vitality for Undead, void for Beast, mental for Aberration, or its chosen elemental type for Elemental. Choose the deactivating type when adding this.", [
        {
            key: "ChoiceSet",
            slug: "bondedRegen",
            rollOption: "ascendant-bonded-regen",
            prompt: "ASCENDANT.Bonded.RegenPrompt",
            adjustName: true,
            choices: ["spirit", "vitality", "void", "mental", "acid", "cold", "electricity", "fire", "sonic"].map((value) => ({ value, label: `PF2E.Trait${value.charAt(0).toUpperCase()}${value.slice(1)}` })),
        },
        ...["spirit", "vitality", "void", "mental", "acid", "cold", "electricity", "fire", "sonic"].map((type) => ({
            key: "FastHealing",
            type: "regeneration",
            value: "floor(@actor.level / 2)",
            deactivatedBy: [type],
            predicate: [`ascendant-bonded-regen:${type}`],
        })),
    ]),
    evolution(3, "dread-form", "Dread Form", "Enemies that begin their turn within 30 feet are Frightened 1 unless they succeed at a Will save against the owner's class DC.", [
        {
            key: "Aura",
            slug: "bonded-dread-form",
            radius: 30,
            traits: ["emotion", "fear", "mental"],
            // A marker for "inside the aura": PF2e applies it on entry whatever `events` says.
            // scripts/dread-form.mjs rolls the save at the start of each turn spent inside.
            effects: [{ uuid: uuidFor(PACK, "bonded-dread-form-frightened"), affects: "enemies", events: ["enter"], removeOnExit: true }],
            appearance: { border: { color: "#8b0000", alpha: 0.75 }, highlight: { color: "#8b0000", alpha: 0.2 } },
        },
    ]),
    evolution(4, "huge", "Huge", "Becomes Huge, gaining reach 15 feet and +4 to Athletics. Requires Large: add this in place of Large.", [
        { key: "CreatureSize", value: "huge", reach: { add: 10 } },
        { key: "FlatModifier", selector: "athletics", slug: "bonded-huge", type: "untyped", value: 4 },
    ]),
    evolution(4, "warded", "Warded", "When targeted by a spell, it may attempt to counteract that spell as a reaction, using the owner's class DC and half their level as the counteract rank."),
    evolution(4, "shared-form", "Shared Form", "Choose one evolution of 3 points or fewer. The owner gains its benefits while the Bonded is manifested within 30 feet of them. Add a copy of that evolution's effect to the owner's sheet while it applies."),
];

const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "Bonded Soul",
    img: IMG,
    levels: [
        { level: 5, text: levelBlock("5th Level", ["Its Strikes gain an additional damage die."]) },
        { level: 10, text: levelBlock("10th Level", ["It gains a third action.", "Its Strikes gain another additional damage die."]) },
        { level: 15, text: levelBlock("15th Level", ["Its Strikes gain another additional damage die."]) },
    ],
});

export const bondedSoul = talent({
    name: "Bonded Soul",
    slug: SLUG,
    category: "ascendant-apex",
    img: IMG,
    description: `
${flavour("Somewhere in the working that shaped you, a second thing arrived and declined to leave. It wears whatever form the bond permits and shares every wound you take, which makes the arrangement less a partnership than a single life, awkwardly divided between two bodies.")}
<p><strong>Statistics</strong></p>
<ul>
<li>The Bonded is your level. It uses your AC, saving throw modifiers, Perception, and class DC.</li>
<li>Its Strikes use the higher of your weapon attack modifier or your spell attack modifier, and add your highest attribute modifier to damage.</li>
<li>It has its own multiple attack penalty.</li>
<li>It uses your skill modifiers. Its Athletics modifier is the higher of your Athletics or your best attack modifier.</li>
</ul>
<p><strong>Shared Life</strong></p>
<ul>
<li>You and the Bonded share a single Hit Point pool. Damage to either reduces it; healing either restores it.<ul><li>If both are affected by the same area effect, apply the greater result once.</li></ul></li>
<li>You share conditions, taking the worse of the two.</li>
</ul>
<p><strong>Manifesting</strong></p>
<ul>
<li>Manifest it in an open space within 30 feet as a 2-action activity. It remains indefinitely and may travel any distance from you.</li>
<li>You may dismiss it as a free action, and it may dismiss itself as a free action.</li>
<li>If your shared Hit Points drop to one quarter of maximum or lower, it immediately unmanifests.</li>
</ul>
<p><strong>Actions and Damage</strong></p>
<ul>
<li>It acts on your initiative, immediately after your turn, with 2 actions. At 10th level it gains a third action.</li>
<li>Its Strikes gain an additional damage die at 5th, 10th, and 15th level.</li>
</ul>
<p><strong>Evolution Pool</strong></p>
<ul><li>You have evolution points equal to 3 + your level, reallocated freely during daily preparations.</li></ul>
<p><strong>Base Form</strong> Choose one at 1st level, permanently: Elemental, Fiend, Celestial, Beast, Aberration or Undead. The full table and the evolution list are in the Rules compendium.</p>
<hr />
<p><strong>In Foundry:</strong> import the base form you chose from the <em>Bonded Souls</em> compendium, then press <strong>Link Bonded</strong> in your sheet's header and pick it. That writes your level, AC, saves, Perception and Hit Points onto it, gives its Strikes your best attack modifier and highest attribute, and adds the extra dice for your level. Press it again whenever your numbers change; it also runs when you level. Damage or healing applied to either of you through a chat card is mirrored to the other, and a message says so when the pool drops to a quarter. Evolutions are the <em>Evolution N: ...</em> items in this compendium: drag them onto the Bonded (re-run the sync after adding a Strike).</p>
<p>For the table: the evolution point budget (3 + your level), shared conditions, manifesting and dismissing, the area-effect rule, and the effects of Limbs, Improved Damage, Grab, Knockdown, Warded and Shared Form.</p>
`.trim(),
    rules: [...grants],
});

export default [bondedSoul, ...evolutions, dreadFormEffect, ...bondedActions, ...subFeats];
