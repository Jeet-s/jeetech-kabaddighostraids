exec(open('.agf/tmp/ld/blocks.py').read())
old = {i: get(i) for i in range(1, 67)}
put(3, '''
  {
    id: 3, ch: 1, name: "Burst Home", type: "Raid Puzzle", role: "teach", theme: "Village Mat",
    intro: ["dash home"], mech: ["hand touch", "walk home", "dash home", "thigh-holders"],
    intent: "Teach the way home: five Thigh-holders stand between you and the midline and only the two left-hand men are rookies. The touch on the corner rookie is safe either way; the walk home past five slow-reaching T's is the risk (READ: walk home held about 2.5x as often as the Dash). Aha: the way home is a choice too — touch the safe rookie, then burst home with the Dash. 3 points in 5 raids.",
    op: "ooTTTTT", g: 0.3, moves: M1D, flow: "raid", raids: 5,
    goal: { pts: 3, maxCaught: 2 }, stars: [S("noCaught", 0, "Never get caught"), S("pts", 4, "Score 4 points")],
  },
''')
put(4, '''
  {
    id: 4, ch: 1, name: "Hold the Line", type: "Defend Stand", role: "teach", theme: "Village Mat",
    intro: ["defender select", "ankle hold", "thigh hold", "tackle ring"], mech: ["ankle hold", "thigh hold", "tackle ring", "read the raider's move"],
    intent: "First defence, in one drill: select a defender beside the raider's target, pick the hold, and press on the tackle ring. The village raider telegraphs his touch — a Hand Touch (high) or a Toe Touch (low). The Ankle Hold catches a Toe, the Thigh Hold catches a Hand; the wrong hold misses about 3 times in 4, and 'Hold' (no tackle) just hands him the point. Aha: watch his move, then match the hold. Stop 3 of his 5 raids, concede no more than 4.",
    op: "ooooooo", g: 1, w: 1.05, moves: M1D, def: D2, flow: "defend", defs: 5,
    ai: ai("Village raider", 0.25, ["hand", "toe"], ["walk"], 0),
    goal: { stops: 3, maxOpp: 4 }, stars: [S("stops", 4, "Stop 4 raids"), S("oppMax", 1, "Concede at most 1")],
  },
''')
put(5, '''
  {
    id: 5, ch: 1, name: "Second Touch", type: "Raid Puzzle", role: "teach", theme: "Village Mat",
    intro: ["second touch (raid depth)"], mech: ["hand touch", "dash home", "raid depth", "thigh-holders"],
    intent: "Teach greed: a rookie pair stands on each corner around a wall of three Thigh-holders. 4 points in 3 raids means at least one raid must take two touches — but every touch already made raises the next touch's risk by a third and makes the way home deeper (READ: home after 1 touch vs after 2). Aha: be greedy only along a rookie pair — the corner first, then his rookie neighbour away from the T, then Dash home; a second touch next to a T is where raids die.",
    op: "ooTTToo", g: 0.4, moves: M1D, flow: "raid", raids: 3,
    goal: { pts: 4, maxCaught: 2 }, stars: [S("pts", 5, "Score 5 points"), S("noCaught", 0, "Never get caught")],
  },
''')
put(6, '''
  {
    id: 6, ch: 1, name: "Cover Tackle", type: "Defend Stand", role: "twist", theme: "Village Mat",
    intro: ["cover position"], mech: ["thigh hold", "cover position", "defender select"],
    intent: "Twist: not WHICH hold but WHO tackles. This raider only Hand Touches and walks home, so the Thigh Hold is always the right hold; the cover ring on screen shows who should make it — the man he touches tackles at 82% of full strength (he is off balance), his neighbour, the cover, at 100%, two away at 55%. Aha: let the cover make the tackle, never the man being touched. Stop 3 of 5.",
    op: "ooooooo", g: 1, w: 1, moves: M1D, def: D2, flow: "defend", defs: 5, show: { cover: true },
    ai: ai("Village raider", 0.35, ["hand"], ["walk"], 0),
    goal: { stops: 3, maxOpp: 5 }, stars: [S("stops", 4, "Stop 4 raids"), S("oppMax", 2, "Concede at most 2")],
  },
''')
put(8, '''
  {
    id: 8, ch: 1, name: "Village Fair", type: "Match", role: "breather", theme: "Village Mat",
    intro: ["raid and defend in turns", "referee's call"], mech: ["hand touch", "dash home", "ankle hold", "thigh hold", "alternating raids", "referee's call"],
    intent: "Breather and the first real match flow: 3 raids each against a gentle village side (two Thigh-holders, a Hand-Touch-only raider), the sides swapping after every raid. After the first two raids the referee steps in: LOBBY — their Thigh-holder in slot 2 stepped out of bounds and is sent off the mat, so the gap you have been raiding changes shape. Aha: after a referee's call, re-read the mat before you raid. Win the segment by 1; 3 stars for winning by 4.",
    op: "oTooToo", g: 0.45, moves: M1D, def: D2, flow: "alt", first: 0, raids: 3, defs: 3,
    moment: { at: 2, kind: "ref", text: "LOBBY! Their Thigh-holder stepped out of bounds — the referee sends him off. Re-read the mat.", out: [1] },
    ai: ai("Fair raider", 0.2, ["hand"], ["walk"], 0),
    goal: { margin: 1 }, stars: [S("margin", 3, "Win by 3"), S("margin", 4, "Win by 4")],
  },
''')
put(9, '''
  {
    id: 9, ch: 1, name: "Two-Way Duel", type: "Match", role: "combine", theme: "Village Mat",
    intro: ["mid-match reversal"], mech: ["hand touch", "dash home", "ankle hold", "thigh hold", "return tackle", "thigh-holders", "mid-match reversal"],
    intent: "Combine both halves of chapter 1, then flip them: 4 raids each. At first T's guard both corners and the centre, so raid the gaps and Dash home, and their raider mixes Hand and Toe, so match the hold. After two raids each their coach reverses everything: the T's move into the old gaps (rookies now at the corners and the centre) and their raider switches to Toe Touches and Dash home only. Aha: a reversal is a new puzzle — re-read both ends (your safe touch moves, and one Ankle Hold now beats both his touch and his way home). Win by 2.",
    op: "TooToTo", g: 0.5, moves: M1D, def: D2, flow: "alt", first: 0, raids: 4, defs: 4,
    moment: { at: 4, kind: "reversal", text: "REVERSAL! Their coach swaps the shape: Thigh-holders into the gaps — and their raider now only Toe-touches and Dashes home.", op: "oTToTTo", ai: { mv: ["toe"], ret: ["dash"] } },
    ai: ai("Village raider", 0.35, ["hand", "toe"], ["walk", "dash"], 0),
    goal: { margin: 2 }, stars: [S("margin", 4, "Win by 4"), S("noCaught", 0, "Never get caught")],
  },
''')
put(11, '''
  {
    id: 11, ch: 1, name: "Village Final", type: "Full Match", role: "boss", theme: "Village Mat",
    intro: ["full match", "half-time swap", "rival personality"], mech: ["hand touch", "dash home", "struggle (pull-away)", "ankle hold", "thigh hold", "cover position", "full match"],
    intent: "Chapter boss and the first whole match, kept short: the Village Final as a mini-Blitz of 2x6 game minutes (~17 raids, about 6 real minutes) with a half-time swap. Their captain Bholu has a personality you can read: he is greedy — he goes for two touches on 8 raids in 10 and always Dashes home. Aha: his second touch and his Dash are your chances — tackle his next target with the cover, or Ankle his Dash home; on your raids, raid the rookie gaps and Dash past the T's. Win the match.",
    op: "oTToTTo", g: 0.4, moves: M1D, def: D2, flow: "alt", first: 0, clock: [0, 720], half: 360,
    ai: ai("Bholu, the greedy captain", 0.35, ["hand", "toe"], ["dash"], 0, { k: 2, greedy: 0.8 }),
    goal: { margin: 1 }, stars: [S("margin", 3, "Win by 3"), S("margin", 6, "Win by 6")],
  },
''')
# ch2
b14 = old[14].replace('Four Blockers (B) form a wall on the midline: Dash home into them and you are held most of the time (READ).',
  'Four Blockers (B) form a wall on the midline — the screen shows it: before you pick the way home the B\'s link arms across the midline and the Dash gem is drawn against the wall, so a Dash into them (held most of the time, READ) is never a hidden trap.')
