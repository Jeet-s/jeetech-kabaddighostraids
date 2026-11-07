exec(open('.agf/tmp/ld/blocks.py').read())
put(49, '''
  {
    id: 49, ch: 5, name: "Pincer", type: "Raid Puzzle", role: "twist", theme: "Formation: Pincer",
    intro: ["formation theme: Pincer"], mech: ["formation theme: Pincer", "thigh-holders", "rusher defenders", "bonus line", "backward kick"],
    intent: "Twist theme, the Pincer: Thigh-holder corners and two Rushers just inside them squeeze the bonus line. The hop is now a fair gamble rather than a trap — about one in three held (READ), a point that puts nobody out — while a Kick on a charging R is the safe point and the Toe beats the T's. Aha: the bonus is worth taking only while all seven stand and only once; after a hop, kick the rushers. Score 4 in 4 raids with a Kick.",
    op: "TRoBoRT", g: 0.5, moves: M3, flow: "raid", raids: 4,
    goal: { pts: 4, maxCaught: 2, need: { kick: 1 } }, stars: [S("bonus", 1, "Land a bonus hop"), S("noCaught", 0, "Never get caught")],
  },
''')
put(50, '''
  {
    id: 50, ch: 5, name: "Third Umpire", type: "Raid Puzzle", role: "teach", theme: "Continental Cup",
    intro: ["DRS review"], mech: ["DRS review", "toe touch", "hand touch", "dubki"],
    intent: "Teach DRS on an easy mat, so the review is the only lesson: rookies with two Thigh-holders. Close touches are called by the referee and the call says how close: 'very tight' calls are wrong almost half the time, 'tight' ones 1 in 5. You have 2 reviews and a failed review is lost. Aha: review the very tight calls, accept the merely tight ones — a review is a resource, not a reflex. Score 4 in 5 raids.",
    op: "ooToToo", g: 0.5, moves: M3, flow: "raid", raids: 5, drs: 2,
    goal: { pts: 4, maxCaught: 2 }, stars: [S("drsWin", 1, "Win a DRS review"), S("noCaught", 0, "Never get caught")],
  },
''')
b = get(52).replace('a Hard raider who chains touches', 'a Medium raider who strings two touches together').replace('2, { k: 2, bluff: 0.1 }', '1, { k: 2, bluff: 0.1 }')
put(52, b)
put(55, '''
  {
    id: 55, ch: 5, name: "Continental Semi-Final", type: "Full Match", role: "boss", theme: "Continental Cup",
    intro: ["half-time reversal"], mech: ["full match", "chain tackle", "super raid", "DRS review", "formation theme: Cage", "ankle-catchers", "feints", "mid-match reversal"],
    intent: "Chapter boss: the Continental Semi-Final as a Blitz (2x10), joined at 5:00 already 4-6 down (~21 raids). First half they defend in the Cage (two chained pairs: walking or dashing home past them is the risk, the Dubki ducks under). At half-time their coach reverses it: an Ankle Line (four Ankle-catchers) that reads the Dubki and the Toe, so the walk, the Dash and the Hand Touch come back. Their raider feints 15% and takes two touches (chain the return). One DRS review. Aha: the half-time whistle changes the answer — the move that won the first half loses the second. Win the match.",
    op: "oCCoCCo", g: 0.45, moves: M3, def: D5, flow: "alt", first: 0, clock: [300, 1200], half: 600, score: [4, 6], drs: 1, raider: [7, 6, 6, 6],
    moment: { atHalf: true, kind: "reversal", text: "HALF-TIME REVERSAL! They drop the Cage for an Ankle Line — four Ankle-catchers read the Dubki and the Toe.", op: "AoAoAoA" },
    ai: ai("Continental captain", 0.5, ["hand", "toe", "bonus"], ["walk", "dash", "dubki"], 1, { k: 2, bluff: 0.15, bonusRate: 0.2 }),
    goal: { margin: 1 }, stars: [S("margin", 4, "Win by 4"), S("drsWin", 1, "Win a DRS review")],
  },
''')
put(59, '''
  {
    id: 59, ch: 6, name: "Feint Master", type: "Defend Stand", role: "twist", theme: "World Championship",
    intro: ["feint tell"], mech: ["feints", "feint tell", "rival raider signature", "chain tackle", "anchor", "ankle hold"],
    intent: "Twist on rival raiders: the Feint Master feints 1 raid in 4 — but he has a tell. On 6 of 10 feints his hips turn before the shown move and the telegraph flickers (FEINT? on screen): then the shown move is a lie. With no tell, the telegraph is true about 9 times in 10. Your Anchor stands between two Covers, so a chain through the centre is strong whichever touch is real, and the Ankle covers both his Dash and his Dubki home. Aha: read the tell — trust a clean telegraph, and against a flicker use the move that has no weakness. Stop 3 of 5, concede no more than 3.",
    op: "ooooooo", me: "ooCKCoo", g: 1, moves: M3, def: D5, flow: "defend", defs: 5,
    ai: ai("The Feint Master", 0.5, ["hand", "toe"], ["walk", "dash", "dubki"], 1, { bluff: 0.25, tell: 0.6 }),
    goal: { stops: 3, maxOpp: 3 }, stars: [S("stops", 4, "Stop 4 raids"), S("chain", 2, "Two chain tackles")],
  },
''')
put(60, '''
  {
    id: 60, ch: 6, name: "Endurance", type: "Match", role: "combine", theme: "World Championship",
    intro: [], mech: ["defence reads repeats", "fatigue", "raider rotation", "rival captain", "backward kick", "chain tackle", "dubki", "mid-match reversal"],
    intent: "Combine fatigue with a reversal: the last 15 minutes of a group match (~21 raids), 17-19 down, with three raiders to rotate (one star, two workhorses) against a mat anchored by a rival captain weak to the Toe Touch. After 8 raids their captain tires and goes to the bench: a fresh Rusher takes the centre, so the captain's Toe weakness is gone and the Kick on the charging R becomes the centre's safe touch. Aha: rest the star for the raids after the swap, and re-read the centre when the captain leaves. Win by 1.",
    op: "RTAKATR", kWeak: "toe", g: 0.5, moves: M3, def: D5, flow: "alt", first: 0, clock: [1500, 2400], score: [17, 19], read: 0.25, fatigue: true,
    moment: { at: 8, kind: "reversal", text: "Their captain is tired and goes to the bench — a fresh Rusher takes the centre.", op: "RTARATR" },
    raiders: [{ name: "Veer", st: [8, 7, 7, 3] }, { name: "Kabir", st: [6, 6, 5, 8] }, { name: "Dev", st: [6, 7, 6, 6] }],
    ai: ai("World raider", 0.5, ["hand", "toe", "bonus"], ["walk", "dash", "dubki"], 1, { k: 2, bluff: 0.15, tell: 0.5, bonusRate: 0.2 }),
    goal: { margin: 1 }, stars: [S("margin", 3, "Win by 3"), S("noCaught", 0, "Never get caught")],
  },
''')
put(61, '''
  {
    id: 61, ch: 6, name: "Captain's Cage", type: "Raid Puzzle", role: "combine", theme: "Formation: Cage",
    intro: [], mech: ["rival captain", "formation theme: Cage", "chain links", "dubki", "dash home", "backward kick", "super raid"],
    intent: "Combine: a half-Cage with a rival captain at its hinge — a chained pair on the left, the captain in the centre, two T's on the right. Two ways home compete (READ): the Dubki ducks under the chain and the T's but not the captain; the Dash is the captain's weakness (he cannot turn) but runs into the chain. And the answer moves: every chain link you put out breaks the chain for the next raid, so the Dash gets safer raid by raid. Aha: there is no fixed answer — re-price the way home after every raid. Score 4 in 5 raids; a Super Raid is the 3-star swing.",
    op: "oCCKTTo", kWeak: "dash", g: 0.5, moves: M3, flow: "raid", raids: 5,
    goal: { pts: 4, maxCaught: 2 }, stars: [S("superRaid", 1, "Land a Super Raid"), S("noCaught", 0, "Never get caught")],
  },
''')
b = get(62).replace('read: 0.35,', 'read: 0.3,').replace("2, { k: 2, bluff: 0.25 }", "2, { k: 2, bluff: 0.25, tell: 0.5 }")
b = b.replace("against a Hard feinting raider.", "against a Hard raider who feints 1 in 4 (half his feints show the tell).")
put(62, b)
b = get(65).replace("{ k: 2, bluff: 0.25, bonusRate: 0.2 }", "{ k: 2, bluff: 0.2, tell: 0.5, bonusRate: 0.2 }")
b = b.replace("against the champions' feinting raider", "against the champions' feinting raider (1 in 5, half of them with the tell)")
put(65, b)
put(66, '''
  {
    id: 66, ch: 6, name: "World Final", type: "Full Match", role: "boss", theme: "World Championship",
    intro: ["all mechanics combined"], mech: ["defence reads repeats", "full match", "rival captain", "rival raider signature", "fatigue", "raider rotation", "feints", "feint tell", "DRS review", "chain tackle", "super raid", "revival"],
    intent: "Final boss on Hard, as a World Final Blitz of 2x8 game minutes (~22 raids, one session). Their captain anchors a Pincer-Cage mat (weak to the Kick), their scouts read repeats (capped and shown: a repeated move's gem says SCOUTED and costs ~8 points), their raider is the Feint Master (1 feint in 4, half of them with the tell) who hunts super raids, and you rotate three raiders through fatigue with one DRS review. Aha: everything is readable — kick the captain, vary what they scouted, trust clean telegraphs, rest the star for the closing raids. Finish ahead.",
    op: "ACRKRCA", kWeak: "kick", g: 0.45, read: 0.3, moves: M3, def: D5, flow: "alt", first: 0, clock: [0, 960], half: 480, fatigue: true, drs: 1,
    raiders: [{ name: "Veer", st: [8, 7, 7, 4] }, { name: "Kabir", st: [6, 6, 5, 8] }, { name: "Dev", st: [6, 7, 6, 6] }],
    ai: ai("World captain", 0.55, ["hand", "toe", "bonus"], ["walk", "dash", "dubki"], 2, { k: 3, bluff: 0.25, tell: 0.5, bonusRate: 0.2 }),
    goal: { margin: 1 }, stars: [S("margin", 3, "Win by 3"), S("margin", 6, "Win by 6")],
  },
''')
open(p, 'w').write(s)
print("ok")
