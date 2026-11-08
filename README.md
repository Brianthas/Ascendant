# Ascendant: Mythic Rebuilt (PF2e)

A [Foundry VTT](https://foundryvtt.com/) module for the [Pathfinder 2e](https://github.com/foundryvtt/pf2e)
system implementing the *Ascendant: Mythic Rebuilt* ruleset: a Mythic alternative for Pathfinder
Second Edition.

**This replaces the official Mythic rules. Do not use both.** Where Mythic grants destinies,
calling and mythic points, Ascendant grants Talents that scale across all twenty levels and need no
separate resource.

Every character chooses, permanently at 1st level: one Expertise Track, one Apex Talent, one
Paragon Talent and one Adept Talent. The party chooses one Party Talent together. Characters also
gain Enhanced Attribute Boosts and a 20-item investiture limit.

The module also carries the three variant rules the ruleset is played with: Dual Class (with an
optional third class), Ancestry Paragon and Free Archetype, as settings.

## Installation

Requires the [libWrapper](https://foundryvtt.com/packages/lib-wrapper) module.

In Foundry's **Add-on Modules** tab, choose **Install Module** and paste this manifest URL:

```
https://github.com/Brianthas/Ascendant/releases/latest/download/module.json
```

Then enable **Ascendant: Mythic Rebuilt (PF2e)** in the world's module settings. Foundry v14 and
PF2e 8.5.0 or later; verified on Foundry 14.369 with PF2e 8.6.1.

## What it adds

Seven compendiums under **Ascendant: Mythic Rebuilt**:

| Compendium | Holds |
| --- | --- |
| Ascendant: Core | Weapon Expertise, Spellcasting Expertise, Enhanced Attribute Boosts, Expanded Investment |
| Ascendant: Apex Talents | The twelve Apex Talents, their level features, and the Bonded Soul evolutions |
| Ascendant: Paragon Talents | The twelve Paragon Talents and their level features |
| Ascendant: Adept Talents | The twelve Adept Talents and their level features |
| Ascendant: Party Talents | Haven and The Ledger, with Haven's storage and The Ledger's Party stash container |
| Ascendant: Bonded Souls | The six Bonded Soul base forms, as NPC actors |
| Ascendant: Rules | The full rules text, one journal per chapter |

Every talent is a feat. The character sheet's Feats tab gains a section per tier, each with one
slot, so a character holds exactly one of each. Level features arrive as separate feats named
`Talent (Nth)` in the **Ascendant - Granted** section, granted automatically when the character
reaches that level; choices that belong to a level are asked at that level.

Mythic proficiency, the sixth rank at level + 10, appears on attack rolls and spell DCs as
**Mythic** where a track reaches it.

## Building a character

1. Build the character as normal, including the ordinary attribute boosts.
2. From **Ascendant: Core**, add an Expertise Track, **Enhanced Attribute Boosts** and **Expanded
   Investment**. With the boosts feat on the sheet, the **Attribute Boosts** window gains a row
   labelled *(Ascendant)* under each of PF2e's level rows: four picks at Level 1 and two at
   Levels 5, 10, 15 and 20. Pressing an attribute twice on a later row puts both picks on it.
3. Add one talent from each of Apex, Paragon and Adept, and the party's Party Talent. Drag each
   onto the sheet or use the **Browse** button on its section; the sheet seats it in that
   section's slot and nests its level features under it. A talent created any other way, by a
   macro or a script, has no slot and lists under **Bonus Feats** instead; drag it onto its
   section to seat it.
4. Read the talent's **In Foundry** paragraph. Some need one more step: Inexhaustible Magics'
   **Triple Spell Slots** button once the spellcasting entries exist (not needed with
   [spellcasting automation](#spellcasting-automation) on), Soulbound Arsenal's tag on
   a weapon, Bonded Soul's **Link Bonded** button after importing a base form.

## What is and is not automated

Every numerical rule is applied automatically: proficiency ladders, damage riders, Enhanced
Defense, resistances and immunities, speeds, auras, degree-of-success changes, multiple attack
penalties. Most are PF2e rule elements. Weapon Expertise's ranks are a rule element the module
registers with PF2e, and the Enhanced Attribute Boost picks are applied by script. PF2e's auras
roll no saves, so Dread Presence's and Bonded Soul's Dread Form's Will saves are rolled by script
when the save is due. Where the system
has no rule element for a clause, the clause is on the item text under
**For the table**, and a note appears on the roll it applies to. [MANUAL.md](MANUAL.md) lists every
such clause with the reason.

## Variant rules

The world settings page carries **Enable Dual Class**, **Allow a Third Class**, **Third Class
Permissions**, **Show the Skill Proficiencies Panel**, **Enable Ancestry Paragon** and **Enable Free
Archetype**. If the separate Dual Class Items module is also active, Ascendant leaves the first
five to it and says so in the console; a character built under that module opens with both classes
here. While it is active, every class change made there is copied to Ascendant's own record, so
turning it off later leaves each character with the classes it had.

The copy carries that module's two PF2e Leveler bridges: classes created together in one write are
recorded as dual class, and second-class feats Leveler files under `xdy_dualclass` move into the
class's own ladder. Both verified live in each module on 2026-09-17, on a Monk/Guardian created in
one batch.

## Spellcasting automation

World setting **Spellcasting: automate entries and slots**, off by default. With it on:

- A character that takes Bard, Cleric, Druid, Witch, Wizard, Oracle, Sorcerer, Animist, Psychic,
  Magus, Necromancer or Summoner gets that class's spellcasting entry, with its tradition and
  attribute. Animist gets two, its own and its apparition entry. A sorcerer, witch or summoner's
  entry waits for the bloodline, patron or eidolon that sets its tradition, and a psychic's for its
  key attribute.
- Spell slots follow the class's Spells per Day table at each level, tripled with Inexhaustible
  Magics. A prepared entry's cantrip slots are included; a spontaneous entry casts cantrips without
  slots.
- On top of the table: a wizard's curriculum cantrip and one curriculum slot per rank (not for
  Unified Magical Theory), Cantrip Expansion's two prepared cantrips, and the extra 10th-rank slot
  from a class's 20th-level feat. A cleric's Divine Font gets an entry of its own holding only the
  font slots at the highest rank. Inexhaustible Magics does not triple these additions. A cleric
  with the Battle Creed doctrine uses that doctrine's own Spells per Day table, read from the
  feature, and its font slots sit at that table's highest rank.
- A slot count changed by hand is kept. Each rank that differs from the table shows a red **!** and
  a sync button that sets it to the table value. Levelling up moves every other rank.
- An entry built before the setting was turned on is taken over by **Sync Spellcasting** in the
  sheet header when its preparation type and tradition match the class. Ranks that already match
  follow the table from then on; the rest are marked.
- Entries are never deleted. Removing a class leaves its entry as it is.
- The twelve class archetypes (Bard Dedication through Summoner Dedication) get an entry of their
  own, "<Class> Archetype Spells", with the dedication's cantrips and the Player Core basic,
  expert and master spellcasting benefits by level: 1st-rank slot with the basic feat, 2nd at 6th,
  3rd at 8th; 4th with the expert feat, 5th at 14th, 6th at 16th; 7th with the master feat, 8th at
  20th. Inexhaustible Magics triples them, cantrips included.
- Infernal Pactbreaker, Prophet of Kalistrade and Rivethun Involutionist get an archetype entry
  the same way. Hedge Mage, Beast Gunner, Cathartic Mage, Eldritch Archer and the pervasive magic
  line let the player choose a tradition that PF2e does not record, so their entry is not created:
  build it with the system's dialog, then **Sync Spellcasting** takes it over when it is the only
  unmanaged entry of its preparation type. Prophet, Beast Gunner, Cathartic Mage and Eldritch
  Archer give no cantrips of their own to a character with a casting class. Captivator's spells
  are innate and have no slots.
- A sorcerer's bloodline gifts are added to the repertoire as each rank opens, including the ones
  Draconic, Elemental and Genie bloodlines set by exemplar, element or genie. They count among the
  spells the table gives. A cleric's deity spells go into the spellbook as each rank opens. An
  oracle's mystery spells, a psychic's conscious mind spells and psi cantrips (the deeper one at
  6th, the deepest at 10th), and a bard's muse spell are added the same way and count on top of
  the table. A magus's studious spells go into the spellbook at 7th, 11th and 13th. A granted
  spell the player deletes is not added again, and one already known is not added twice. A
  psychic's attribute is read from its subconscious mind's text, since PF2e does not set it.
- A spontaneous entry shows, on each rank's header, the spells known at that rank against what the
  class table and feats give (Cantrip Expansion, Deep Lore, Greater Mental Evolution, the 10th-rank
  capstone's two spells), in red when they differ. A spell learned again at a higher rank counts
  at that rank. Once the character has Signature Spells, the entry also shows signature spells
  chosen against one per rank. Each non-signature spell has a control that adds it to the
  repertoire again at a higher rank. Apparition entries show no counts.
- A prepared entry's **Prepare Spells** button opens a two-column window: the spellbook on the
  left, every slot by rank on the right. Drag a spell onto a slot, or click it and then a slot. A
  spell can come from the compendium, and goes into the spellbook on the way. A spell in a slot
  above its rank is marked with the rank it will be cast at. Each slot can be marked cast or
  emptied. A rank lists its filled slots first, as PF2e does. Flexible entries keep the system's
  window.

The tables are parsed from the class pages on Archives of Nethys by
`tools/fetch-casting-tables.mjs` (`npm run tables:casting`).

## Updating

After installing a new version, use **Refresh talent rules** in the module's settings. It resyncs
every talent already on a character with the compendium, keeping choices and toggles.

## Status

- [CHANGELOG.md](CHANGELOG.md) - version history
- [MANUAL.md](MANUAL.md) - what is applied by hand, and why
