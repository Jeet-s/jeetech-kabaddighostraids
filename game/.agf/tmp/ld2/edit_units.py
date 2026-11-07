import re,sys
p='src/game/units.ts'
s=open(p).read()
def block(i):
    m=re.search(r'\n  \{\n    id: %d, ch:'%i, s)
    assert m, i
    st=m.start()+1
    en=s.index('\n  },\n', st)+len('\n  },\n')
    return st,en
def setunit(i, body):
    global s
    st,en=block(i)
    s=s[:st]+body.strip('\n')+'\n'+s[en:]

setunit(16, '''  {
    id: 16, ch: 2, name: "Count the Empties", type: "Match", role: "teach", theme: "District Cup",
    intro: ["empty-raid counter"], mech: ["empty-raid counter", "toe touch", "hand touch", "ankle-catchers", "thigh-holders"],
    intent: "Teach the empty-raid counter: you lead 8-7, already on 1 empty raid, and their mat is all hard — Ankle-catchers and Thigh-holders in turn, no rookie anywhere, so every touch is a real risk (READ ~25-35% held) and a caught raid hands them the point and the lead. An empty raid (Walk home without touching) is safe and costs nothing while you lead — but the THIRD empty in a row is Do-or-Die, so you get exactly one free one. Their raider is gentle: your defence wins the points. Aha: one patient empty raid is a weapon, two is a risk — spend the one, then touch with the counter move (Toe on a T, Hand on an A). 4 raids each; finish ahead. The 3-star play is exactly one empty raid.",
    op: "ATATATA", g: 0.7, moves: M2T, def: D2, flow: "alt", first: 0, raids: 4, defs: 4, score: [8, 7], empty: [1, 0],
    ai: ai("District raider", 0.3, ["hand", "toe"], ["walk"], 0),
    goal: { margin: 1 }, stars: [S("empties", 1, "Exactly one empty raid"), S("noCaught", 0, "Never get caught")],
  },''')

setunit(17, '''  {
    id: 17, ch: 2, name: "Do-or-Die", type: "Do-or-Die Drill", role: "teach", theme: "District Cup",
    intro: ["do-or-die raid"], mech: ["do-or-die raid", "toe touch", "hand touch", "ankle-catchers", "blocker wall"],
    intent: "One lesson — survive the Do-or-Die: you are on two empty raids, so your FIRST raid must score or your raider is out. Ankle-catchers on the corners, a Blocker wall in the middle: the wall shuts the Dash home and the A's read the Dubki, so the safe way back is a plain walk, and the safe touch is a Hand on a corner A (READ). Win that raid and the trial is yours: score 2 in 3 raids. The greedy 3-point run (a second touch on a free raid after the Do-or-Die) is the star, never the goal. Aha: under Do-or-Die take the surest point, not the biggest.",
    op: "AoBBBoA", g: 0.55, moves: M2, flow: "raid", raids: 3, empty: [2, 0],
    goal: { pts: 2, maxCaught: 2, need: { dodWin: 1 } }, stars: [S("pts", 3, "Score 3 points"), S("noCaught", 0, "Never get caught")],
  },''')

setunit(19, '''  {
    id: 19, ch: 2, name: "Win Them Back", type: "Revival Run", role: "twist", theme: "District Cup",
    intro: ["revival"], mech: ["revival", "ankle hold", "thigh hold", "cover position"],
    intent: "Twist, one lesson — revival: two of your side are already out (5 on the mat). Every point you win brings one back, first out, first back, and a tackle is a point — so each stop is a man returning to the mat, each touch he lands sends another off. Only the two holds you know (no Block): his telegraph shows Hand or Toe, Thigh the Hand, Ankle the Toe, with the cover beside his target. Aha: defence is how you rebuild — two clean stops put all seven back. Stop 2 of his 4 raids and concede no more than 3; finishing with all 7 on the mat is the 3-star rebuild.",
    op: "ooooooo", me: "oo-oo-o", g: 1, w: 1.1, moves: M2, def: D2, flow: "defend", defs: 4,
    ai: ai("District raider", 0.38, ["hand", "toe"], ["walk"], 0),
    goal: { stops: 2, maxOpp: 3 }, stars: [S("fullSide", 0, "Finish with all 7 on the mat"), S("fastD", 3, "Win within his first 3 raids")],
  },''')

