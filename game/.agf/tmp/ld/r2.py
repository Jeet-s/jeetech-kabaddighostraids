exec(open('.agf/tmp/ld/blocks.py').read())
def edit(uid, a, b):
    t = get(uid); assert a in t, (uid, a); put(uid, t.replace(a, b))
edit(3, 'flow: "raid", raids: 5,', 'flow: "raid", raids: 4,')
edit(3, '3 points in 5 raids.', '3 points in 4 raids.')
edit(15, '["hand", "toe"], ["dash"], 0)', '["hand", "toe"], ["walk", "dash"], 0)')
edit(15, 'bw: 1.25', 'bw: 1.15')
edit(15, 'intent: "Teach the Block: the district raider always Dashes home. Let the touch go and form the Block on the midline — in this first lesson its timing window is a quarter wider than normal, so a well-timed Block is the strongest stop on the board (READ); an Ankle Hold on the Dash is the back-up and a Thigh Hold on a Dash mostly fails. Aha: defend the way home, not the touch. Stop 3 of 5.",',
  'intent: "Teach the Block: the district sprinter telegraphs his way home — mostly a Dash, sometimes a walk. Against a Dash, let the touch go and form the Block on the midline (its timing window is a little wider in this first lesson, READ); against a walk the Block is weak and the Thigh Hold is the stop. Aha: defend the way home, not the touch — and read WHICH way home before you build the wall. Stop 3 of 5.",')
edit(19, 'me: "oo-ooo-"', 'me: "ooooo-o"')
edit(19, 'goal: { stops: 2, maxOpp: 4, minMat: 3 }', 'goal: { stops: 2, maxOpp: 4, minMat: 4 }')
edit(19, 'two of your side are already out, so every stop revives one of them (first out, first back) and every touch he lands sends another of yours off; fall to 2 on the mat and the trial is lost.', 'one of your side is already out, so a stop revives him (every point revives one, first out, first back) and every touch he lands sends another of yours off; fall to 3 on the mat and the trial is lost.')
edit(26, 'flow: "defend", defs: 3,', 'flow: "defend", defs: 4,')
edit(26, 'Land a Super Tackle within 3 raids and concede no more than 1.', 'Land a Super Tackle within 4 raids and concede no more than 1.')
edit(26, 'Aha: three defenders are a threat, not a weakness.', 'Choose WHICH of your three makes the tackle — the one beside his target (cover), never the man he touches. Aha: three defenders are a threat, not a weakness.')
edit(28, 'op: "--o--T-"', 'op: "--oT-T-"')
edit(28, 'only a Thigh-holder and a rookie are left. Touch both out (one greedy 2-touch raid or two clean ones)', 'only a rookie and two Thigh-holders are left. Touch all three out (a greedy 2-touch raid along the rookie and a T, then the last man)')
edit(28, 'S("fast", 1, "All-out in one raid")', 'S("fast", 2, "All-out within 2 raids")')
edit(34, 'flow: "auction", purse: 85,', 'flow: "auction", purse: 85, show: { purse: true },')
edit(34, 'Aha: price the whole squad', 'The purse helper on screen shows what is still needed and the cheapest squad left. Aha: price the whole squad')
edit(37, '{ bluff: 0.35 })', '{ bluff: 0.3, tell: 0.6 })')
edit(37, 'intent: "Twist: this raider feints — 35% of the time the telegraphed move is not the real one. Committing to the counter of a feint fails. Aha: against a bluffer use the all-round Anchor, Ankle a Dash home (works on both Dash and Dubki) and let doubtful touches go. Stop 2 of 5, concede no more than 5.",',
  'intent: "Twist: this raider feints — 3 raids in 10 the telegraphed move is not the real one — but feints have a tell: on 6 of 10 feints his hips turn first and the telegraph flickers (FEINT? on screen), so a flickering telegraph is a lie and a clean one is true about 85% of the time. Aha: trust a clean telegraph and counter it; against a flicker, use the all-round Anchor or an Ankle on his way home (it covers Dash and Dubki). Stop 2 of 5, concede no more than 5.",')
