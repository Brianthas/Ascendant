# Changelog

## 0.1.3 - unreleased

- Weapon Expertise follows the revised rules. Every trained weapon proficiency is one rank above
  what the classes grant, at every level, and at least Master from 5th, Legendary from 10th and
  Mythic from 15th. A proficiency a class makes Expert at 1st (Fighter simple, martial and
  unarmed; Gunslinger firearms and crossbows) is Master from 1st, Legendary from 5th and Mythic
  from 13th, and from 15th its Strikes gain one die of the weapon's own damage die, stacking with
  striking and doubling on a critical hit. The +1 previously stopped at 4th.
- Keyed weapon proficiencies are raised too: the Gunslinger's firearms and crossbows, a Fighter's
  weapon-group entries, Soulbound Arsenal's weapon and combination weapons. 0.1.2 raised only the
  four categories.
- Mythic is per weapon. 0.1.2 made every Strike Mythic at 15th, untrained ones included; now only
  weapons you are trained in, and a Fighter's advanced weapons stay Legendary at 13th.
- The damage bonus follows the rank of the weapon struck with. 0.1.2 used the category's rank, so
  a Gunslinger's firearm took the martial category's bonus.
- Warmage: the weapon-to-spell rank raise runs after Weapon Expertise, so the spell rank includes
  the track's +1; spells go Mythic when any trained weapon is, 13th for an Expert-start weapon; the
  Spellcasting track's Mythic reaches only weapons you are trained in.
- Rules text and journal synced to the revised document: Weapon Expertise, the Assumed Variant
  Rules section, the 1st-level attribute cap as +5 with its note, Spellcasting Expertise by level,
  Mythic Proficiency and Expanded Investment as their own pages, Dread Presence's untyped penalty,
  Metal's damage type chosen at character creation, and the Game Master Notes on the variant rules.
- Characters built before 0.1.3 keep the old Weapon Expertise and Warmage rules until the GM runs
  **Refresh talent rules**.

## 0.1.2 - 2026-09-22

Verified on Foundry 14.368 with PF2e 8.5.1 on the two test characters: Mythic proficiency reads
level + 10 on every Strike, the Wizard's spell DC carries the flat +2, no Ascendant rule element is
ignored, the six feat sections and the bonded header button render, and the variants copy stands
down for the separate dual-class module with a single second-class ladder. No code change; the
manifest records the version.

## 0.1.1 - 2026-09-17

- Variants: the two PF2e Leveler bridges from Dual Class Items, ported line for line into
  `scripts/variants`. Classes created together in one write are recorded as dual class, and
  second-class feats filed under `xdy_dualclass`, `dualclass` or `dual_class` move into the class's
  ladder when it has a slot at that level. Verified live in this copy with Dual Class Items
  disabled: both flag scopes written, class Hit Points 12, feats at levels 1 and 2 moved, level 3
  kept its id.

## 0.1.0 - 2026-09-14

First build, verified live on Foundry 14.367 with PF2e 8.5.0: every talent and both tracks on a
20th-level Fighter/Wizard with Dual Class, Ancestry Paragon and Free Archetype on, the level
ladders at every boundary, and the runtime scripts against real combat, damage and token state.

- Core: Weapon Expertise and Spellcasting Expertise tracks with Mythic proficiency at 15th,
  Enhanced Defense, Enhanced Attribute Boosts with caps, Expanded Investment.
- Enhanced Attribute Boosts are picked on rows added to PF2e's Attribute Boosts window and
  stored in an actor flag, replacing the granted pick items. The 1st-level picks follow PF2e's
  own half-step rule for a score at 18 or above; the pick items gave nothing there.
- All twelve Apex, twelve Paragon and twelve Adept Talents, and both Party Talents, as feats with
  level features granted on levelling.
- Bonded Soul: six base-form NPC actors, evolution items, link and sync button, shared Hit Points.
- Flicker, Flicker Strike, the free-action Flicker and Shadowstep: **Use** on the action, or the
  **Choose destination** button on its chat card, shows the range as a ring on the map; click a
  square inside it and the token teleports there as a Foundry blink, with up to four targeted
  creatures within the mover's reach alongside for Flicker, each placed in a free square adjacent
  to the arrival on the side it came from. Until 10th the square must be one the token can see. A
  puff of smoke marks departure and arrival with a short beat between, drawn on the canvas and
  sent to every client; JB2A's smoke is used instead when Sequencer is present. World setting to
  turn it off.
- Every action this module grants shows PF2e's **Use** button on the Actions tab; Fade into
  Shadow's applies the invisibility effect.
- Runtime: Deathless deactivation, Inexhaustible Magics slot tripling, Know-It-All skill feat slots,
  Shape of Harm attunement card, Soulbound Arsenal reshape dialog, Tireless Aegis reform and
  regeneration, Second Wind trigger, Battle Mender immunity removal, party container capacities.
- Variant rules: Dual Class, third class, Ancestry Paragon and Free Archetype settings.
- Rules compendium built from the rules text.
- At `ready`, the GM's client removes this module's section ids from PF2e's persisted
  `campaignFeatSections` setting if another module saved them there, so disabling Ascendant leaves
  no raw section rows behind on character sheets.