setunit(25, '''  {
    id: 25, ch: 3, name: "Charge the Hop", type: "Defend Stand", role: "teach", theme: "State League",
    intro: ["defender rush"], mech: ["defender rush", "bonus line", "ankle hold", "thigh hold"],
    intent: "Teach the defender Rush, and when NOT to use it: the state raider hops for the bonus line on about half his raids and Hand- or Toe-touches on the rest. A corner Rush is the best answer to a hop, but it is the worst answer to a touch — the holds stop touches (READ). So every raid is a read: hop → Rush, Hand → Thigh, Toe → Ankle. Aha: rush the hop, hold the touch. Stop 2 of 4 raids, concede no more than 3.",
    op: "ooooooo", g: 1, moves: M3, def: D4, flow: "defend", defs: 4,
    ai: ai("Bonus hunter", 0.45, ["bonus", "hand", "toe"], ["walk", "dash"], 0, { bonusRate: 0.45 }),
    goal: { stops: 2, maxOpp: 3 }, stars: [S("fastD", 3, "Win within his first 3 raids"), S("oppMax", 1, "Concede at most 1")],
  },''')

setunit(28, '''  {
    id: 28, ch: 3, name: "All Out!", type: "Super Challenge", role: "teach", theme: "State League",
    intro: ["all-out"], mech: ["all-out", "hand touch", "toe touch", "dubki", "thigh-holders", "ankle-catchers"],
    intent: "Teach the all-out: four are left — a rookie on each corner and a Thigh-holder beside an Ankle-catcher in the centre. Touch all four out and the all-out is +2 with their whole side coming back — but every point THEY win (a caught raid) revives one of theirs, so a greedy raid that gets caught undoes the work. The centre pair needs two different moves (Toe on the T, Hand on the A, READ) and each extra touch raises the next one's risk. No scouting on this drill. Aha: finish the job in the right order — the hard centre pair first while you are fresh, the corner rookies last, and never let a lone survivor revive them. Inflict the all-out within 3 raids.",
    op: "o-TA--o", g: 0.6, read: 0, moves: M3, flow: "raid", raids: 3,
    goal: { maxCaught: 2, need: { allOut: 1 } }, stars: [S("fast", 2, "All-out within 2 raids"), S("noCaught", 0, "Never get caught")],
  },''')

setunit(32, '''  {
    id: 32, ch: 3, name: "Rival's Ghost", type: "Ghost Duel", role: "breather", theme: "State League",
    intro: [], mech: ["ghost duel", "backward kick", "rusher defenders", "bonus line", "toe touch"],
    intent: "Breather after the revival spike, and the chapter's Ghost Duel: your district rival Sameer raided this friendly floodlight mat (rookies, two Rushers, one Thigh-holder, bonus line open) and his recorded score is on the board. Beat it in 4 raids — no defending, the ghost replays exactly. The toy: the floodlight crowd roars for every Backward Kick on a charging Rusher. Aha: the kick you learnt in this chapter is the safe point — Kick the R's, Toe the T, hop the bonus while all seven stand.",
    op: "oRoToRo", g: 0.45, read: 0, moves: M3, flow: "raid", raids: 4, ghost: "rival",
    goal: { ghost: true, maxCaught: 2 }, stars: [S("kick", 2, "Score with 2 Kicks"), S("noCaught", 0, "Never get caught")],
  },''')

setunit(38, '''  {
    id: 38, ch: 4, name: "Hold the Lead", type: "Match", role: "practise", theme: "Auction Hall",
    intro: ["protect a lead"], mech: ["game management", "empty-raid counter", "hold specialists", "anchor", "alternating raids"],
    intent: "Game management against a strong captain: you lead 20-19 with 4 raids each to go, and the trial is lost the moment you trail by more than 1. Your specialist squad defends (A corners, T covers, Anchor in the middle) against a Hard-thinking league captain who counters your specialists. A patient empty raid is safe while you lead, but two in a row make the third a Do-or-Die. Aha: protecting a lead is its own skill — bank the safe single touch, spend at most one empty raid, and tackle only with the specialist whose hold matches his move. Finish ahead, never more than 1 behind.",
    op: "ATBoBTA", me: "AToKoTA", g: 0.5, moves: M3, def: D4, flow: "alt", first: 1, raids: 4, defs: 4, score: [20, 19],
    ai: ai("League captain", 0.55, ["hand", "toe"], ["walk", "dash"], 2),
    goal: { margin: 1, maxTrail: 1 }, stars: [S("margin", 3, "Win by 3"), S("noEmpty", 0, "No empty raids")],
  },''')

