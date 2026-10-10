# Changelog

## 0.1.4 - 2026-10-09

- **Dread Presence rolls the Will save.** When an enemy enters the aura, or is inside it when the
  aura is switched on, its Will save against the higher of the owner's Class DC and Spell DC is
  rolled with no dialog, and the aura effect on it shows the result as a badge. Frightened cannot
  be lowered below the badge while it stays inside. From 7th the badge rises to 2 (3 from 13th)
  once the creature's Frightened has reached that value from any source; a critical success stays
  at 1 (ruling recorded in MANUAL.md). On leaving, or when the aura is switched off, the creature
  keeps its Frightened value, and a *Dread Presence: Lingering* effect holds the rolled result
  through its next turn, or its next ten after a critical failure. Re-entering rolls again, and
  the higher Frightened wins. A critical failure's card notes the dropped items and lost reactions.
- The immunity ladder is applied as written rather than by skipping creatures. PF2e drops an
  effect whose traits the actor is immune to, so below 10th the aura effect is mental only:
  fear- and emotion-immune creatures are affected and roll one degree better, mental-immune and
  mindless ones stay out. From 10th a second effect with only the aura trait reaches everything;
  mental-immune and mindless creatures roll one degree better until 17th. Previously the effect
  carried the fear, emotion and mental traits at every level, so PF2e kept those creatures out even
  from 17th, where the rules say nothing is immune; the `target:immunity:` predicates meant to do
  the banding never matched, because PF2e emits no immunity roll options.
- The 5th-level low-roll clause now covers the aura's own save, which is one of "your effects".
- **The 15th-level attack penalty never applied.** It tested `target:feat:dread-presence`, and an
  attack's target options carry no feats at all: PF2e maps only `self:` options onto the target.
  The talent now sets `self:ascendant-dread-presence` while the aura is on, and the penalty keys
  on that. Its four rules, one per Frightened value, also shared a slug, and PF2e keeps one
  modifier per slug, the largest, before checking whether it applies, so only the -4 survived and
  the penalty worked at Frightened 4 alone. Each value now has its own slug, and only the highest
  Frightened value counts, since a creature holding two Frightened conditions reports both.
  Verified live on a goblin's Strike against a 15th-level owner: -3 at Frightened 3, and -4 alone
  with Frightened 3 and 4 both present.
- Characters who already have Dread Presence need **Refresh talent rules** run once.
- **Bonded Soul's Dread Form rolls its save.** An enemy that begins its turn within 30 feet rolls a
  Will save against the owner's class DC (the higher of two classes'), and is Frightened 1 on a
  failure. PF2e applies an aura's effect on entry whatever its `events` say (they only set
  `removeOnExit`'s default), so the old "turn-start" effect arrived on entry and came back as soon
  as it was removed by hand. The aura effect is now a marker for being inside, and a
  `pf2e.startTurn` hook rolls the save. A Bonded that already has Dread Form needs nothing: the
  marker is copied from the compendium each time it lands, and the evolution's own change is to
  `events`, which PF2e does not act on. Verified live: a failure at turn start gave a stored Frightened 1, a natural 20
  the next round gave none, and an enemy outside the aura rolled nothing.
- **Sovereign Mind's 15th-level immunity is to mental damage, as written.** It was PF2e's
  `mental` immunity, which also covers every effect with the mental trait. It is now a custom
  immunity on mental damage. Verified live at 15th: not immune to a mental-only effect, 10 mental
  damage taking nothing, 10 fire taking 10. Characters with Sovereign Mind need **Refresh talent
  rules** run once.
- Bonded Soul's sync read the owner's class DC as `classDC.value`, which is undefined; it is
  `classDC.dc.value`. Nothing used the value, so nothing changed at the table: the Bonded keeps
  its own level-based class DC.
- Verified live with forced and natural dice, at 7th, 15th and 17th: each immunity band on a goblin,
  a fear-immune Scarecrow, a mental-immune mindless Zombie Shambler and an emotion- and fear-immune
  Axiomite; the low-roll clause on the aura's save (a natural 2 at Frightened 2 taken from failure to
  critical failure); a critical success staying at 1 at 7th and the badge rising to 2 when a stored
  Frightened 2 arrived; the 15th floor of 3 holding as a stored Frightened 4 was lowered to 1;
  leaving with a stored value and a Lingering at the rolled result; and the attack penalty against
  the owner, with a Strike against another creature as the control. Lingering's round counting is
  shared with a sibling implementation and was verified across three rounds of combat there.

## 0.1.3 - 2026-10-01

Verified live on Foundry 14.368 with PF2e 8.5.1, on test characters built from PF2e's own class
items and class features: a Fighter at 1st, 4th, 5th, 12th, 13th and 15th, a Gunslinger at 1st,
5th, 13th and 15th, a Wizard at 1st, 5th, 11th and 15th, a Fighter/Wizard Warmage at 1st, 12th and
13th, and the existing 20th-level Fighter/Wizard before and after **Refresh talent rules**. A
1st-level Fighter/Gunslinger with every boost on Dexterity reads +5, a single-class Fighter +4.

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
