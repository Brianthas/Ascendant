# Changelog

## Unreleased

- Variants: the two PF2e Leveler bridges from Dual Class Items, ported line for line into
  `scripts/variants`. Classes created together in one write are recorded as dual class, and
  second-class feats filed under `xdy_dualclass`, `dualclass` or `dual_class` move into the class's
  ladder when it has a slot at that level. Verified live in that module, not yet in this one.

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