setunit(40, '''  {
    id: 40, ch: 4, name: "Specialist Derby", type: "Match", role: "spike", theme: "Auction Hall",
    intro: [], mech: ["hold specialists", "anchor", "backward kick", "rusher defenders", "ankle-catchers", "thigh-holders"],
    intent: "Spike, both ends read at once — but no wall and no feints: your specialist squad (A corners, T covers, Anchor) against a league mat of A's, T's and two Rushers, and a Medium raider who reads your shape. On your raids every defender has a counter — Kick the R, Toe the T, Hand the A — no scouting; on defence, match the specialist to his move. 5 raids each, win by 1.",
    op: "ATRoRTA", me: "AToKoTA", g: 0.5, read: 0, moves: M3, def: D4, flow: "alt", first: 0, raids: 5, defs: 5,
    ai: ai("League star", 0.5, ["hand", "toe"], ["walk", "dash", "dubki"], 1, {}),
    goal: { margin: 1 }, stars: [S("margin", 3, "Win by 3"), S("oppMax", 2, "Concede at most 2")],
  },''')

setunit(45, '''  {
    id: 45, ch: 5, name: "Super Raid", type: "Super Challenge", role: "teach", theme: "Continental Cup",
    intro: ["super raid"], mech: ["super raid", "raid clock", "hand touch", "toe touch", "dubki"],
    intent: "Teach the Super Raid on a soft mat: six rookies and one Thigh-holder on the right. Three touches in one raid take 21 of the 30 seconds and every touch makes the way home harder (depth ×1.7 at three, READ: home after 1 vs after 2), so the route matters: three rookies in a row on the LEFT, away from the T, then Dubki home. No scouting in this lesson. Aha: string the touches along the soft side, then duck home before the clock. Land a Super Raid within 4 raids — the spare raid lets you learn the route.",
    op: "ooooTo o".replace(" ", ""), g: 0.45, read: 0, moves: M3, flow: "raid", raids: 4,
    goal: { maxCaught: 3, need: { superRaid: 1 } }, stars: [S("noCaught", 0, "Never get caught"), S("fast", 2, "Super Raid within 2 raids")],
  },''')

setunit(49, '''  {
    id: 49, ch: 5, name: "Pincer", type: "Raid Puzzle", role: "twist", theme: "Formation: Pincer",
    intro: ["formation theme: Pincer"], mech: ["formation theme: Pincer", "thigh-holders", "rusher defenders", "bonus line", "backward kick"],
    intent: "Twist theme, the Pincer: Thigh-holder corners and two Rushers just inside them squeeze the bonus line. The hop is a coin flip (about half held, READ) but a failed hop just ends the raid — while a Kick on a charging R (about 1 in 10 held) is the safe point and the Toe on the rookies beats the T's. The goal asks for BOTH tools: one bonus point and one Kick point. Aha: take the bonus once, early, while all seven stand — after it, kick the rushers. Score 4 in 5 raids with a bonus and a Kick.",
    op: "TRoBoRT", g: 0.5, moves: M3, flow: "raid", raids: 5,
    goal: { pts: 4, maxCaught: 2, need: { bonus: 1, kick: 1 } }, stars: [S("noCaught", 0, "Never get caught"), S("fast", 4, "Win within 4 raids")],
  },''')

setunit(50, '''  {
    id: 50, ch: 5, name: "Third Umpire", type: "Raid Puzzle", role: "teach", theme: "Continental Cup",
    intro: ["DRS review"], mech: ["DRS review", "toe touch", "hand touch", "dubki"],
    intent: "Teach DRS on an easy mat, so the review is the only lesson: rookies with two Thigh-holders. Close touches are called by the referee and the call says how close: 'very tight' calls are wrong almost half the time, 'tight' ones 1 in 5 — and the first close call of this trial is always a wrong 'very tight' one, so the lesson is guaranteed to come up. You have 2 reviews and a failed review is lost. Aha: review the very tight calls, accept the merely tight ones — a review is a resource, not a reflex. Score 4 in 4 raids — one point a raid, so a wrong call you don't review costs the trial.",
    op: "ooToToo", g: 0.5, moves: M3, flow: "raid", raids: 4, drs: 2, drsFirstWrong: true,
    goal: { pts: 4, maxCaught: 2 }, stars: [S("drsWin", 1, "Win a DRS review"), S("noCaught", 0, "Never get caught")],
  },''')

