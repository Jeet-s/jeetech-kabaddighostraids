# Kabaddi Ghost Raids: Raid League — Content plan

This is a CONTENT game: the campaign is 66 handcrafted **Raid Trials** (short scored match situations and six
chapter-boss matches of ~17-22 raids) in 6 chapters, plus the open modes. Engine: `src/game/` (pure TypeScript, no UI).
Data: `src/game/units.ts` (trials), `src/game/tuning.json` (measured knobs), `src/game/ghosts.ts` (recorded ghosts).

## Modes
| Mode | What it is | Gate | Engine |
|---|---|---|---|
| Campaign | 66 Raid Trials, 3 stars each, 6 chapters, a Full Match boss per chapter (each ~17-22 raids) | open | `UNITS` |
| Quick Match | vs CPU, Full (2x20) or Blitz (2x10), Easy / Medium / Hard | open from first launch | `MODES.quick_*`, `MODES.blitz_*` |
| Tournament | a bracket of Quick Matches | after 1 completed match ("Complete 1 match (0/1)") | `MODES` |
| Championship | harder bracket | after a Tournament win ("Win 1 Tournament (0/1)") | `MODES` |
| Ghost Ladder / Daily Ghost | beat a recorded ghost's raid score; defend a recorded ghost raider | after Trial 5 | `ghost.ts`, `ghosts.ts`, unit `gate` |
| Auction | bid for squad players against AI franchises with a purse (trials 34, 41, 42; optional in 44) | Trial 34 (or the basic team builder from the start) | `Lot`, `bid`/`pass` decisions |

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
- **DRS**: close touch calls can be wrong ("tight" 1 in 5, "very tight" ~1 in 2); reviews are limited.
- **Fatigue**: rotation trials give 2-3 raiders with stamina; a tired raider reaches less and escapes less.
- **Auction**: lots with visible stats and a market range; the franchises bid while a lot is worth it to them.

