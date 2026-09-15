import { talent, actionItem, effectItem } from "../lib/item.mjs";
import { levelChain, grantBetween, flavour, levelBlock } from "../lib/grants.mjs";

const PACK = "ascendant-adept";
const SLUG = "living-shadow";
const IMG = "icons/magic/perception/shadow-stealth-eyes-purple.webp";

/** PF2e's Invisible condition, read off the installed system's packs. */
const INVISIBLE = "Compendium.pf2e.conditionitems.Item.zJxUflt9np0q4yML";

/**
 * Adept: Living Shadow.
 *
 * Seeing in any darkness is greater darkvision (PF2e's sense that ignores
 * magical darkness). Never Concealed or Dazzled by darkness is immunity to
 * Dazzled; the concealment half is a flat check on the attacker's side that
 * nothing on the defender's sheet can waive, so it is on the text. The
 * 5th-level invisibility is an effect item carrying the Invisible condition,
 * applied by the player; its ending conditions are text. Shadowstep is a real
 * action from 15th. Hiding as a free action, Hiding without cover, silent
 * movement and the detection immunities have no rule element and are noted.
 */
export const shadowCloak = effectItem({
    slug: `${SLUG}-invisible`,
    name: "Living Shadow: Invisible",
    img: IMG,
    traits: ["illusion", "visual"],
    duration: { value: 1, unit: "minutes", sustained: true, expiry: "turn-end" },
    description: `
<p>You are invisible while in dim light or darkness. This ends if you take a hostile action or Cast a Spell (until 10th level), or if you leave dim light.</p>
<hr />
<p>Sustain it each turn to keep it going for up to 1 minute. Delete the effect when a condition ends it.</p>
`.trim(),
    rules: [{ key: "GrantItem", uuid: INVISIBLE, inMemoryOnly: true }],
});

export const shadowstep = actionItem({
    slug: `${SLUG}-shadowstep`,
    name: "Shadowstep",
    actionType: "action",
    actions: 1,
    traits: ["shadow", "teleportation"],
    img: IMG,
    description: `<p>Teleport to any shadow or area of dim light you can see within 120 feet.</p>`,
});

export const fadeIntoShadow = actionItem({
    slug: `${SLUG}-fade`,
    name: "Fade into Shadow",
    actionType: "action",
    actions: 1,
    traits: ["concentrate", "shadow"],
    img: IMG,
    description: `
<p>While in dim light or darkness, become invisible until you take a hostile action, Cast a Spell, or leave dim light.</p>
<ul><li>You may Sustain this to maintain it for up to 1 minute.</li></ul>
<p>From 10th level, it no longer ends when you take a hostile action, only if you leave dim light.</p>
<hr />
<p>Drag <em>Living Shadow: Invisible</em> from the compendium onto your token, or apply it from this item's effect, and remove it when it ends.</p>
`.trim(),
});

const { subFeats, grants } = levelChain({
    pack: PACK,
    slug: SLUG,
    name: "Living Shadow",
    img: IMG,
    levels: [
        { level: 5, text: levelBlock("5th Level", ["[1 action] While in dim light or darkness, become invisible until you take a hostile action, Cast a Spell, or leave dim light.<ul><li>You may Sustain this to maintain it for up to 1 minute.</li></ul>"]) },
        { level: 10, text: levelBlock("10th Level", ["Your movement makes no sound.", "You cannot be detected by hearing, scent, tremorsense, or lifesense, and you leave no tracks.", "Your invisibility no longer ends when you take a hostile action, only if you leave dim light."]) },
        { level: 15, text: levelBlock("15th Level", ["Gain Shadowstep.<ul><li><strong>Shadowstep</strong> [1 action] Teleport to any shadow or area of dim light you can see within 120 feet.</li></ul>"]) },
    ],
});

export const livingShadow = talent({
    name: "Living Shadow",
    slug: SLUG,
    category: "ascendant-adept",
    img: IMG,
    description: `
${flavour("The dark stopped being somewhere you hide and started being something you are. You see through it, move without sound inside it, and when it suits you, step from one patch of it into another as easily as crossing a threshold.")}
${levelBlock("1st Level", ["You see normally in darkness of any kind, including magical darkness.", "You are never Concealed or Dazzled by low light or darkness.", "While in dim light or darkness, you may Hide as a free action once per round.", "You may Hide and Sneak even without cover or concealment."])}
${levelBlock("5th Level", ["[1 action] While in dim light or darkness, become invisible until you take a hostile action, Cast a Spell, or leave dim light.<ul><li>You may Sustain this to maintain it for up to 1 minute.</li></ul>"])}
${levelBlock("10th Level", ["Your movement makes no sound.", "You cannot be detected by hearing, scent, tremorsense, or lifesense, and you leave no tracks.", "Your invisibility no longer ends when you take a hostile action, only if you leave dim light."])}
${levelBlock("15th Level", ["Gain Shadowstep.<ul><li><strong>Shadowstep</strong> [1 action] Teleport to any shadow or area of dim light you can see within 120 feet.</li></ul>"])}
<hr />
<p><strong>In Foundry:</strong> you have greater darkvision and are immune to Dazzled. <em>Fade into Shadow</em> is on your Actions tab from 5th with the <em>Living Shadow: Invisible</em> effect to apply, and Shadowstep from 15th. Posting Shadowstep to chat puts a <strong>Choose destination</strong> button on the card: click a square within 120 feet and your token teleports there; that the square is in shadow or dim light is yours to judge.</p>
<p>For the table: never being Concealed by darkness (the attacker's flat check), Hiding as a free action and without cover, silent movement and the detection immunities from 10th. A note on your Stealth checks reminds you.</p>
`.trim(),
    rules: [
        { key: "Sense", selector: "greater-darkvision" },
        { key: "Immunity", type: "dazzled" },
        {
            key: "Note",
            selector: "stealth",
            title: "Living Shadow",
            text: "ASCENDANT.Note.LivingShadowStealth",
        },
        grantBetween(PACK, `${SLUG}-fade`, 5),
        grantBetween(PACK, `${SLUG}-shadowstep`, 15),
        ...grants,
    ],
});

export default [livingShadow, shadowCloak, fadeIntoShadow, shadowstep, ...subFeats];