setunit(52, '''  {
    id: 52, ch: 5, name: "Diamond", type: "Match", role: "combine", theme: "Formation: Diamond",
    intro: ["formation theme: Diamond"], mech: ["formation theme: Diamond", "chain tackle", "rusher defenders", "blocker wall", "thigh-holders", "dubki"],
    intent: "The Diamond theme as a lesson, not a slog: a Blocker at the point, Rushers on its shoulders, T's behind, rookie corners. Each layer has one answer — Kick the rushers, Toe the T's, Dubki under the wall's arms (the Dash is WALLED) — and the gentle Medium raider takes one touch, so a chain around his target is your stop. No feints, no scouting. Aha: a formation is read layer by layer: the point tells you the way home, the shoulders tell you the touch. 4 raids each, just win.",
    op: "oTRBRTo", g: 0.5, read: 0, moves: M3, def: D5, flow: "alt", first: 0, raids: 4, defs: 4, show: { wall: true },
    ai: ai("Continental raider", 0.45, ["hand", "toe"], ["walk", "dash"], 1, { k: 1 }),
    goal: { margin: 1 }, stars: [S("margin", 3, "Win by 3"), S("chain", 1, "Land a chain tackle")],
  },''')

setunit(53, '''  {
    id: 53, ch: 5, name: "Ghost Duel: Cage", type: "Ghost Duel", role: "spike", theme: "Formation: Cage",
    intro: ["weekly ladder ghost"], mech: ["ghost duel", "formation theme: Cage", "chain links", "raid depth", "dubki"],
    intent: `Spike: this week's ladder ghost raided the Cage (two chained pairs, T's at the corners) 5 times and scored ${CAGE_GHOST} — the target is on the scoreboard all trial. You get 6 raids to beat it (${CAGE_GHOST + 1}+). The chains make every walk or Dash home a risk, so Dubki home; one point a raid only just beats the ghost on the last raid, so a greedy second touch on one raid buys you a spare. Every touch makes the way home deeper (READ: home after 1 vs after 2). Aha: choose WHICH raid is the greedy one — on the rookie in slot 4 and his chain-link neighbour, then duck home.`,
    op: "TCCoCCT", g: 0.9, moves: M3, flow: "raid", raids: 6, ghost: "cage",
    goal: { ghost: true, maxCaught: 3 }, stars: [S("dubki", 2, "Dubki home twice"), S("noCaught", 0, "Never get caught")],
  },''')

setunit(54, '''  {
    id: 54, ch: 5, name: "Friend's Rematch", type: "Ghost Duel", role: "breather", theme: "Continental Cup",
    intro: [], mech: ["ghost duel", "chain links", "dubki", "bonus line", "backward kick"],
    intent: "Breather after the ghost spike, and a new toy: Arun — your friend's ghost from trial 21 — wants a rematch on the continental fan-zone mat, and he has learnt the chapter: one chained pair in the middle, a Rusher on the left, rookies elsewhere, bonus line open. Beat his recorded score in 4 raids, no defending. Aha: a friendly mat still has one trap — never walk or Dash past the chained pair; hop the bonus while seven stand, kick the Rusher, and Dubki home whenever the chain is up.",
    op: "oRoCCoo", g: 0.45, read: 0, moves: M3, flow: "raid", raids: 4, ghost: "rematch",
    goal: { ghost: true, maxCaught: 2 }, stars: [S("bonus", 1, "Land a bonus hop"), S("noCaught", 0, "Never get caught")],
  },''')