edit(37, 'intro: ["feints"]', 'intro: ["feints", "feint tell"]')
put(38, '''
  {
    id: 38, ch: 4, name: "Draft Day", type: "Auction", role: "practise", theme: "Auction Hall",
    intro: ["purse target"], mech: ["auction", "player roles", "purse", "cover"],
    intent: "A different shopping list, auction only: this franchise needs a Raider and a Cover, and the owner wants at least 15 lakh left in the purse when the hammer falls (the trial fails over budget). 60 lakh, 6 lots: a star Raider first, a Thigh Corner, a Cover, an Anchor, a budget Cover and a budget Raider last. Aha: a budget is a target, not a limit — the cheap twins at the end of the list complete the squad and keep the owner happy; a star bought early leaves you short.",
    op: "ooooooo", g: 0.5, moves: M3, def: D4, flow: "auction", purse: 60, show: { purse: true },
    lots: [
      lot("Arjun Dhillon", "Raider", "o", 20, 25, 45, [8, 6, 7, 6]),
      lot("Manav Kher", "Corner", "T", 15, 15, 30),
      lot("Nikhil Rane", "Cover", "C", 10, 12, 22),
      lot("Sardar Gill", "Anchor", "K", 20, 20, 36),
      lot("Tenzin Norbu", "Cover", "C", 8, 8, 16),
      lot("Rohit Bansal", "Raider", "o", 10, 10, 20, [6, 6, 6, 6]),
    ],
    needRoles: ["Raider", "Cover"],
    goal: { purse: 15 }, stars: [S("purse", 22, "Keep 22 lakh in the purse"), S("purse", 28, "Keep 28 lakh in the purse")],
  },
''')
old40 = get(40); old42 = get(42)
put(40, '''
  {
    id: 40, ch: 4, name: "Specialist Derby", type: "Match", role: "spike", theme: "Auction Hall",
    intro: [], mech: ["defence reads repeats", "hold specialists", "anchor", "feints", "feint tell", "backward kick", "rusher defenders", "blocker wall", "ankle-catchers"],
    intent: "Spike, every read at once: your specialist squad (A corners, T covers, Anchor) against a full league mat (A, T, B, R) and a Medium raider who feints 15% (with the tell on half of them). On your raids the mat has a counter for every move — Kick the R, Toe the T, Hand the A — and they scout your last raid; on defence, match the specialist to his move. 5 raids each, win by 2.",
    op: "ATBRBTA", me: "AToKoTA", g: 0.5, moves: M3, def: D4, flow: "alt", first: 0, raids: 5, defs: 5,
    ai: ai("League star", 0.5, ["hand", "toe"], ["walk", "dash", "dubki"], 1, { bluff: 0.15, tell: 0.5 }),
    goal: { margin: 2 }, stars: [S("margin", 4, "Win by 4"), S("oppMax", 2, "Concede at most 2")],
  },
''')
put(42, '''
  {
    id: 42, ch: 4, name: "Rival Franchise", type: "Auction", role: "twist", theme: "Auction Hall",
    intro: ["rival bidder"], mech: ["auction", "rival bidder", "player roles", "anchor", "purse"],
    intent: "Twist, auction only — read the other bidder: the Mumbai Mavericks need an Anchor and chase the FIRST one on the list, paying about 14 lakh over his market value (shown in the lot's market range); once they have one they stop. You need a Raider and an Anchor from 60 lakh, and the purse helper shows the sum on every bid. Aha: let the rival overpay for the first Anchor — his twin later goes at market, and that saving buys the better Raider.",
    op: "ooooooo", g: 0.5, moves: M3, def: D4, flow: "auction", purse: 60, show: { purse: true },
    rival: { name: "Mumbai Mavericks", role: "Anchor", plus: 14 },
    lots: [
      lot("Pawan Saini", "Anchor", "K", 18, 20, 34),
      lot("Devraj Thakur", "Raider", "o", 25, 28, 46, [8, 7, 7, 6]),
      lot("Zubin Mistry", "Corner", "A", 12, 14, 26),
      lot("Sunny Bains", "Raider", "o", 12, 12, 24, [5, 5, 6, 6]),
      lot("Ajay Rathi", "Anchor", "K", 15, 18, 30),
    ],
    needRoles: ["Raider", "Anchor"],
    goal: {}, stars: [S("purse", 10, "Keep 10 lakh in the purse"), S("purse", 18, "Keep 18 lakh in the purse")],
  },
''')
edit(44, 'clock: [0, 900], half: 450, purse: 75,', 'clock: [0, 720], half: 360, purse: 75,')
edit(44, '    needRoles: ["Corner", "Cover", "Anchor"],\n', '')
edit(44, 'intent: "Chapter boss: build the DEFENCE, then play the Season Final as a Blitz of 2x7.5 game minutes (~21 raids). Your raider is fixed; from 75 lakh you must buy a Corner, a Cover and an Anchor (7 lots, two of each plus an optional star Raider who would leave you short). Then a Medium-Hard franchise that reads your specialists and feints 15%. Aha: three mid-price defenders beat one star — the squad you can afford is the one that defends every slot. Buy a Corner, a Cover and an Anchor, then win the match.",',
  'intent: "Chapter boss: the Season Final as a 2x6 mini-Blitz (~17 raids), with an OPTIONAL pre-match auction — 75 lakh, 7 lots (two Corners, two Covers, two Anchors, one star Raider); buy who you like or nobody, every buy strengthens the squad that plays. Then a Medium franchise that reads your specialists and feints 15%. Aha: the auction is preparation, not a gate — three mid-price defenders cover more slots than one star. Win the match.",')
