exec(open('.agf/tmp/ld/blocks.py').read())
def edit(uid, a, b):
    t = get(uid); assert a in t, (uid, a); put(uid, t.replace(a, b))
# L7 escape is the goal
edit(7, 'goal: { pts: 3, maxCaught: 3 }, stars: [S("escapes", 1, "Break free from a hold"), S("noCaught", 0, "Never tackled out")]',
        'goal: { pts: 3, maxCaught: 3, need: { escape: 1 } }, stars: [S("escapes", 2, "Break free twice"), S("fast", 4, "Win within 4 raids")]')
edit(7, 'Score 3 in 5 raids; caught 3 times and it\'s over.', 'Score 3 in 5 raids AND break free from at least one hold; caught 3 times and it\'s over.')
# L19 softer fail
edit(19, 'goal: { stops: 2, maxOpp: 4, minMat: 4 }', 'goal: { stops: 2, maxOpp: 5, minMat: 4 }')
edit(19, 'concede no more than 4.', 'concede no more than 5.')
# L30 combine: fewer counters at once
edit(30, 'ai("State raider", 0.45, ["hand", "toe", "bonus"], ["walk", "dash"], 0, { bonusRate: 0.35 })', 'ai("State raider", 0.4, ["hand", "bonus"], ["dash"], 0, { bonusRate: 0.4 })')
edit(30, 'and a raider who hops the bonus or Dashes home. Kick the rushers, Dubki past the wall; Rush his hop, Block his Dash.', 'and a raider with one plan — Hand Touch or bonus hop, then always the Dash. On your raids the rushers want the Kick and the wall wants the Dubki; on his, Rush the hop and Block the Dash.')
# L33 shorter, 2-point deficit
edit(33, 'clock: [1500, 2400], score: [9, 12]', 'clock: [1750, 2400], score: [10, 12]')
edit(33, 'the last 15 minutes of the State Final (~21 raids), 9-12 down.', 'the last 11 minutes of the State Final (~15 raids), 10-12 down.')
edit(33, 'Aha: three points back is three clean raids plus one stop', 'Aha: two points back is two clean raids plus one stop')
# L38: a new non-auction unit — protect a lead (survive goal)
put(38, '''
  {
    id: 38, ch: 4, name: "Hold the Lead", type: "Match", role: "practise", theme: "Auction Hall",
    intro: ["protect a lead"], mech: ["game management", "empty-raid counter", "hold specialists", "anchor", "alternating raids"],
    intent: "A different kind of goal — game management: you lead 20-18 with 4 raids each to go, and the trial is lost the moment you fall BEHIND (level is fine). Your specialist squad defends (A corners, T covers, Anchor in the middle). A patient empty raid is safe while you lead, but two in a row make the third a Do-or-Die. Aha: protecting a lead is its own skill — bank the safe single touch, spend the empty raids, and tackle only with the specialist whose hold matches his move. Finish ahead without ever trailing.",
    op: "ATBoBTA", me: "AToKoTA", g: 0.5, moves: M3, def: D4, flow: "alt", first: 1, raids: 4, defs: 4, score: [20, 18],
    ai: ai("League raider", 0.45, ["hand", "toe"], ["walk", "dash"], 1),
    goal: { margin: 1, maxTrail: 0 }, stars: [S("margin", 3, "Win by 3"), S("noEmpty", 0, "No empty raids")],
  },
''')
# L40 strip feints
edit(40, '{ bluff: 0.15, tell: 0.5 })', '{})')
edit(40, 'and a Medium raider who feints 15% (with the tell on half of them).', 'and a Medium raider who reads your shape (no feints: the test is reading both ends, not bluffs).')
edit(40, '"feints", "feint tell", ', '')
# L45 teach without scouting, easier mat
edit(45, 'op: "ooToTTo", g: 0.45, moves: M3,', 'op: "oooToTo", g: 0.45, read: 0, moves: M3,')
edit(45, 'Aha: string the touches along one side (rookies first, Toe on the T\'s), then Dubki home before the clock.', 'No scouting in this lesson, so only the route matters. Aha: string the touches along the rookie side first, then decide the way home before the clock runs out.')
# L46 concede cap back
edit(46, 'goal: { maxOpp: 3, need: { chain: 2 } }', 'goal: { maxOpp: 4, need: { chain: 2 } }')
edit(46, 'concede no more than 3.', 'concede no more than 4.')
# L47 two touches
edit(47, '{ k: 3 })', '{ k: 2 })')
edit(47, 'against a raider hunting a super raid (2-3 touches a raid)', 'against a raider who goes for two touches')
# L49 drop the kick requirement
edit(49, 'goal: { pts: 4, maxCaught: 2, need: { kick: 1 } }, stars: [S("bonus", 1, "Land a bonus hop"), S("noCaught", 0, "Never get caught")]', 'goal: { pts: 4, maxCaught: 2 }, stars: [S("bonus", 1, "Land a bonus hop"), S("kick", 1, "Score with a kick")]')
edit(49, 'Score 4 in 4 raids with a Kick.', 'Score 4 in 4 raids, any way you like.')
# L51 plan shown on screen
edit(51, 'flow: "defend", defs: 5,', 'flow: "defend", defs: 5, show: { plan: true },')
# L52 4 raids
edit(52, 'raids: 5, defs: 5,', 'raids: 4, defs: 4,')
edit(52, '5 raids each, win by 2.', '4 raids each, win by 2.')
# L58 stop 3 of 6
edit(58, 'goal: { stops: 4, maxOpp: 4 }', 'goal: { stops: 3, maxOpp: 4 }')
edit(58, 'Stop 4 of 6 and concede no more than 4.', 'Stop 3 of 6 and concede no more than 4.')
edit(58, 'S("fastD", 5, "Win within his first 5 raids")', 'S("fastD", 4, "Win within his first 4 raids")')
# L59 clearer tell
edit(59, '{ bluff: 0.2, tell: 0.6 })', '{ bluff: 0.2, tell: 0.75 })')
edit(59, 'on 6 of 10 feints his hips turn', 'on 3 of 4 feints his hips turn')
edit(59, 'With no tell, the telegraph is true about 9 times in 10.', 'With no tell, the telegraph is true about 19 times in 20.')
# L60 shorter, smaller deficit
edit(60, 'clock: [1500, 2400], score: [16, 19]', 'clock: [1800, 2400], score: [16, 18]')
edit(60, 'the last 15 minutes of a group match (~21 raids), 16-19 down', 'the last 10 minutes of a group match (~14 raids), 16-18 down')
edit(60, 'After 8 raids their captain tires', 'After 6 raids their captain tires')
edit(60, 'moment: { at: 8,', 'moment: { at: 6,')
# L62 Medium raider, win by 1
edit(62, 'score: [10, 11],', 'score: [10, 10],')
edit(62, 'goal: { margin: 2 }, stars: [S("margin", 4, "Win by 4")', 'goal: { margin: 1 }, stars: [S("margin", 3, "Win by 3")')
edit(62, 'Joined at 10-11 down, 5 raids each, win by 2.', 'Joined at 10-10, 5 raids each, win by 1.')
edit(62, 'against a Hard raider who feints 1 in 4 (half his feints show the tell).', 'against a Medium raider who feints 1 in 4 (half his feints show the tell).')
t = get(62); import re
t = t.replace('["walk", "dash", "dubki"], 2, { k: 2, bluff: 0.25, tell: 0.5 })', '["walk", "dash", "dubki"], 1, { k: 2, bluff: 0.25, tell: 0.5 })'); put(62, t)
# L66 focus on three systems
put(66, '''
  {
    id: 66, ch: 6, name: "World Final", type: "Full Match", role: "boss", theme: "World Championship",
    intro: [], mech: ["full match", "rival captain", "rival raider signature", "feints", "feint tell", "fatigue", "raider rotation", "chain tackle"],
    intent: "Final boss, a mastery test of three things only, as a World Final Blitz of 2x8 game minutes (~22 raids): (1) their captain anchors a Pincer-Cage mat and is weak to the Kick, (2) their raider is the Feint Master (1 feint in 4, three of four with the tell) who goes for two touches, (3) you rotate three raiders through fatigue. No DRS, light scouting. Aha: the final asks for the chapter lessons in one match — kick the captain, trust a clean telegraph and chain the pair around his target, save a fresh Veer for the closing raids. Finish ahead.",
    op: "ACRKRCA", kWeak: "kick", g: 0.45, read: 0.15, moves: M3, def: D5, flow: "alt", first: 0, clock: [0, 960], half: 480, fatigue: true,
    raiders: [{ name: "Veer", st: [8, 7, 7, 4] }, { name: "Kabir", st: [6, 6, 5, 8] }, { name: "Dev", st: [6, 7, 6, 6] }],
    ai: ai("World captain", 0.55, ["hand", "toe", "bonus"], ["walk", "dash", "dubki"], 2, { k: 2, bluff: 0.25, tell: 0.75, bonusRate: 0.2 }),
    goal: { margin: 1 }, stars: [S("margin", 3, "Win by 3"), S("chain", 2, "Two chain tackles")],
  },
''')
open(p,'w').write(s)
t=open('src/game/types.ts').read()
a='  purse?: boolean; // auction: show "still needed" roles and the cheapest legal squad cost vs the purse\n'
assert a in t; t=t.replace(a, a+'  plan?: boolean; // ghost gate: show the ghost\'s next recorded raid plan (UnitDef.gate[S.gi]) above the mat\n')
open('src/game/types.ts','w').write(t)
t=open('scripts/tune-units.ts').read()
for k,v in {38:.7,45:.7,53:.58,59:.66,64:.54,65:.54}.items():
    t=re.sub(r'(\b%d: )0\.\d+'%k, lambda m: m.group(1)+str(v), t, count=1)
open('scripts/tune-units.ts','w').write(t)
print("ok")