setunit(55, '''  {
    id: 55, ch: 5, name: "Continental Semi-Final", type: "Full Match", role: "boss", theme: "Continental Cup",
    intro: ["half-time reversal"], mech: ["full match", "chain tackle", "formation theme: Cage", "ankle-catchers", "mid-match reversal", "dubki"],
    intent: "Chapter boss, one session: the 12 raids either side of half-time of the Continental Semi-Final, level at 6-6. First half they defend in the Cage (two chained pairs: walking or dashing home past them is the risk, the Dubki ducks under). At half-time their coach reverses it: an Ankle Line (four Ankle-catchers with two Thigh-holders) that reads the Dubki and the Toe, so the Hand on an A and the Dash home come back. Their raider takes two touches and never feints — chain the return. Aha: the half-time whistle changes the answer — the move that won the first half loses the second. Win the match.",
    op: "oCCoCCo", g: 0.45, moves: M3, def: D5, flow: "alt", first: 0, clock: [340, 860], half: 600, score: [6, 6], raider: [7, 6, 6, 6],
    moment: { atHalf: true, kind: "reversal", text: "HALF-TIME REVERSAL! They drop the Cage for an Ankle Line — four Ankle-catchers read the Dubki and the Toe.", op: "ATAoATA" },
    ai: ai("Continental captain", 0.5, ["hand", "toe"], ["walk", "dash", "dubki"], 1, { k: 2 }),
    goal: { margin: 1 }, stars: [S("margin", 4, "Win by 4"), S("chain", 1, "Land a chain tackle")],
  },''')

setunit(56, '''  {
    id: 56, ch: 6, name: "Rotation", type: "Match", role: "teach", theme: "World Championship",
    intro: ["fatigue", "raider rotation"], mech: ["fatigue", "raider rotation", "toe touch", "hand touch", "dubki"],
    intent: "Teach fatigue on a soft mat, so tiredness is the only thing you fight: rookies with two Thigh-holders and a gentle raider. Your star Veer (reach 8) tires after two raids (stamina 3); Kabir (reach 6, stamina 8) can go all day. A tired raider reaches less and is held more — watch the stamina % on the WHO RAIDS card. Aha: rotate — the star for the raids that matter, the workhorse in between. 5 raids each, win by 2.",
    op: "oToooTo", g: 0.5, read: 0, moves: M3, def: D5, flow: "alt", first: 0, raids: 5, defs: 5, fatigue: true,
    raiders: [{ name: "Veer", st: [8, 7, 7, 3] }, { name: "Kabir", st: [6, 6, 5, 8] }],
    ai: ai("World raider", 0.4, ["hand", "toe"], ["walk", "dash"], 0),
    goal: { margin: 2 }, stars: [S("margin", 4, "Win by 4"), S("noCaught", 0, "Never get caught")],
  },''')

setunit(58, '''  {
    id: 58, ch: 6, name: "Dubki King", type: "Defend Stand", role: "teach", theme: "World Championship",
    intro: ["rival raider signature"], mech: ["rival raider signature", "ankle hold", "chain tackle", "CPU backward kick", "step back vs a kick"],
    intent: "Rival raider: the Dubki King always ducks home — under thighs, chains and walls — and only the Ankle Hold reads the dubki (READ). He knows you know: his touch is a Hand or a Backward Kick at whoever chases him, so the touch is a second read — Thigh the Hand, step back (Stay Back) from the Kick. Aha: a signature move is a promise — never chase the touch you can't win, and ankle him on the way home. Stop 3 of 6 and concede no more than 4.",
    op: "ooooooo", g: 1, moves: M3, def: D5, flow: "defend", defs: 6,
    ai: ai("The Dubki King", 0.5, ["hand", "kick"], ["dubki"], 1, { k: 1 }),
    goal: { stops: 3, maxOpp: 4 }, stars: [S("fastD", 4, "Win within his first 4 raids"), S("oppMax", 1, "Concede at most 1")],
  },''')

setunit(59, '''  {
    id: 59, ch: 6, name: "Feint Master", type: "Defend Stand", role: "twist", theme: "World Championship",
    intro: [], mech: ["feints", "feint tell", "rival raider signature", "chain tackle", "anchor", "ankle hold"],
    intent: "Twist on rival raiders: the Feint Master feints about 1 raid in 7 and, like every feinter since trial 37, has a tell: on 3 of 4 feints his hips turn before the shown move and the telegraph flickers (FEINT? on screen) — then the shown move is a lie. With no tell, the telegraph is true about 24 times in 25. Your Anchor stands between two Covers, so a chain through the centre is strong whichever touch is real, and the Ankle covers both his Dash and his Dubki home. Aha: read the tell — trust a clean telegraph, and against a flicker use the move that has no weakness. Stop 2 of his 4 raids, concede no more than 3.",
    op: "ooooooo", me: "ooCKCoo", g: 1, moves: M3, def: D5, flow: "defend", defs: 4,
    ai: ai("The Feint Master", 0.45, ["hand", "toe"], ["walk", "dash", "dubki"], 1, { bluff: 0.15, tell: 0.75 }),
    goal: { stops: 2, maxOpp: 3 }, stars: [S("fastD", 3, "Win within his first 3 raids"), S("chain", 1, "Land a chain tackle")],
  },''')

