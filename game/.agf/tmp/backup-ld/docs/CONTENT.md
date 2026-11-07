# Kabaddi Ghost Raids: Raid League — Content plan

This is a CONTENT game: the campaign is 66 handcrafted **Raid Trials** (short scored match situations and six
full 2x20 matches) in 6 chapters, plus the open modes. Engine: `src/game/` (pure TypeScript, no UI).
Data: `src/game/units.ts` (trials), `src/game/tuning.json` (measured knobs), `src/game/ghosts.ts` (recorded ghosts).

## Modes
| Mode | What it is | Gate | Engine |
|---|---|---|---|
| Campaign | 66 Raid Trials, 3 stars each, 6 chapters, a Full Match boss per chapter | open | `UNITS` |
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
| Feints | 37 | 59 (Feint Master) | 40, 62, 66 |
| Super Raid | 45 | 52 (Diamond) | 54, 63 |
| Chain Tackle | 46 | 47 | 51, 59 |
| Formation themes (Cage, Pincer, Diamond, Wall) | 48 | 49, 52, 62 | 53, 61 |
| DRS review | 50 | 53 | 55, 62, 65 |
| Ghost Duel / Ghost Gate | 21 (friend's ghost, breather) / 51 | 53 (weekly ladder ghost in the Cage) | Daily Ghost, Ladder |
| Fatigue + raider rotation | 56 | 60 | 65, 66 |
| Rival captain (K) / rival raider signature | 57 / 58 | 59, 61 | 62, 64-66 |

## Progression and reasons to return
- Chapters: Village Mat → District Cup → State League → Auction Season → Continental Cup → World Championship,
  each 11 trials: intro trials, twists, combines, a breather, a spike and a Full Match boss.
- Stars: 3 per trial (win + two trial-specific goals tied to its lesson); stars open chapter chests.
- Squad: the auction (chapter 4 onwards) builds the defenders' roles and the raider's stats that the matches use.
- Ghosts: recorded raids replay exactly (input trace + seed), the Daily Ghost and the ladder reuse the pipeline.
- Difficulty curve (casual bot win rate, measured by `npm run playtest`): Ch1 99 → 77-83%, Ch2 85 → 65-77%,
  Ch3 77 → 61-69%, Ch4 77 → 57-66%, Ch5 72 → 57-60%, Ch6 73 → 57-59%; last third 64% mean; breathers after every spike.
  Teach units and breathers keep a gentle CPU raider (skill ≤ 0.45); repeat-reads are light (0.2-0.3 by chapter).
  validate.ts difficulty = the mid-skill player's expected failed attempts before a win (1/p − 1).
  Tuned by `scripts/tune-units.ts` (one difficulty knob per trial: opponent grip, CPU raider skill/timing window,
  or purse); `scripts/record-ghosts.ts` picks the ghost whose score paces the Ghost Duel.

## Every trial

### Chapter 1 — Village Mat (trials 1-11)

| # | Trial | Type · role | Introduces | What it tests (aha) | Casual / skilled bot |
|---|---|---|---|---|---|
| 1 | First Raid | Raid Puzzle · teach | hand touch, walk home | Teach the raid: pick a defender, Hand Touch him and walk back over the midline. Seven rookies, 3 raids, 1 point needed — the only lesson is that a touch only counts once you are home. | 99% / 100% |
| 2 | Read the Gap | Raid Puzzle · teach | thigh-holder defenders | Two rookies stand in the gap between five big Thigh-holders (T). A Hand Touch on a T, or beside him, gets you grabbed; the rookie pair in slots 3-4 is the safe touch. Aha: read the gap, not the defender. 2 points in 3 raids. | 93% / 91% |
| 3 | Burst Home | Raid Puzzle · teach | dash home | Five Thigh-holders fill the middle; only the corners are rookies. Walking home past five T's is a coin flip, a Dash bursts past their slow reach. Aha: touch a corner, then Dash, never walk. 3 points in 5 raids. | 84% / 87% |
| 4 | Hold the Line | Defend Stand · teach | defender select, ankle hold, tackle ring | First defence. The village raider only Toe Touches; select the defender next to his target and Ankle Hold on the ring. Tapping Hold (no tackle) gifts him the touch. Stop 2 of his 4 raids, concede no more than 3. | 93% / 89% |
| 5 | Match the Hold | Defend Stand · teach | thigh hold | The raider now mixes Hand Touches and Toe Touches and his move is telegraphed. Ankle Hold beats a Toe Touch, Thigh Hold beats a Hand Touch — the wrong hold fails 3 times in 4. Aha: match the hold to the move. Stop 3 of 5. | 89% / 94% |
| 6 | Cover Tackle | Defend Stand · twist | return tackle, cover position | Twist: the raider now Dashes home after his touch. The touched man tackles at 82% of full strength, his cover beside him at full strength, two away at about half; on the way home an Ankle Hold beats a Dash, a Thigh Hold beats a walk (READ: best stops ~57% on the touch, 44-48% going home). Aha: let the cover make the tackle, and keep a second chance for the return. Stop 3 of 5. | 88% / 97% |
| 7 | Grip and Rip | Raid Puzzle · teach | struggle (pull-away) | Five Thigh-holders with strong grips around one rookie: even good raids get held here. Held raiders play the struggle — the pull-away breaks free about half the time, and the defender holding you counts as touched when you do. Aha: a hold is not the end — keep raiding the rookie gap and rip loose when grabbed. Score 3 in 5 raids; caught 3 times and it's over. | 87% / 91% |
| 8 | Village Fair | Match · breather | raid and defend in turns | Breather and the first real match flow: 3 raids each against a gentle village side (one Thigh-holder, a Hand-Touch-only raider). The sides swap after every raid — the referee panel calls 'your raid' / 'defend' — so the lesson is the rhythm: score, then stop him straight back. Win the segment by 1; 3 stars for winning by 4. | 89% / 94% |
| 9 | Two-Way Duel | Match · combine | — | Combine both halves of chapter 1: T's guard both corners and the centre, so raid the gaps and Dash home; their raider mixes Hand/Toe and walks or Dashes, so match the hold and use the cover. 4 raids each; win by 2. | 86% / 89% |
| 10 | Dusk Showdown | Comeback · spike | comeback from a deficit | Spike: 15:00 of the second half, 11-13 down, 4 raids each left against the village's best raider. Two points is a lot in 8 raids: you need one stop and steady touches, and a second touch only when the gap beside your first is a rookie. Win by 1. | 81% / 87% |
| 11 | Village Final | Full Match · boss | full 2x20 match, half-time swap | Chapter boss and the first whole match: the Village Final as a Blitz (2x10 game minutes, ~14 raids each, half-time swap). Everything from chapter 1 — raid the gaps, Dash past T's, match the hold — over a match where the score swings and all-outs and revivals happen for real. Win the match. | 83% / 94% |

### Chapter 2 — District Cup (trials 12-22)

| # | Trial | Type · role | Introduces | What it tests (aha) | Casual / skilled bot |
|---|---|---|---|---|---|
| 12 | Long Reach | Raid Puzzle · teach | toe touch | Seven Thigh-holders and no gap at all. A Hand Touch into a T gets you held about 1 time in 5, the Toe Touch's long low reach only 3% (see READ). Aha: change the move, not the target. 3 points in 4 raids. | 85% / 94% |
| 13 | Ankle Trap | Raid Puzzle · twist | ankle-catcher defenders | Twist: Ankle-catchers (A) on both corners and slot 3 wait for your Toe Touch, the T's wait for your Hand. The READ row shows the counter for each slot: Hand on an A, Toe on a T — and slot 2, a T between two A's, is the one to avoid with both. Aha: every defender has a counter. 4 points in 5 raids. | 83% / 95% |
| 14 | Duck Under | Raid Puzzle · teach | dubki, blocker wall | Four Blockers (B) form a wall on the midline: Dash home into them and you are held most of the time (READ). The Dubki ducks under their arms and the T's reach. Aha: dubki under a reach. Score 3 points with at least one Dubki or Toe Touch scoring. | 81% / 91% |
| 15 | Build the Wall | Defend Stand · teach | block (defensive wall) | The district raider always Dashes home. Let the touch go and form the Block on the midline (the best stop vs his Dash, see READ), or Ankle him — a Thigh Hold on a Dash mostly fails. Aha: defend the way home, not the touch. Stop 3 of 5. | 77% / 85% |
| 16 | Count the Empties | Match · teach | empty-raid counter | Teach the empty-raid counter: you lead 8-7 and already have 1 empty raid. The mat is soft but for its two Ankle-catcher corners. An empty raid is safe — touching nobody keeps you deep in your own half — but the third in a row is Do-or-Die, so after one more empty raid you MUST touch. Aha: one patient empty raid is a weapon, two is a risk. 4 raids each, win by 2. | 85% / 97% |
| 17 | Their Do-or-Die | Do-or-Die Drill · twist | do-or-die raid | Twist: THEIR raider is on 2 empty raids, so his first raid is Do-or-Die: he cannot play safe and must touch someone, so his telegraphed move is always a real attempt. Tackle the touch with the matching hold (Thigh on a Hand, Ankle on a Toe) — 'Hold' just hands him the point he needs. Aha: a Do-or-Die raider is predictable, so punish it. Stop 2 of his 4 raids, concede no more than 4. | 83% / 94% |
| 18 | Do-or-Die | Do-or-Die Drill · teach | — | Two empty raids already: your next raid is Do-or-Die and an empty return puts you out. Ankle-catchers on the corners, a Blocker wall in the middle. The wall shuts the Dash home and the corner A's read the Dubki, so the safe way back is a plain walk (READ). Aha: in a Do-or-Die take the one SAFE touch (Hand on an A, walk home), never the greedy second. Win the Do-or-Die raid and score 2 in 3 raids; out twice and it's over. | 81% / 89% |
| 19 | Bonus Line | Raid Puzzle · teach | bonus line | Teach the bonus line: with 6+ defenders on the mat a hop over the bonus line scores 1 and puts nobody out. Rookie corners make the hop safe. Aha: bonus first — every touch puts a man out and below 6 the bonus line is dead. Earn 2 bonus points and 4 points total in 4 raids. | 77% / 93% |
| 20 | One-Point Thriller | Do-or-Die Drill · spike | — | Spike: level at 13-13 with 3 raids each left, and you are on 2 empty raids — your first raid is Do-or-Die. Ankle-catchers guard the corners (so the bonus hop is dangerous) and their raider goes for the bonus and two-touch raids. Win by 1. | 65% / 83% |
| 21 | Friend's Ghost | Ghost Duel · breather | ghost duel | Breather after the thriller, and the first Ghost Duel: a friend raided this same friendly mat (seven on, rookie corners, bonus line open) and their recorded score is on the board. Beat it in 4 raids. No defending, no clock pressure — the ghost replays exactly, so it is a pure score chase. Aha: the bonus hop is free points while all seven stand; take it before your touches thin the mat. | 87% / 93% |
| 22 | District Final | Full Match · boss | — | Chapter boss with a Do-or-Die finish: the second half of the District Final, two down at 12-14 from 20:00 (~14 raids each). A, T and B defenders and a raider who hops the bonus and Dubkis home; Do-or-Die is live on both sides, so the empty raids you spend early decide who is forced at the end. Win the match. | 77% / 90% |

### Chapter 3 — State League (trials 23-33)

| # | Trial | Type · role | Introduces | What it tests (aha) | Casual / skilled bot |
|---|---|---|---|---|---|
| 23 | Rushers | Raid Puzzle · teach | backward kick, rusher defenders | Teach the Backward Kick: Rushers (R) charge the raider and hold about a third of Hand or Toe Touches near them, but a Backward Kick tags a charging R at a fraction of that risk (READ). Aha: let the rusher come to you. Score 2 Kicks and 3 points in 4 raids. | 77% / 91% |
| 24 | Lunge for the Line | Raid Puzzle · teach | escape lunge | Teach the Escape lunge: strong-grip T's and a chained pair (C C) will hold you. Walking or dashing home past them is held most of the time — only the Dubki gets home reliably (READ). When held, the lunge for the line is strong held shallow (0-1 touches) and fades with every touch; held deep, the stamina pull-away is the better struggle. Aha: Dubki home, and if held: shallow → lunge, deep → pull. Score 4 in 4 raids; caught 3 times and it's over. | 75% / 90% |
| 25 | Charge the Hop | Defend Stand · teach | defender rush | Teach the defender Rush: the state raider goes for the bonus line on most raids and lands it 8 times in 10 if you let him. A corner Rush stops the hop best; the holds on a hop are weak (READ). Aha: rush the hop, hold the touch. Stop 2 of 4 raids, concede no more than 3. | 73% / 83% |
| 26 | Super Tackle | Super Challenge · teach | super tackle | Teach the Super Tackle: you have only 3 on the mat, so any tackle is worth 2 — but he goes for two touches, and lose all 3 and the all-out gives them +2. Aha: three defenders are a threat, not a weakness. Land a Super Tackle within 3 raids and concede no more than 1. | 79% / 83% |
| 27 | Turn the Raid | Match · twist | defence reads repeats | Twist: state sides scout you — a touch move or way home you used on your previous raid is now read and punished, so the safe Kick can't be your every raid. You are down to 5 on the mat and their Rushers sit beside Thigh-holders: alternate the Kick on a charging R with a Toe on a T and vary the way home; every point revives a team-mate, and drop to 3 and you fail. Score with a Backward Kick and win the 4-raid segment by 1. | 69% / 78% |
| 28 | All Out! | Super Challenge · teach | all-out | Teach the all-out: only a Thigh-holder and a rookie are left. Touch both out (one greedy 2-touch raid or two clean ones) and the all-out is +2 with their whole side coming back. Aha: finish the job — a lone survivor revives them. Inflict the all-out within 3 raids. | 74% / 92% |
| 29 | The Kicker | Defend Stand · twist | CPU backward kick | Twist on the kick: now THEIR raider touches once and Backward-Kicks the defender who chases him — the briefing and the telegraph show a kick coming. No hold stops a kick well, and a Rush into it almost never works, so when the kick is shown, let it go and Block his Dash home (the best stop on the board); when he shows a Hand, Thigh Hold the touch. Aha: never chase a kicker — beat his way home. Stop 3 of 5. | 69% / 76% |
| 30 | Rush Hour | Match · combine | — | Combine chapter 3: a mat of Rushers around a Blocker and two T's, and a raider who hops the bonus or Dashes home. Kick the rushers, Dubki past the wall; Rush his hop, Block his Dash. 4 raids each, win by 2. | 66% / 80% |
| 31 | Revival Run | Revival Run · spike | revival | Spike: all out at minute 5 — 5-9 down and only 3 back on the mat. Each point you score revives a team-mate, and with 3 or fewer every tackle is a Super Tackle. Aha: sacrifice greed for revivals — safe single touches rebuild the side. Reach 20:00 within 2 points; trail by 9 and it's over. A Super Tackle from three is the 3-star swing. | 73% / 81% |
| 32 | Floodlight Friendly | Match · breather | — | Breather after the revival spike: a friendly against a second-string side — two rookies, one rusher to kick, bonus line open. 3 raids each; win by 2, 3 stars for 5. | 82% / 92% |
| 33 | State Final | Full Match · boss | — | Chapter boss with a comeback: the State Final, joined at 10:00 already 3-9 down after the champions' opening raids. Full mat of Rushers, Blockers and T's; a raider who kicks chasers and hops the bonus. Win the match. | 61% / 85% |

### Chapter 4 — Auction Season (trials 34-44)

| # | Trial | Type · role | Introduces | What it tests (aha) | Casual / skilled bot |
|---|---|---|---|---|---|
| 34 | The Auction | Auction · teach | auction, player roles | Teach the auction: 6 lots — a star Raider and a cheap one, two Corners, two Anchors — and an 85-lakh purse against AI franchises. The star goes for 45-60, so buying him leaves barely enough for a Corner and an Anchor and nothing for the stars; the budget Raider, a Corner and an Anchor cost about 55. Aha: price the whole squad, not the lot — a lot you pass on has a cheaper twin later. Buy a Raider, a Corner and an Anchor. | 74% / 94% |
| 35 | Corner Specialists | Defend Stand · teach | hold specialists | Teach specialists: your left corner is an Ankle specialist (A, ankle ×1.25), your right corner a Thigh specialist (T, thigh ×1.25). The raider attacks anywhere with Hand or Toe. Aha: switch to the specialist whose hold matches his move when he is in range. Stop 3 of 5. | 77% / 86% |
| 36 | The Anchor | Defend Stand · teach | anchor | Teach the Anchor: K in slot 4 adds strength to every hold and his holds rarely slip, so whenever the raider's target is within one slot of him (slots 3-5), tackle with the Anchor whatever the move; at the corners, use the corner specialist only when his hold matches the move, otherwise the defender beside him. Aha: the specialists need the right read, the Anchor just needs to be in range. Stop 3 of 5. | 77% / 72% |
| 37 | Bluff Raider | Defend Stand · twist | feints | Twist: this raider feints — 35% of the time the telegraphed move is not the real one. Committing to the counter of a feint fails. Aha: against a bluffer use the all-round Anchor, Ankle a Dash home (works on both Dash and Dubki) and let doubtful touches go. Stop 2 of 5, concede no more than 5. | 74% / 85% |
| 38 | Draft Day | Auction · practise | — | Build the squad, then play it: 7 lots (a star Raider, two Corners, Anchor, Cover, a second Anchor, a budget Raider last) on 100 lakh — enough for the three you need plus one extra if you don't overpay, then a 4-raid league match where YOUR buys defend and YOUR raider's stats raid. Aha: the raider's reach and speed you paid for show up in every touch. Buy a Raider, a Corner and an Anchor, then win by 1. | 66% / 83% |
| 39 | Switch! | Defend Stand · twist | defender switch | Twist: a two-touch raider — after the first touch he turns for a second defender, so the defender in range changes mid-raid. Switch to whoever covers the new target (the tap-select is instant). Aha: defend the raider's NEXT target, not the last one. Stop 2 of 4 and concede no more than 3. | 83% / 89% |
| 40 | Specialist Derby | Match · combine | — | Combine: your specialist squad (A corners, T covers, Anchor) against a full league mat (A, T, B, R) and a Medium raider who feints 15%. Every raid is a read on both ends. 4 raids each, win by 2. | 67% / 87% |
| 41 | Scout's Choice | Auction · combine | — | Combine auction and defence: the scouting report says their raider is a Toe-Touch specialist who Dubkis home — both beaten by Ankle holds. The Ankle Corner is the one you want, so the rival franchises bid him up; the Thigh Corner goes cheap and the Anchor sits between. 70 lakh buys the Ankle Corner and an Anchor only if you don't overpay. Aha: buy for the opponent you will face, not the bargain. Buy a Corner and an Anchor, then stop 3 of his 5 raids. | 69% / 85% |
| 42 | Squad Test | Auction · spike | — | Spike — the first squad-dependent test: a tight 90-lakh purse for 5 lots (a star and a budget Raider, one Corner, two Anchors), then 5 raids each against the league's Hard franchise: its raider is no athlete, but a schemer (Hard brain: he reads your shape, feints 20%, knows the Do-or-Die). The budget Raider plus a Corner and the cheaper Anchor is a winning mid-cost squad; overpaying for both stars is not. Buy a Raider, a Corner and an Anchor, then win by 1. | 57% / 83% |
| 43 | Fans' Day | Match · breather | — | Breather after the squad test: your full specialist squad against an exhibition side with an easy raider. Enjoy the toolkit — bonus line open, one rusher to kick. 3 raids each, win by 2. | 83% / 95% |
| 44 | Season Final | Full Match · boss | — | Chapter boss: auction your own squad (7 lots, 110 lakh), then play the full 2x20 Season Final with it against a Medium-Hard franchise that reads your specialists and feints. Win the match. | 61% / 91% |

### Chapter 5 — Continental Cup (trials 45-55)

| # | Trial | Type · role | Introduces | What it tests (aha) | Casual / skilled bot |
|---|---|---|---|---|---|
| 45 | Super Raid | Super Challenge · teach | super raid | Teach the Super Raid: three touches in one raid. Three touches take 21 of the 30 seconds and every touch makes the way home harder (depth ×1.7 at three). Aha: string the touches along one side (rookies first, Toe on the T's), then Dubki home before the clock. Land a Super Raid within 4 raids. | 67% / 83% |
| 46 | Two Defenders, One Chain | Defend Stand · teach | chain tackle | Teach the Chain Tackle: two adjacent defenders link — strong against every touch and every way home except the Dubki, and a chained raider rarely slips. Aha: two defenders, one chain — chain the pair around his target. Land 2 chain tackles in 5 raids and concede no more than 4. | 72% / 83% |
| 47 | Last Three Standing | Super Challenge · twist | — | Twist: three rookies left in the middle of your mat, no specialists, against a raider hunting a super raid (2-3 touches a raid). Any tackle from 3 is a Super Tackle (+2), but a failed tackle on the touch costs two men and brings the all-out close. Aha: let the first touch go and chain him on the way home, when every tackle still counts as Super. Land a Super Tackle within 3 raids, concede no more than 1. | 60% / 75% |
| 48 | The Cage | Raid Puzzle · teach | formation theme: Cage, chain links | Teach formation themes with the Cage: two chained pairs (C C) either side of the centre. Walking or dashing home past two chains is held most of the time; the Dubki ducks under both (READ). Aha: in the Cage, the way home is the puzzle. Score 4 in 4 raids. | 61% / 82% |
| 49 | Pincer | Raid Puzzle · twist | formation theme: Pincer | Twist theme, the Pincer: Ankle-catcher corners and Rushers inside — the bonus hop runs straight into both (READ). The cheap points are Kicks on the charging R's and Hand Touches on the A's. Aha: the open bonus line is the bait. Score 3 in 4 raids with a Kick. | 63% / 71% |
| 50 | Third Umpire | Raid Puzzle · teach | DRS review | Teach DRS: close touches are called by the referee, and 'very tight' calls are wrong almost half the time ('tight' ones 1 in 5). 2 reviews: a failed review is lost. Aha: review the very tight calls, accept the merely tight. Score 4 in 5 raids. | 67% / 82% |
| 51 | Ghost Gate | Ghost Duel · twist | ghost gate | Twist: defend against a recorded ghost raider. Its 5 raids are known before you start (GHOST PLAN row: a Toe and Dash home, a Hand and walk, a bonus hop, a two-touch raid with a Dubki home, a corner Toe and Dash) and replay exactly — no feints. Aha: a ghost can be solved: plan the perfect counter for each raid. Stop 3 of 5 and concede no more than 4. | 67% / 78% |
| 52 | Diamond | Match · combine | formation theme: Diamond | Combine with the Diamond theme: a Blocker at the point, Rushers on the shoulders, T's behind — and a Hard raider who chains touches. Kick the rushers, Dubki the wall, chain his deep raids. 4 raids each, win by 2. | 60% / 81% |
| 53 | Ghost Duel: Cage | Ghost Duel · spike | weekly ladder ghost | Spike: this week's ladder ghost raided the Cage (two chained pairs, T's at the corners) 5 times and its score is on the board. Beat it in 5 raids — the chains make every walk or Dash home a gamble, so Dubki home, and you need at least one two-touch raid. 2 DRS reviews for the very tight calls; a lost review is gone. | 57% / 77% |
| 54 | Fan Zone | Match · breather | — | Breather after the ghost spike: a fan-zone exhibition against a young side (rookies, one T) and an Easy raider who never feints; the young side barely reads repeats. Try the super raid for fun. 3 raids each, win by 2. | 79% / 95% |
| 55 | Continental Semi-Final | Full Match · boss | — | Chapter boss: the Continental Semi-Final as a Blitz (2x10), joined at 5:00 already 4-6 down after a bad start, against a Hard side that defends in the Cage (Dubki home, Toe on the T corners) and raids with feints and two-touch raids (chain the return). One DRS review. Win the match. | 58% / 85% |

### Chapter 6 — World Championship (trials 56-66)

| # | Trial | Type · role | Introduces | What it tests (aha) | Casual / skilled bot |
|---|---|---|---|---|---|
| 56 | Rotation | Match · teach | fatigue, raider rotation | Teach fatigue: your star raider Veer (reach 8) tires after two raids (stamina 3); Kabir (reach 6, stamina 8) can go all day. A tired raider reaches less and is held more. Aha: rotate — the star for the big raids, the workhorse in between. 6 raids each, win by 3. | 73% / 90% |
| 57 | Iron Anchor | Raid Puzzle · teach | rival captain | Teach rival captains: their captain K anchors the centre — every move near him is dangerous and he guards every way home. His one weakness: he chases, so a Backward Kick on him is the safest touch on the mat (READ k on slot 4), and the kick tags him out of the way home too. Aha: kick the captain, don't avoid him. Score 4 in 4 raids. | 65% / 77% |
| 58 | Dubki King | Defend Stand · teach | rival raider signature | Rival raider: the Dubki King always ducks home — under thighs, chains and walls. Only the Ankle Hold reads the dubki — the best answer on the board (READ). Aha: a signature move is a promise — let the touch go and ankle him on the way home. Stop 3 of 5 and concede no more than 3. | 60% / 76% |
| 59 | Feint Master | Defend Stand · twist | — | Twist on rival raiders: the Feint Master's telegraph lies 1 time in 5. Your Anchor stands between two Covers, so a chain through the centre is the strongest tackle on your mat whichever touch is real, and the Ankle covers both Dash and Dubki home. Aha: when you can't read him, defend with the move that has no weakness. Stop 3 of 5 and concede no more than 3. | 71% / 86% |
| 60 | Endurance | Match · combine | — | Combine: the last 15 minutes of a group match, 17-19 down, with three raiders to rotate (one star, two workhorses) against a mat anchored by a rival captain weak to the Toe Touch. Fatigue decides it. Win by 1. | 59% / 82% |
| 61 | Captain's Cage | Raid Puzzle · combine | — | Combine: the Cage with a rival captain locking its centre. The captain is weak to the Dubki home — but the chains beside him also hate it, so the Dubki is the only way home. Find the touches (Toe on the corners, Kick on the captain) and duck out — one clean point a raid is enough, and a Super Raid along the rookie corner and the captain is the 3-star swing. Score 4 in 5 raids. | 64% / 84% |
| 62 | Night Wall | Match · combine | formation theme: Wall | Combine with the Wall theme: four Blockers and a captain weak to the Toe Touch, against a Hard feinting raider. No Dash in this trial — the wall would eat it — so it's walk or Dubki home, chosen against what they read from your last raid; review the very tight calls. 5 raids each, win by 1. | 68% / 87% |
| 63 | Lap of Honour | Match · breather | — | Breather before the last push: a lap-of-honour friendly against a veterans' side (rookies and one T, six on the mat) with a slow Easy raider; the veterans barely read repeats. 3 raids each, win by 2; 3 stars for a Super Raid. | 75% / 91% |
| 64 | Last Stand | Revival Run · spike | — | Spike: the last 5 minutes of a world group decider, 24-25 down with only 3 on the mat. Every tackle is a Super Tackle (+2) and every point you score revives a team-mate, so one Super Tackle plus a kick on their captain (his weakness) turns it. Trail by 9 and it's over. Win by 1. | 59% / 74% |
| 65 | Champion's Gauntlet | Comeback · spike | — | The last 10 minutes of the World semi-final, 1 point down, against the champions' feinting raider and a captain weak to the Kick, with two raiders to rotate and one DRS review. About 7 raids each: rest the star for the closing raids. Win by 1. | 57% / 70% |
| 66 | World Final | Full Match · boss | all mechanics combined | Final boss on Hard: the full 2x20 World Final. Their captain anchors a Pincer-Cage mat (weak to the Kick), their scouts read every repeated move, their raider is the Feint Master with a Dubki home, and you rotate three raiders through fatigue with one DRS review. Finish ahead. | 58% / 85% |

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
