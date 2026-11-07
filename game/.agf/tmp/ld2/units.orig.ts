/**
 * The campaign: 66 handcrafted Raid Trials in 6 chapters (docs/CONTENT.md is the design plan — keep both in step).
 * Tuning numbers (g = opponent grip, ai.s = CPU raider skill) were set by measuring with the bot playtesters
 * (scripts/tune-units.ts); everything else is designed by hand.
 */
import type { AIRaider, Lot, UnitDef } from "./types";
import TUNING from "./tuning.json";
import { GHOSTS } from "./ghosts";

const CAGE_GHOST = GHOSTS.cage?.pts ?? 5;

const ai = (name: string, s: number, mv: AIRaider["mv"], ret: AIRaider["ret"], smart: AIRaider["smart"], extra: Partial<AIRaider> = {}): AIRaider =>
  ({ name, s, mv, ret, bluff: 0, k: 1, smart, ...extra });

// my raid move sets, growing chapter by chapter
const M1 = ["hand", "walk", "pull"] as UnitDef["moves"];
const M1D = ["hand", "walk", "dash", "pull"] as UnitDef["moves"];
const M2T = ["hand", "toe", "walk", "dash", "pull"] as UnitDef["moves"];
const M2 = ["hand", "toe", "walk", "dash", "dubki", "pull"] as UnitDef["moves"];
const M2B = ["hand", "toe", "bonus", "walk", "dash", "dubki", "pull"] as UnitDef["moves"];
const M3K = ["hand", "toe", "kick", "bonus", "walk", "dash", "dubki", "pull"] as UnitDef["moves"];
const M3 = ["hand", "toe", "kick", "bonus", "walk", "dash", "dubki", "pull", "lunge"] as UnitDef["moves"];

const D1 = ["ankle"] as UnitDef["def"];
const D2 = ["ankle", "thigh"] as UnitDef["def"];
const D3 = ["ankle", "thigh", "block"] as UnitDef["def"];
const D4 = ["ankle", "thigh", "block", "rush"] as UnitDef["def"];
const D5 = ["ankle", "thigh", "block", "rush", "chain"] as UnitDef["def"];

const lot = (name: string, role: Lot["role"], trait: Lot["trait"], base: number, lo: number, hi: number, st?: [number, number, number, number]): Lot =>
  ({ name, role, trait, base, lo, hi, ...(st ? { reach: st[0], agility: st[1], speed: st[2], stamina: st[3] } : {}) });

const S = (k: UnitDef["stars"][0]["k"], v: number, label: string) => ({ k, v, label });

export const CHAPTERS = [
  { n: 1, name: "Village Mat", theme: "Village mud mat at golden hour", from: 1, to: 11 },
  { n: 2, name: "District Cup", theme: "School-ground arena under floodlights", from: 12, to: 22 },
  { n: 3, name: "State League", theme: "State indoor stadium with LED boards", from: 23, to: 33 },
  { n: 4, name: "Auction Season", theme: "Auction hall and franchise league", from: 34, to: 44 },
  { n: 5, name: "Continental Cup", theme: "Continental arena with the big screen", from: 45, to: 55 },
  { n: 6, name: "World Championship", theme: "World Championship night arena", from: 56, to: 66 },
];