setunit(63, '''  {
    id: 63, ch: 6, name: "Legend's Ghost", type: "Ghost Duel", role: "breather", theme: "World Championship",
    intro: [], mech: ["ghost gate", "chain tackle", "cover", "anchor", "score attack"],
    intent: "Breather with a toy before the last push: the legends' lap of honour as a Ghost Duel on defence. A retired champion's ghost replays four recorded raids — the plan is on screen above the mat (Hand and walk, Toe and walk, Hand and walk, Toe and walk), no feints — into your Anchor and two Covers; the crowd wants a Chain Tackle. Land 1 chain and concede no more than 1 (a chain inside his first 2 raids is the show-off star). The cost: a broken chain lets him tag both links, so a wild chain far from his target is worse than a plain Thigh Hold. Aha: a chain is two men, one tackle — link the pair either side of his target and let the Covers do the lifting.",
    op: "ooooooo", me: "ooCKCoo", g: 1, moves: M3, def: D5, flow: "defend", defs: 4, show: { plan: true },
    ai: ai("Legend's ghost", 0.25, ["hand", "toe"], ["walk"], 0),
    gate: ["hand@3>walk", "toe@2>walk", "hand@4>walk", "toe@3>walk"],
    goal: { maxOpp: 1, need: { chain: 1 } }, stars: [S("fastD", 2, "Chain him within his first 2 raids"), S("oppMax", 0, "Concede nothing")],
  },''')

setunit(66, '''  {
    id: 66, ch: 6, name: "World Final", type: "Full Match", role: "boss", theme: "World Championship",
    intro: [], mech: ["full match", "rival captain", "rival raider signature", "feints", "feint tell", "fatigue", "raider rotation", "chain tackle"],
    intent: "Final boss, a mastery test of three things only, as a World Final Blitz of 2x5 game minutes from 0-0 (~14 raids): (1) their captain anchors a Pincer-Cage mat and is weak to the Kick, (2) their raider is the Feint Master (1 feint in 5, three in four with the tell — the same read as trial 59), (3) you rotate three raiders through fatigue. No DRS, light scouting. Aha: the final asks for the chapter lessons in one match — kick the captain, trust a clean telegraph and chain the pair around his target, save a fresh Veer for the closing raids. Win the match.",
    op: "ACRKRCA", kWeak: "kick", g: 0.45, read: 0.15, moves: M3, def: D5, flow: "alt", first: 0, clock: [0, 600], half: 300, fatigue: true,
    raiders: [{ name: "Veer", st: [8, 7, 7, 4] }, { name: "Kabir", st: [6, 6, 5, 8] }, { name: "Dev", st: [6, 7, 6, 6] }],
    ai: ai("World captain", 0.5, ["hand", "toe", "bonus"], ["walk", "dash", "dubki"], 1, { k: 2, bluff: 0.2, tell: 0.75, bonusRate: 0.2 }),
    goal: { margin: 1 }, stars: [S("margin", 4, "Win by 4"), S("chain", 2, "Two chain tackles")],
  },''')

# L31 no longer introduces revival
s=s.replace('''    intro: ["revival"], mech: ["revival", "all-out", "super tackle", "backward kick", "escape lunge", "dubki"],
    intent: "Spike: all out at minute 5''','''    intro: ["comeback from an all-out"], mech: ["revival", "all-out", "super tackle", "backward kick", "escape lunge", "dubki"],
    intent: "Spike: all out at minute 5''')
s=s.replace('''Each point you score revives a team-mate, and with 3 or fewer every tackle is a Super Tackle. Every point revives a team-mate (first out, first back). Aha: sacrifice greed for revivals''','''Revival from trial 19 now runs a whole comeback: each point you score revives a team-mate (first out, first back), and with 3 or fewer every tackle is a Super Tackle. Aha: sacrifice greed for revivals''')
s=s.replace('op: "ooooTo o".replace(" ", "")','op: "ooooTo"+"o"')
open(p,'w').write(s)
print("ok")
