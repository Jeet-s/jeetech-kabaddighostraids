exec(open('.agf/tmp/ld/blocks.py').read())
put(27, '''
  {
    id: 27, ch: 3, name: "Turn the Raid", type: "Raid Puzzle", role: "twist", theme: "State League",
    intro: ["defence reads repeats"], mech: ["defence reads repeats", "backward kick", "rusher defenders", "thigh-holders", "toe touch"],
    intent: "Twist, one idea only: state sides scout you. A touch move or way home you used on your PREVIOUS raid is read — its gem shows a SCOUTED tag and its real % rises (READ row). Rushers sit beside Thigh-holders, so the Kick on a charging R and the Toe on a T are both good touches, and the Dash and the walk both get you home. Aha: the safest move is the one you did not just use — alternate Kick and Toe, Dash and walk. Score 4 in 4 raids with at least one Kick.",
    op: "oRTRToR", g: 0.55, read: 0.25, moves: M3, flow: "raid", raids: 4,
    goal: { pts: 4, maxCaught: 2, need: { kick: 1 } }, stars: [S("kick", 2, "Score with 2 kicks"), S("noCaught", 0, "Never get caught")],
  },
''')
b = get(29)
b = b.replace('intent: "Twist on the kick: now THEIR raider touches once and Backward-Kicks the defender who chases him — the briefing and the telegraph show a kick coming. No hold stops a kick well, and a Rush into it almost never works, so when the kick is shown, let it go and Block his Dash home (the best stop on the board); when he shows a Hand, Thigh Hold the touch. Aha: never chase a kicker — beat his way home. Stop 3 of 5.",',
 'intent: "Twist on the kick: now THEIR raider touches once and then Backward-Kicks the defender who chases him — the telegraph shows the kick coming. Chasing a kick is the trap (no hold catches it well, a Rush almost never). The counter is to step back: if nobody steps in (Hold), his kick finds nobody to tag 65% of the time, and his way home is still yours to Block. When he shows a Hand, Thigh Hold the touch as usual. Aha: never chase a kicker — step back, then beat his way home. Stop 3 of 5.",')