## Roster of mechanics — introduced alone, twisted, then combined
| Mechanic | Introduced | Twisted | Combined |
|---|---|---|---|
| Hand Touch, walk home | 1 | 2 (thigh-holders punish it) | everywhere |
| Thigh-holder defenders (T) | 2 | 12 (all seven T: change the move) | 9, 13 |
| Dash home (the way home is a choice) | 3 | 14 (the wall, drawn on screen) | 9-11 |
| Ankle + Thigh Hold, tackle ring (match the hold) | 4 | 15 (defend the way home) | 8-11 |
| Second touch (raid depth, greed) | 5 | 10 (comeback) | 45 (super raid) |
| Cover position (cover ring on screen) | 6 | 36 (Anchor range ring) | 8-11 |
| Struggle pull-away | 7 | 24 (lunge vs pull) | 31 |
| Referee's call (one-off moment) | 8 | — | — |
| Mid-match reversal | 9 | 55 (half-time: Cage → Ankle Line) | — |
| Rival personality (greedy captain) | 11 | 58 (Dubki King), 59 (Feint Master: feints on the way home) | 60, 66 |
| Toe Touch | 12 | 13 (ankle-catchers punish it) | 14, 16 |
| Dubki, Blocker wall (B) | 14 | 48 (the Cage), 58 (CPU Dubki King) | 16, 30 |
| Block (defence, wider window in the lesson) | 15 | 29 (vs a kicker) | 30 |
| Empty-raid counter / Do-or-Die | 16 (hard mat: one patient empty raid) / 17 | 20 (one-point thriller) | 22 |
| Bonus line | 18 | 49 (the Pincer: a coin-flip risk) | 20, 21 |
| Backward Kick, Rusher defenders (R) | 23 | 27 (a rush line: the Kick is the safest touch), 29 (CPU kicker: step back) | 30, 49 |
| Escape lunge | 24 (alone: no Dubki, no Kick) | 31 | 33 |
| Defender Rush | 25 | 29 (never chase a kicker) | 30 |
| Super Tackle | 26 | 47 (from three, with a chain) | 31, 64 |
| Defence reads repeats (SCOUTED tag, capped; off where a row says "no scouting": 27, 28, 40, 43, 45, 54, 60) | 30 (on a combine: the tag + READ explain it) | 62 | 65, 66 (light) |
| All-out / revival | 28 (four left, two moves) / 19 (defence wins men back) | 31 (whole comeback), 64 (last stand) | 33 |
| Auction, player roles | 34 | 42 (rival bidder) | 41 (scout), 44 (pre-match auction: must sign a Corner) |
| Hold specialists, Anchor (range ring) | 35 / 36 | 39 (switch for the next target) | 40, 43 |
| Feints + feint tell | 37 (on the touch) | 59 (on the way home only), 65 | 66 (the tell shows on only half his feints) |
| Super Raid | 45 | 52 (Diamond) | 61, 63 |
| Chain Tackle | 46 | 47 | 51, 59 |
| Formation themes (Cage, Pincer, Diamond, Wall) | 48 | 49, 52, 62 | 53, 55, 61 |
| DRS review (on an easy mat; the first close call is always a wrong "very tight" one) | 50 | — | — |
| Ghost Duel / Ghost Gate | 21 (friend's ghost, breather) / 51 | 53 (weekly ladder ghost in the Cage) | breathers 32 (rival), 54 (friend's rematch), 63 (legend's ghost on defence); Daily Ghost, Ladder |
| Fatigue + raider rotation | 56 | 60 | 65, 66 |
| Rival captain (K) | 57 | 61 (two ways home), 64 | 60, 62, 65, 66 |

## Level-design review fixes (2026-11-07)
- Chapter 1: Hold the Line (4) teaches both holds at once (the old 4+5 drill pair); the freed slot is **Second Touch** (5,
  greed vs raid depth). Cover Tackle (6) teaches only WHO tackles, with the cover ring on screen. Village Fair (8) has a
  one-off referee's call (lobby), Two-Way Duel (9) a mid-match reversal, and the Village Final (11) is a 2x6 mini-Blitz
  (~17 raids) against Bholu, a greedy captain who goes for two touches 8 raids in 10 and always Dashes.
- Do-or-Die spread out: 16 empties → 17 your Do-or-Die → 18 bonus line → 19 their Do-or-Die (+ revivals: 2 of yours
  out, every stop brings one back) → 20 thriller without a forced start or two-touch raider.
- Every boss fits one session: ~14-17 raids where possible (11: 2x6 Blitz, 22: last 10 minutes, 44: 2x5 Blitz,
  65: last 10 minutes, 66: 2x6 Blitz from 1:00); 33 and 55 keep their half-time reversals (~15-21 raids).
- Second review pass (2026-11-07): goals that were luck cliffs were eased — 17 gets a 3rd raid after the Do-or-Die, 40 is
  4 raids each and win by 1, 46 needs ONE chain, 47 allows 2 conceded, 49 needs 4 points, 52 has no feints (the test is
  the shape), 56 is win by 3 (not 4), 64 starts with 4 on the mat (one more out makes every tackle Super), 66 is win
  by 1 from 0-2. Difficulty moved to where a decision carries it: 59 concedes at most 3 against a gentler Feint Master,
  62 joins 9-11 down.
- Repeat reads are capped and telegraphed: a scouted move's gem shows a SCOUTED tag and costs a fixed ~5-9 points
  (engine `SCOUT_G`: the rise no longer scales with a boss's grip). Feints get a visible tell (`AIRaider.tell`): with the
  tell shown the telegraph is a lie, a clean telegraph is ~88-90% true.
- The CPU kicker has a counter: Hold (step back) vs a real Kick — nobody to tag 65% of the time (`KICK_STEP_BACK`).
- Auctions vary: 34 Raider+Corner+Anchor (purse helper); 41 Corner+Anchor for a scouted opponent; 42 a rival franchise
  that overpays for the first Anchor (`rival`); 44 optional. `goal.purse` (keep N lakh) is supported for future units.
- Ch5-6 variety: 49 Pincer bonus hop a coin-flip risk (~1 in 2 held), 50 DRS on an easy mat, 55 half-time reversal, 59 feint
  tell, 60 captain benched mid-match, 61 two competing ways home that change as the chain breaks.
- describe() READ rows list the % the gems show for every option (never "the best stop"); every row carries the full
  legend plus a short KEY of the traits on that mat.
- Later review rounds: 38 is now **Hold the Lead** (protect a 20-18 lead, lose the moment you trail — a game-management
  goal instead of a third pure auction); 40 Specialist Derby is Ch4's spike (no feints, no scouting) and 42 Rival
  Franchise is an auction-only twist; 44's pre-match auction is optional (every buy still plays). Breathers got toys:
  32 bonus trophy, 43 kick exhibition (raid score attack), 54 Super Raid booth, 63 legends' chain-tackle show. 37
  introduces the feint tell, 59/65/66 reuse it (66 is a 3-system final: captain, Feint Master, rotation; no DRS).
  Unreachable 3rd stars fixed: a trial ends the moment its goal is met, so "stop N+1" / "score N+2" stars became
  "win within N of his raids" (`fastD`) / "win within N raids" (`fast`) and lesson-tied stars.
- Round 2026-11-07 (late): Ghost Gate (51) — the right counter to a known ghost raid stops +15 points (engine
  `GATE_COUNTER_BONUS`, shown in READ), concede limit 5. Ghost Duel: Cage (53) drops DRS, shows the ghost's score in the
  brief and has reachable stars (Dubki twice, never caught). Night Wall (62) drops feints and DRS, gives the Dash back
  (drawn WALLED) and swaps the T's beside the captain for rookies. Lap of Honour (63) needs 1 chain. Champion's Gauntlet
  (65) drops DRS and halves scouting. Harder finale: 55's half-time Ankle Line keeps two T's (ATAoATA); 66 starts 0-2 at
  1:00 and the Feint Master's tell shows on only half his feints. 17 needs a greedy touch (3 points in 2 raids), 29 and
  41 ask for 2 stops, 38 fails only when trailing by more than 2, 56 is 6 raids each. DRS now only in 50 and 55.
- Tuning (`scripts/tune-units.ts`) aims at the mean of the factory playtest (fixed start) and the mid-skill player on
  100 fresh match seeds (the PROOF row), so both numbers the review reads agree.

## Level-design review fixes, round 3 (2026-11-07)
Reviewer score 7/10: L59, L16, L19, L28, L45, L52, L55, L66 were below 6, and Ch5-6 played as a wall. Each was rebuilt by hand:
- **16 Count the Empties**: all-hard mat (A T A T A T A, every touch ~20-35% held), lead 8-7 on 1 empty raid, just win —
  the patient empty raid is now the right play; 3rd star = exactly one empty raid (new star key `empties`).
- **17 Do-or-Die**: one lesson — win the forced raid; goal 2 points in 3, the greedy third point is a star.
- **19 Win Them Back**: one lesson, revival — two of yours out, every stop brings one back; no Block, no minimum-mat
  fail, all 7 back is the 3rd star. (31 now builds a whole comeback on it.)
- **25 Charge the Hop**: he hops only about half the time, so every raid is a read (Rush the hop, hold the touch).
- **28 All Out!**: four left (rookie corners, a T beside an A): two moves, an order and revivals to manage, 4 raids.
- **38 Hold the Lead**: 20-19, lose the moment you trail by more than 1, a Medium-thinking captain (was Hard).
- **40 Specialist Derby**: no Blocker wall (one dimension less), 5 raids each.
- **45 Super Raid**: soft mat (six rookies, one T), 4 raids. **49 Pincer**: one must — a bonus point among 3 points; hop
  first while seven stand (the bots' value now prices the dying bonus line, `bonusNeed`).
- **50 Third Umpire**: until the first review, every close call is a wrong "very tight" one (`drsFirstWrong`), 1 review —
  the DRS star is always reachable.
- **52 Diamond**: a lesson in the shape, layer by layer; Medium raider, win by 2.
- **55 Semi-Final**: 12 raids around half-time from 5-6, no feints, no DRS. **56 Rotation**: soft mat, gentle raider.
- **58 Dubki King**: a second read (Hand or a Kick at a chaser) on top of the signature Dubki.
- **59 Feint Master**: 4 raids, feints 15% on the WAY HOME only (tell on 3 in 4: a clean telegraph is true 96%).
- **66 World Final**: no deficit (0-0 Blitz 2x5), grip capped at 1.45 (was 1.59), the Feint Master's tell as in 59.
- **Ghost duels as breathers** (the async-PvP pillar in every chapter from 2): 32 Rival's Ghost (kick the rushers),
  53 Cage ghost now 4 points (target 5), 54 Friend's Rematch, 63 Legend's Ghost (a recorded ghost raider on defence).
- Second pass the same day: scouting off where it only added noise (33, 49, 57, 62 — 62 now has one clearly good way home,
  the Dubki), 33 joined 11-12, 47 four raids.
- **Retry assist**: after a failed attempt, Try Again opens with the coach guiding the first raid (the solution's
  first move glows), so a fail is followed by being shown the answer.
- Pacing: last third casual 64% (gate ≤ 65%), skilled 80%; no late trial under 55% casual; validate's mid-skill player
  now draws a per-trial seeded stream (numbers no longer shift when another trial changes); late/early 3.25x.

## Level-design review fixes, round 4 (2026-11-07, review 6.5/10)

- **The Kick is no longer free on every Rusher** (engine `KICK_BACK`): a Rusher standing NEXT to the kicked man charges
  the raider's turned back. A lone Rusher is still the safe Kick (trial 23's lesson); a rush line in pairs punishes it
  (trial 27 is now "kick the lone one, then break a pair"), and the World Final captain's Kick weakness is guarded by
  his two Rushers until one is tagged out (66). Every Kick gem also shows its landing chance ("Kick · lands 66%" on a
  captain, 92% on a Rusher) and the READ row prints it.
- **Ghost Duels replay the ghost raid by raid** (`ghostRaids()` in `src/game/ghost.ts`, replayed from the trace): the mat
  shows the ghost's same-numbered raid, its plan and its result; describe() prints the full GHOST REPLAY row
  (21, 32, 53, 54) — the duel is a read of a real run, not a static number.
- **READ shows both struggle gems by depth** (pull / lunge after 0, 1, 2 touches) — trial 24's lesson is visible, and
  24 no longer has the Toe.
- Redesigned by hand: 14 (Dubki alone: tag the corner Ankle-catcher out, then duck under the T's), 16 (T block + A
  block: the counter touch on the inside of each block is 40+ points safer), 27, 34 (purse 72: the star no longer fits
  with the other two roles), 41 (purse 66, Anchor sold first, Ankle Corner valued 32-44, mixed Toe/Hand raider), 43
  (Fans' Day is now the bonus-hop show, 3 stars reachable), 47 (replaces the trial-26 repeat: chain a greedy
  three-touch raider on his way home), 48 (Ankle corners: the Cage is opened from the outside in), 49 (no Kick; the
  bonus hop is the riskiest, required option), 51 (the ghost raider may make the two-touch raid its plan has), 62
  (captain weak to the walk: walk vs Dubki is a real choice each raid), 63 (concede at most 2 vs the Legend's
  two-touch signature raids).
- Not changed this round (noted for the next): 50's DRS calls, 30's scouting introduction inside a match, 35's
  specialist multiplier, the player-built Ghost Gate (51).

## Progression and reasons to return
- Chapters: Village Mat → District Cup → State League → Auction Season → Continental Cup → World Championship,
  each 11 trials: intro trials, twists, combines, a breather, a spike and a Full Match boss.
- Stars: 3 per trial (win + two trial-specific goals tied to its lesson); stars open chapter chests.
- Squad: the auction (chapter 4 onwards) builds the defenders' roles and the raider's stats that the matches use.
- Ghosts: recorded raids replay exactly (input trace + seed), the Daily Ghost and the ladder reuse the pipeline.
- Difficulty curve (casual bot win rate, measured by `npm run playtest`, see the trial tables): Ch1 99 → ~80-87%,
  Ch2 ~77-91%, Ch3 ~67-84%, Ch4 ~62-85%, Ch5 ~55-81%, Ch6 ~53-73%; last third ~64% mean; breathers after every spike.
  Teach units and breathers keep a gentle CPU raider (skill ≤ 0.45); repeat-reads are capped (SCOUTED, ~5-9 points).
  validate.ts difficulty = the mid-skill player's expected failed attempts before a win (1/p − 1).
  Tuned by `scripts/tune-units.ts` (one difficulty knob per trial: opponent grip, CPU raider skill, never the purse);
  `scripts/record-ghosts.ts` picks the ghost whose score paces the Ghost Duel.

## Redesign pass 3 (level review 6.5/10: walls at 55-65% casual, combine soup, repeats)
Each listed trial was changed by hand, then re-measured (playtest bots + validate's competent / mid-skill players):
- **22 District Final**: 8 minutes (~12 raids) instead of 10, grip 0.82 → 0.68 — the boss is a session, not a slog.
- **24 Lunge for the Line**: ONE lesson — no Dubki, Kick or bonus, so you are held and must choose lunge vs pull.
- **27 Turn the Raid**: kicks only — five Rushers and two rookies, no Toe, no scouting; 2 Kicks needed.
- **29 The Kicker**: kicker skill 0.65 → 0.55 (competent 28 → 36 of 40). **30 Rush Hour**: grip 0.8 → 0.72.
- **33 State Final**: grip 1.26 → 1.0, CPU 0.68 → 0.65 (mid-skill 63 → 83%). **35 Corner Specialists**: CPU 0.45 → 0.38.
- **38 Hold the Lead**: Medium brain, grip 0.98 → 0.85. **19 Win Them Back**: CPU 0.54 → 0.45.
- **40 Specialist Derby**: one layer removed — no Rushers/Kick, a pure specialist mirror (A T T o T T A vs your A T o K o T A).
- **44 Season Final**: the auction is mandatory-light — the squad must include a Corner (`needRoles`), CPU 0.7 → 0.6.
- **47 Last Three Standing**: cover rings on the mat show the strong tackle, 3 conceded allowed (was 2).
- **51 Ghost Gate**: CPU 0.67 → 0.62 (competent 27 → 31). **58 Dubki King**: CPU 0.54 → 0.5.
- **59 Feint Master**: no longer L37 again — he only Hand Touches, the feint is on the WAY HOME (read his feet, not his hands).
- **60 Endurance**: split — fatigue + rival captain only (no scouting, no reversal).
- **64 Last Stand**: grip 1.32 → 1.2, CPU 0.68 → 0.6. **65 Champion's Gauntlet**: CPU 0.7 → 0.65.
- The last third must stay ≤ 65% casual on average (QA pacing gate): 45 (grip 1.25), 56 (grip 1.42), 62 and 63 (CPU) took
  a little of the difficulty the eased walls gave up, with the competent player still winning ≥ 31/40 everywhere.
- **1 First Raid**: no longer seven rookies — one Thigh-holder dead centre makes the obvious target the wrong one (READ %), 2 points in 3 raids.
- **36 The Anchor**: their raider never Dubkis (range is the only question), CPU 0.36 → 0.25. **65 Champion's Gauntlet**: one system less — no fatigue/rotation (that is 60), feints + the captain's Kick only.
- Chapter 1 rescue: one caught raid from failing a chapter-1 trial, the coach shows the safest pick for the next raid.

## Every trial

### Chapter 1 — Village Mat (trials 1-11)

| # | Trial | Type · role | Introduces | What it tests (aha) | Casual / skilled bot |
|---|---|---|---|---|---|
| 1 | First Raid | Raid Puzzle · teach | hand touch, walk home, the READ % | Guided first raid, then one real read: six rookies and ONE Thigh-holder (T), standing dead centre — the man right in front of you. The coach walks the first raid (tap a defender → Hand Touch → Walk Home) and the referee panel gives the point only once you cross the midline: a touch counts only when you get home. Then you raid alone, and the obvious target is the worst one: the % under the Hand Touch gem jumps on the T (READ). Aha: the number under the gem is your real risk — read it, then touch a rookie. 2 points in 3 raids. | 96% / 98% |
| 2 | Read the Gap | Raid Puzzle · teach | thigh-holder defenders | Two rookies stand in the gap between five big Thigh-holders (T). A Hand Touch on a T, or beside him, gets you grabbed; the rookie pair in slots 3-4 is the safe touch. Aha: read the gap, not the defender. 2 points in 3 raids. | 93% / 91% |
| 3 | Burst Home | Raid Puzzle · teach | dash home | Teach the way home: five Thigh-holders stand between you and the midline and only the two left-hand men are rookies. The touch on the corner rookie is safe either way; the walk home past five slow-reaching T's is the risk (READ: walk home held about 2.5x as often as the Dash). Aha: the way home is a choice too — touch the safe rookie, then burst home with the Dash. 3 points in 4 raids. | 89% / 99% |
| 4 | Hold the Line | Defend Stand · teach | defender select, ankle hold, thigh hold, tackle ring | First defence, in one drill: select a defender beside the raider's target, pick the hold, and press on the tackle ring. The village raider telegraphs his touch — a Hand Touch (high) or a Toe Touch (low). The Ankle Hold catches a Toe, the Thigh Hold catches a Hand; the wrong hold misses about 3 times in 4, and 'Hold' (no tackle) just hands him the point. Aha: watch his move, then match the hold. Stop 3 of his 5 raids, concede no more than 4. | 87% / 96% |
| 5 | Second Touch | Raid Puzzle · teach | second touch (raid depth) | Teach greed: a rookie pair stands on each corner around a wall of three Thigh-holders. 4 points in 3 raids means at least one raid must take two touches — but every touch already made raises the next touch's risk by a third and makes the way home deeper (READ: home after 1 touch vs after 2). Aha: be greedy only along a rookie pair — the corner first, then his rookie neighbour away from the T, then Dash home; a second touch next to a T is where raids end. | 86% / 97% |
| 6 | Cover Tackle | Defend Stand · twist | cover position | Twist: not WHICH hold but WHO tackles. This raider only Hand Touches and walks home, so the Thigh Hold is always the right hold; the cover ring on screen shows who should make it — the man he touches tackles at 82% of full strength (he is off balance), his neighbour, the cover, at 100%, two away at 55%. Aha: let the cover make the tackle, never the man being touched. Stop 3 of 5. | 91% / 99% |
| 7 | Grip and Rip | Raid Puzzle · teach | struggle (pull-away) | Five Thigh-holders with strong grips around one rookie: even good raids get held here. Held raiders play the struggle — the pull-away breaks free about half the time, and the defender holding you counts as touched when you do. Aha: a hold is not the end — keep raiding the rookie gap and rip loose when grabbed. Score 3 in 5 raids; caught 3 times and it's over. | 93% / 99% |
| 8 | Village Fair | Match · breather | raid and defend in turns, referee's call | Breather and the first real match flow: 3 raids each against a gentle village side (two Thigh-holders, a Hand-Touch-only raider), the sides swapping after every raid. After the first two raids the referee steps in: LOBBY — their Thigh-holder in slot 2 stepped out of bounds and is sent off the mat, so the gap you have been raiding changes shape. Aha: after a referee's call, re-read the mat before you raid. Win the segment by 1; 3 stars for winning by 4. | 85% / 90% |
| 9 | Two-Way Duel | Match · combine | mid-match reversal | Combine both halves of chapter 1, then flip them: 4 raids each. At first T's guard both corners and the centre, so raid the gaps and Dash home, and their raider mixes Hand and Toe, so match the hold. After two raids each their coach reverses everything: the T's move into the old gaps (rookies now at the corners and the centre) and their raider switches to Toe Touches and Dash home only. Aha: a reversal is a new puzzle — re-read both ends (your safe touch moves, and one Ankle Hold now beats both his touch and his way home). Win by 2. | 89% / 91% |
| 10 | Dusk Showdown | Comeback · spike | comeback from a deficit | Spike: 15:00 of the second half, 11-13 down, 4 raids each left against the village's best raider. Two points is a lot in 8 raids: you need one stop and steady touches, and a second touch only when the gap beside your first is a rookie. Win by 1. | 85% / 85% |
| 11 | Village Final | Full Match · boss | full match, half-time swap, rival personality | Chapter boss and the first whole match, kept short: the Village Final as a mini-Blitz of 2x6 game minutes (~17 raids in all) with a half-time swap. Their captain Bholu has a personality you can read: he is greedy — he goes for two touches on 8 raids in 10 and always Dashes home. Aha: his second touch and his Dash are your chances — tackle his next target with the cover, or Ankle his Dash home; on your raids, raid the rookie gaps and Dash past the T's. Win the match. | 87% / 95% |

### Chapter 2 — District Cup (trials 12-22)

| # | Trial | Type · role | Introduces | What it tests (aha) | Casual / skilled bot |
|---|---|---|---|---|---|
| 12 | Long Reach | Raid Puzzle · teach | toe touch | Seven Thigh-holders and no gap at all. A Hand Touch into a T gets you held about 1 time in 5, the Toe Touch's long low reach only 3% (see READ). Aha: change the move, not the target. 3 points in 4 raids. | 89% / 99% |
| 13 | Ankle Trap | Raid Puzzle · twist | ankle-catcher defenders | Twist: Ankle-catchers (A) on both corners and slot 3 wait for your Toe Touch, the T's wait for your Hand. The READ row shows the counter for each slot: Hand on an A, Toe on a T — and slot 2, a T between two A's, is the one to avoid with both. Aha: every defender has a counter. 4 points in 5 raids. | 89% / 97% |
| 14 | Duck Under | Raid Puzzle · teach | dubki | Teach the Dubki ALONE (no Toe, no Dash, no wall, no bonus): four Thigh-holders in the middle reach for anyone walking home, and the Dubki ducks under a Thigh-holder's reach (READ after a touch: walk ~32% held, Dubki ~17%). One defender reads it: the Ankle-catcher on the left corner — and he is also the safest touch on the mat (Hand on the A ~4%). Aha: the Dubki is the way home under a reach — and it gets cleaner still once the corner Ankle-catcher is tagged out. Score 3 in 4 raids, at least one point coming home on a Dubki. | 79% / 85% |
| 15 | Build the Wall | Defend Stand · teach | block (defensive wall) | Teach the Block: the district sprinter telegraphs his way home — mostly a Dash, sometimes a walk. Against a Dash, let the touch go and form the Block on the midline (its timing window is a little wider in this first lesson, READ); against a walk the Block is weak and the Thigh Hold is the stop. Aha: defend the way home, not the touch — and read WHICH way home before you build the wall. Stop 3 of 5. | 78% / 84% |
| 16 | Count the Empties | Match · teach | empty-raid counter | Teach the empty-raid counter: you lead 8-7, already on 1 empty raid, and their mat is all hard — three Thigh-holders on the left, three Ankle-catchers on the right, a T on the far corner, no rookie anywhere. Each block has ONE counter touch and it is far safer than the wrong one (READ: Toe on a T inside the T block ~10-13% vs Hand ~50-60%; Hand on the A in the middle of the A block ~11% vs Toe ~60%); the men where the blocks meet are dangerous both ways. A caught raid hands them the point and the lead, an empty raid (walk home without touching) is free while you lead — but the THIRD empty in a row is Do-or-Die, so you get exactly one free one. Aha: spend the one patient empty raid, then touch the INSIDE of a block with its counter move. 4 raids each; finish ahead. The 3-star play is exactly one empty raid. | 82% / 91% |
| 17 | Do-or-Die | Do-or-Die Drill · teach | do-or-die raid | One lesson — survive the Do-or-Die: you are on two empty raids, so your FIRST raid must score or your raider is out. Ankle-catchers on the corners, a Blocker wall in the middle: the wall shuts the Dash home and the A's read the Dubki, so the safe way back is a plain walk, and the safe touch is a Hand on a corner A (READ). Win that raid and the trial is yours: score 2 in 3 raids. The greedy 3-point run (a second touch on a free raid after the Do-or-Die) is the star, never the goal. Aha: under Do-or-Die take the surest point, not the biggest. | 83% / 87% |
| 18 | Bonus Line | Raid Puzzle · teach | bonus line | Teach the bonus line: with 6+ defenders on the mat a hop over the bonus line scores 1 and puts nobody out. Rookie corners make the hop safe. Aha: bonus first — every touch puts a man out and below 6 the bonus line is closed. Earn 2 bonus points and 4 points total in 4 raids. | 80% / 96% |
| 19 | Win Them Back | Revival Run · twist | revival | Twist, one lesson — revival: two of your side are already out (5 on the mat). Every point you win brings one back, first out, first back, and a tackle is a point — so each stop is a man returning to the mat, each touch he lands sends another off. Only the two holds you know (no Block): his telegraph shows Hand or Toe, Thigh the Hand, Ankle the Toe, with the cover beside his target. Aha: defence is how you rebuild — two clean stops put all seven back. Stop 2 of his 4 raids and concede no more than 3; finishing with all 7 on the mat is the 3-star rebuild. | 85% / 93% |
| 20 | One-Point Thriller | Match · spike | — | Spike built only from chapter 2's verbs: level at 13-13, 4 raids each left. You are on 1 empty raid (one more patient raid is allowed, a second would make the third Do-or-Die), their raider takes one touch or hops the bonus. Ankle-catchers on the corners make your bonus hop a real risk (READ); the rookies in slots 2 and 6 are the safe touches, the T's beside the Blocker want the Toe. Aha: in a one-point game, count the empties — bank one safe Toe point early, then decide whether the bonus is worth its risk. Win by 1. | 79% / 86% |
| 21 | Friend's Ghost | Ghost Duel · breather | ghost duel | Breather after the thriller, and the first Ghost Duel: your friend Arun raided this same friendly mat (seven on, rookie corners, bonus line open) and his run is REPLAYED raid by raid — before each of your raids the mat shows what Arun did on that raid number and what it scored (GHOST REPLAY row: a bonus hop and a Toe for +2, an empty Dubki, a Toe for +2, then a greedy four-touch raid that got him caught). Beat his 4 in 4 raids. No defending, no clock pressure. Aha: his replay is your scouting — copy what worked (hop the bonus while seven stand), skip the empty raid, and never make his last-raid mistake of a fourth touch. | 85% / 91% |
| 22 | District Final | Full Match · boss | — | Chapter boss with a Do-or-Die finish, kept to one session: the last 8 minutes of the District Final (~12 raids), one down at 16-17. A, T and B defenders and a raider who hops the bonus and Dubkis home; Do-or-Die is live on both sides, so the empty raids you spend early decide who is forced at the end. Aha: manage the empties like a clock — spend patience while level, never while behind. Win the match. | 80% / 86% |

### Chapter 3 — State League (trials 23-33)

| # | Trial | Type · role | Introduces | What it tests (aha) | Casual / skilled bot |
|---|---|---|---|---|---|
| 23 | Rushers | Raid Puzzle · teach | backward kick, rusher defenders | Teach the Backward Kick: Rushers (R) charge the raider and hold about a third of Hand or Toe Touches near them, but a Backward Kick tags a charging R at a fraction of that risk (READ). Aha: let the rusher come to you. Score 2 Kicks and 3 points in 4 raids. | 81% / 91% |
| 24 | Lunge for the Line | Raid Puzzle · teach | escape lunge | Teach ONE thing, the Escape lunge: no Toe, no Dubki, no Kick, no bonus — Thigh-holders and a chained pair (C C) will hold you, so you WILL be held, and the trial is about what you do then. The READ row lists both struggle gems by depth: the lunge for the line is the strong escape when held shallow (0 touches: lunge ~62% vs pull ~45%), they are level after one touch, and after two the lunge collapses (~28%) while the stamina pull-away stays ~45%. Aha: shallow → lunge, deep → pull — and that is why one touch per raid is the plan here, not three. Score 4 in 4 raids; caught 3 times and it's over. | 77% / 87% |
| 25 | Charge the Hop | Defend Stand · teach | defender rush | Teach the defender Rush, and when NOT to use it: the state raider hops for the bonus line on about half his raids and Hand- or Toe-touches on the rest. A corner Rush is the best answer to a hop, but it is the worst answer to a touch — the holds stop touches (READ). So every raid is a read: hop → Rush, Hand → Thigh, Toe → Ankle. Aha: rush the hop, hold the touch. Stop 2 of 4 raids, concede no more than 3. | 74% / 83% |
| 26 | Super Tackle | Super Challenge · teach | super tackle | Teach the Super Tackle: you have only 3 on the mat, so any tackle is worth 2 — but he goes for two touches, and lose all 3 and the all-out gives them +2. Choose WHICH of your three makes the tackle — the one beside his target (cover), never the man he touches. Aha: three defenders are a threat, not a weakness. Land a Super Tackle within 4 raids and concede no more than 2 (his two-touch raid can cost two at once). | 81% / 88% |
| 27 | Turn the Raid | Raid Puzzle · twist | backward kick vs a rush line | Twist on the Kick (trial 23 taught: the Kick tags a charging Rusher). Now the Rushers stand in PAIRS — R R o R o R R — and a Rusher next to the kicked man charges your turned back (READ: Kick on a paired R ~18-20% held, Kick on the lone R in the middle ~7%, a Hand on a rookie between Rushers ~25%). No Toe, no scouting. And the mat changes as you score: every R you tag leaves, so the pair beside him becomes two lone Rushers for the next raid. Aha: kick the Rusher who stands ALONE — then break a pair so the next one stands alone too. Score 4 in 4 raids, at least 2 of them with a Kick. | 79% / 83% |
| 28 | All Out! | Super Challenge · teach | all-out | Teach the all-out: four are left — a rookie on each corner and a Thigh-holder beside an Ankle-catcher in the centre. Touch all four out and the all-out is +2 with their whole side coming back — but every point THEY win (a caught raid) revives one of theirs, so a greedy raid that gets caught undoes the work. The centre pair needs two different moves (Toe on the T, Hand on the A, READ) and each extra touch raises the next one's risk. No scouting on this drill. Aha: finish the job in the right order — the hard centre pair first while you are fresh, the corner rookies last, and never let a lone survivor revive them. Inflict the all-out within 4 raids. | 67% / 88% |
| 29 | The Kicker | Defend Stand · twist | CPU backward kick, step back vs a kick | Twist on the kick: now THEIR raider touches once and then Backward-Kicks the defender who chases him — his telegraph shows KICK before he turns, so you always see it coming. Chasing a kick is the trap (no hold catches it well, a Rush almost never). The counter is to step back: if nobody steps in (Hold), his kick finds nobody to tag 65% of the time, and his way home is still yours to Block. When he shows a Hand, Thigh Hold the touch as usual. The cost of the step-back: Hold never stops him on the touch, so the stop must come on his way home. Aha: never chase a kicker — step back, then beat his way home. Stop 2 of 5, concede no more than 4. | 89% / 92% |
| 30 | Rush Hour | Match · combine | defence reads repeats | Combine chapter 3 with its one new idea, scouting: from here on state sides read you — the touch or way home you used on your PREVIOUS raid shows a SCOUTED tag and its % rises a few points (READ row). A mat of Rushers around a Blocker and two T's, and a raider with one plan — Hand Touch or bonus hop, then always the Dash. On your raids the rushers want the Kick and the wall wants the Dubki, so alternate Kick and Toe touches and never repeat the scouted gem; on his raids, Rush the hop and Block the Dash. Aha: the counter you used last raid is now the read one — switch. 4 raids each, win by 2. | 73% / 85% |
| 31 | Revival Run | Revival Run · spike | comeback from an all-out | Spike: all out at minute 5 — 5-9 down and only 3 back on the mat. Revival from trial 19 now runs a whole comeback: each point you score revives a team-mate (first out, first back), and with 3 or fewer every tackle is a Super Tackle. Aha: sacrifice greed for revivals — safe single touches rebuild the side. Reach 20:00 within 2 points; trail by 9 and it's over. A Super Tackle from three is the 3-star swing. | 77% / 81% |
| 32 | Rival's Ghost | Ghost Duel · breather | — | Breather after the revival spike, and the chapter's Ghost Duel: your rival Sameer raided this friendly floodlight mat (rookies, two lone Rushers, one Thigh-holder, bonus line open), and the mat replays his run raid by raid before each of yours (GHOST REPLAY row: an empty Dash, two Kicks on the Rushers for +3, then a greedy Toe raid that got him caught). Beat his 3 in 4 raids — no defending. The toy: each Rusher stands alone, so his Kick is the safe point (READ ~4%). Aha: his replay shows where the points were (the Kicks) and where he wasted a raid (the empty Dash) — take both Kicks and a Toe on the T, and stop before the greedy third touch. | 85% / 98% |
| 33 | State Final | Full Match · boss | — | Chapter boss with a comeback, kept to one session: the last 11 minutes of the State Final (~15 raids), 11-12 down, no scouting. Full mat of Rushers, Blockers and T's; a raider who kicks chasers (step back) and hops the bonus (Rush the hop). Aha: one point back is a clean raid plus one stop — kick the rushers, Dubki the wall, and never chase his kick. Win the match. | 68% / 91% |

### Chapter 4 — Auction Season (trials 34-44)

| # | Trial | Type · role | Introduces | What it tests (aha) | Casual / skilled bot |
|---|---|---|---|---|---|
| 34 | The Auction | Auction · teach | auction, player roles | Teach the auction: buy a Raider, a Corner and an Anchor with a 72-lakh purse. The star Raider Veer (reach 8) opens at 35 and the market values him 45-60; the second raider Kabir is a 14-22 bargain, the Corners 12-24 and the Anchors 16-32. Veer at even his lowest market price plus the cheapest Corner and Anchor is 73 — one lakh over the purse — so the star only fits if the room lets him go at the opening bid, and every lakh you raise for him is taken from the other two roles. The purse helper on screen shows the roles still needed and the cheapest legal squad left. Aha: a squad is three roles, not one star — bid for the shape first. Buy all three; keeping 15 / 25 lakh are the stars. | 66% / 85% |
| 35 | Corner Specialists | Defend Stand · teach | hold specialists | Teach specialists: your left corner is an Ankle specialist (A, ankle ×1.25), your right corner a Thigh specialist (T, thigh ×1.25). The raider attacks anywhere with Hand or Toe. Aha: switch to the specialist whose hold matches his move when he is in range. Stop 3 of 5. | 78% / 91% |
| 36 | The Anchor | Defend Stand · teach | anchor | Teach the Anchor, with his range drawn on the mat: K in slot 4 multiplies every hold by 1.15 and his tackles rarely slip, and the shaded ring shows his range — slots 3-5, the target and one either side. Inside the ring the Anchor is the tackler whatever the move; outside it he is too far (half strength), so at the corners use the corner specialist when his hold matches the move, the defender beside the target when it does not. He never Dubkis home here (Walk or Dash only), so range is the only question. Aha: the specialists need the right read, the Anchor only needs the raider inside his ring. Stop 3 of 5. | 75% / 79% |
| 37 | Bluff Raider | Defend Stand · twist | feints, feint tell | Twist: this raider feints — 3 raids in 10 the telegraphed move is not the real one — but feints have a tell: on 6 of 10 feints his hips turn first and the telegraph flickers (FEINT? on screen), so a flickering telegraph is a lie and a clean one is true about 85% of the time. Aha: trust a clean telegraph and counter it; against a flicker, use the all-round Anchor or an Ankle on his way home (it covers Dash and Dubki). Stop 2 of 5, concede no more than 5. | 84% / 89% |
| 38 | Hold the Lead | Match · practise | protect a lead | Game management against a strong captain: you lead 20-19 with 4 raids each to go, and the trial is lost the moment you trail by more than 1. Your specialist squad defends (A corners, T covers, Anchor in the middle) against a Medium-thinking league captain who tests your specialists. A patient empty raid is safe while you lead, but two in a row make the third a Do-or-Die. Aha: protecting a lead is its own skill — bank the safe single touch, spend at most one empty raid, and tackle only with the specialist whose hold matches his move. Finish ahead, never more than 1 behind. | 83% / 97% |
| 39 | Switch! | Defend Stand · twist | defender switch | Twist: a two-touch raider — after the first touch he turns for a second defender, so the defender in range changes mid-raid. Switch to whoever covers the new target (the tap-select is instant). Aha: defend the raider's NEXT target, not the last one. Stop 2 of 4 and concede no more than 3. | 84% / 91% |
| 40 | Specialist Derby | Match · spike | — | Spike on ONE layer, the specialist mirror (no Rushers, no wall, no feints, no scouting): your specialist squad (A corners, T covers, Anchor) against a league mat built the same way — A corners, four T's, a rookie in the centre — and a Medium raider who reads your shape. On your raids the counters are the chapter's two: Toe the T, Hand the A; on defence, match the specialist to his move and keep the Anchor central. Aha: both ends are the same lesson seen from each side — the hold that beats a move is the move that beats the hold. 5 raids each, win by 1. | 73% / 85% |
| 41 | Scout's Choice | Auction · combine | — | Combine auction and defence, and the auction comes FIRST: the scouting report says their raider is a Toe-Touch specialist (2 raids in 3 a Toe, otherwise a Hand) who usually Dubkis home — both beaten by Ankle holds (READ: Ankle stops his Toe ~71% and his Dubki ~57%; the Thigh corner's holds stop them ~25% and ~9%). The Anchor is sold first (market 18-30), then the cheap Thigh Corner (10-18), and the Ankle Corner last — the room values him 32-44. The 66-lakh purse cannot pay the top of both markets (30 + 44 = 74), so what you pay for the Anchor decides whether you can still win the Ankle Corner. Aha: buy for the opponent you will face, not the bargain — and plan the last lot before you bid on the first. Buy a Corner and an Anchor, then stop 2 of his 5 raids. | 68% / 89% |
| 42 | Rival Franchise | Auction · twist | rival bidder | Twist, auction only — read the other bidder: the Harbour Hawks need an Anchor and chase the FIRST one on the list, paying about 14 lakh over his market value (shown in the lot's market range); once they have one they stop. You need a Raider and an Anchor from 75 lakh, and the purse helper shows the sum on every bid. Aha: let the rival overpay for the first Anchor — his twin later goes at market, and that saving buys the better Raider. | 71% / 93% |
| 43 | Fans' Day | Super Challenge · breather | — | Breather with a show: Fans' Day on a friendly mat — five rookies, a Thigh-holder and Ankle-catchers on both corners — with your squad's raider (reach 7). The touches are easy (READ: Hand on a rookie ~6%, Hand on a corner A ~4%), so the crowd's request is the real choice: bonus hops. The corner A's make the hop the riskiest option on the mat (~27% held) and it is only live while six or more stand, and only the touches thin the mat — below six standing the hop is gone. Aha: a breather is where you try the show move — hop early while seven stand, score the safe touches after. Score 4 in 5 raids; a bonus hop with no catch is the 3-star show. | 82% / 89% |
| 44 | Season Final | Full Match · boss | — | Chapter boss: the Season Final as a 2x5 mini-Blitz (~14 raids), with a pre-match auction you MUST use lightly — 75 lakh, 7 lots (two Corners, two Covers, two Anchors, one star Raider), and the squad must include at least one Corner or the owner rejects it. The star Raider is the tempting lot: buy him first and a Corner still fits only if you bid with discipline. Then a Medium franchise that reads your specialists and feints 15%. Aha: the auction is preparation — a Corner plus two mid-price defenders cover more slots than one star. Win the match. | 68% / 85% |

### Chapter 5 — Continental Cup (trials 45-55)

| # | Trial | Type · role | Introduces | What it tests (aha) | Casual / skilled bot |
|---|---|---|---|---|---|
| 45 | Super Raid | Super Challenge · teach | super raid | Teach the Super Raid on a soft mat: six rookies and one Thigh-holder on the right. Three touches in one raid take 21 of the 30 seconds and every touch makes the way home harder (depth ×1.7 at three, READ: home after 1 vs after 2), so the route matters: three rookies in a row on the LEFT, away from the T, then Dubki home. No scouting in this lesson. Aha: string the touches along the soft side, then duck home before the clock. Land a Super Raid within 4 raids — the spare raid lets you learn the route. | 62% / 86% |
| 46 | Two Defenders, One Chain | Defend Stand · teach | chain tackle | Teach the Chain Tackle: two adjacent defenders link. It is the one tackle with no wrong read — about as strong as the RIGHT hold on any touch (READ: chain ~45-49 vs the matching hold ~52-54, while the wrong hold is ~20), and the best stop of all on his walk home — but a broken chain costs two men, and the Dubki ducks under it. Aha: two defenders, one chain — when you are unsure of his move, chain the pair around his target; when you are sure, the matching hold is as good and risks one man. Land a chain tackle in his 4 raids and concede no more than 2 — one clean chain is the lesson, and a wrong pair costs a point. | 65% / 77% |
| 47 | Let Him Go Deep | Super Challenge · twist | — | Twist on the chain (trial 46 taught it as a stop on the touch): a full side of seven with two Cover men, against a greedy raider who strings up to THREE touches (4 raids in 10 he goes for all three). A tackle on his touch is a coin flip (READ: the best hold vs his touch ~44-47%), but every touch he makes slows him home, and the chain on his way home is your strongest stop (READ: chain vs his walk ~44%, the best of any tackle there). Aha: let a greedy raider go deep — then chain him on the way home. Stop 2 of his 4 raids, at least one with a chain, and concede no more than 2. | 72% / 83% |
| 48 | The Cage | Raid Puzzle · teach | formation theme: Cage, chain links | Teach the Cage theme: two chained pairs (C C) shut the walk and the Dash home, and Ankle-catchers on both corners read the Dubki — so on the first raid all three ways home are close (READ: after a touch walk ~41%, Dash ~41%, Dubki ~35%). The Cage is beaten from the outside in: a Hand on a corner A is the safe touch (~8%), and every A you put out makes the Dubki under the chains cleaner, while every C you tag breaks his pair for the next raid. Scouting is on, so the same way home twice in a row is read. Aha: re-price the way home after every raid — open the corner, then duck under the Cage. Score 4 in 5 raids. | 63% / 74% |
| 49 | Pincer | Raid Puzzle · twist | formation theme: Pincer | Twist theme, the Pincer: Ankle-catcher corners and two Rushers just inside them close on the bonus line — the bonus hop is the riskiest option on this mat (READ: bonus ~19% held, every touch 3-10%), and it is REQUIRED: one bonus point is part of the goal. No Kick here, no scouting: the Rushers can only be read, not turned. And the bonus is live only while six stand, so the order matters. Aha: the squeeze is a timing puzzle — take the hop on an early raid while the line is full, then score the soft rookies and the Blocker in the middle. Score 3 in 5 raids including a bonus point. | 63% / 71% |
| 50 | Third Umpire | Raid Puzzle · teach | DRS review | Teach DRS on an easy mat, so the review is the only lesson: rookies with two Thigh-holders. Close touches are called by the referee and the call says how close: 'very tight' calls are wrong almost half the time, 'tight' ones 1 in 5 — and until you use your first review every close call here comes up 'very tight' and wrong, so the lesson always comes up. You have 1 review and a failed review is lost. Aha: spend the one review on a very tight call, accept the merely tight ones — a review is a resource, not a reflex. Score 4 in 4 raids — one point a raid, so a wrong call you don't review costs the trial. | 71% / 91% |
| 51 | Ghost Gate | Ghost Duel · twist | ghost gate | Twist: defend against a recorded ghost raider. Its 5 raids are known before you start (GHOST PLAN row: a Toe and Dash home, a Hand and walk, a bonus hop, a two-touch raid with a Dubki home, a corner Toe and Dash) and replay exactly — no feints — so the right counter is set up in advance and stops about 15 points more than usual (READ: Thigh v Hand, Ankle v Toe and Dubki, Rush v the hop, Block v the Dash, Chain v the walk). A chain tackle is the 3-star show but it costs two men if it breaks. Aha: a ghost can be solved: plan the perfect counter for each raid. Stop 3 of 5 and concede no more than 3. | 59% / 68% |
| 52 | Diamond | Match · combine | formation theme: Diamond | The Diamond theme as a lesson, not a slog: a Blocker at the point, Rushers on its shoulders, T's behind, rookie corners. Each layer has one answer — Kick the rushers, Toe the T's, Dubki under the wall's arms (the Dash is WALLED) — and the Medium raider strings two touches, so a chain around his NEXT target is your stop. No feints; the Diamond scouts you (SCOUTED tags), so vary the way home. Aha: a formation is read layer by layer: the point tells you the way home, the shoulders tell you the touch. 4 raids each, win by 2. | 65% / 83% |
| 53 | Ghost Duel: Cage | Ghost Duel · spike | weekly ladder ghost | Spike: this week's ladder ghost Ravi raided the Cage (two chained pairs, T's at the corners) 5 times and scored 4, and his run replays raid by raid on the mat (GHOST REPLAY row: two empty Dubkis, three bonus raids for +3, and he is caught on his last). Beat it (5+) in your 5 raids. The chains make every walk or Dash home a risk, so Dubki home like he did; his two empty raids are where you win — one point a raid leaves no room for a caught raid, so one raid should take a greedy second touch, and every touch makes the way home deeper (READ: home after 1 vs after 2). Aha: beat a ghost where he was idle — turn his empty raids into touches, on the rookie in slot 4 and his chain-link neighbour, then duck home. | 63% / 79% |
| 54 | Friend's Rematch | Ghost Duel · breather | — | Breather after the ghost spike: Arun — your friend's ghost from trial 21 — wants a rematch on the continental fan-zone mat, and his replay shows he has learnt the chapter (GHOST REPLAY row: a Dubki-and-lunge +1, a bonus-and-Toe raid for +2, a Toe and Dubki +1, then the same greedy four-touch raid at the end). One chained pair in the middle, a lone Rusher on the left, rookies elsewhere, bonus line open. Beat his 4 in 4 raids, no defending. Aha: the rivalry has a pattern — Arun always over-reaches on his last raid; bank your points early, hop the bonus while seven stand, kick the lone Rusher, and Dubki home whenever the chain is up. | 77% / 89% |
| 55 | Continental Semi-Final | Full Match · boss | half-time reversal | Chapter boss, one session: the 12 raids either side of half-time of the Continental Semi-Final, joined one down at 5-6. First half they defend in the Cage (two chained pairs: walking or dashing home past them is the risk, the Dubki ducks under). At half-time their coach reverses it: an Ankle Line (four Ankle-catchers with two Thigh-holders) that reads the Dubki and the Toe, so the Hand on an A and the Dash home come back. Their raider takes two touches and never feints — chain the return. Aha: the half-time whistle changes the answer — the move that won the first half loses the second. Win the match. | 65% / 84% |

### Chapter 6 — World Championship (trials 56-66)

| # | Trial | Type · role | Introduces | What it tests (aha) | Casual / skilled bot |
|---|---|---|---|---|---|
| 56 | Rotation | Match · teach | fatigue, raider rotation | Teach fatigue on a soft mat, so tiredness is the only thing you fight: rookies with two Thigh-holders and a gentle raider. Your star Veer (reach 8) tires fast (stamina 2); Kabir (reach 5, stamina 8) can go all day. A tired raider reaches less and is held more — watch the stamina % on the WHO RAIDS card. Aha: rotate — the star for the raids that matter, the workhorse in between. 5 raids each, win by 4 — a tired Veer on every raid will not get there. | 68% / 81% |
| 57 | Iron Anchor | Raid Puzzle · teach | rival captain | Teach rival captains: five on their mat (so the bonus line is closed) and their captain K anchors the centre — every move near him is dangerous and he guards every way home. His one weakness: he chases, so a Backward Kick on him is the safest touch on the mat (READ k on slot 4), and the kick tags him out of the way home too. No scouting in this lesson. Aha: kick the captain, don't avoid him. Score 4 in 5 raids. | 61% / 75% |
| 58 | Dubki King | Defend Stand · teach | rival raider signature | Rival raider: the Dubki King always ducks home — under thighs, chains and walls — and only the Ankle Hold reads the dubki (READ). He knows you know: his touch is a Hand or a Backward Kick at whoever chases him, so the touch is a second read — Thigh the Hand, step back (Stay Back) from the Kick. Aha: a signature move is a promise — never chase the touch you can't win, and ankle him on the way home. Stop 3 of 6 and concede no more than 4. | 61% / 85% |
| 59 | Feint Master | Defend Stand · twist | return-beat feints | Twist on trial 37's feints — moved to the OTHER beat: the Feint Master only ever Hand Touches (his touch is always honest), but his WAY HOME is the lie: he shows Walk, Dash or Dubki and feints about 1 in 7, with a tell on 3 of 4 feints (the return telegraph flickers, FEINT? on screen). So the touch is the wrong moment to commit — Stay Back, let him take his one touch, and tackle on the way home: trust a clean return telegraph, and against a flicker use the Chain through your Anchor and two Covers, strong whichever way he really goes. Aha: in trial 37 you read his hands; here you read his feet. Stop 2 of his 4 raids, concede no more than 2. | 61% / 69% |
| 60 | Endurance | Match · combine | — | Combine exactly two systems — fatigue and the rival captain (no scouting, no reversal): the last 10 minutes of a group match (~14 raids), 16-18 down, with three raiders to rotate (Veer the star with little stamina, two workhorses) against a mat anchored by a rival captain weak to the Toe Touch, rookies either side of him, Rushers on the corners. The captain's Toe is the safest point on the mat — but only a fresh raider reaches it reliably. Aha: spend the workhorses on the plain points and save Veer's stamina for the captain's Toe when the score is close. Win by 1. | 56% / 75% |
| 61 | Captain's Cage | Raid Puzzle · combine | — | Combine: a half-Cage with a rival captain at its hinge — a chained pair on the left, the captain in the centre, two T's on the right. Two ways home compete (READ): the Dubki ducks under the chain and the T's but not the captain; the Dash is the captain's weakness (he cannot turn) but runs into the chain. And the answer moves: every chain link you put out breaks the chain for the next raid, so the Dash gets safer raid by raid. Aha: there is no fixed answer — re-price the way home after every raid. Score 4 in 6 raids; a Super Raid is the 3-star swing. | 57% / 79% |
| 62 | Night Wall | Match · combine | formation theme: Wall | Combine the Wall theme with the rival captain, and the captain is weak to the WALK this time (trial 57's was the Kick): four Blockers make the Dash home hopeless (READ: Dash ~93% held, shown WALLED), so the way home is a real choice between the Dubki under their arms and the walk past a captain who can't turn (READ after a touch: walk ~53%, Dubki ~51%) — and it tips every raid as their men go out. Touch the Blockers on the outside (READ: Toe on an end B ~18%), never the captain (~47%); on defence his Medium raider strings two touches — chain the pair around his next target. 5 raids each from 9-11 down; win by 1. | 65% / 75% |
| 63 | Legend's Ghost | Ghost Duel · breather | — | Breather and spectacle: the Legend's ghost replays his signature raids — four recorded plans, two of them double touches that end in a Dash or a Dubki, and the mat shows his NEXT plan before every raid (the gate). Knowing the plan, the stop is a matter of matching it: chain the pair around his target on the double touches, Ankle the Dubki, Block the Dash (READ). The cap is generous — concede no more than 2 — and the one must is a single chain tackle. Aha: a known plan is a free read; spend it on the chain. Defend 4 raids; chaining him early is the 3-star finish. | 66% / 78% |
| 64 | Last Stand | Revival Run · spike | — | Spike: the last 7 minutes of a world group decider (~10 raids), 24-25 down with only 4 on the mat. One more man out and every tackle becomes a Super Tackle (+2); every point you score revives a team-mate, so a kick on their captain (his weakness) plus one Super Tackle turns it. Trail by 9 and it's over. Win by 1. | 63% / 77% |
| 65 | Champion's Gauntlet | Comeback · spike | — | Spike on two reads, one per end (no fatigue, no rotation, no DRS — unlike 60 and 66): the last 10 minutes of the World semi-final (~15 raids), 18-19 down. On defence, the champions' raider feints 1 raid in 5 and half his feints show the tell — trust a clean telegraph, chain through the centre against a flicker. On your raids, their captain (K, centre) is weak to the Kick: one of the safest touches on the mat (READ ~15%, level with a Kick on a corner Rusher), but it lands only about 2 times in 3 (a miss is an empty raid, READ), with light scouting punishing the same Kick twice in a row. Aha: alternate the captain's Kick with a safe Toe on the T's, and never commit to his shown move when it flickers. Win by 1. | 62% / 70% |
| 66 | World Final | Full Match · boss | — | Final boss, a mastery test of three things only, as a World Final Blitz of 2x5 game minutes from 0-0 (~14 raids): (1) their captain anchors a Pincer-Cage mat and is weak to the Kick — but his two Rushers flank him and charge a kicker's turned back (READ: Kick on K ~50% while both stand, Kick on a Rusher ~15%), so the captain's weakness opens only after you tag a Rusher out, (2) their raider is the Feint Master (1 feint in 5, three in four with the tell — the same read as trial 59), (3) you rotate three raiders through fatigue. No DRS, light scouting. Aha: the final asks for the chapter lessons in one match — tag a Rusher, then kick the captain, trust a clean telegraph and chain the pair around his target, save a fresh Veer for the closing raids. Win the match. | 69% / 89% |

## Screens
| Screen | File | What the player does |
|---|---|---|
| Home (title) | `src/screens/HomeScreen.tsx` | logo, the raider bursting through a defence (idle motion), coins / Chant Tokens, daily reward, chapter progress, **Play · Trial N**, Trials / Matches / Album / Shop / Settings |
| Raid Trials map | `src/screens/LevelsScreen.tsx` | 66 nodes in 6 chapter bands, stars, crowned chapter bosses |
| Matches hub | `src/screens/ModesScreen.tsx` | Quick Match (difficulty + Full/Blitz), Tournament / Championship brackets with lock cards and counters, Daily Ghost, Online Raid Race (find rival, friend room, join by code) |
| Match | `src/screens/GameScreen.tsx` + `src/screens/match/*` | briefing → raid (tap a defender, pick the touch gem, then the way home; every gem shows its real risk) / defence (read the telegraph, select the tackler, pick the hold; grip % per move) → struggle, DRS, raider pick, auction overlays → referee panel after every raid (calls slide in one by one, points fly into the shields) → staged win (VICTORY banner, side jumps, board confetti, then the card) / fail (shake + DEFEAT banner) |
| Kit Album | `src/screens/KitAlbumScreen.tsx`, `src/game/kit.ts` | 3 sets x 4 fixed cosmetics (crest shield, raid trail, raid banner) bought with coins or Chant Tokens and worn in the next match; a full set pays a one-time bonus |
| Shop, Settings | `src/screens/ShopScreen.tsx`, `src/ui/SettingsPopup.tsx` | Remove Ads, coin packs, Coach hints, rewarded coins; audio, vibration, left-hand, reduced motion, reminders |

Every on-screen decision is one of the engine's discrete decisions (`legalMoves`); the move animation plays while the
decision is pending and `"go"` resolves it, so what the mat shows is always the engine state.