edit(44, 'mech: ["full match", "auction", "player roles", "hold specialists", "anchor", "cover", "feints", "defender switch"]', 'mech: ["full match", "optional auction", "player roles", "hold specialists", "anchor", "cover", "feints", "defender switch"]')
edit(48, 'goal: { pts: 4, maxCaught: 2 }', 'goal: { pts: 3, maxCaught: 2 }')
edit(48, 'Score 4 in 4 raids.', 'Score 3 in 4 raids.')
edit(59, '{ bluff: 0.25, tell: 0.6 })', '{ bluff: 0.2, tell: 0.6 })')
edit(59, 'the Feint Master feints 1 raid in 4 — but he has a tell. On 6 of 10 feints his hips turn before the shown move and the telegraph flickers (FEINT? on screen): then the shown move is a lie. With no tell, the telegraph is true about 9 times in 10.', 'the Feint Master feints 1 raid in 5 and, like every feinter since trial 37, has a tell: on 6 of 10 feints his hips turn before the shown move and the telegraph flickers (FEINT? on screen) — then the shown move is a lie. With no tell, the telegraph is true about 9 times in 10.')
edit(59, 'intro: ["feint tell"]', 'intro: []')
edit(60, 'score: [16, 19]', 'score: [17, 19]')
edit(60, '16-19 down', '17-19 down')
open(p,'w').write(s)
t=open('scripts/tune-units.ts').read()
import re
aims={3:.9,6:.88,15:.85,19:.8,26:.76,28:.76,40:.62,42:.7,44:.62,45:.7,46:.7,47:.62,48:.7,49:.66,50:.7,51:.64,52:.6,53:.58,54:.74,55:.58,56:.66,57:.7,58:.68,59:.64,60:.6,61:.62,62:.58,63:.72,64:.56,65:.56,66:.56}
for k,v in aims.items():
    t=re.sub(r'(\b%d: )0\.\d+'%k, lambda m: m.group(1)+str(v), t, count=1)
open('scripts/tune-units.ts','w').write(t)
print("ok")
