# Kabaddi Ghost Raids: Raid League — Content plan

This is a CONTENT game: the campaign is 66 handcrafted **Raid Trials** (short scored match situations and six
full 2x20 matches) in 6 chapters, plus the open modes. Engine: `src/game/` (pure TypeScript, no UI).
Data: `src/game/units.ts` (trials), `src/game/tuning.json` (measured knobs), `src/game/ghosts.ts` (recorded ghosts).

## Modes
| Mode | What it is | Gate | Engine |
|---|---|---|---|
| Campaign | 66 Raid Trials, 3 stars each, 6 chapters, a match boss per chapter (Ch1 Blitz final, Ch2 the second half with a Do-or-Die finish, Ch3 a comeback joined at 10:00, Ch4 a full 2x20 with your auctioned squad, Ch5 a Blitz semi joined 4 down, Ch6 the full 2x20 World Final) | open | `UNITS` |
| Quick Match | vs CPU, Full (2x20) or Blitz (2x10), Easy / Medium / Hard | open from first launch | `MODES.quick_*`, `MODES.blitz_*` |
| Tournament | a bracket of Quick Matches | after 1 completed match ("Complete 1 match (0/1)") | `MODES` |
| Championship | harder bracket | after a Tournament win ("Win 1 Tournament (0/1)") | `MODES` |
| Ghost Ladder / Daily Ghost | beat a recorded ghost's raid score; defend a recorded ghost raider | after Trial 5 | `ghost.ts`, `ghosts.ts`, unit `gate` |
| Auction | bid for squad players against AI franchises with a purse | Trial 34 (or the basic team builder from the start) | `Lot`, `bid`/`pass` decisions |

## Rules engine (`src/game/rules.ts`) — single source of truth
Every raid ends in one `RaidResult`; `scoreRaid()` returns the referee events and the new match. The scoreboard is
the sum of those events, so the referee panel and the scoreboard can never disagree (validate re-counts 1000
rule-level matches and 1000 engine matches: 0 mismatches). Touch points, bonus only with 6+ defenders, tackle,
Super Tackle (+2 with 3 or fewer defenders), Super Raid (3+ touches), revival one-per-point (first out, first back),
all-out +2 with the whole side returning (the half goes on), Do-or-Die on the third straight empty raid, 30 s raid
clock, 20-minute halves with a half-time swap. Game clock: each raid costs its raid time + 28 s of dead time
(≈ 28 raids a side per match; at the 5x clock scale a half is ≈ 4 real minutes).

## How a match is played (`src/game/engine.ts`)
The match screen's real-time controls (drag path, move arcs, tackle ring, struggle taps) end in discrete decisions;
execution is resolved by the seeded engine, and every random result waits for its animation ("go"), so a decision
is always taken on what the player can see, never on the dice.
- **My raid**: Hand Touch / Toe Touch / Backward Kick on a defender, the Bonus hop, then walk / Dash / Dubki home.
  Danger comes from the target and the defenders beside him, by trait vs move (table in `engine.ts`), and grows
  with each touch already made. Held → struggle: pull-away (stamina) or lunge (strong when shallow).
- **My defence**: the CPU raider's move is telegraphed (feinting raiders lie at their feint rate). Ankle / Thigh /
  Rush by any defender within two of his target, Chain (two adjacent defenders), Block (the midline wall), Hold.
  Success depends on the hold vs the move, position (the cover beside the target is best), role specialists, the
  timing window and the raider's skill. Random choices miss 74% of the time (validate: need ≥ 30%).
- **CPU raider brains**: Easy (random target/move), Medium (avoids my specialists' strengths), Hard (counters my
  shape, Do-or-Die aware); every possession is a real raid with a plan (target, move, way home, depth, feint).
- **Scouting (the defence reads repeats)**: from trial 27 a touch move or way home used on my previous raid is
  more likely to be held (rising by chapter, strongest in the World Final), so a single safe answer can't be
  spammed — alternate the two good reads of a formation.