b = b.replace('intro: ["CPU backward kick"]', 'intro: ["CPU backward kick", "step back vs a kick"]')
put(29, b)
b = get(31).replace('Aha: sacrifice greed for revivals', 'Every point revives a team-mate (first out, first back). Aha: sacrifice greed for revivals')
put(31, b)
put(33, '''
  {
    id: 33, ch: 3, name: "State Final", type: "Full Match", role: "boss", theme: "State League",
    intro: [], mech: ["full match", "comeback", "revival", "super tackle", "backward kick", "escape lunge", "defender rush", "rusher defenders"],
    intent: "Chapter boss with a comeback, kept to one session: the last 15 minutes of the State Final (~21 raids), 9-12 down. Full mat of Rushers, Blockers and T's; a raider who kicks chasers (step back) and hops the bonus (Rush the hop). Aha: three points back is three clean raids plus one stop — kick the rushers, Dubki the wall, and never chase his kick. Win the match.",
    op: "RTBoBTR", g: 0.45, moves: M3, def: D4, flow: "alt", first: 0, clock: [1500, 2400], score: [9, 12],
    ai: ai("State champion", 0.45, ["hand", "toe", "bonus", "kick"], ["walk", "dash", "dubki"], 1, { k: 2, bonusRate: 0.25 }),
    goal: { margin: 1 }, stars: [S("margin", 3, "Win by 3"), S("margin", 6, "Win by 6")],
  },
''')
put(36, '''
  {
    id: 36, ch: 4, name: "The Anchor", type: "Defend Stand", role: "teach", theme: "Auction Hall",
    intro: ["anchor"], mech: ["anchor", "hold specialists", "ankle hold", "thigh hold", "block (defensive wall)"],
    intent: "Teach the Anchor, with his range drawn on the mat: K in slot 4 multiplies every hold by 1.15 and his tackles rarely slip, and the shaded ring shows his range — slots 3-5, the target and one either side. Inside the ring the Anchor is the tackler whatever the move; outside it he is too far (half strength), so at the corners use the corner specialist when his hold matches the move, the defender beside the target when it does not. Aha: the specialists need the right read, the Anchor only needs the raider inside his ring. Stop 3 of 5.",
    op: "ooooooo", me: "AooKooT", g: 1, moves: M3, def: D4, flow: "defend", defs: 5, show: { anchor: 1 },
    ai: ai("League raider", 0.4, ["hand", "toe"], ["walk", "dash", "dubki"], 0),
    goal: { stops: 3, maxOpp: 5 }, stars: [S("stops", 4, "Stop 4 raids"), S("oppMax", 2, "Concede at most 2")],
  },
''')
put(38, '''
  {
    id: 38, ch: 4, name: "Draft Day", type: "Auction", role: "practise", theme: "Auction Hall",
    intro: ["purse target"], mech: ["auction", "player roles", "purse", "cover", "alternating raids"],
    intent: "A different shopping list: this franchise needs a Raider and a Cover, and the owner wants at least 15 lakh left in the purse when the hammer falls (the trial fails over budget). 70 lakh, 6 lots: a star Raider first, a Thigh Corner, a Cover, an Anchor, a budget Cover and a budget Raider last. Then a 4-raid league match where YOUR buys defend (the Cover strengthens chains and the Block) and YOUR raider's stats raid. Aha: a budget is a target, not a limit — the cheap twins near the end of the list buy the squad and keep the owner happy. Buy a Raider and a Cover with 15+ lakh left, then win by 1.",
    op: "ATBoBTA", g: 0.5, moves: M3, def: D4, flow: "alt", first: 0, raids: 4, defs: 4, purse: 70,
    lots: [
      lot("Arjun Dhillon", "Raider", "o", 20, 25, 45, [8, 6, 7, 6]),
      lot("Manav Kher", "Corner", "T", 15, 15, 30),
      lot("Nikhil Rane", "Cover", "C", 10, 12, 22),
      lot("Sardar Gill", "Anchor", "K", 20, 20, 36),
      lot("Tenzin Norbu", "Cover", "C", 8, 8, 16),
      lot("Rohit Bansal", "Raider", "o", 10, 10, 20, [6, 6, 6, 6]),
    ],
    needRoles: ["Raider", "Cover"],
    ai: ai("League raider", 0.45, ["hand", "toe"], ["walk", "dash"], 1),
    goal: { margin: 1, purse: 15 }, stars: [S("margin", 3, "Win by 3"), S("purse", 25, "Keep 25 lakh in the purse")],
  },
''')
put(42, '''
  {
    id: 42, ch: 4, name: "Rival Franchise", type: "Auction", role: "spike", theme: "Auction Hall",
    intro: ["rival bidder"], mech: ["auction", "rival bidder", "player roles", "anchor", "feints", "alternating raids"],
    intent: "Spike — read the other bidder: the Mumbai Mavericks need an Anchor and chase the FIRST one on the list, paying about 14 lakh over his market value; once they have one they stop. You need a Raider and an Anchor from 75 lakh. The auction panel shows the sum (still needed, cheapest squad left vs your purse) on every bid. Aha: let the rival overpay for the first Anchor — his twin later goes at market, and that saving buys the better Raider. Then 5 raids each against a Medium franchise raider who feints 15% and takes two touches. Buy a Raider and an Anchor, then win by 1.",
    op: "ATRBRTA", g: 0.5, moves: M3, def: D4, flow: "alt", first: 0, raids: 5, defs: 5, purse: 75, show: { purse: true },
    rival: { name: "Mumbai Mavericks", role: "Anchor", plus: 14 },
    lots: [
      lot("Pawan Saini", "Anchor", "K", 18, 20, 34),
      lot("Devraj Thakur", "Raider", "o", 25, 28, 46, [8, 7, 7, 6]),
      lot("Zubin Mistry", "Corner", "A", 12, 14, 26),
      lot("Sunny Bains", "Raider", "o", 12, 12, 24, [5, 5, 6, 6]),
      lot("Ajay Rathi", "Anchor", "K", 15, 18, 30),
    ],
    needRoles: ["Raider", "Anchor"],
    ai: ai("Franchise raider", 0.5, ["hand", "toe", "bonus"], ["walk", "dash", "dubki"], 1, { bluff: 0.15, k: 2, bonusRate: 0.25 }),
    goal: { margin: 1 }, stars: [S("margin", 3, "Win by 3"), S("purse", 10, "Keep 10 lakh in the purse")],
  },
''')
put(44, '''
  {
    id: 44, ch: 4, name: "Season Final", type: "Full Match", role: "boss", theme: "Auction Hall",
    intro: [], mech: ["full match", "auction", "player roles", "hold specialists", "anchor", "cover", "feints", "defender switch"],
    intent: "Chapter boss: build the DEFENCE, then play the Season Final as a Blitz of 2x7.5 game minutes (~21 raids). Your raider is fixed; from 75 lakh you must buy a Corner, a Cover and an Anchor (7 lots, two of each plus an optional star Raider who would leave you short). Then a Medium-Hard franchise that reads your specialists and feints 15%. Aha: three mid-price defenders beat one star — the squad you can afford is the one that defends every slot. Buy a Corner, a Cover and an Anchor, then win the match.",
    op: "ATRBRTA", g: 0.45, raider: [7, 6, 6, 6], moves: M3, def: D4, flow: "alt", first: 0, clock: [0, 900], half: 450, purse: 75,
    lots: [
      lot("Raghav Chauhan", "Raider", "o", 25, 30, 55, [8, 7, 8, 6]),
      lot("Firoz Ali", "Corner", "A", 12, 14, 28),
      lot("Gurtej Mann", "Anchor", "K", 18, 20, 36),
      lot("Tenzin Dorje", "Cover", "C", 10, 12, 22),
      lot("Lakshya Joshi", "Corner", "T", 10, 12, 24),
      lot("Mohit Dahiya", "Anchor", "K", 15, 16, 30),
      lot("Yash Kale", "Cover", "C", 8, 8, 18),
    ],
    needRoles: ["Corner", "Cover", "Anchor"],
    ai: ai("Franchise captain", 0.45, ["hand", "toe", "bonus"], ["walk", "dash", "dubki"], 1, { bluff: 0.15, k: 2, bonusRate: 0.25 }),
    goal: { margin: 1 }, stars: [S("margin", 4, "Win by 4"), S("margin", 7, "Win by 7")],
  },
''')
open(p, 'w').write(s)
print("ok")