export const UNITS: UnitDef[] = [
  // ═════════════════════ CHAPTER 1 — VILLAGE MAT ═════════════════════
  {
    id: 1, ch: 1, name: "First Raid", type: "Raid Puzzle", role: "teach", theme: "Village Mat",
    intro: ["hand touch", "walk home"], mech: ["hand touch", "walk home"],
    intent: "Teach the raid: pick a defender, Hand Touch him and walk back over the midline. Seven rookies, 3 raids, 1 point needed — the only lesson is that a touch only counts once you are home.",
    op: "ooooooo", g: 0.55, moves: M1, flow: "raid", raids: 3,
    goal: { pts: 1, maxCaught: 2 }, stars: [S("fast", 1, "Score on your first raid"), S("noCaught", 0, "Never get caught")],
  },
  {
    id: 2, ch: 1, name: "Read the Gap", type: "Raid Puzzle", role: "teach", theme: "Village Mat",
    intro: ["thigh-holder defenders"], mech: ["hand touch", "walk home", "thigh-holders"],
    intent: "Two rookies stand in the gap between five big Thigh-holders (T). A Hand Touch on a T, or beside him, gets you grabbed; the rookie pair in slots 3-4 is the safe touch. Aha: read the gap, not the defender. 2 points in 3 raids.",
    op: "TTooTTT", g: 0.3, moves: M1, flow: "raid", raids: 3,
    goal: { pts: 2, maxCaught: 2 }, stars: [S("noCaught", 0, "Never get caught"), S("noEmpty", 0, "No empty raids")],
  },
  {
    id: 3, ch: 1, name: "Burst Home", type: "Raid Puzzle", role: "teach", theme: "Village Mat",
    intro: ["dash home"], mech: ["hand touch", "walk home", "dash home", "thigh-holders"],
    intent: "Teach the way home: five Thigh-holders stand between you and the midline and only the two left-hand men are rookies. The touch on the corner rookie is safe either way; the walk home past five slow-reaching T's is the risk (READ: walk home held about 2.5x as often as the Dash). Aha: the way home is a choice too — touch the safe rookie, then burst home with the Dash. 3 points in 4 raids.",
    op: "ooTTTTT", g: 0.3, moves: M1D, flow: "raid", raids: 4,
    goal: { pts: 3, maxCaught: 2 }, stars: [S("noCaught", 0, "Never get caught"), S("pts", 4, "Score 4 points")],
  },
  {
    id: 4, ch: 1, name: "Hold the Line", type: "Defend Stand", role: "teach", theme: "Village Mat",
    intro: ["defender select", "ankle hold", "thigh hold", "tackle ring"], mech: ["ankle hold", "thigh hold", "tackle ring", "read the raider's move"],
    intent: "First defence, in one drill: select a defender beside the raider's target, pick the hold, and press on the tackle ring. The village raider telegraphs his touch — a Hand Touch (high) or a Toe Touch (low). The Ankle Hold catches a Toe, the Thigh Hold catches a Hand; the wrong hold misses about 3 times in 4, and 'Hold' (no tackle) just hands him the point. Aha: watch his move, then match the hold. Stop 3 of his 5 raids, concede no more than 4.",
    op: "ooooooo", g: 1, w: 1.05, moves: M1D, def: D2, flow: "defend", defs: 5,
    ai: ai("Village raider", 0.25, ["hand", "toe"], ["walk"], 0),
    goal: { stops: 3, maxOpp: 4 }, stars: [S("fastD", 4, "Win within his first 4 raids"), S("oppMax", 1, "Concede at most 1")],
  },
  {
    id: 5, ch: 1, name: "Second Touch", type: "Raid Puzzle", role: "teach", theme: "Village Mat",
    intro: ["second touch (raid depth)"], mech: ["hand touch", "dash home", "raid depth", "thigh-holders"],
    intent: "Teach greed: a rookie pair stands on each corner around a wall of three Thigh-holders. 4 points in 3 raids means at least one raid must take two touches — but every touch already made raises the next touch's risk by a third and makes the way home deeper (READ: home after 1 touch vs after 2). Aha: be greedy only along a rookie pair — the corner first, then his rookie neighbour away from the T, then Dash home; a second touch next to a T is where raids end.",
    op: "ooTTToo", g: 0.4, moves: M1D, flow: "raid", raids: 3,
    goal: { pts: 4, maxCaught: 2 }, stars: [S("fast", 2, "Win within 2 raids"), S("noCaught", 0, "Never get caught")],
  },
  {
    id: 6, ch: 1, name: "Cover Tackle", type: "Defend Stand", role: "twist", theme: "Village Mat",
    intro: ["cover position"], mech: ["thigh hold", "cover position", "defender select"],
    intent: "Twist: not WHICH hold but WHO tackles. This raider only Hand Touches and walks home, so the Thigh Hold is always the right hold; the cover ring on screen shows who should make it — the man he touches tackles at 82% of full strength (he is off balance), his neighbour, the cover, at 100%, two away at 55%. Aha: let the cover make the tackle, never the man being touched. Stop 3 of 5.",
    op: "ooooooo", g: 1, w: 1, moves: M1D, def: D2, flow: "defend", defs: 5, show: { cover: true },
    ai: ai("Village raider", 0.35, ["hand"], ["walk"], 0),
    goal: { stops: 3, maxOpp: 5 }, stars: [S("fastD", 4, "Win within his first 4 raids"), S("oppMax", 2, "Concede at most 2")],
  },
  {
    id: 7, ch: 1, name: "Grip and Rip", type: "Raid Puzzle", role: "teach", theme: "Village Mat",
    intro: ["struggle (pull-away)"], mech: ["hand touch", "dash home", "struggle (pull-away)", "thigh-holders"],
    intent: "Five Thigh-holders with strong grips around one rookie: even good raids get held here. Held raiders play the struggle — the pull-away breaks free about half the time, and the defender holding you counts as touched when you do. Aha: a hold is not the end — keep raiding the rookie gap and rip loose when grabbed. Score 3 in 5 raids; caught 3 times and it's over.",
    op: "TToToTT", g: 0.65, moves: M1D, flow: "raid", raids: 5,
    goal: { pts: 3, maxCaught: 3 }, stars: [S("escapes", 1, "Break free from a hold"), S("fast", 4, "Win within 4 raids")],
  },
  {
    id: 8, ch: 1, name: "Village Fair", type: "Match", role: "breather", theme: "Village Mat",
    intro: ["raid and defend in turns", "referee's call"], mech: ["hand touch", "dash home", "ankle hold", "thigh hold", "alternating raids", "referee's call"],
    intent: "Breather and the first real match flow: 3 raids each against a gentle village side (two Thigh-holders, a Hand-Touch-only raider), the sides swapping after every raid. After the first two raids the referee steps in: LOBBY — their Thigh-holder in slot 2 stepped out of bounds and is sent off the mat, so the gap you have been raiding changes shape. Aha: after a referee's call, re-read the mat before you raid. Win the segment by 1; 3 stars for winning by 4.",
    op: "oTooToo", g: 0.45, moves: M1D, def: D2, flow: "alt", first: 0, raids: 3, defs: 3,
    moment: { at: 2, kind: "ref", text: "LOBBY! Their Thigh-holder stepped out of bounds — the referee sends him off. Re-read the mat.", out: [1] },
    ai: ai("Fair raider", 0.2, ["hand"], ["walk"], 0),
    goal: { margin: 1 }, stars: [S("margin", 3, "Win by 3"), S("margin", 4, "Win by 4")],
  },
  {
    id: 9, ch: 1, name: "Two-Way Duel", type: "Match", role: "combine", theme: "Village Mat",
    intro: ["mid-match reversal"], mech: ["hand touch", "dash home", "ankle hold", "thigh hold", "return tackle", "thigh-holders", "mid-match reversal"],
    intent: "Combine both halves of chapter 1, then flip them: 4 raids each. At first T's guard both corners and the centre, so raid the gaps and Dash home, and their raider mixes Hand and Toe, so match the hold. After two raids each their coach reverses everything: the T's move into the old gaps (rookies now at the corners and the centre) and their raider switches to Toe Touches and Dash home only. Aha: a reversal is a new puzzle — re-read both ends (your safe touch moves, and one Ankle Hold now beats both his touch and his way home). Win by 2.",
    op: "TooToTo", g: 0.5, moves: M1D, def: D2, flow: "alt", first: 0, raids: 4, defs: 4,
    moment: { at: 4, kind: "reversal", text: "REVERSAL! Their coach swaps the shape: Thigh-holders into the gaps — and their raider now only Toe-touches and Dashes home.", op: "oTToTTo", ai: { mv: ["toe"], ret: ["dash"] } },
    ai: ai("Village raider", 0.35, ["hand", "toe"], ["walk", "dash"], 0),
    goal: { margin: 2 }, stars: [S("margin", 4, "Win by 4"), S("noCaught", 0, "Never get caught")],
  },
  {
    id: 10, ch: 1, name: "Dusk Showdown", type: "Comeback", role: "spike", theme: "Village Mat",
    intro: ["comeback from a deficit"], mech: ["hand touch", "dash home", "struggle (pull-away)", "ankle hold", "thigh hold", "comeback"],
    intent: "Spike: 15:00 of the second half, 11-13 down, 4 raids each left against the village's best raider. Two points is a lot in 8 raids: you need one stop and steady touches, and a second touch only when the gap beside your first is a rookie. Win by 1.",
    op: "TToToTT", g: 0.45, moves: M1D, def: D2, flow: "alt", first: 0, raids: 4, defs: 4, score: [11, 13],
    ai: ai("Village captain", 0.4, ["hand", "toe"], ["walk", "dash"], 0, { k: 2 }),
    goal: { margin: 1 }, stars: [S("margin", 3, "Win by 3"), S("oppMax", 3, "Concede at most 3")],
  },
  {
    id: 11, ch: 1, name: "Village Final", type: "Full Match", role: "boss", theme: "Village Mat",
    intro: ["full match", "half-time swap", "rival personality"], mech: ["hand touch", "dash home", "struggle (pull-away)", "ankle hold", "thigh hold", "cover position", "full match"],
    intent: "Chapter boss and the first whole match, kept short: the Village Final as a mini-Blitz of 2x6 game minutes (~17 raids in all) with a half-time swap. Their captain Bholu has a personality you can read: he is greedy — he goes for two touches on 8 raids in 10 and always Dashes home. Aha: his second touch and his Dash are your chances — tackle his next target with the cover, or Ankle his Dash home; on your raids, raid the rookie gaps and Dash past the T's. Win the match.",
    op: "oTToTTo", g: 0.4, moves: M1D, def: D2, flow: "alt", first: 0, clock: [0, 720], half: 360,
    ai: ai("Bholu, the greedy captain", 0.35, ["hand", "toe"], ["dash"], 0, { k: 2, greedy: 0.8 }),
    goal: { margin: 1 }, stars: [S("margin", 3, "Win by 3"), S("margin", 6, "Win by 6")],
  },

  // ═════════════════════ CHAPTER 2 — DISTRICT CUP ═════════════════════
  {
    id: 12, ch: 2, name: "Long Reach", type: "Raid Puzzle", role: "teach", theme: "District Cup",
    intro: ["toe touch"], mech: ["toe touch", "hand touch", "dash home", "thigh-holders"],
    intent: "Seven Thigh-holders and no gap at all. A Hand Touch into a T gets you held about 1 time in 5, the Toe Touch's long low reach only 3% (see READ). Aha: change the move, not the target. 3 points in 4 raids.",
    op: "TTTTTTT", g: 0.4, moves: M2T, flow: "raid", raids: 4,
    goal: { pts: 3, maxCaught: 2 }, stars: [S("noCaught", 0, "Never get caught"), S("fast", 3, "Win within 3 raids")],
  },
  {
    id: 13, ch: 2, name: "Ankle Trap", type: "Raid Puzzle", role: "twist", theme: "District Cup",
    intro: ["ankle-catcher defenders"], mech: ["toe touch", "hand touch", "dash home", "thigh-holders", "ankle-catchers"],
    intent: "Twist: Ankle-catchers (A) on both corners and slot 3 wait for your Toe Touch, the T's wait for your Hand. The READ row shows the counter for each slot: Hand on an A, Toe on a T — and slot 2, a T between two A's, is the one to avoid with both. Aha: every defender has a counter. 4 points in 5 raids.",
    op: "ATAoTTA", g: 0.5, moves: M2T, flow: "raid", raids: 5,
    goal: { pts: 4, maxCaught: 2 }, stars: [S("noCaught", 0, "Never get caught"), S("fast", 3, "Win within 3 raids")],
  },
  {
    id: 14, ch: 2, name: "Duck Under", type: "Raid Puzzle", role: "teach", theme: "District Cup",
    intro: ["dubki", "blocker wall"], mech: ["dubki", "toe touch", "hand touch", "blocker wall", "thigh-holders"],
    intent: "Four Blockers (B) form a wall on the midline — the screen shows it: before you pick the way home the B's link arms across the midline and the Dash gem is drawn against the wall, so a Dash into them (held most of the time, READ) is shown on its gem with a WALLED tag — never a hidden trap. The Dubki ducks under their arms and the T's reach. Aha: dubki under a reach. Score 3 points with at least one Dubki or Toe Touch scoring.",
    op: "TBBoBBT", g: 0.45, moves: M2, flow: "raid", raids: 4, show: { wall: true },
    goal: { pts: 3, maxCaught: 2, need: { lowMove: 1 } }, stars: [S("dubki", 2, "Score with Dubki twice"), S("noCaught", 0, "Never get caught")],
  },
  {
    id: 15, ch: 2, name: "Build the Wall", type: "Defend Stand", role: "teach", theme: "District Cup",
    intro: ["block (defensive wall)"], mech: ["block (defensive wall)", "ankle hold", "thigh hold", "return tackle"],
    intent: "Teach the Block: the district sprinter telegraphs his way home — mostly a Dash, sometimes a walk. Against a Dash, let the touch go and form the Block on the midline (its timing window is a little wider in this first lesson, READ); against a walk the Block is weak and the Thigh Hold is the stop. Aha: defend the way home, not the touch — and read WHICH way home before you build the wall. Stop 3 of 5.",
    op: "ooooooo", g: 1, w: 1, bw: 1.15, moves: M2, def: D3, flow: "defend", defs: 5,
    ai: ai("District sprinter", 0.45, ["hand", "toe"], ["walk", "dash"], 0),
    goal: { stops: 3, maxOpp: 5 }, stars: [S("fastD", 4, "Win within his first 4 raids"), S("oppMax", 2, "Concede at most 2")],
  },
  {
    id: 16, ch: 2, name: "Count the Empties", type: "Match", role: "teach", theme: "District Cup",
    intro: ["empty-raid counter"], mech: ["empty-raid counter", "toe touch", "dubki", "block (defensive wall)", "ankle-catchers", "thigh-holders"],
    intent: "Teach the empty-raid counter: you lead 8-7 and already have 1 empty raid. The mat is soft but for its two Ankle-catcher corners. An empty raid is safe — touching nobody keeps you deep in your own half — but the third in a row is Do-or-Die, so after one more empty raid you MUST touch. Aha: one patient empty raid is a weapon, two is a risk. 4 raids each, win by 2.",
    op: "AoToToA", g: 0.45, moves: M2, def: D3, flow: "alt", first: 0, raids: 4, defs: 4, score: [8, 7], empty: [1, 0],
    ai: ai("District raider", 0.4, ["hand", "toe"], ["walk", "dash"], 0),
    goal: { margin: 2 }, stars: [S("margin", 4, "Win by 4"), S("noCaught", 0, "Never get caught")],
  },
  {
    id: 17, ch: 2, name: "Do-or-Die", type: "Do-or-Die Drill", role: "teach", theme: "District Cup",
    intro: ["do-or-die raid"], mech: ["do-or-die raid", "toe touch", "hand touch", "dubki", "ankle-catchers", "blocker wall"],
    intent: "Straight after the empty-raid counter: two empty raids already: your next raid is Do-or-Die and an empty return puts you out. Ankle-catchers on the corners, a Blocker wall in the middle. The wall shuts the Dash home and the corner A's read the Dubki, so the safe way back is a plain walk (READ). The trade-off: the safe touch (Hand on an A, walk home) wins the Do-or-Die but scores only 1, and the goal is 3 points in 3 raids — so after the Do-or-Die one free raid may take a greedy second touch, a third riskier and deeper from home. The Do-or-Die IS the lesson: win it first. Aha: survive the Do-or-Die with the safe touch, then spend the greed on a free raid after it. Win the Do-or-Die raid and score 3 in 3 raids.",
    op: "AoBBBoA", g: 0.55, moves: M2, flow: "raid", raids: 3, empty: [2, 0],
    goal: { pts: 3, maxCaught: 2, need: { dodWin: 1 } }, stars: [S("pts", 4, "Score 4 points"), S("noCaught", 0, "Never get caught")],
  },
  {
    id: 18, ch: 2, name: "Bonus Line", type: "Raid Puzzle", role: "teach", theme: "District Cup",
    intro: ["bonus line"], mech: ["bonus line", "toe touch", "hand touch", "dubki", "thigh-holders"],
    intent: "Teach the bonus line: with 6+ defenders on the mat a hop over the bonus line scores 1 and puts nobody out. Rookie corners make the hop safe. Aha: bonus first — every touch puts a man out and below 6 the bonus line is dead. Earn 2 bonus points and 4 points total in 4 raids.",
    op: "oTToTTo", g: 0.45, moves: M2B, flow: "raid", raids: 4,
    goal: { pts: 4, maxCaught: 2, need: { bonus: 2 } }, stars: [S("bonus", 3, "Earn 3 bonus points"), S("noCaught", 0, "Never get caught")],
  },
  {
    id: 19, ch: 2, name: "Their Do-or-Die", type: "Do-or-Die Drill", role: "twist", theme: "District Cup",
    intro: [], mech: ["do-or-die raid", "ankle hold", "thigh hold", "block (defensive wall)", "revival"],
    intent: "Twist: now THEIR raider is on 2 empty raids, so his first raid is Do-or-Die — he must touch someone, so his telegraph is always a real attempt and an empty raid puts him out. The extra consequence: one of your side is already out, so a stop revives him (every point revives one, first out, first back) and every touch he lands sends another of yours off; fall to 3 on the mat and the trial is lost. Aha: a forced raider is predictable — punish his Do-or-Die with the matching hold and win your men back. Stop 2 of his 4 raids, concede no more than 5.",
    op: "ooooooo", me: "ooooo-o", g: 1, w: 1.1, moves: M2, def: D3, flow: "defend", defs: 4, empty: [0, 2],
    ai: ai("Desperate raider", 0.38, ["hand", "toe"], ["walk", "dash"], 0),
    goal: { stops: 2, maxOpp: 5, minMat: 4 }, stars: [S("fullSide", 0, "Finish with all 7 on the mat"), S("fastD", 3, "Win within his first 3 raids")],
  },
  {
    id: 20, ch: 2, name: "One-Point Thriller", type: "Match", role: "spike", theme: "District Cup",
    intro: [], mech: ["empty-raid counter", "bonus line", "toe touch", "dubki", "block (defensive wall)", "ankle-catchers"],
    intent: "Spike built only from chapter 2's verbs: level at 13-13, 4 raids each left. You are on 1 empty raid (one more patient raid is allowed, a second would make the third Do-or-Die), their raider takes one touch or hops the bonus. Ankle-catchers on the corners make your bonus hop a real risk (READ); the rookies in slots 2 and 6 are the safe touches, the T's beside the Blocker want the Toe. Aha: in a one-point game, count the empties — bank one safe Toe point early, then decide whether the bonus is worth its risk. Win by 1.",
    op: "AoTBToA", g: 0.5, moves: M2B, def: D3, flow: "alt", first: 0, raids: 4, defs: 4, score: [13, 13], empty: [1, 1],
    ai: ai("District star", 0.4, ["hand", "toe", "bonus"], ["walk", "dash", "dubki"], 0, { bonusRate: 0.3 }),
    goal: { margin: 1 }, stars: [S("margin", 3, "Win by 3"), S("noEmpty", 0, "No empty raids")],
  },
  {
    id: 21, ch: 2, name: "Friend's Ghost", type: "Ghost Duel", role: "breather", theme: "District Cup",
    intro: ["ghost duel"], mech: ["ghost duel", "bonus line", "toe touch", "hand touch", "dubki"],
    intent: "Breather after the thriller, and the first Ghost Duel: a friend raided this same friendly mat (seven on, rookie corners, bonus line open) and their recorded score is on the board. Beat it in 4 raids. No defending, no clock pressure — the ghost replays exactly, so it is a pure score chase. Aha: the bonus hop is free points while all seven stand; take it before your touches thin the mat.",
    op: "oToooTo", g: 0.45, moves: M2B, flow: "raid", raids: 4, ghost: "friend",
    goal: { ghost: true, maxCaught: 2, need: { bonus: 1 } }, stars: [S("bonus", 2, "Earn 2 bonus points"), S("noCaught", 0, "Never get caught")],
  },
  {
    id: 22, ch: 2, name: "District Final", type: "Full Match", role: "boss", theme: "District Cup",
    intro: [], mech: ["full match", "do-or-die raid", "bonus line", "toe touch", "dubki", "block (defensive wall)", "ankle-catchers", "thigh-holders"],
    intent: "Chapter boss with a Do-or-Die finish, kept to one session: the last 10 minutes of the District Final (~15 raids), one down at 16-17. A, T and B defenders and a raider who hops the bonus and Dubkis home; Do-or-Die is live on both sides, so the empty raids you spend early decide who is forced at the end. Aha: manage the empties like a clock — spend patience while level, never while behind. Win the match.",
    op: "ATTBTTA", g: 0.45, moves: M2B, def: D3, flow: "alt", first: 0, clock: [1800, 2400], score: [16, 17],
    ai: ai("District captain", 0.42, ["hand", "toe", "bonus"], ["walk", "dash", "dubki"], 0, { k: 2, bonusRate: 0.25 }),
    goal: { margin: 1 }, stars: [S("margin", 4, "Win by 4"), S("margin", 7, "Win by 7")],
  },

  // ═════════════════════ CHAPTER 3 — STATE LEAGUE ═════════════════════
  {
    id: 23, ch: 3, name: "Rushers", type: "Raid Puzzle", role: "teach", theme: "State League",
    intro: ["backward kick", "rusher defenders"], mech: ["backward kick", "rusher defenders", "hand touch", "toe touch", "dash home"],
    intent: "Teach the Backward Kick: Rushers (R) charge the raider and hold about a third of Hand or Toe Touches near them, but a Backward Kick tags a charging R at a fraction of that risk (READ). Aha: let the rusher come to you. Score 2 Kicks and 3 points in 4 raids.",
    op: "RoRoRoR", g: 0.5, moves: M3K, flow: "raid", raids: 4,
    goal: { pts: 3, maxCaught: 2, need: { kick: 2 } }, stars: [S("fast", 3, "Win within 3 raids"), S("noCaught", 0, "Never get caught")],
  },
  {
    id: 24, ch: 3, name: "Lunge for the Line", type: "Raid Puzzle", role: "teach", theme: "State League",
    intro: ["escape lunge"], mech: ["escape lunge", "struggle (pull-away)", "chain links", "thigh-holders", "hand touch"],
    intent: "Teach the Escape lunge: strong-grip T's and a chained pair (C C) will hold you. Walking or dashing home past them is held most of the time — only the Dubki gets home reliably (READ). When held, the lunge for the line is strong held shallow (0-1 touches) and fades with every touch; held deep, the stamina pull-away is the better struggle. Aha: Dubki home, and if held: shallow → lunge, deep → pull. Score 4 in 4 raids; caught 3 times and it's over.",
    op: "TTCCTTT", g: 0.7, moves: M3, flow: "raid", raids: 4,
    goal: { pts: 4, maxCaught: 3 }, stars: [S("escapes", 1, "Escape a hold"), S("pts", 5, "Score 5 points")],
  },
  {
    id: 25, ch: 3, name: "Charge the Hop", type: "Defend Stand", role: "teach", theme: "State League",
    intro: ["defender rush"], mech: ["defender rush", "bonus line", "ankle hold", "thigh hold", "block (defensive wall)"],
    intent: "Teach the defender Rush: the state raider goes for the bonus line on most raids and lands it 8 times in 10 if you let him. A corner Rush stops the hop best; the holds on a hop are weak (READ). Aha: rush the hop, hold the touch. Stop 2 of 4 raids, concede no more than 3.",
    op: "ooooooo", g: 1, moves: M3, def: D4, flow: "defend", defs: 4,
    ai: ai("Bonus hunter", 0.45, ["bonus", "hand", "toe"], ["walk", "dash"], 0, { bonusRate: 0.7 }),
    goal: { stops: 2, maxOpp: 3 }, stars: [S("fastD", 3, "Win within his first 3 raids"), S("oppMax", 1, "Concede at most 1")],
  },
  {
    id: 26, ch: 3, name: "Super Tackle", type: "Super Challenge", role: "teach", theme: "State League",
    intro: ["super tackle"], mech: ["super tackle", "all-out", "ankle hold", "thigh hold", "block (defensive wall)", "defender rush"],
    intent: "Teach the Super Tackle: you have only 3 on the mat, so any tackle is worth 2 — but he goes for two touches, and lose all 3 and the all-out gives them +2. Choose WHICH of your three makes the tackle — the one beside his target (cover), never the man he touches. Aha: three defenders are a threat, not a weakness. Land a Super Tackle within 4 raids and concede no more than 2 (his two-touch raid can cost two at once).",
    op: "ooooooo", me: "oo---o-", g: 1, moves: M3, def: D4, flow: "defend", defs: 4,
    ai: ai("State raider", 0.4, ["hand", "toe"], ["walk", "dash"], 1, { k: 2 }),
    goal: { maxOpp: 2, need: { superTackle: 1 } }, stars: [S("fastD", 2, "Super Tackle within his first 2 raids"), S("oppMax", 1, "Concede at most 1")],
  },
  {
    id: 27, ch: 3, name: "Turn the Raid", type: "Raid Puzzle", role: "twist", theme: "State League",
    intro: ["defence reads repeats"], mech: ["defence reads repeats", "backward kick", "rusher defenders", "thigh-holders", "toe touch"],
    intent: "Twist, one idea only: state sides scout you. A touch move or way home you used on your PREVIOUS raid is read — its gem shows a SCOUTED tag and its real % rises (READ row). Rushers sit beside Thigh-holders, so the Kick on a charging R and the Toe on a T are both good touches, and the Dash and the walk both get you home. Aha: the safest move is the one you did not just use — alternate Kick and Toe, Dash and walk. Score 4 in 4 raids with at least one Kick.",
    op: "oRTRToR", g: 0.55, read: 0.25, moves: M3, flow: "raid", raids: 4,
    goal: { pts: 4, maxCaught: 2, need: { kick: 1 } }, stars: [S("kick", 2, "Score with 2 kicks"), S("noCaught", 0, "Never get caught")],
  },
  {
    id: 28, ch: 3, name: "All Out!", type: "Super Challenge", role: "teach", theme: "State League",
    intro: ["all-out"], mech: ["all-out", "hand touch", "toe touch", "backward kick", "dubki"],
    intent: "Teach the all-out: three are left — two rookies and a Thigh-holder. Touch all three out (a greedy 2-touch raid along the rookie pair, then the T with a Toe) and the all-out is +2 with their whole side coming back. No scouting on this short drill (no SCOUTED tags): the only question is the order of the touches. Aha: finish the job — a lone survivor revives them. Inflict the all-out within 3 raids.",
    op: "--oo-T-", g: 0.6, read: 0, moves: M3, flow: "raid", raids: 3,
    goal: { maxCaught: 2, need: { allOut: 1 } }, stars: [S("fast", 2, "All-out within 2 raids"), S("noCaught", 0, "Never get caught")],
  },
  {
    id: 29, ch: 3, name: "The Kicker", type: "Defend Stand", role: "twist", theme: "State League",
    intro: ["CPU backward kick", "step back vs a kick"], mech: ["CPU backward kick", "defender rush", "thigh hold", "ankle hold", "block (defensive wall)"],
    intent: "Twist on the kick: now THEIR raider touches once and then Backward-Kicks the defender who chases him — his telegraph shows KICK before he turns, so you always see it coming. Chasing a kick is the trap (no hold catches it well, a Rush almost never). The counter is to step back: if nobody steps in (Hold), his kick finds nobody to tag 65% of the time, and his way home is still yours to Block. When he shows a Hand, Thigh Hold the touch as usual. The cost of the step-back: Hold never stops him on the touch, so the stop must come on his way home. Aha: never chase a kicker — step back, then beat his way home. Stop 2 of 5, concede no more than 4.",
    op: "ooooooo", g: 1, moves: M3, def: D4, flow: "defend", defs: 5,
    ai: ai("State kicker", 0.45, ["hand", "kick"], ["walk", "dash"], 0, { k: 2 }),
    goal: { stops: 2, maxOpp: 4 }, stars: [S("fastD", 3, "Win within his first 3 raids"), S("oppMax", 3, "Concede at most 3")],
  },
  {
    id: 30, ch: 3, name: "Rush Hour", type: "Match", role: "combine", theme: "State League",
    intro: [], mech: ["defence reads repeats", "backward kick", "rusher defenders", "blocker wall", "dubki", "defender rush", "block (defensive wall)", "bonus line"],
    intent: "Combine chapter 3: a mat of Rushers around a Blocker and two T's, and a raider with one plan — Hand Touch or bonus hop, then always the Dash. On your raids the rushers want the Kick and the wall wants the Dubki; on his, Rush the hop and Block the Dash. 4 raids each, win by 2.",
    op: "RTRBRTR", g: 0.5, moves: M3, def: D4, flow: "alt", first: 0, raids: 4, defs: 4,
    ai: ai("State raider", 0.4, ["hand", "bonus"], ["dash"], 0, { bonusRate: 0.4 }),
    goal: { margin: 2 }, stars: [S("margin", 4, "Win by 4"), S("noCaught", 0, "Never get caught")],
  },
  {
    id: 31, ch: 3, name: "Revival Run", type: "Revival Run", role: "spike", theme: "State League",
    intro: ["revival"], mech: ["revival", "all-out", "super tackle", "backward kick", "escape lunge", "dubki"],
    intent: "Spike: all out at minute 5 — 5-9 down and only 3 back on the mat. Each point you score revives a team-mate, and with 3 or fewer every tackle is a Super Tackle. Every point revives a team-mate (first out, first back). Aha: sacrifice greed for revivals — safe single touches rebuild the side. Reach 20:00 within 2 points; trail by 9 and it's over. A Super Tackle from three is the 3-star swing.",
    op: "oTRoBTo", me: "--o-o-o", g: 0.5, moves: M3, def: D4, flow: "alt", first: 0, clock: [900, 1200], score: [5, 9],
    ai: ai("State raider", 0.42, ["hand", "toe"], ["walk", "dash"], 0),
    goal: { margin: -2, maxTrail: 8 }, stars: [S("margin", 0, "Draw level"), S("superTackle", 1, "Land a Super Tackle")],
  },
  {
    id: 32, ch: 3, name: "Floodlight Friendly", type: "Match", role: "breather", theme: "State League",
    intro: [], mech: ["backward kick", "bonus line", "hand touch", "toe touch", "ankle hold", "thigh hold"],
    intent: "Breather after the revival spike: a friendly against a second-string side — two rookies, one rusher to kick, bonus line open. 3 raids each; win by 2. The toy: the floodlight Bonus trophy — two bonus hops while all seven stand is the 3-star show.",
    op: "ooRooTo", g: 0.45, moves: M3, def: D4, flow: "alt", first: 0, raids: 3, defs: 3,
    ai: ai("Reserve raider", 0.25, ["hand", "toe"], ["walk"], 0),
    goal: { margin: 2 }, stars: [S("margin", 4, "Win by 4"), S("bonus", 2, "Bonus trophy: 2 bonus hops")],
  },
  {
    id: 33, ch: 3, name: "State Final", type: "Full Match", role: "boss", theme: "State League",
    intro: [], mech: ["full match", "comeback", "revival", "super tackle", "backward kick", "escape lunge", "defender rush", "rusher defenders"],
    intent: "Chapter boss with a comeback, kept to one session: the last 11 minutes of the State Final (~15 raids), 10-12 down. Full mat of Rushers, Blockers and T's; a raider who kicks chasers (step back) and hops the bonus (Rush the hop). Aha: two points back is two clean raids plus one stop — kick the rushers, Dubki the wall, and never chase his kick. Win the match.",
    op: "RTBoBTR", g: 0.45, moves: M3, def: D4, flow: "alt", first: 0, clock: [1750, 2400], score: [10, 12],
    ai: ai("State champion", 0.45, ["hand", "toe", "bonus", "kick"], ["walk", "dash", "dubki"], 1, { k: 2, bonusRate: 0.25 }),
    goal: { margin: 1 }, stars: [S("margin", 3, "Win by 3"), S("margin", 6, "Win by 6")],
  },

  // ═════════════════════ CHAPTER 4 — AUCTION SEASON ═════════════════════
  {
    id: 34, ch: 4, name: "The Auction", type: "Auction", role: "teach", theme: "Auction Hall",
    intro: ["auction", "player roles"], mech: ["auction", "player roles", "purse"],
    intent: "Teach the auction: 6 lots — a star Raider and a cheap one, two Corners, two Anchors — and an 85-lakh purse against AI franchises. The star goes for 45-60, so buying him leaves barely enough for a Corner and an Anchor and nothing for the stars; the budget Raider, a Corner and an Anchor cost about 55. The purse helper on screen shows what is still needed and the cheapest squad left. Aha: price the whole squad, not the lot — a lot you pass on has a cheaper twin later. Buy a Raider, a Corner and an Anchor.",
    op: "ooooooo", g: 0.5, moves: M3, def: D4, flow: "auction", purse: 85, show: { purse: true },
    lots: [
      lot("Veer 'Thunder' Rao", "Raider", "o", 35, 45, 60, [8, 7, 7, 6]),
      lot("Kabir Sethi", "Raider", "o", 12, 14, 22, [6, 6, 5, 7]),
      lot("Ishaan Pal", "Corner", "A", 12, 14, 24),
      lot("Danish Mir", "Corner", "T", 10, 12, 20),
      lot("Rustam Bhatti", "Anchor", "K", 18, 20, 32),
      lot("Balwant Singh", "Anchor", "K", 14, 16, 26),
    ],
    needRoles: ["Raider", "Corner", "Anchor"],
    goal: {}, stars: [S("purse", 15, "Keep 15 lakh in the purse"), S("purse", 25, "Keep 25 lakh in the purse")],
  },
  {
    id: 35, ch: 4, name: "Corner Specialists", type: "Defend Stand", role: "teach", theme: "Auction Hall",
    intro: ["hold specialists"], mech: ["hold specialists", "ankle hold", "thigh hold", "cover position", "defender select"],
    intent: "Teach specialists: your left corner is an Ankle specialist (A, ankle ×1.25), your right corner a Thigh specialist (T, thigh ×1.25). The raider attacks anywhere with Hand or Toe. Aha: switch to the specialist whose hold matches his move when he is in range. Stop 3 of 5.",
    op: "ooooooo", me: "AoooooT", g: 1, moves: M3, def: D4, flow: "defend", defs: 5,
    ai: ai("League raider", 0.5, ["hand", "toe"], ["walk", "dash"], 0),
    goal: { stops: 3, maxOpp: 5 }, stars: [S("fastD", 4, "Win within his first 4 raids"), S("oppMax", 2, "Concede at most 2")],
  },
  {
    id: 36, ch: 4, name: "The Anchor", type: "Defend Stand", role: "teach", theme: "Auction Hall",
    intro: ["anchor"], mech: ["anchor", "hold specialists", "ankle hold", "thigh hold", "block (defensive wall)"],
    intent: "Teach the Anchor, with his range drawn on the mat: K in slot 4 multiplies every hold by 1.15 and his tackles rarely slip, and the shaded ring shows his range — slots 3-5, the target and one either side. Inside the ring the Anchor is the tackler whatever the move; outside it he is too far (half strength), so at the corners use the corner specialist when his hold matches the move, the defender beside the target when it does not. Aha: the specialists need the right read, the Anchor only needs the raider inside his ring. Stop 3 of 5.",
    op: "ooooooo", me: "AooKooT", g: 1, moves: M3, def: D4, flow: "defend", defs: 5, show: { anchor: 1 },
    ai: ai("League raider", 0.4, ["hand", "toe"], ["walk", "dash", "dubki"], 0),
    goal: { stops: 3, maxOpp: 5 }, stars: [S("fastD", 4, "Win within his first 4 raids"), S("oppMax", 2, "Concede at most 2")],
  },
  {
    id: 37, ch: 4, name: "Bluff Raider", type: "Defend Stand", role: "twist", theme: "Auction Hall",
    intro: ["feints", "feint tell"], mech: ["feints", "anchor", "hold specialists", "block (defensive wall)", "ankle hold", "thigh hold"],
    intent: "Twist: this raider feints — 3 raids in 10 the telegraphed move is not the real one — but feints have a tell: on 6 of 10 feints his hips turn first and the telegraph flickers (FEINT? on screen), so a flickering telegraph is a lie and a clean one is true about 85% of the time. Aha: trust a clean telegraph and counter it; against a flicker, use the all-round Anchor or an Ankle on his way home (it covers Dash and Dubki). Stop 2 of 5, concede no more than 5.",
    op: "ooooooo", me: "AooKooT", g: 1, moves: M3, def: D4, flow: "defend", defs: 5,
    ai: ai("Feinting raider", 0.5, ["hand", "toe"], ["walk", "dash", "dubki"], 0, { bluff: 0.3, tell: 0.6 }),
    goal: { stops: 2, maxOpp: 5 }, stars: [S("fastD", 3, "Win within his first 3 raids"), S("oppMax", 3, "Concede at most 3")],
  },
  {
    id: 38, ch: 4, name: "Hold the Lead", type: "Match", role: "practise", theme: "Auction Hall",
    intro: ["protect a lead"], mech: ["game management", "empty-raid counter", "hold specialists", "anchor", "alternating raids"],
    intent: "A different kind of goal — game management: you lead 20-18 with 4 raids each to go, and the trial is lost if you ever trail by more than 2. Your specialist squad defends (A corners, T covers, Anchor in the middle). A patient empty raid is safe while you lead, but two in a row make the third a Do-or-Die. Aha: protecting a lead is its own skill — bank the safe single touch, spend the empty raids, and tackle only with the specialist whose hold matches his move. Finish ahead, never more than 2 behind.",
    op: "ATBoBTA", me: "AToKoTA", g: 0.5, moves: M3, def: D4, flow: "alt", first: 1, raids: 4, defs: 4, score: [20, 18],
    ai: ai("League raider", 0.45, ["hand", "toe"], ["walk", "dash"], 1),
    goal: { margin: 1, maxTrail: 2 }, stars: [S("margin", 3, "Win by 3"), S("noEmpty", 0, "No empty raids")],
  },
  {
    id: 39, ch: 4, name: "Switch!", type: "Defend Stand", role: "twist", theme: "Auction Hall",
    intro: ["defender switch"], mech: ["defender switch", "hold specialists", "anchor", "ankle hold", "thigh hold", "block (defensive wall)"],
    intent: "Twist: a two-touch raider — after the first touch he turns for a second defender, so the defender in range changes mid-raid. Switch to whoever covers the new target (the tap-select is instant). Aha: defend the raider's NEXT target, not the last one. Stop 2 of 4 and concede no more than 3.",
    op: "ooooooo", me: "AoTKToA", g: 1, moves: M3, def: D4, flow: "defend", defs: 4,
    ai: ai("Two-touch raider", 0.45, ["hand", "toe"], ["walk", "dash"], 1, { k: 2 }),
    goal: { stops: 2, maxOpp: 3 }, stars: [S("fastD", 3, "Win within his first 3 raids"), S("oppMax", 1, "Concede at most 1")],
  },
  {
    id: 40, ch: 4, name: "Specialist Derby", type: "Match", role: "spike", theme: "Auction Hall",
    intro: [], mech: ["hold specialists", "anchor", "backward kick", "rusher defenders", "blocker wall", "ankle-catchers"],
    intent: "Spike, every read at once: your specialist squad (A corners, T covers, Anchor) against a full league mat (A, T, B, R) and a Medium raider who reads your shape (no feints: the test is reading both ends, not bluffs). On your raids the mat has a counter for every move — Kick the R, Toe the T, Hand the A — no scouting here; on defence, match the specialist to his move. 4 raids each, win by 1.",
    op: "ATBRBTA", me: "AToKoTA", g: 0.5, read: 0, moves: M3, def: D4, flow: "alt", first: 0, raids: 4, defs: 4,
    ai: ai("League star", 0.5, ["hand", "toe"], ["walk", "dash", "dubki"], 1, {}),
    goal: { margin: 1 }, stars: [S("margin", 3, "Win by 3"), S("oppMax", 2, "Concede at most 2")],
  },
  {
    id: 41, ch: 4, name: "Scout's Choice", type: "Auction", role: "combine", theme: "Auction Hall",
    intro: [], mech: ["auction", "hold specialists", "anchor", "ankle hold", "thigh hold", "scouting"],
    intent: "Combine auction and defence: the scouting report says their raider is a Toe-Touch specialist who Dubkis home — both beaten by Ankle holds. The Ankle Corner is the one you want, so the rival franchises bid him up; the Thigh Corner goes cheap and the Anchor sits between. 74 lakh buys the Ankle Corner and an Anchor only if you don't overpay. Aha: buy for the opponent you will face, not the bargain. Buy a Corner and an Anchor, then stop 2 of his 5 raids.",
    op: "ooooooo", g: 1, moves: M3, def: D4, flow: "defend", defs: 5, purse: 74,
    lots: [
      lot("Harpreet Sandhu", "Corner", "T", 8, 10, 18),
      lot("Imran Qureshi", "Corner", "A", 22, 26, 38),
      lot("Bhim Yadav", "Anchor", "K", 16, 18, 30),
    ],
    needRoles: ["Corner", "Anchor"],
    ai: ai("Toe specialist", 0.4, ["toe"], ["dubki"], 0),
    goal: { stops: 2, maxOpp: 5 }, stars: [S("fastD", 3, "Win within his first 3 raids"), S("purse", 10, "Keep 10 lakh in the purse")],
  },
  {
    id: 42, ch: 4, name: "Rival Franchise", type: "Auction", role: "twist", theme: "Auction Hall",
    intro: ["rival bidder"], mech: ["auction", "rival bidder", "player roles", "anchor", "purse"],
    intent: "Twist, auction only — read the other bidder: the Harbour Hawks need an Anchor and chase the FIRST one on the list, paying about 14 lakh over his market value (shown in the lot's market range); once they have one they stop. You need a Raider and an Anchor from 75 lakh, and the purse helper shows the sum on every bid. Aha: let the rival overpay for the first Anchor — his twin later goes at market, and that saving buys the better Raider.",
    op: "ooooooo", g: 0.5, moves: M3, def: D4, flow: "auction", purse: 75, show: { purse: true },
    rival: { name: "Harbour Hawks", role: "Anchor", plus: 14 },
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
  {
    id: 43, ch: 4, name: "Fans' Day", type: "Super Challenge", role: "breather", theme: "Auction Hall",
    intro: [], mech: ["backward kick", "rusher defenders", "bonus line", "score attack"],
    intent: "Breather with a toy: the fans' trick-shot exhibition. Three Rushers charge on a friendly mat and the crowd wants Backward Kicks — score 2 Kicks on the way to 4 points in 4 raids (a bonus hop first is the show-off star), with your squad's raider (reach 7). Aha: an exhibition is the place to try the show moves you will need later — kick the charge, hop the line while seven stand.",
    op: "RoRoRoo", g: 0.45, read: 0, raider: [7, 6, 6, 6], moves: M3, flow: "raid", raids: 4,
    goal: { pts: 4, maxCaught: 2, need: { kick: 2 } }, stars: [S("bonus", 1, "Land a bonus hop"), S("noCaught", 0, "Never get caught")],
  },
  {
    id: 44, ch: 4, name: "Season Final", type: "Full Match", role: "boss", theme: "Auction Hall",
    intro: [], mech: ["full match", "optional auction", "player roles", "hold specialists", "anchor", "cover", "feints", "defender switch"],
    intent: "Chapter boss: the Season Final as a 2x5 mini-Blitz (~14 raids), with an OPTIONAL pre-match auction — 75 lakh, 7 lots (two Corners, two Covers, two Anchors, one star Raider); buy who you like or nobody, every buy strengthens the squad that plays. Then a Medium franchise that reads your specialists and feints 15%. Aha: the auction is preparation, not a gate — three mid-price defenders cover more slots than one star. Win the match.",
    op: "ATRBRTA", g: 0.45, raider: [7, 6, 6, 6], moves: M3, def: D4, flow: "alt", first: 0, clock: [0, 600], half: 300, purse: 75,
    lots: [
      lot("Raghav Chauhan", "Raider", "o", 25, 30, 55, [8, 7, 8, 6]),
      lot("Firoz Ali", "Corner", "A", 12, 14, 28),
      lot("Gurtej Mann", "Anchor", "K", 18, 20, 36),
      lot("Tenzin Dorje", "Cover", "C", 10, 12, 22),
      lot("Lakshya Joshi", "Corner", "T", 10, 12, 24),
      lot("Mohit Dahiya", "Anchor", "K", 15, 16, 30),
      lot("Yash Kale", "Cover", "C", 8, 8, 18),
    ],
    ai: ai("Franchise captain", 0.45, ["hand", "toe", "bonus"], ["walk", "dash", "dubki"], 1, { bluff: 0.15, k: 2, bonusRate: 0.25 }),
    goal: { margin: 1 }, stars: [S("margin", 4, "Win by 4"), S("margin", 7, "Win by 7")],
  },

  // ═════════════════════ CHAPTER 5 — CONTINENTAL CUP ═════════════════════
  {
    id: 45, ch: 5, name: "Super Raid", type: "Super Challenge", role: "teach", theme: "Continental Cup",
    intro: ["super raid"], mech: ["super raid", "raid clock", "hand touch", "toe touch", "dubki", "thigh-holders"],
    intent: "Teach the Super Raid: three touches in one raid. Three touches take 21 of the 30 seconds and every touch makes the way home harder (depth ×1.7 at three). No scouting in this lesson, so only the route matters. Aha: string the touches along the rookie side first, then decide the way home before the clock runs out. Land a Super Raid within 3 raids.",
    op: "oooToTo", g: 0.45, read: 0, moves: M3, flow: "raid", raids: 3,
    goal: { maxCaught: 3, need: { superRaid: 1 } }, stars: [S("noCaught", 0, "Never get caught"), S("fast", 1, "Super Raid on the first raid")],
  },
  {
    id: 46, ch: 5, name: "Two Defenders, One Chain", type: "Defend Stand", role: "teach", theme: "Continental Cup",
    intro: ["chain tackle"], mech: ["chain tackle", "ankle hold", "thigh hold", "block (defensive wall)", "defender rush"],
    intent: "Teach the Chain Tackle: two adjacent defenders link — strong against every touch and every way home except the Dubki, and a chained raider rarely slips. Aha: two defenders, one chain — chain the pair around his target. Land a chain tackle in 5 raids and concede no more than 3 — one clean chain is the lesson, and a wrong pair costs a point.",
    op: "ooooooo", g: 1, moves: M3, def: D5, flow: "defend", defs: 5,
    ai: ai("Continental raider", 0.5, ["hand", "toe"], ["walk", "dash"], 0),
    goal: { maxOpp: 3, need: { chain: 1 } }, stars: [S("fastD", 2, "Chain him within his first 2 raids"), S("oppMax", 1, "Concede at most 1")],
  },
  {
    id: 47, ch: 5, name: "Last Three Standing", type: "Super Challenge", role: "twist", theme: "Continental Cup",
    intro: [], mech: ["chain tackle", "super tackle", "super raid", "all-out"],
    intent: "Twist: three rookies left in the middle of your mat, no specialists, against a raider who goes for two touches. Any tackle from 3 is a Super Tackle (+2), but a failed tackle on the touch costs two men and brings the all-out close. Aha: let the first touch go and chain him on the way home, when every tackle still counts as Super. Land a Super Tackle within 3 raids, concede no more than 2 — one bad read is survivable, two are not.",
    op: "ooooooo", me: "--ooo--", g: 1, moves: M3, def: D5, flow: "defend", defs: 3,
    ai: ai("Super raider", 0.5, ["hand", "toe"], ["walk", "dash"], 0, { k: 2 }),
    goal: { maxOpp: 2, need: { superTackle: 1 } }, stars: [S("chain", 1, "Super Tackle with a chain"), S("oppMax", 0, "Concede nothing")],
  },
  {
    id: 48, ch: 5, name: "The Cage", type: "Raid Puzzle", role: "teach", theme: "Formation: Cage",
    intro: ["formation theme: Cage", "chain links"], mech: ["formation theme: Cage", "chain links", "dubki", "toe touch", "hand touch"],
    intent: "Teach formation themes with the Cage: two chained pairs (C C) either side of the centre. Walking or dashing home past two chains is held most of the time; the Dubki ducks under both (READ). Aha: in the Cage, the way home is the puzzle. Score 4 in 5 raids — one spare raid to learn the Cage.",
    op: "oCCoCCo", g: 0.55, moves: M3, flow: "raid", raids: 5,
    goal: { pts: 4, maxCaught: 2 }, stars: [S("fast", 4, "Win within 4 raids"), S("noCaught", 0, "Never get caught")],
  },
  {
    id: 49, ch: 5, name: "Pincer", type: "Raid Puzzle", role: "twist", theme: "Formation: Pincer",
    intro: ["formation theme: Pincer"], mech: ["formation theme: Pincer", "thigh-holders", "rusher defenders", "bonus line", "backward kick"],
    intent: "Twist theme, the Pincer: Thigh-holder corners and two Rushers just inside them squeeze the bonus line. The hop is a coin flip (about half held, READ) but a failed hop just ends the raid — while a Kick on a charging R (about 1 in 10 held) is the safe point and the Toe on the rookies (about 1 in 5) beats the T's. Aha: the bonus is worth taking only while all seven stand and only once; after a hop, kick the rushers. Score 4 in 5 raids, any way you like.",
    op: "TRoBoRT", g: 0.5, moves: M3, flow: "raid", raids: 5,
    goal: { pts: 4, maxCaught: 2 }, stars: [S("bonus", 1, "Land a bonus hop"), S("kick", 1, "Score with a kick")],
  },
  {
    id: 50, ch: 5, name: "Third Umpire", type: "Raid Puzzle", role: "teach", theme: "Continental Cup",
    intro: ["DRS review"], mech: ["DRS review", "toe touch", "hand touch", "dubki"],
    intent: "Teach DRS on an easy mat, so the review is the only lesson: rookies with two Thigh-holders. Close touches are called by the referee and the call says how close: 'very tight' calls are wrong almost half the time, 'tight' ones 1 in 5. You have 2 reviews and a failed review is lost. Aha: review the very tight calls, accept the merely tight ones — a review is a resource, not a reflex. Score 4 in 4 raids — one point a raid, so a wrong call you don't review costs the trial.",
    op: "ooToToo", g: 0.5, moves: M3, flow: "raid", raids: 4, drs: 2,
    goal: { pts: 4, maxCaught: 2 }, stars: [S("drsWin", 1, "Win a DRS review"), S("noCaught", 0, "Never get caught")],
  },
  {
    id: 51, ch: 5, name: "Ghost Gate", type: "Ghost Duel", role: "twist", theme: "Formation: Ghost Gate",
    intro: ["ghost gate"], mech: ["ghost gate", "chain tackle", "block (defensive wall)", "ankle hold", "thigh hold", "defender rush"],
    intent: "Twist: defend against a recorded ghost raider. Its 5 raids are known before you start (GHOST PLAN row: a Toe and Dash home, a Hand and walk, a bonus hop, a two-touch raid with a Dubki home, a corner Toe and Dash) and replay exactly — no feints — so the right counter is set up in advance and stops about 15 points more than usual (READ: Thigh v Hand, Ankle v Toe and Dubki, Rush v the hop, Block v the Dash, Chain v the walk). A chain tackle is the 3-star show but it costs two men if it breaks. Aha: a ghost can be solved: plan the perfect counter for each raid. Stop 3 of 5 and concede no more than 5.",
    op: "ooooooo", g: 1, moves: M3, def: D5, flow: "defend", defs: 5, show: { plan: true },
    ai: ai("Ghost raider", 0.62, ["hand", "toe", "bonus"], ["walk", "dash", "dubki"], 0),
    gate: ["toe@1>dash", "hand@3>walk", "bonus>walk", "hand@5,toe@4>dubki", "toe@0>dash"],
    goal: { stops: 3, maxOpp: 5 }, stars: [S("fastD", 4, "Win within his first 4 raids"), S("chain", 1, "Land a chain tackle")],
  },
  {
    id: 52, ch: 5, name: "Diamond", type: "Match", role: "combine", theme: "Formation: Diamond",
    intro: ["formation theme: Diamond"], mech: ["defence reads repeats", "formation theme: Diamond", "super raid", "chain tackle", "rusher defenders", "blocker wall", "thigh-holders"],
    intent: "Combine with the Diamond theme: a Blocker at the point, Rushers on the shoulders, T's behind — and a Medium raider who strings two touches together. No feints here — the test is the shape. Kick the rushers, Dubki the wall, chain his deep raids. 4 raids each, win by 2.",
    op: "oTRBRTo", g: 0.5, moves: M3, def: D5, flow: "alt", first: 0, raids: 4, defs: 4,
    ai: ai("Continental raider", 0.55, ["hand", "toe"], ["walk", "dash", "dubki"], 1, { k: 2 }),
    goal: { margin: 2 }, stars: [S("margin", 4, "Win by 4"), S("superRaid", 1, "Land a Super Raid")],
  },
  {
    id: 53, ch: 5, name: "Ghost Duel: Cage", type: "Ghost Duel", role: "spike", theme: "Formation: Cage",
    intro: ["weekly ladder ghost"], mech: ["ghost duel", "formation theme: Cage", "chain links", "raid depth", "dubki"],
    intent: `Spike: this week's ladder ghost raided the Cage (two chained pairs, T's at the corners) 5 times and scored ${CAGE_GHOST} — the target is on the scoreboard all trial. Beat it (${CAGE_GHOST + 1}+) in 5 raids. The chains make every walk or Dash home a risk, so Dubki home; one point a raid only ties the ghost, so at least one raid must take a greedy second touch, and every touch makes the way home deeper (READ: home after 1 vs after 2). Aha: choose WHICH raid is the greedy one — on the rookie in slot 4 and his chain-link neighbour, then duck home.`,
    op: "TCCoCCT", g: 0.9, moves: M3, flow: "raid", raids: 5, ghost: "cage",
    goal: { ghost: true, maxCaught: 3 }, stars: [S("dubki", 2, "Dubki home twice"), S("noCaught", 0, "Never get caught")],
  },
  {
    id: 54, ch: 5, name: "Fan Zone", type: "Super Challenge", role: "breather", theme: "Continental Cup",
    intro: [], mech: ["super raid", "raid clock", "dubki", "score attack"],
    intent: "Breather with a toy, after the ghost spike: the fan-zone Super Raid booth. A young side (rookies and one T) that never scouts you, three raids, and the crowd wants a Super Raid — three touches in one raid, home before the 30 s clock. Aha: the three-touch route that was a long shot in trial 45 is a show on a soft mat — take the rookies in a line and duck home.",
    op: "oooTooo", g: 0.45, read: 0, moves: M3, flow: "raid", raids: 3,
    goal: { maxCaught: 2, need: { superRaid: 1 } }, stars: [S("fast", 1, "Super Raid on the first raid"), S("noCaught", 0, "Never get caught")],
  },
  {
    id: 55, ch: 5, name: "Continental Semi-Final", type: "Full Match", role: "boss", theme: "Continental Cup",
    intro: ["half-time reversal"], mech: ["full match", "chain tackle", "super raid", "DRS review", "formation theme: Cage", "ankle-catchers", "feints", "mid-match reversal"],
    intent: "Chapter boss: the Continental Semi-Final as a Blitz (2x10), joined at 5:00 already 4-6 down (~21 raids). First half they defend in the Cage (two chained pairs: walking or dashing home past them is the risk, the Dubki ducks under). At half-time their coach reverses it: an Ankle Line (four Ankle-catchers with two Thigh-holders) that reads the Dubki and the Toe, so the Hand on an A and the Dash home come back — and the T's still punish the walk. Their raider feints 15% and takes two touches (chain the return). One DRS review. Aha: the half-time whistle changes the answer — the move that won the first half loses the second. Win the match.",
    op: "oCCoCCo", g: 0.45, moves: M3, def: D5, flow: "alt", first: 0, clock: [300, 1200], half: 600, score: [4, 6], drs: 1, raider: [7, 6, 6, 6],
    moment: { atHalf: true, kind: "reversal", text: "HALF-TIME REVERSAL! They drop the Cage for an Ankle Line — four Ankle-catchers read the Dubki and the Toe.", op: "ATAoATA" },
    ai: ai("Continental captain", 0.5, ["hand", "toe", "bonus"], ["walk", "dash", "dubki"], 1, { k: 2, bluff: 0.15, bonusRate: 0.2 }),
    goal: { margin: 1 }, stars: [S("margin", 4, "Win by 4"), S("drsWin", 1, "Win a DRS review")],
  },

  // ═════════════════════ CHAPTER 6 — WORLD CHAMPIONSHIP ═════════════════════
  {
    id: 56, ch: 6, name: "Rotation", type: "Match", role: "teach", theme: "World Championship",
    intro: ["fatigue", "raider rotation"], mech: ["fatigue", "raider rotation", "chain tackle", "super raid", "dubki"],
    intent: "Teach fatigue: your star raider Veer (reach 8) tires after two raids (stamina 3); Kabir (reach 6, stamina 8) can go all day. A tired raider reaches less and is held more. Aha: rotate — the star for the big raids, the workhorse in between. 6 raids each, win by 3.",
    op: "oTRBRTo", g: 0.5, moves: M3, def: D5, flow: "alt", first: 0, raids: 6, defs: 6, fatigue: true,
    raiders: [{ name: "Veer", st: [8, 7, 7, 3] }, { name: "Kabir", st: [6, 6, 5, 8] }],
    ai: ai("World raider", 0.5, ["hand", "toe"], ["walk", "dash", "dubki"], 1, { k: 2 }),
    goal: { margin: 3 }, stars: [S("margin", 5, "Win by 5"), S("noCaught", 0, "Never get caught")],
  },
  {
    id: 57, ch: 6, name: "Iron Anchor", type: "Raid Puzzle", role: "teach", theme: "World Championship",
    intro: ["rival captain"], mech: ["rival captain", "backward kick", "ankle-catchers", "thigh-holders", "dubki"],
    intent: "Teach rival captains: five on their mat (so the bonus line is dead) and their captain K anchors the centre — every move near him is dangerous and he guards every way home. His one weakness: he chases, so a Backward Kick on him is the safest touch on the mat (READ k on slot 4), and the kick tags him out of the way home too. Aha: kick the captain, don't avoid him. Score 4 in 5 raids.",
    op: "-TAKAT-", kWeak: "kick", g: 0.5, moves: M3, flow: "raid", raids: 5,
    goal: { pts: 4, maxCaught: 2 }, stars: [S("kick", 1, "Score with a kick on the captain"), S("noCaught", 0, "Never get caught")],
  },
  {
    id: 58, ch: 6, name: "Dubki King", type: "Defend Stand", role: "teach", theme: "World Championship",
    intro: ["rival raider signature"], mech: ["rival raider signature", "ankle hold", "chain tackle", "block (defensive wall)", "thigh hold"],
    intent: "Rival raider: the Dubki King always ducks home — under thighs, chains and walls. Only the Ankle Hold reads the dubki — the best answer on the board (READ). Aha: a signature move is a promise — let the touch go and ankle him on the way home. Stop 3 of 6 and concede no more than 4.",
    op: "ooooooo", g: 1, moves: M3, def: D5, flow: "defend", defs: 6,
    ai: ai("The Dubki King", 0.5, ["hand", "toe"], ["dubki"], 2, { k: 2 }),
    goal: { stops: 3, maxOpp: 4 }, stars: [S("fastD", 4, "Win within his first 4 raids"), S("oppMax", 1, "Concede at most 1")],
  },
  {
    id: 59, ch: 6, name: "Feint Master", type: "Defend Stand", role: "twist", theme: "World Championship",
    intro: [], mech: ["feints", "feint tell", "rival raider signature", "chain tackle", "anchor", "ankle hold"],
    intent: "Twist on rival raiders: the Feint Master feints 1 raid in 5 and, like every feinter since trial 37, has a tell: on 3 of 4 feints his hips turn before the shown move and the telegraph flickers (FEINT? on screen) — then the shown move is a lie. With no tell, the telegraph is true about 19 times in 20. Your Anchor stands between two Covers, so a chain through the centre is strong whichever touch is real, and the Ankle covers both his Dash and his Dubki home. Aha: read the tell — trust a clean telegraph, and against a flicker use the move that has no weakness. Stop 3 of his 6 raids, concede no more than 3.",
    op: "ooooooo", me: "ooCKCoo", g: 1, moves: M3, def: D5, flow: "defend", defs: 6,
    ai: ai("The Feint Master", 0.5, ["hand", "toe"], ["walk", "dash", "dubki"], 1, { bluff: 0.2, tell: 0.75 }),
    goal: { stops: 3, maxOpp: 3 }, stars: [S("fastD", 4, "Win within his first 4 raids"), S("chain", 2, "Two chain tackles")],
  },
  {
    id: 60, ch: 6, name: "Endurance", type: "Match", role: "combine", theme: "World Championship",
    intro: [], mech: ["defence reads repeats", "fatigue", "raider rotation", "rival captain", "backward kick", "chain tackle", "dubki", "mid-match reversal"],
    intent: "Combine fatigue with a reversal: the last 10 minutes of a group match (~14 raids), 16-18 down, with three raiders to rotate (one star, two workhorses) against a mat anchored by a rival captain weak to the Toe Touch, with rookies either side of him so his Toe gem is the safest on the mat. After 6 raids their captain tires and goes to the bench: a fresh Rusher takes the centre, so the captain's Toe weakness is gone and the Kick on the charging R becomes the centre's safe touch. Aha: rest the star for the raids after the swap, and re-read the centre when the captain leaves. Win by 1.",
    op: "RToKoTR", kWeak: "toe", g: 0.5, moves: M3, def: D5, flow: "alt", first: 0, clock: [1800, 2400], score: [16, 18], read: 0.25, fatigue: true,
    moment: { at: 6, kind: "reversal", text: "Their captain is tired and goes to the bench — a fresh Rusher takes the centre.", op: "RToRoTR" },
    raiders: [{ name: "Veer", st: [8, 7, 7, 3] }, { name: "Kabir", st: [6, 6, 5, 8] }, { name: "Dev", st: [6, 7, 6, 6] }],
    ai: ai("World raider", 0.5, ["hand", "toe", "bonus"], ["walk", "dash", "dubki"], 1, { k: 2, bluff: 0.15, tell: 0.5, bonusRate: 0.2 }),
    goal: { margin: 1 }, stars: [S("margin", 3, "Win by 3"), S("noCaught", 0, "Never get caught")],
  },
  {
    id: 61, ch: 6, name: "Captain's Cage", type: "Raid Puzzle", role: "combine", theme: "Formation: Cage",
    intro: [], mech: ["rival captain", "formation theme: Cage", "chain links", "dubki", "dash home", "backward kick", "super raid"],
    intent: "Combine: a half-Cage with a rival captain at its hinge — a chained pair on the left, the captain in the centre, two T's on the right. Two ways home compete (READ): the Dubki ducks under the chain and the T's but not the captain; the Dash is the captain's weakness (he cannot turn) but runs into the chain. And the answer moves: every chain link you put out breaks the chain for the next raid, so the Dash gets safer raid by raid. Aha: there is no fixed answer — re-price the way home after every raid. Score 4 in 6 raids; a Super Raid is the 3-star swing.",
    op: "oCCKTTo", kWeak: "dash", g: 0.5, moves: M3, flow: "raid", raids: 6,
    goal: { pts: 4, maxCaught: 2 }, stars: [S("superRaid", 1, "Land a Super Raid"), S("noCaught", 0, "Never get caught")],
  },
  {
    id: 62, ch: 6, name: "Night Wall", type: "Match", role: "combine", theme: "Formation: Wall",
    intro: ["formation theme: Wall"], mech: ["formation theme: Wall", "rival captain", "blocker wall", "defence reads repeats", "chain tackle"],
    intent: "Combine with the Wall theme: four Blockers link arms on the midline around a captain weak to the Toe Touch, with rookies beside him, against a Medium raider who never feints. The Dash gem is drawn WALLED — it is legal but the wall eats it (READ) — so the way home is the walk or the Dubki, and the Wall reads the one you used last raid (SCOUTED). The Dubki is the low-% way home (READ) — and exactly the move they scout, so after a Dubki raid the walk becomes the better price for one raid; the walk deepens fast after two touches. Aha: alternate the way home and keep the walk for single-touch raids right after a scouted Dubki. Joined at 9-11 down, 5 raids each, win by 1.",
    op: "BBoKoBB", kWeak: "toe", g: 0.5, read: 0.3, moves: M3, def: D5, flow: "alt", first: 0, raids: 5, defs: 5, score: [9, 11], show: { wall: true },
    ai: ai("World raider", 0.55, ["hand", "toe"], ["walk", "dash", "dubki"], 1, { k: 2 }),
    goal: { margin: 1 }, stars: [S("margin", 3, "Win by 3"), S("noCaught", 0, "Never get caught")],
  },
  {
    id: 63, ch: 6, name: "Lap of Honour", type: "Super Challenge", role: "breather", theme: "World Championship",
    intro: [], mech: ["chain tackle", "cover", "anchor", "score attack"],
    intent: "Breather with a toy before the last push: the legends' lap of honour. A slow veterans' raider (Easy, no feints) walks into your Anchor and two Covers; the crowd wants a Chain Tackle — land 1 in his 4 raids and concede no more than 1 (a chain inside his first 2 raids is the show-off star). The cost: a broken chain lets him tag both links, so a wild chain far from his target is worse than a plain Thigh Hold. Aha: a chain is two men, one tackle — link the pair either side of his target and let the Covers do the lifting.",
    op: "ooooooo", me: "ooCKCoo", g: 1, moves: M3, def: D5, flow: "defend", defs: 4,
    ai: ai("Veteran raider", 0.25, ["hand", "toe"], ["walk"], 0),
    goal: { maxOpp: 1, need: { chain: 1 } }, stars: [S("fastD", 2, "Chain him within his first 2 raids"), S("oppMax", 0, "Concede nothing")],
  },
  {
    id: 64, ch: 6, name: "Last Stand", type: "Revival Run", role: "spike", theme: "World Championship",
    intro: [], mech: ["revival", "super tackle", "all-out", "chain tackle", "rival captain", "Hard CPU"],
    intent: "Spike: the last 7 minutes of a world group decider (~10 raids), 24-25 down with only 4 on the mat. One more man out and every tackle becomes a Super Tackle (+2); every point you score revives a team-mate, so a kick on their captain (his weakness) plus one Super Tackle turns it. Trail by 9 and it's over. Win by 1.",
    op: "oTAKATo", kWeak: "kick", me: "-ooKo--", g: 0.45, moves: M3, def: D5, flow: "alt", first: 0, clock: [1980, 2400], score: [24, 25],
    ai: ai("World raider", 0.5, ["hand", "toe"], ["walk", "dash", "dubki"], 2, { k: 2, bluff: 0.15 }),
    goal: { margin: 1, maxTrail: 9 }, stars: [S("margin", 3, "Win by 3"), S("superTackle", 1, "Land a Super Tackle")],
  },
  {
    id: 65, ch: 6, name: "Champion's Gauntlet", type: "Comeback", role: "spike", theme: "World Championship",
    intro: [], mech: ["fatigue", "raider rotation", "rival captain", "feints", "backward kick", "chain tackle"],
    intent: "Spike: the last 10 minutes of the World semi-final (~15 raids), 18-19 down, against the champions' feinting raider (1 in 5, half of them with the tell) and a captain weak to the Kick, with two raiders to rotate. No DRS and only light scouting — the test is fatigue and the feint read. Fatigue is the clock inside the clock: Veer is the better raider but tires, Kabir never does; the Kick on the captain is the lowest-% held touch on the mat but it lands only about 2 times in 3 (a miss is an empty raid, READ). Aha: spend the star only where the captain's Kick weakness pays, and save a fresh Veer for the last three raids. Win by 1.",
    op: "RTAKATR", kWeak: "kick", g: 0.48, moves: M3, def: D5, flow: "alt", first: 0, clock: [1800, 2400], score: [18, 19], read: 0.15, fatigue: true,
    raiders: [{ name: "Veer", st: [8, 7, 7, 6] }, { name: "Kabir", st: [6, 6, 5, 8] }],
    ai: ai("Champion raider", 0.55, ["hand", "toe", "bonus"], ["walk", "dash", "dubki"], 2, { k: 2, bluff: 0.2, tell: 0.5, bonusRate: 0.2 }),
    goal: { margin: 1 }, stars: [S("margin", 4, "Win by 4"), S("kick", 2, "Score with 2 Kicks")],
  },
  {
    id: 66, ch: 6, name: "World Final", type: "Full Match", role: "boss", theme: "World Championship",
    intro: [], mech: ["full match", "rival captain", "rival raider signature", "feints", "feint tell", "fatigue", "raider rotation", "chain tackle"],
    intent: "Final boss, a mastery test of three things only, as a World Final Blitz of 2x6 game minutes, joined at 1:00 already 0-2 down after their captain's opening two-touch raid (~15 raids): (1) their captain anchors a Pincer-Cage mat and is weak to the Kick, (2) their raider is the Feint Master (1 feint in 4) — and in the final he hides his tell better than in trial 59: only half his feints flicker who goes for two touches, (3) you rotate three raiders through fatigue. No DRS, light scouting. Aha: the final asks for the chapter lessons in one match — kick the captain, trust a clean telegraph and chain the pair around his target, save a fresh Veer for the closing raids. Win by 1 — from 0-2 that is a three-point swing: a final is won, not survived.",
    op: "ACRKRCA", kWeak: "kick", g: 0.45, read: 0.15, moves: M3, def: D5, flow: "alt", first: 0, clock: [60, 720], half: 360, score: [0, 2], fatigue: true,
    raiders: [{ name: "Veer", st: [8, 7, 7, 4] }, { name: "Kabir", st: [6, 6, 5, 8] }, { name: "Dev", st: [6, 7, 6, 6] }],
    ai: ai("World captain", 0.55, ["hand", "toe", "bonus"], ["walk", "dash", "dubki"], 2, { k: 2, bluff: 0.25, tell: 0.5, bonusRate: 0.2 }),
    goal: { margin: 1 }, stars: [S("margin", 4, "Win by 4"), S("chain", 2, "Two chain tackles")],
  },
];

/** Quick Match / Tournament / Championship opponents (outside the campaign): Full 2x20 or Blitz 2x10, three CPU levels. */
const quick = (id: number, name: string, level: 0 | 1 | 2, blitz: boolean): UnitDef => ({
  id, ch: 0, name, type: "Quick Match", role: "practise", theme: "Quick Match", intro: [], mech: ["full match"],
  intent: `${["Easy", "Medium", "Hard"][level]} CPU ${blitz ? "Blitz 2x10" : "Full 2x20"} quick match.`,
  op: ["oTToTTo", "ATTBTTA", "ACRKRCA"][level], kWeak: level === 2 ? "kick" : undefined, g: [1.5, 1.35, 1.6][level],
  moves: M3, def: D5, flow: "alt", first: 0, clock: [0, blitz ? 1200 : 2400], half: blitz ? 600 : 1200,
  ai: [
    ai("Easy CPU", 0.6, ["hand", "toe", "bonus"], ["walk", "dash", "dubki"], 0, { k: 2, bonusRate: 0.2 }),
    ai("Medium CPU", 0.6, ["hand", "toe", "bonus", "kick"], ["walk", "dash", "dubki"], 1, { k: 2, bluff: 0.1, bonusRate: 0.2 }),
    ai("Hard CPU", 0.7, ["hand", "toe", "bonus", "kick"], ["walk", "dash", "dubki"], 2, { k: 3, bluff: 0.25, bonusRate: 0.2 }),
  ][level],
  goal: { margin: 1 }, stars: [S("margin", 5, "Win by 5"), S("margin", 10, "Win by 10")],
});
export const MODES: Record<string, UnitDef> = {
  quick_easy: quick(101, "Quick Match · Easy", 0, false),
  quick_medium: quick(102, "Quick Match · Medium", 1, false),
  quick_hard: quick(103, "Quick Match · Hard", 2, false),
  blitz_easy: quick(111, "Blitz · Easy", 0, true),
  blitz_medium: quick(112, "Blitz · Medium", 1, true),
  blitz_hard: quick(113, "Blitz · Hard", 2, true),
};
/** Campaign units first (index = trial number - 1), then the quick-match modes. */
export const ALL_UNITS: UnitDef[] = [];
export const modeIndex = (key: keyof typeof MODES | string) => UNITS.length + Object.keys(MODES).indexOf(key);

// Measured tuning (scripts/tune-units.ts): opponent grip, CPU raider skill, purse.
for (const u of UNITS) {
  const t = (TUNING as Record<string, { g?: number; s?: number; w?: number; purse?: number }>)[String(u.id)];
  if (!t) continue;
  if (t.g !== undefined) u.g = t.g;
  if (t.s !== undefined && u.ai) u.ai = { ...u.ai, s: t.s };
  if (t.purse !== undefined) u.purse = t.purse;
  if (t.w !== undefined) u.w = t.w;
}
ALL_UNITS.push(...UNITS, ...Object.values(MODES));
