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
| Mid-match reversal | 9 | 55 (half-time: Cage → Ankle Line), 60 (captain benched) | — |
| Rival personality (greedy captain) | 11 | 58 (Dubki King), 59 (Feint Master) | 66 |
| Toe Touch | 12 | 13 (ankle-catchers punish it) | 14, 16 |
| Dubki, Blocker wall (B) | 14 | 48 (the Cage), 58 (CPU Dubki King) | 16, 30 |
| Block (defence, wider window in the lesson) | 15 | 29 (vs a kicker) | 30 |
| Empty-raid counter / Do-or-Die | 16 / 17 | 19 (their Do-or-Die + revivals) | 20, 22 |
| Bonus line | 18 | 49 (the Pincer: a coin-flip risk) | 20, 21 |
| Backward Kick, Rusher defenders (R) | 23 | 29 (CPU kicker: step back) | 30, 49 |
| Escape lunge | 24 | 31 | 33 |
| Defender Rush | 25 | 29 (never chase a kicker) | 30 |
| Super Tackle | 26 | 47 (from three, with a chain) | 31, 64 |
| Defence reads repeats (SCOUTED tag, capped; off where a row says "no scouting": 28, 40, 43, 45, 54) | 27 | 60, 62 | 65, 66 (light) |
| All-out / revival | 28 / 31 (first look 19) | 64 (last stand) | 33 |
| Auction, player roles | 34 | 42 (rival bidder) | 41 (scout), 44 (optional pre-match auction) |
| Hold specialists, Anchor (range ring) | 35 / 36 | 39 (switch for the next target) | 40, 43 |
| Feints + feint tell | 37 | 59 (Feint Master), 65 | 66 (the tell shows on only half his feints) |
| Super Raid | 45 | 52 (Diamond) | 61, 63 |
| Chain Tackle | 46 | 47 | 51, 59 |
| Formation themes (Cage, Pincer, Diamond, Wall) | 48 | 49, 52, 62 | 53, 55, 61 |
| DRS review (on an easy mat) | 50 | — | 55 (one review in the semi-final) |
| Ghost Duel / Ghost Gate | 21 (friend's ghost, breather) / 51 | 53 (weekly ladder ghost in the Cage) | Daily Ghost, Ladder |
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

## Every trial

### Chapter 1 — Village Mat (trials 1-11)

| # | Trial | Type · role | Introduces | What it tests (aha) | Casual / skilled bot |
|---|---|---|---|---|---|
| 1 | First Raid | Raid Puzzle · teach | hand touch, walk home | Teach the raid: pick a defender, Hand Touch him and walk back over the midline. Seven rookies, 3 raids, 1 point needed — the only lesson is that a touch only counts once you are home. | 99% / 100% |
| 2 | Read the Gap | Raid Puzzle · teach | thigh-holder defenders | Two rookies stand in the gap between five big Thigh-holders (T). A Hand Touch on a T, or beside him, gets you grabbed; the rookie pair in slots 3-4 is the safe touch. Aha: read the gap, not the defender. 2 points in 3 raids. | 93% / 91% |
| 3 | Burst Home | Raid Puzzle · teach | dash home | Teach the way home: five Thigh-holders stand between you and the midline and only the two left-hand men are rookies. The touch on the corner rookie is safe either way; the walk home past five slow-reaching T's is the risk (READ: walk home held about 2.5x as often as the Dash). Aha: the way home is a choice too — touch the safe rookie, then burst home with the Dash. 3 points in 4 raids. | 89% / 99% |
| 4 | Hold the Line | Defend Stand · teach | defender select, ankle hold, thigh hold, tackle ring | First defence, in one drill: select a defender beside the raider's target, pick the hold, and press on the tackle ring. The village raider telegraphs his touch — a Hand Touch (high) or a Toe Touch (low). The Ankle Hold catches a Toe, the Thigh Hold catches a Hand; the wrong hold misses about 3 times in 4, and 'Hold' (no tackle) just hands him the point. Aha: watch his move, then match the hold. Stop 3 of his 5 raids, concede no more than 4. | 87% / 96% |
| 5 | Second Touch | Raid Puzzle · teach | second touch (raid depth) | Teach greed: a rookie pair stands on each corner around a wall of three Thigh-holders. 4 points in 3 raids means at least one raid must take two touches — but every touch already made raises the next touch's risk by a third and makes the way home deeper (READ: home after 1 touch vs after 2). Aha: be greedy only along a rookie pair — the corner first, then his rookie neighbour away from the T, then Dash home; a second touch next to a T is where raids end. | 86% / 97% |
| 6 | Cover Tackle | Defend Stand · twist | cover position | Twist: not WHICH hold but WHO tackles. This raider only Hand Touches and walks home, so the Thigh Hold is always the right hold; the cover ring on screen shows who should make it — the man he touches tackles at 82% of full strength (he is off balance), his neighbour, the cover, at 100%, two away at 55%. Aha: let the cover make the tackle, never the man being touched. Stop 3 of 5. | 89% / 93% |
| 7 | Grip and Rip | Raid Puzzle · teach | struggle (pull-away) | Five Thigh-holders with strong grips around one rookie: even good raids get held here. Held raiders play the struggle — the pull-away breaks free about half the time, and the defender holding you counts as touched when you do. Aha: a hold is not the end — keep raiding the rookie gap and rip loose when grabbed. Score 3 in 5 raids; caught 3 times and it's over. | 86% / 96% |
| 8 | Village Fair | Match · breather | raid and defend in turns, referee's call | Breather and the first real match flow: 3 raids each against a gentle village side (two Thigh-holders, a Hand-Touch-only raider), the sides swapping after every raid. After the first two raids the referee steps in: LOBBY — their Thigh-holder in slot 2 stepped out of bounds and is sent off the mat, so the gap you have been raiding changes shape. Aha: after a referee's call, re-read the mat before you raid. Win the segment by 1; 3 stars for winning by 4. | 85% / 90% |
| 9 | Two-Way Duel | Match · combine | mid-match reversal | Combine both halves of chapter 1, then flip them: 4 raids each. At first T's guard both corners and the centre, so raid the gaps and Dash home, and their raider mixes Hand and Toe, so match the hold. After two raids each their coach reverses everything: the T's move into the old gaps (rookies now at the corners and the centre) and their raider switches to Toe Touches and Dash home only. Aha: a reversal is a new puzzle — re-read both ends (your safe touch moves, and one Ankle Hold now beats both his touch and his way home). Win by 2. | 83% / 89% |
| 10 | Dusk Showdown | Comeback · spike | comeback from a deficit | Spike: 15:00 of the second half, 11-13 down, 4 raids each left against the village's best raider. Two points is a lot in 8 raids: you need one stop and steady touches, and a second touch only when the gap beside your first is a rookie. Win by 1. | 76% / 85% |
| 11 | Village Final | Full Match · boss | full match, half-time swap, rival personality | Chapter boss and the first whole match, kept short: the Village Final as a mini-Blitz of 2x6 game minutes (~17 raids in all) with a half-time swap. Their captain Bholu has a personality you can read: he is greedy — he goes for two touches on 8 raids in 10 and always Dashes home. Aha: his second touch and his Dash are your chances — tackle his next target with the cover, or Ankle his Dash home; on your raids, raid the rookie gaps and Dash past the T's. Win the match. | 87% / 95% |

### Chapter 2 — District Cup (trials 12-22)

| # | Trial | Type · role | Introduces | What it tests (aha) | Casual / skilled bot |
|---|---|---|---|---|---|
| 12 | Long Reach | Raid Puzzle · teach | toe touch | Seven Thigh-holders and no gap at all. A Hand Touch into a T gets you held about 1 time in 5, the Toe Touch's long low reach only 3% (see READ). Aha: change the move, not the target. 3 points in 4 raids. | 85% / 93% |
| 13 | Ankle Trap | Raid Puzzle · twist | ankle-catcher defenders | Twist: Ankle-catchers (A) on both corners and slot 3 wait for your Toe Touch, the T's wait for your Hand. The READ row shows the counter for each slot: Hand on an A, Toe on a T — and slot 2, a T between two A's, is the one to avoid with both. Aha: every defender has a counter. 4 points in 5 raids. | 89% / 94% |
| 14 | Duck Under | Raid Puzzle · teach | dubki, blocker wall | Four Blockers (B) form a wall on the midline — the screen shows it: before you pick the way home the B's link arms across the midline and the Dash gem is drawn against the wall, so a Dash into them (held most of the time, READ) is shown on its gem with a WALLED tag — never a hidden trap. The Dubki ducks under their arms and the T's reach. Aha: dubki under a reach. Score 3 points with at least one Dubki or Toe Touch scoring. | 85% / 91% |
| 15 | Build the Wall | Defend Stand · teach | block (defensive wall) | Teach the Block: the district sprinter telegraphs his way home — mostly a Dash, sometimes a walk. Against a Dash, let the touch go and form the Block on the midline (its timing window is a little wider in this first lesson, READ); against a walk the Block is weak and the Thigh Hold is the stop. Aha: defend the way home, not the touch — and read WHICH way home before you build the wall. Stop 3 of 5. | 78% / 84% |
| 16 | Count the Empties | Match · teach | empty-raid counter | Teach the empty-raid counter: you lead 8-7 and already have 1 empty raid. The mat is soft but for its two Ankle-catcher corners. An empty raid is safe — touching nobody keeps you deep in your own half — but the third in a row is Do-or-Die, so after one more empty raid you MUST touch. Aha: one patient empty raid is a weapon, two is a risk. 4 raids each, win by 2. | 84% / 96% |
| 17 | Do-or-Die | Do-or-Die Drill · teach | do-or-die raid | Straight after the empty-raid counter: two empty raids already: your next raid is Do-or-Die and an empty return puts you out. Ankle-catchers on the corners, a Blocker wall in the middle. The wall shuts the Dash home and the corner A's read the Dubki, so the safe way back is a plain walk (READ). The trade-off: the safe touch (Hand on an A, walk home) wins the Do-or-Die but scores only 1, and the goal is 3 points in 3 raids — so after the Do-or-Die one free raid may take a greedy second touch, a third riskier and deeper from home. The Do-or-Die IS the lesson: win it first. Aha: survive the Do-or-Die with the safe touch, then spend the greed on a free raid after it. Win the Do-or-Die raid and score 3 in 3 raids. | 77% / 89% |
| 18 | Bonus Line | Raid Puzzle · teach | bonus line | Teach the bonus line: with 6+ defenders on the mat a hop over the bonus line scores 1 and puts nobody out. Rookie corners make the hop safe. Aha: bonus first — every touch puts a man out and below 6 the bonus line is dead. Earn 2 bonus points and 4 points total in 4 raids. | 80% / 96% |
| 19 | Their Do-or-Die | Do-or-Die Drill · twist | — | Twist: now THEIR raider is on 2 empty raids, so his first raid is Do-or-Die — he must touch someone, so his telegraph is always a real attempt and an empty raid puts him out. The extra consequence: one of your side is already out, so a stop revives him (every point revives one, first out, first back) and every touch he lands sends another of yours off; fall to 3 on the mat and the trial is lost. Aha: a forced raider is predictable — punish his Do-or-Die with the matching hold and win your men back. Stop 2 of his 4 raids, concede no more than 5. | 87% / 97% |
| 20 | One-Point Thriller | Match · spike | — | Spike built only from chapter 2's verbs: level at 13-13, 4 raids each left. You are on 1 empty raid (one more patient raid is allowed, a second would make the third Do-or-Die), their raider takes one touch or hops the bonus. Ankle-catchers on the corners make your bonus hop a real risk (READ); the rookies in slots 2 and 6 are the safe touches, the T's beside the Blocker want the Toe. Aha: in a one-point game, count the empties — bank one safe Toe point early, then decide whether the bonus is worth its risk. Win by 1. | 79% / 86% |
| 21 | Friend's Ghost | Ghost Duel · breather | ghost duel | Breather after the thriller, and the first Ghost Duel: a friend raided this same friendly mat (seven on, rookie corners, bonus line open) and their recorded score is on the board. Beat it in 4 raids. No defending, no clock pressure — the ghost replays exactly, so it is a pure score chase. Aha: the bonus hop is free points while all seven stand; take it before your touches thin the mat. | 85% / 91% |
| 22 | District Final | Full Match · boss | — | Chapter boss with a Do-or-Die finish, kept to one session: the last 10 minutes of the District Final (~15 raids), one down at 16-17. A, T and B defenders and a raider who hops the bonus and Dubkis home; Do-or-Die is live on both sides, so the empty raids you spend early decide who is forced at the end. Aha: manage the empties like a clock — spend patience while level, never while behind. Win the match. | 71% / 91% |

### Chapter 3 — State League (trials 23-33)

| # | Trial | Type · role | Introduces | What it tests (aha) | Casual / skilled bot |
|---|---|---|---|---|---|
| 23 | Rushers | Raid Puzzle · teach | backward kick, rusher defenders | Teach the Backward Kick: Rushers (R) charge the raider and hold about a third of Hand or Toe Touches near them, but a Backward Kick tags a charging R at a fraction of that risk (READ). Aha: let the rusher come to you. Score 2 Kicks and 3 points in 4 raids. | 84% / 97% |
| 24 | Lunge for the Line | Raid Puzzle · teach | escape lunge | Teach the Escape lunge: strong-grip T's and a chained pair (C C) will hold you. Walking or dashing home past them is held most of the time — only the Dubki gets home reliably (READ). When held, the lunge for the line is strong held shallow (0-1 touches) and fades with every touch; held deep, the stamina pull-away is the better struggle. Aha: Dubki home, and if held: shallow → lunge, deep → pull. Score 4 in 4 raids; caught 3 times and it's over. | 80% / 91% |
| 25 | Charge the Hop | Defend Stand · teach | defender rush | Teach the defender Rush: the state raider goes for the bonus line on most raids and lands it 8 times in 10 if you let him. A corner Rush stops the hop best; the holds on a hop are weak (READ). Aha: rush the hop, hold the touch. Stop 2 of 4 raids, concede no more than 3. | 69% / 83% |
| 26 | Super Tackle | Super Challenge · teach | super tackle | Teach the Super Tackle: you have only 3 on the mat, so any tackle is worth 2 — but he goes for two touches, and lose all 3 and the all-out gives them +2. Choose WHICH of your three makes the tackle — the one beside his target (cover), never the man he touches. Aha: three defenders are a threat, not a weakness. Land a Super Tackle within 4 raids and concede no more than 2 (his two-touch raid can cost two at once). | 81% / 88% |
| 27 | Turn the Raid | Raid Puzzle · twist | defence reads repeats | Twist, one idea only: state sides scout you. A touch move or way home you used on your PREVIOUS raid is read — its gem shows a SCOUTED tag and its real % rises (READ row). Rushers sit beside Thigh-holders, so the Kick on a charging R and the Toe on a T are both good touches, and the Dash and the walk both get you home. Aha: the safest move is the one you did not just use — alternate Kick and Toe, Dash and walk. Score 4 in 4 raids with at least one Kick. | 73% / 93% |
| 28 | All Out! | Super Challenge · teach | all-out | Teach the all-out: three are left — two rookies and a Thigh-holder. Touch all three out (a greedy 2-touch raid along the rookie pair, then the T with a Toe) and the all-out is +2 with their whole side coming back. No scouting on this short drill (no SCOUTED tags): the only question is the order of the touches. Aha: finish the job — a lone survivor revives them. Inflict the all-out within 3 raids. | 83% / 86% |
| 29 | The Kicker | Defend Stand · twist | CPU backward kick, step back vs a kick | Twist on the kick: now THEIR raider touches once and then Backward-Kicks the defender who chases him — his telegraph shows KICK before he turns, so you always see it coming. Chasing a kick is the trap (no hold catches it well, a Rush almost never). The counter is to step back: if nobody steps in (Hold), his kick finds nobody to tag 65% of the time, and his way home is still yours to Block. When he shows a Hand, Thigh Hold the touch as usual. The cost of the step-back: Hold never stops him on the touch, so the stop must come on his way home. Aha: never chase a kicker — step back, then beat his way home. Stop 2 of 5, concede no more than 4. | 79% / 91% |
| 30 | Rush Hour | Match · combine | — | Combine chapter 3: a mat of Rushers around a Blocker and two T's, and a raider with one plan — Hand Touch or bonus hop, then always the Dash. On your raids the rushers want the Kick and the wall wants the Dubki; on his, Rush the hop and Block the Dash. 4 raids each, win by 2. | 73% / 89% |
| 31 | Revival Run | Revival Run · spike | revival | Spike: all out at minute 5 — 5-9 down and only 3 back on the mat. Each point you score revives a team-mate, and with 3 or fewer every tackle is a Super Tackle. Every point revives a team-mate (first out, first back). Aha: sacrifice greed for revivals — safe single touches rebuild the side. Reach 20:00 within 2 points; trail by 9 and it's over. A Super Tackle from three is the 3-star swing. | 77% / 85% |
| 32 | Floodlight Friendly | Match · breather | — | Breather after the revival spike: a friendly against a second-string side — two rookies, one rusher to kick, bonus line open. 3 raids each; win by 2. The toy: the floodlight Bonus trophy — two bonus hops while all seven stand is the 3-star show. | 82% / 90% |
| 33 | State Final | Full Match · boss | — | Chapter boss with a comeback, kept to one session: the last 11 minutes of the State Final (~15 raids), 10-12 down. Full mat of Rushers, Blockers and T's; a raider who kicks chasers (step back) and hops the bonus (Rush the hop). Aha: two points back is two clean raids plus one stop — kick the rushers, Dubki the wall, and never chase his kick. Win the match. | 71% / 85% |

### Chapter 4 — Auction Season (trials 34-44)

| # | Trial | Type · role | Introduces | What it tests (aha) | Casual / skilled bot |
|---|---|---|---|---|---|
| 34 | The Auction | Auction · teach | auction, player roles | Teach the auction: 6 lots — a star Raider and a cheap one, two Corners, two Anchors — and an 85-lakh purse against AI franchises. The star goes for 45-60, so buying him leaves barely enough for a Corner and an Anchor and nothing for the stars; the budget Raider, a Corner and an Anchor cost about 55. The purse helper on screen shows what is still needed and the cheapest squad left. Aha: price the whole squad, not the lot — a lot you pass on has a cheaper twin later. Buy a Raider, a Corner and an Anchor. | 73% / 93% |
| 35 | Corner Specialists | Defend Stand · teach | hold specialists | Teach specialists: your left corner is an Ankle specialist (A, ankle ×1.25), your right corner a Thigh specialist (T, thigh ×1.25). The raider attacks anywhere with Hand or Toe. Aha: switch to the specialist whose hold matches his move when he is in range. Stop 3 of 5. | 73% / 81% |
| 36 | The Anchor | Defend Stand · teach | anchor | Teach the Anchor, with his range drawn on the mat: K in slot 4 multiplies every hold by 1.15 and his tackles rarely slip, and the shaded ring shows his range — slots 3-5, the target and one either side. Inside the ring the Anchor is the tackler whatever the move; outside it he is too far (half strength), so at the corners use the corner specialist when his hold matches the move, the defender beside the target when it does not. Aha: the specialists need the right read, the Anchor only needs the raider inside his ring. Stop 3 of 5. | 69% / 79% |
| 37 | Bluff Raider | Defend Stand · twist | feints, feint tell | Twist: this raider feints — 3 raids in 10 the telegraphed move is not the real one — but feints have a tell: on 6 of 10 feints his hips turn first and the telegraph flickers (FEINT? on screen), so a flickering telegraph is a lie and a clean one is true about 85% of the time. Aha: trust a clean telegraph and counter it; against a flicker, use the all-round Anchor or an Ankle on his way home (it covers Dash and Dubki). Stop 2 of 5, concede no more than 5. | 84% / 89% |
| 38 | Hold the Lead | Match · practise | protect a lead | A different kind of goal — game management: you lead 20-18 with 4 raids each to go, and the trial is lost if you ever trail by more than 2. Your specialist squad defends (A corners, T covers, Anchor in the middle). A patient empty raid is safe while you lead, but two in a row make the third a Do-or-Die. Aha: protecting a lead is its own skill — bank the safe single touch, spend the empty raids, and tackle only with the specialist whose hold matches his move. Finish ahead, never more than 2 behind. | 91% / 98% |
| 39 | Switch! | Defend Stand · twist | defender switch | Twist: a two-touch raider — after the first touch he turns for a second defender, so the defender in range changes mid-raid. Switch to whoever covers the new target (the tap-select is instant). Aha: defend the raider's NEXT target, not the last one. Stop 2 of 4 and concede no more than 3. | 84% / 91% |
| 40 | Specialist Derby | Match · spike | — | Spike, every read at once: your specialist squad (A corners, T covers, Anchor) against a full league mat (A, T, B, R) and a Medium raider who reads your shape (no feints: the test is reading both ends, not bluffs). On your raids the mat has a counter for every move — Kick the R, Toe the T, Hand the A — no scouting here; on defence, match the specialist to his move. 4 raids each, win by 1. | 64% / 73% |
| 41 | Scout's Choice | Auction · combine | — | Combine auction and defence: the scouting report says their raider is a Toe-Touch specialist who Dubkis home — both beaten by Ankle holds. The Ankle Corner is the one you want, so the rival franchises bid him up; the Thigh Corner goes cheap and the Anchor sits between. 74 lakh buys the Ankle Corner and an Anchor only if you don't overpay. Aha: buy for the opponent you will face, not the bargain. Buy a Corner and an Anchor, then stop 2 of his 5 raids. | 68% / 89% |
| 42 | Rival Franchise | Auction · twist | rival bidder | Twist, auction only — read the other bidder: the Harbour Hawks need an Anchor and chase the FIRST one on the list, paying about 14 lakh over his market value (shown in the lot's market range); once they have one they stop. You need a Raider and an Anchor from 75 lakh, and the purse helper shows the sum on every bid. Aha: let the rival overpay for the first Anchor — his twin later goes at market, and that saving buys the better Raider. | 71% / 93% |
| 43 | Fans' Day | Super Challenge · breather | — | Breather with a toy: the fans' trick-shot exhibition. Three Rushers charge on a friendly mat and the crowd wants Backward Kicks — score 2 Kicks on the way to 4 points in 4 raids (a bonus hop first is the show-off star), with your squad's raider (reach 7). Aha: an exhibition is the place to try the show moves you will need later — kick the charge, hop the line while seven stand. | 81% / 99% |
| 44 | Season Final | Full Match · boss | — | Chapter boss: the Season Final as a 2x5 mini-Blitz (~14 raids), with an OPTIONAL pre-match auction — 75 lakh, 7 lots (two Corners, two Covers, two Anchors, one star Raider); buy who you like or nobody, every buy strengthens the squad that plays. Then a Medium franchise that reads your specialists and feints 15%. Aha: the auction is preparation, not a gate — three mid-price defenders cover more slots than one star. Win the match. | 70% / 80% |

### Chapter 5 — Continental Cup (trials 45-55)

| # | Trial | Type · role | Introduces | What it tests (aha) | Casual / skilled bot |
|---|---|---|---|---|---|
| 45 | Super Raid | Super Challenge · teach | super raid | Teach the Super Raid: three touches in one raid. Three touches take 21 of the 30 seconds and every touch makes the way home harder (depth ×1.7 at three). No scouting in this lesson, so only the route matters. Aha: string the touches along the rookie side first, then decide the way home before the clock runs out. Land a Super Raid within 3 raids. | 64% / 87% |
| 46 | Two Defenders, One Chain | Defend Stand · teach | chain tackle | Teach the Chain Tackle: two adjacent defenders link — strong against every touch and every way home except the Dubki, and a chained raider rarely slips. Aha: two defenders, one chain — chain the pair around his target. Land a chain tackle in 5 raids and concede no more than 3 — one clean chain is the lesson, and a wrong pair costs a point. | 83% / 91% |
| 47 | Last Three Standing | Super Challenge · twist | — | Twist: three rookies left in the middle of your mat, no specialists, against a raider who goes for two touches. Any tackle from 3 is a Super Tackle (+2), but a failed tackle on the touch costs two men and brings the all-out close. Aha: let the first touch go and chain him on the way home, when every tackle still counts as Super. Land a Super Tackle within 3 raids, concede no more than 2 — one bad read is survivable, two are not. | 73% / 89% |
| 48 | The Cage | Raid Puzzle · teach | formation theme: Cage, chain links | Teach formation themes with the Cage: two chained pairs (C C) either side of the centre. Walking or dashing home past two chains is held most of the time; the Dubki ducks under both (READ). Aha: in the Cage, the way home is the puzzle. Score 4 in 5 raids — one spare raid to learn the Cage. | 63% / 77% |
| 49 | Pincer | Raid Puzzle · twist | formation theme: Pincer | Twist theme, the Pincer: Thigh-holder corners and two Rushers just inside them squeeze the bonus line. The hop is a coin flip (about half held, READ) but a failed hop just ends the raid — while a Kick on a charging R (about 1 in 10 held) is the safe point and the Toe on the rookies (about 1 in 5) beats the T's. Aha: the bonus is worth taking only while all seven stand and only once; after a hop, kick the rushers. Score 4 in 5 raids, any way you like. | 65% / 77% |
| 50 | Third Umpire | Raid Puzzle · teach | DRS review | Teach DRS on an easy mat, so the review is the only lesson: rookies with two Thigh-holders. Close touches are called by the referee and the call says how close: 'very tight' calls are wrong almost half the time, 'tight' ones 1 in 5. You have 2 reviews and a failed review is lost. Aha: review the very tight calls, accept the merely tight ones — a review is a resource, not a reflex. Score 4 in 4 raids — one point a raid, so a wrong call you don't review costs the trial. | 72% / 87% |
| 51 | Ghost Gate | Ghost Duel · twist | ghost gate | Twist: defend against a recorded ghost raider. Its 5 raids are known before you start (GHOST PLAN row: a Toe and Dash home, a Hand and walk, a bonus hop, a two-touch raid with a Dubki home, a corner Toe and Dash) and replay exactly — no feints — so the right counter is set up in advance and stops about 15 points more than usual (READ: Thigh v Hand, Ankle v Toe and Dubki, Rush v the hop, Block v the Dash, Chain v the walk). A chain tackle is the 3-star show but it costs two men if it breaks. Aha: a ghost can be solved: plan the perfect counter for each raid. Stop 3 of 5 and concede no more than 5. | 74% / 81% |
| 52 | Diamond | Match · combine | formation theme: Diamond | Combine with the Diamond theme: a Blocker at the point, Rushers on the shoulders, T's behind — and a Medium raider who strings two touches together. No feints here — the test is the shape. Kick the rushers, Dubki the wall, chain his deep raids. 4 raids each, win by 2. | 55% / 74% |
| 53 | Ghost Duel: Cage | Ghost Duel · spike | weekly ladder ghost | Spike: this week's ladder ghost raided the Cage (two chained pairs, T's at the corners) 5 times and scored 5 — the target is on the scoreboard all trial. Beat it (6+) in 5 raids. The chains make every walk or Dash home a risk, so Dubki home; one point a raid only ties the ghost, so at least one raid must take a greedy second touch, and every touch makes the way home deeper (READ: home after 1 vs after 2). Aha: choose WHICH raid is the greedy one — on the rookie in slot 4 and his chain-link neighbour, then duck home. | 51% / 73% |
| 54 | Fan Zone | Super Challenge · breather | — | Breather with a toy, after the ghost spike: the fan-zone Super Raid booth. A young side (rookies and one T) that never scouts you, three raids, and the crowd wants a Super Raid — three touches in one raid, home before the 30 s clock. Aha: the three-touch route that was a long shot in trial 45 is a show on a soft mat — take the rookies in a line and duck home. | 71% / 85% |
| 55 | Continental Semi-Final | Full Match · boss | half-time reversal | Chapter boss: the Continental Semi-Final as a Blitz (2x10), joined at 5:00 already 4-6 down (~21 raids). First half they defend in the Cage (two chained pairs: walking or dashing home past them is the risk, the Dubki ducks under). At half-time their coach reverses it: an Ankle Line (four Ankle-catchers with two Thigh-holders) that reads the Dubki and the Toe, so the Hand on an A and the Dash home come back — and the T's still punish the walk. Their raider feints 15% and takes two touches (chain the return). One DRS review. Aha: the half-time whistle changes the answer — the move that won the first half loses the second. Win the match. | 59% / 83% |

### Chapter 6 — World Championship (trials 56-66)

| # | Trial | Type · role | Introduces | What it tests (aha) | Casual / skilled bot |
|---|---|---|---|---|---|
| 56 | Rotation | Match · teach | fatigue, raider rotation | Teach fatigue: your star raider Veer (reach 8) tires after two raids (stamina 3); Kabir (reach 6, stamina 8) can go all day. A tired raider reaches less and is held more. Aha: rotate — the star for the big raids, the workhorse in between. 6 raids each, win by 3. | 64% / 89% |
| 57 | Iron Anchor | Raid Puzzle · teach | rival captain | Teach rival captains: five on their mat (so the bonus line is dead) and their captain K anchors the centre — every move near him is dangerous and he guards every way home. His one weakness: he chases, so a Backward Kick on him is the safest touch on the mat (READ k on slot 4), and the kick tags him out of the way home too. Aha: kick the captain, don't avoid him. Score 4 in 5 raids. | 69% / 79% |
| 58 | Dubki King | Defend Stand · teach | rival raider signature | Rival raider: the Dubki King always ducks home — under thighs, chains and walls. Only the Ankle Hold reads the dubki — the best answer on the board (READ). Aha: a signature move is a promise — let the touch go and ankle him on the way home. Stop 3 of 6 and concede no more than 4. | 65% / 81% |
| 59 | Feint Master | Defend Stand · twist | — | Twist on rival raiders: the Feint Master feints 1 raid in 5 and, like every feinter since trial 37, has a tell: on 3 of 4 feints his hips turn before the shown move and the telegraph flickers (FEINT? on screen) — then the shown move is a lie. With no tell, the telegraph is true about 19 times in 20. Your Anchor stands between two Covers, so a chain through the centre is strong whichever touch is real, and the Ankle covers both his Dash and his Dubki home. Aha: read the tell — trust a clean telegraph, and against a flicker use the move that has no weakness. Stop 3 of his 6 raids, concede no more than 3. | 57% / 69% |
| 60 | Endurance | Match · combine | — | Combine fatigue with a reversal: the last 10 minutes of a group match (~14 raids), 16-18 down, with three raiders to rotate (one star, two workhorses) against a mat anchored by a rival captain weak to the Toe Touch, with rookies either side of him so his Toe gem is the safest on the mat. After 6 raids their captain tires and goes to the bench: a fresh Rusher takes the centre, so the captain's Toe weakness is gone and the Kick on the charging R becomes the centre's safe touch. Aha: rest the star for the raids after the swap, and re-read the centre when the captain leaves. Win by 1. | 62% / 77% |
| 61 | Captain's Cage | Raid Puzzle · combine | — | Combine: a half-Cage with a rival captain at its hinge — a chained pair on the left, the captain in the centre, two T's on the right. Two ways home compete (READ): the Dubki ducks under the chain and the T's but not the captain; the Dash is the captain's weakness (he cannot turn) but runs into the chain. And the answer moves: every chain link you put out breaks the chain for the next raid, so the Dash gets safer raid by raid. Aha: there is no fixed answer — re-price the way home after every raid. Score 4 in 6 raids; a Super Raid is the 3-star swing. | 64% / 83% |
| 62 | Night Wall | Match · combine | formation theme: Wall | Combine with the Wall theme: four Blockers link arms on the midline around a captain weak to the Toe Touch, with rookies beside him, against a Medium raider who never feints. The Dash gem is drawn WALLED — it is legal but the wall eats it (READ) — so the way home is the walk or the Dubki, and the Wall reads the one you used last raid (SCOUTED). The Dubki is the low-% way home (READ) — and exactly the move they scout, so after a Dubki raid the walk becomes the better price for one raid; the walk deepens fast after two touches. Aha: alternate the way home and keep the walk for single-touch raids right after a scouted Dubki. Joined at 9-11 down, 5 raids each, win by 1. | 62% / 84% |
| 63 | Lap of Honour | Super Challenge · breather | — | Breather with a toy before the last push: the legends' lap of honour. A slow veterans' raider (Easy, no feints) walks into your Anchor and two Covers; the crowd wants a Chain Tackle — land 1 in his 4 raids and concede no more than 1 (a chain inside his first 2 raids is the show-off star). The cost: a broken chain lets him tag both links, so a wild chain far from his target is worse than a plain Thigh Hold. Aha: a chain is two men, one tackle — link the pair either side of his target and let the Covers do the lifting. | 89% / 98% |
| 64 | Last Stand | Revival Run · spike | — | Spike: the last 7 minutes of a world group decider (~10 raids), 24-25 down with only 4 on the mat. One more man out and every tackle becomes a Super Tackle (+2); every point you score revives a team-mate, so a kick on their captain (his weakness) plus one Super Tackle turns it. Trail by 9 and it's over. Win by 1. | 63% / 77% |
| 65 | Champion's Gauntlet | Comeback · spike | — | Spike: the last 10 minutes of the World semi-final (~15 raids), 18-19 down, against the champions' feinting raider (1 in 5, half of them with the tell) and a captain weak to the Kick, with two raiders to rotate. No DRS and only light scouting — the test is fatigue and the feint read. Fatigue is the clock inside the clock: Veer is the better raider but tires, Kabir never does; the Kick on the captain is the lowest-% held touch on the mat but it lands only about 2 times in 3 (a miss is an empty raid, READ). Aha: spend the star only where the captain's Kick weakness pays, and save a fresh Veer for the last three raids. Win by 1. | 55% / 75% |
| 66 | World Final | Full Match · boss | — | Final boss, a mastery test of three things only, as a World Final Blitz of 2x6 game minutes, joined at 1:00 already 0-2 down after their captain's opening two-touch raid (~15 raids): (1) their captain anchors a Pincer-Cage mat and is weak to the Kick, (2) their raider is the Feint Master (1 feint in 4) — and in the final he hides his tell better than in trial 59: only half his feints flicker who goes for two touches, (3) you rotate three raiders through fatigue. No DRS, light scouting. Aha: the final asks for the chapter lessons in one match — kick the captain, trust a clean telegraph and chain the pair around his target, save a fresh Veer for the closing raids. Win by 1 — from 0-2 that is a three-point swing: a final is won, not survived. | 44% / 73% |

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
