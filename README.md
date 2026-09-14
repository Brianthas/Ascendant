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

Copy the `ascendant` folder from the release zip into `Data/modules/`, restart Foundry, and enable
**Ascendant: Mythic Rebuilt (PF2e)** in the world's module settings. Foundry v12 or later, PF2e
8.0.0 or later; verified on Foundry v14 with PF2e 8.5.0.

## What it adds

Seven compendiums under **Ascendant: Mythic Rebuilt**:

| Compendium | Holds |
| --- | --- |
| Ascendant: Core | Weapon Expertise, Spellcasting Expertise, Enhanced Attribute Boosts, Expanded Investment |
| Ascendant: Apex Talents | The twelve Apex Talents, their level features, and the Bonded Soul evolutions |
| Ascendant: Paragon Talents | The twelve Paragon Talents and their level features |
| Ascendant: Adept Talents | The twelve Adept Talents and their level features |
| Ascendant: Party Talents | Haven and The Ledger |
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
3. Add one talent from each of Apex, Paragon and Adept, and the party's Party Talent.
4. Read the talent's **In Foundry** paragraph. Some need one more step: Inexhaustible Magics'
   **Triple Spell Slots** button once the spellcasting entries exist, Soulbound Arsenal's tag on
   a weapon, Bonded Soul's **Link Bonded** button after importing a base form.

## What is and is not automated

Every numerical rule is applied by PF2e rule elements: proficiency ladders, damage riders, Enhanced
Defense, resistances and immunities, speeds, auras, degree-of-success changes, multiple attack
penalties. Where the system has no rule element for a clause, the clause is on the item text under
**For the table**, and a note appears on the roll it applies to. [MANUAL.md](MANUAL.md) lists every
such clause with the reason.

## Variant rules

The world settings page carries **Enable Dual Class**, **Allow a Third Class**, **Third Class
Permissions**, **Show the Skill Proficiencies Panel**, **Enable Ancestry Paragon** and **Enable Free
Archetype**. If the separate Dual Class Items module is also active, Ascendant leaves the first
five to it and says so in the console; a character built under that module opens with both classes
here.

## Updating

After installing a new version, use **Refresh talent rules** in the module's settings. It resyncs
every talent already on a character with the compendium, keeping choices and toggles.

## Status

- [CHANGELOG.md](CHANGELOG.md) - version history
- [MANUAL.md](MANUAL.md) - what is applied by hand, and why