b14 = b14.replace('moves: M2, flow: "raid", raids: 4,', 'moves: M2, flow: "raid", raids: 4, show: { wall: true },')
put(14, b14)
put(15, '''
  {
    id: 15, ch: 2, name: "Build the Wall", type: "Defend Stand", role: "teach", theme: "District Cup",
    intro: ["block (defensive wall)"], mech: ["block (defensive wall)", "ankle hold", "thigh hold", "return tackle"],
    intent: "Teach the Block: the district raider always Dashes home. Let the touch go and form the Block on the midline — in this first lesson its timing window is a quarter wider than normal, so a well-timed Block is the strongest stop on the board (READ); an Ankle Hold on the Dash is the back-up and a Thigh Hold on a Dash mostly fails. Aha: defend the way home, not the touch. Stop 3 of 5.",
    op: "ooooooo", g: 1, w: 1, bw: 1.25, moves: M2, def: D3, flow: "defend", defs: 5,
    ai: ai("District sprinter", 0.45, ["hand", "toe"], ["dash"], 0),
    goal: { stops: 3, maxOpp: 5 }, stars: [S("stops", 4, "Stop 4 raids"), S("oppMax", 2, "Concede at most 2")],
  },
''')
dod = old[18].replace('id: 18, ch: 2', 'id: 17, ch: 2').replace('intro: [],', 'intro: ["do-or-die raid"],')
dod = dod.replace('intent: "Two empty raids already', 'intent: "Straight after the empty-raid counter: two empty raids already')
put(17, dod)
bonus = old[19].replace('id: 19, ch: 2', 'id: 18, ch: 2')
put(18, bonus)
put(19, '''
  {
    id: 19, ch: 2, name: "Their Do-or-Die", type: "Do-or-Die Drill", role: "twist", theme: "District Cup",
    intro: [], mech: ["do-or-die raid", "ankle hold", "thigh hold", "block (defensive wall)", "revival"],
    intent: "Twist: now THEIR raider is on 2 empty raids, so his first raid is Do-or-Die — he must touch someone, so his telegraph is always a real attempt and an empty raid puts him out. The extra consequence: two of your side are already out, so every stop revives one of them (first out, first back) and every touch he lands sends another of yours off; fall to 2 on the mat and the trial is lost. Aha: a forced raider is predictable — punish his Do-or-Die with the matching hold and win your men back. Stop 2 of his 4 raids, concede no more than 4.",
    op: "ooooooo", me: "oo-ooo-", g: 1, w: 1.1, moves: M2, def: D3, flow: "defend", defs: 4, empty: [0, 2],
    ai: ai("Desperate raider", 0.38, ["hand", "toe"], ["walk", "dash"], 0),
    goal: { stops: 2, maxOpp: 4, minMat: 3 }, stars: [S("fullSide", 0, "Finish with all 7 on the mat"), S("stops", 3, "Stop 3 raids")],
  },
''')
put(20, '''
  {
    id: 20, ch: 2, name: "One-Point Thriller", type: "Match", role: "spike", theme: "District Cup",
    intro: [], mech: ["empty-raid counter", "bonus line", "toe touch", "dubki", "block (defensive wall)", "ankle-catchers"],
    intent: "Spike built only from chapter 2's verbs: level at 13-13, 3 raids each left. You are on 1 empty raid (one more patient raid is allowed, a second would make the third Do-or-Die), their raider takes one touch or hops the bonus. Ankle-catchers on the corners make your bonus hop a real gamble (READ), the T's in the middle want the Toe. Aha: in a one-point game, count the empties — bank one safe Toe point early, then decide whether the bonus is worth its risk. Win by 1.",
    op: "ATTBTTA", g: 0.5, moves: M2B, def: D3, flow: "alt", first: 0, raids: 3, defs: 3, score: [13, 13], empty: [1, 1],
    ai: ai("District star", 0.4, ["hand", "toe", "bonus"], ["walk", "dash", "dubki"], 0, { bonusRate: 0.3 }),
    goal: { margin: 1 }, stars: [S("margin", 3, "Win by 3"), S("noEmpty", 0, "No empty raids")],
  },
''')
put(22, '''
  {
    id: 22, ch: 2, name: "District Final", type: "Full Match", role: "boss", theme: "District Cup",
    intro: [], mech: ["full match", "do-or-die raid", "bonus line", "toe touch", "dubki", "block (defensive wall)", "ankle-catchers", "thigh-holders"],
    intent: "Chapter boss with a Do-or-Die finish, kept to one session: the last 15 minutes of the District Final (~21 raids), one down at 13-14. A, T and B defenders and a raider who hops the bonus and Dubkis home; Do-or-Die is live on both sides, so the empty raids you spend early decide who is forced at the end. Aha: manage the empties like a clock — spend patience while level, never while behind. Win the match.",
    op: "ATTBTTA", g: 0.45, moves: M2B, def: D3, flow: "alt", first: 0, clock: [1500, 2400], score: [13, 14],
    ai: ai("District captain", 0.42, ["hand", "toe", "bonus"], ["walk", "dash", "dubki"], 0, { k: 2, bonusRate: 0.25 }),
    goal: { margin: 1 }, stars: [S("margin", 4, "Win by 4"), S("margin", 7, "Win by 7")],
  },
''')
open(p, 'w').write(s)
print("ok")