- **Chain cost**: a broken chain costs both links (the raider tags his way out through the pair).
- **DRS**: close touch calls can be wrong ("tight" 1 in 5, "very tight" ~1 in 2); reviews are limited.
- **Fatigue**: rotation trials give 2-3 raiders with stamina; a tired raider reaches less and escapes less.
- **Auction**: lots with visible stats and a market range; the franchises bid while a lot is worth it to them.

## Roster of mechanics — introduced alone, twisted, then combined
| Mechanic | Introduced | Twisted | Combined |
|---|---|---|---|
| Hand Touch, walk home | 1 | 2 (thigh-holders punish it) | everywhere |
| Thigh-holder defenders (T) | 2 | 12 (all seven T: change the move) | 9, 13 |
| Dash home | 3 | 14 (the wall stops it) | 9-11 |
| Ankle Hold, tackle ring, cover position | 4 | 6 (cover tackles + return tackle) | 8-11 |
| Thigh Hold (match the hold to the move) | 5 | 15 (defend the way home) | 8-11 |
| Struggle pull-away | 7 | 24 (lunge vs pull) | 31 |
| Toe Touch | 12 | 13 (ankle-catchers punish it) | 14, 16 |
| Dubki, Blocker wall (B) | 14 | 48 (the Cage), 58 (CPU Dubki King) | 16, 18, 30 |
| Block (defence) | 15 | 29 (vs a kicker) | 30 |
| Empty-raid counter / Do-or-Die | 16 / 18 | 17 (their Do-or-Die), 20 (spike) | 22 |
| Bonus line | 19 | 49 (the Pincer bait) | 20, 21 |
| Backward Kick, Rusher defenders (R) | 23 | 27 (down to 5), 29 (CPU kicker) | 30, 49 |
| Escape lunge | 24 | 31 | 33 |
| Defender Rush | 25 | 29 (never chase a kicker) | 30 |
| Super Tackle | 26 | 47 (from three, with a chain) | 31, 64 |
| All-out / revival | 28 / 31 | 64 (last stand) | 33 |
| Auction, player roles | 34 | 41 (buy for the opponent), 42 (tight purse) | 38, 44 |
| Hold specialists, Anchor | 35 / 36 | 39 (switch for the next target) | 40, 43 |
| Defence reads repeats | 27 | 60, 62 (stronger reads) | 30, 40, 52, 66 |
| Feints | 37 | 59 (Feint Master) | 40, 62, 66 |
| Super Raid | 45 | 52 (Diamond) | 54, 63 |
| Chain Tackle | 46 | 47 | 51, 59 |
| Formation themes (Cage, Pincer, Diamond, Wall) | 48 | 49, 52, 62 | 53, 61 |
| DRS review | 50 | 53 | 55, 62, 65 |
| Ghost Gate / Ghost Duel | 51 / 53 | — | Daily Ghost, Ladder |
| Fatigue + raider rotation | 56 | 60 | 65, 66 |
| Rival captain (K) / rival raider signature | 57 / 58 | 59, 61 | 62, 64-66 |

## Progression and reasons to return
- Chapters: Village Mat → District Cup → State League → Auction Season → Continental Cup → World Championship,
  each 11 trials: intro trials, twists, combines, a breather, a spike and a Full Match boss.
- Stars: 3 per trial (win + two trial-specific goals tied to its lesson); stars open chapter chests.
- Squad: the auction (chapter 4 onwards) builds the defenders' roles and the raider's stats that the matches use.
- Ghosts: recorded raids replay exactly (input trace + seed), the Daily Ghost and the ladder reuse the pipeline.
- Difficulty curve (casual bot win rate, measured by `npm run playtest`): Ch1 ~99 → 76%, Ch2 85 → 55-64%,
  Ch3 80 → 54-59%, Ch4 74 → 50-54%, Ch5 65 → 41-45%, Ch6 62 → 39%; breathers after every spike.
  Tuned by `scripts/tune-units.ts` (one difficulty knob per trial: opponent grip, CPU raider skill/timing window,
  or purse); `scripts/record-ghosts.ts` picks the ghost whose score paces the Ghost Duel.

## Every trial
