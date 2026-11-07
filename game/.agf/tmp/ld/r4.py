exec(open('.agf/tmp/ld/blocks.py').read())
def edit(uid, a, b):
    t = get(uid); assert a in t, (uid, a); put(uid, t.replace(a, b))
put(32, '''
  {
    id: 32, ch: 3, name: "Bonus Bonanza", type: "Super Challenge", role: "breather", theme: "State League",
    intro: [], mech: ["bonus line", "backward kick", "hand touch", "toe touch", "score attack"],
    intent: "Breather with a toy, after the revival spike: a floodlit score attack against a second-string side that leaves the bonus line wide open (rookie corners, one Rusher to kick). Hop the bonus 3 times in 4 raids — a hop puts nobody out, so the mat stays at seven and the line stays live. Aha: the bonus is a resource that lasts only while all seven stand — hop first, touch second.",
    op: "ooRooTo", g: 0.45, read: 0, moves: M3, flow: "raid", raids: 4,
    goal: { pts: 4, maxCaught: 2, need: { bonus: 3 } }, stars: [S("bonus", 4, "Hop the bonus on every raid"), S("noCaught", 0, "Never get caught")],
  },
''')
put(43, '''
  {
    id: 43, ch: 4, name: "Fans' Day", type: "Super Challenge", role: "breather", theme: "Auction Hall",
    intro: [], mech: ["backward kick", "rusher defenders", "bonus line", "score attack"],
    intent: "Breather with a toy: the fans' trick-shot exhibition. Three Rushers charge on a friendly mat and the crowd wants Backward Kicks — score 2 Kicks and a bonus hop on the way to 4 points in 4 raids, with your squad's raider (reach 7). Aha: an exhibition is the place to try the show moves you will need later — kick the charge, hop the line while seven stand.",
    op: "RoRoRoo", g: 0.45, read: 0, raider: [7, 6, 6, 6], moves: M3, flow: "raid", raids: 4,
    goal: { pts: 4, maxCaught: 2, need: { kick: 2, bonus: 1 } }, stars: [S("kick", 3, "Score with 3 kicks"), S("noCaught", 0, "Never get caught")],
  },
''')
put(54, '''
  {
    id: 54, ch: 5, name: "Fan Zone", type: "Super Challenge", role: "breather", theme: "Continental Cup",
    intro: [], mech: ["super raid", "raid clock", "dubki", "score attack"],
    intent: "Breather with a toy, after the ghost spike: the fan-zone Super Raid booth. A young side (rookies and one T) that never scouts you, three raids, and the crowd wants a Super Raid — three touches in one raid, home before the 30 s clock. Aha: the three-touch route that was a gamble in trial 45 is a show on a soft mat — take the rookies in a line and duck home.",
    op: "oooTooo", g: 0.45, read: 0, moves: M3, flow: "raid", raids: 3,
    goal: { maxCaught: 2, need: { superRaid: 1 } }, stars: [S("fast", 1, "Super Raid on the first raid"), S("noCaught", 0, "Never get caught")],
  },
''')
put(63, '''
  {
    id: 63, ch: 6, name: "Lap of Honour", type: "Super Challenge", role: "breather", theme: "World Championship",
    intro: [], mech: ["chain tackle", "cover", "anchor", "score attack"],
    intent: "Breather with a toy before the last push: the legends' lap of honour. A slow veterans' raider (Easy, no feints) walks into your Anchor and two Covers; the crowd wants Chain Tackles — land 2 in his 4 raids. Aha: a chain is two men, one tackle — link the pair either side of his target and let the Covers do the lifting.",
    op: "ooooooo", me: "ooCKCoo", g: 1, moves: M3, def: D5, flow: "defend", defs: 4,
    ai: ai("Veteran raider", 0.25, ["hand", "toe"], ["walk"], 0),
    goal: { maxOpp: 4, need: { chain: 2 } }, stars: [S("fastD", 3, "Two chains within his first 3 raids"), S("oppMax", 1, "Concede at most 1")],
  },
''')
edit(49, 'goal: { pts: 4, maxCaught: 2 }', 'goal: { pts: 5, maxCaught: 2 }'); edit(49, 'flow: "raid", raids: 4,', 'flow: "raid", raids: 5,'); edit(49, 'Score 4 in 4 raids, any way you like.', 'Score 5 in 5 raids, any way you like.')
edit(57, 'goal: { pts: 4, maxCaught: 2 }', 'goal: { pts: 5, maxCaught: 2 }'); edit(57, 'Score 4 in 5 raids.', 'Score 5 in 5 raids.')
edit(61, 'goal: { pts: 4, maxCaught: 2 }', 'goal: { pts: 5, maxCaught: 2 }'); edit(61, 'flow: "raid", raids: 5,', 'flow: "raid", raids: 6,'); edit(61, 'Score 4 in 5 raids;', 'Score 5 in 6 raids;')
edit(40, 'op: "ATBRBTA", me: "AToKoTA", g: 0.5,', 'op: "ATBRBTA", me: "AToKoTA", g: 0.5, read: 0,')
edit(40, 'and they scout your last raid;', 'no scouting here;')
edit(40, '["defence reads repeats", ', '[')
open(p,'w').write(s)
import re
t=open('scripts/tune-units.ts').read()
for k,v in {32:.84,43:.84,54:.76,63:.72}.items():
    t=re.sub(r'(\b%d: )0\.\d+'%k, lambda m: m.group(1)+str(v), t, count=1)
open('scripts/tune-units.ts','w').write(t)
print('ok')
