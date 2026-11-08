# What is applied by hand

Every clause the module does not automate, with the reason. Each also appears on its talent's item
text under **For the table**, and most surface as a note on the roll they apply to.

Reasons recur, so they are named once here and cited below:

- **No hook.** PF2e counts neither actions nor reactions, has no start-of-turn or end-of-turn
  trigger a rule element can use, and does not model surprise, difficult terrain, cover, or
  concealment on the defender's side.
- **Targeting.** Nothing outside a spell changes its targets, area, range, duration or action cost.
- **Other actor.** A rule element acts on the actor that holds it and, through auras and ephemeral
  effects, on a creature for the duration of one roll. Anything that persists on another actor,
  or that reads one actor from another, is done by hand or by a script.
- **Auras follow token movement.** PF2e applies and removes an aura's effect when a token's move
  finishes on the canvas, so an aura only reaches creatures whose tokens are dragged into or out
  of it on a viewed scene. A token placed by editing coordinates, or a scene nobody is viewing,
  does not trigger it.
- **Defender-side.** Resistance, hardness and immunity are applied where the damage lands. There is
  no attacker-side "ignore resistance".
- **Not modelled.** PF2e has no representation of the thing at all: a condition floor, an object's
  identity, a character's age, environmental sources.

## Core

- **Enhanced Attribute Boosts.** Automated in the Attribute Boosts window. The 1st-level picks use
  PF2e's own half-step rule for a score already at 18, so two half steps combine into a whole
  modifier point as they do for PF2e's own boosts. They give +1, not +2, on a score at 18
  (Bryan's ruling, 2026-09-30): a single-class character reaches 19 (+4) at 1st, and Dual Class's
  second class boost makes 20 (+5) reachable. Listed because the window's Manual Entry mode
  switches the picks off along with PF2e's boosts, and the rows are hidden while it is on.
- **Expanded Investment.** Automated; listed because the path it writes is checked live before
  release.

## Apex Talents

**Bonded Soul** (other actor throughout)
- Evolution points (3 + level): stated, not enforced.
- Shared conditions, the area-effect rule, manifesting and dismissing, acting after the owner's
  turn, the third action at 10th.
- Evolutions whose effect is on the text: Limbs, Improved Damage (edit the Strike's die), Grab and
  Knockdown (add the trait; the free maneuver is a note), Warded, Shared Form.
- Shared Hit Points are mirrored only for damage and healing applied through a chat card or the
  sheet's HP field; the quarter-line unmanifest is a chat reminder.

**Borrowed Time** (no hook)
- Extra reactions per turn, the extra flourish at 7th and unlimited flourishes at 13th, Hustle at
  ten times Speed, movement not triggering reactions.

**Charmed Life** (no hook)
- Starting each session with 4 Hero Points (the GM's control resets them).
- Rerolling natural 1s: use the chat card's reroll without spending a Hero Point.
- The flat check after a failed save at 5th and 10th: a second roll after the first resolves.
- Rebounding a misfortune effect onto its source.

**Deathless** (not modelled)
- Conditions that would reduce by 1 at the end of your turn are removed instead.
- Not eating, drinking, sleeping or (15th) breathing.
- 19th: Slowed 1 instead of Unconscious at 0 Hit Points.
- The 7th and 15th immunities must be one of the two chosen resistances and not the deactivating
  type: a ChoiceSet cannot read another rule's selection, so the prompt offers every damage type
  and the player picks correctly (Bryan's ruling, 2026-09-14).
- The two resistance dials may be changed at any time; the daily-preparations limit is on the player
  (same ruling).

**Dread Presence**
- Dropped items and lost reactions on a critical failure. The save's chat card says so.
- A creature immune to the Frightened condition itself stays unaffected at 17th: PF2e will not
  grant it the condition.
- The 7th and 13th floors stop reductions only. A critical success inside a 7th-level aura stays
  Frightened 1; the floor of 2 applies once the creature's Frightened has reached 2, from any
  source (Bryan's ruling, 2026-10-08).
- Healing when a frightened creature drops (other actor).
- 20th: enemies unable to approach.

**Elemental Embodiment**
- Metal's slashing or piercing is chosen once with the element (Bryan's ruling, 2026-09-14).
- 5th: damage to creatures that touch or hit you in melee (other actor).
- 10th: the element ignoring resistance (defender-side); the end-of-turn aura damage (no hook; the
  aura marks the creatures inside).
- 13th: the riders (other actor).
- 15th: passing through gaps. 20th: half damage through immunity (defender-side).

**Inexhaustible Magics**
- With spellcasting automation off, tripling is a button: press **Triple Spell Slots** after
  spellcasting entries exist and again after adding one. Slot maxima are stored data no rule element
  reaches. With it on, the sync writes the tripled slots and cantrips itself and the button is
  hidden. Only the class's Spells per Day table and an archetype's spellcasting benefits are
  tripled (an archetype's cantrips too): 4 slots of a rank become 12. Slots or cantrips a feat or class feature adds (Cantrip
  Expansion, the wizard curriculum, Divine Font) land on top untripled. Spells known are not
  tripled.
- Refocus restoring every point and the shorter Refocus times: PF2e's Refocus restores one point
  and has no hook. Set focus points to the maximum by hand.

**Lifeline** (other actor throughout)
- Taking a bonded ally's damage, the shared resistances at 5th, the shared spells and range at
  10th, the condition transfer and the floor of 1 Hit Point at 15th, the daily restoration at 20th.
- Healing at 60 feet regardless of range (targeting).
- Vital Bond arrives as a spell item; move it into a focus spellcasting entry.

**Soulbound Arsenal**
- The weapon's own reactions (no hook), never being disarmed, returning to hand, acting while you
  cannot at 9th, the number of form changes per round.
- The property runes are chosen in the reshape dialog from the system's own list, with the
  count and the level + 2 cap enforced there. Five rune keys have no item in the equipment pack
  on PF2e 8.5.0 (dancing, disrupting, greater disrupting, speed, spell-storing), so their level
  and etching restriction are not checked; the dialog says so beside them.
- The material dial offers cold iron, silver, adamantine, dawnsilver and sovereign steel, the
  materials that bypass something (Bryan's ruling, 2026-09-14); change it on each form change.

**Unbound Casting** (targeting)
- Every spellshape's change to the spell it applies to.
- 10th: casting while unable to act. 20th: dispel immunity.

**Unbroken Tempo**
- 15th is applied as immunity to Slowed and Stunned, the two conditions that reduce actions at the
  start of a turn. Bryan's ruling (2026-09-14): the wording negates the effect rather than the
  condition, so strictly the character is still Stunned for anything that asks "is this creature
  Stunned"; nothing in practice does, and immunity is the right simplification.
- 20th: the free Strike on a critical hit (no hook).

**Warmage**
- Fully automated, with one display quirk. "Use the higher of" is done by adding the other side's
  attribute as an ability-typed modifier, which PF2e collapses to the highest per statistic: the
  attack breakdown names whichever attribute won. The spellcasting attribute is asked for when the
  talent is taken, since a Strike carries no roll option naming it.
- 10th: the critical carry and MAP exemption; 20th: two spells (targeting).

## Paragon Talents

**Abundant Vitality** (targeting)
- The bonus on Treat Wounds and Battle Medicine (their healing is built inside the action).
- Extra targets, self as a target, doubled durations, free Sustain, composition duration and cost.

**Elusive** (no hook)
- Move actions not triggering reactions, difficult and greater difficult terrain, the 10th-level
  extra move-only action.

**Flicker Step**
- The teleport and willing passengers are automated: **Use** on the action, or the chat card's
  **Choose destination** button, shows the range as a ring and moves the token, and up to four
  targeted creatures within the mover's reach, to the clicked square, refusing a square past the
  range or off the map, each placed in a free square adjacent to the arrival footprint on the
  side it left from. Passengers must be targeted first. Reach is the actor's prepared reach, so
  anything the system already applies to it counts: Far Hand, Enlarge, the Bendy-Arm
  mutagens, Giant's Stature, any size effect. Large ancestries such as Jotunborn have reach 5 in
  the system's data unless a feat says otherwise, which matches their printed reach. Until 10th the square must be visible to the active vision on the picking client, which is
  the controlled token's; a GM with no token controlled sees everything, which is Foundry's own
  rule. Whether a passenger is willing, and the 15th-level unwilling passenger with its Will
  save, stay with the players (other actor).

**Immovable** (no hook, other actor)
- Forced movement, difficult terrain, the Step ban, end-of-turn Off-Guard, damage for a failed move,
  teleport denial, being knocked from a surface. The aura marks who is inside.

**Ironhide**: fully automated.

**Know-It-All**
- "You do not gain skill increases": do not spend them.
- Universal Lore is used only to Recall Knowledge. Its DC against a creature is one of the two
  applicable Lore DCs PF2e shows on the creature's sheet; the GM picks which.
- Recall Knowledge as a free action once per turn (no hook).

**Overwhelm** (targeting)
- Excluding creatures, converting bursts to cones or lines, doubling areas.
- The once-per-round degradation is a toggle the caster switches on for that spell.

**Ruinous Blows** (defender-side, other actor)
- Ignoring hardness and resistance up to level, double damage to objects, halved resistances and
  the counteract on a critical hit, half damage through immunity.
- The AC penalty is an effect the player applies to the target.

**Sovereign Mind**
- 10th: immunity to incapacitation effects that call for a Will save. PF2e's immunity type covers
  every incapacitation effect, so it is a note instead.
- 15th: emotion immunity is a toggle, so an emotion effect can be accepted.

**Spell Volley** (targeting)
- The action cost of attack-trait spells.

**Tireless Aegis**
- Blocking once per turn without a reaction at 5th; the reflected damage at 15th (no hook).
- The Aegis is never lowered: block as if raised; the +3 is on your AC regardless.

**Unerring Shot** (no hook, defender-side)
- The concealment flat check, cover penalties, targeting a sensed creature, ignoring resistance on a
  second hit, reaction immunity at 15th, spell range increments (weapon increments are doubled).
- Aim once per round until 15th: on the player.

## Adept Talents

**Battle Mender**
- The 30-foot range, Treat Wounds in 1 minute, the Wounded reduction and condition removal at 10th
  (other actor).
- The daily limit removal is a script that deletes PF2e's immunity effect when a Battle Mender is
  its source; verified live before release.

**Far Hand** (no hook)
- Interacting at reach, the forced movement at 10th, the free maneuver at 15th.

**Living Shadow** (not modelled)
- Never being Concealed by darkness (the attacker's flat check), Hiding as a free action and
  without cover, silent movement and the detection immunities at 10th.
- The 5th-level invisibility is an effect the player applies and removes.

**Overreaction** (no hook)
- The extra reactions, reacting while Off-Guard, Prone or Grabbed, reacting to spellcasting, and the
  15th-level denial immunity. Reactive Strike and Interpose are real items.

**Peerless Crafter** (not modelled: PF2e's crafting has no rule element for its economy)
- The level + 2 cap, formulas per level, workshop-free crafting, material substitution, the 1-day
  time and 75% cost, salvage at 75%, free rune transfers.

**Piercing Gleam**
- The 10th-level degree improvement is a toggle on the aura's effect, switched on by the ally for a
  save against an effect that would Fascinate, Confuse or Control them (Bryan's ruling,
  2026-09-14: explicit rather than applied to every mental save).
- Concealment inside the aura at 10th (not modelled); the aura being invisible to enemies and the
  automatic successes at 15th.

**Renewed Focus**
- Refocus in 1 minute restoring every point (no hook; set focus points by hand), the action
  discount at 10th and the free cast at 15th (targeting).

**Second Wind**
- Damage typed straight into the sheet bypasses the trigger; the Doomed reduction at 15th; uses
  outside a tracked combat.

**Shape of Harm**
- Attuning to two types at once at 15th (not modelled).
- The physical types count as both cold iron and silver; the rules offer a choice of one. Bryan's
  ruling (2026-09-14): the difference is negligible, keep both.

**Trail Breaker** (no hook)
- Allies borrowing your Speeds, the automatic successes at 5th, Hover at 15th.

**Uncanny Instinct** (no hook)
- Not being surprised, the free Seek each turn, Off-Guard from sources other than flanking.

**What Doesn't Kill You** (not modelled)
- Drowning and suffocation immunity, acting underwater, adaptations (add a resistance or immunity
  effect for the day, permanently from 15th).

## Party Talents

**Haven**: the refuge is GM-run. Each member gets a storage container sized to 20 Bulk per member.

**The Ledger**: a container named The Ledger in the stash on the Party sheet is the shared
inventory (Bryan's rulings: the Party stash, 2026-09-14, because it is already shared,
unencumbering and reachable from anywhere; a container there carrying the Bulk cap, 2026-11-01).
The GM's client creates it once any party member has the talent, and sets its capacity to 20, 30
or 40 Bulk per member by the level of the highest-level member with the talent. It is never
deleted automatically. Retrieval at distance, identification, rune transfers, transformation,
requisition and the restored consumable are GM-run.
