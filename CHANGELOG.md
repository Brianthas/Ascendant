# Changelog

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
- Runtime: Deathless deactivation, Inexhaustible Magics slot tripling, Know-It-All skill feat slots,
  Shape of Harm attunement card, Soulbound Arsenal reshape dialog, Tireless Aegis reform and
  regeneration, Second Wind trigger, Battle Mender immunity removal, party container capacities.
- Variant rules: Dual Class, third class, Ancestry Paragon and Free Archetype settings.
- Rules compendium built from the rules text.
- At `ready`, the GM's client removes this module's section ids from PF2e's persisted
  `campaignFeatSections` setting if another module saved them there, so disabling Ascendant leaves
  no raw section rows behind on character sheets.
