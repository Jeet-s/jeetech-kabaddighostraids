/**
 * The campaign: 66 handcrafted Raid Trials in 6 chapters (docs/CONTENT.md is the design plan — keep both in step).
 * Tuning numbers (g = opponent grip, ai.s = CPU raider skill) were set by measuring with the bot playtesters
 * (scripts/tune-units.ts); everything else is designed by hand.
 */
import type { AIRaider, Lot, UnitDef } from "./types";
import TUNING from "./tuning.json";

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
    intent: "Five Thigh-holders fill the middle; only the corners are rookies. Walking home past five T's is a coin flip, a Dash bursts past their slow reach. Aha: touch a corner, then Dash, never walk. 3 points in 5 raids.",
    op: "oTTTTTo", g: 0.3, moves: M1D, flow: "raid", raids: 5,
    goal: { pts: 3, maxCaught: 2 }, stars: [S("noCaught", 0, "Never get caught"), S("pts", 4, "Score 4 points")],
  },
  {
    id: 4, ch: 1, name: "Hold the Line", type: "Defend Stand", role: "teach", theme: "Village Mat",
    intro: ["defender select", "ankle hold", "tackle ring"], mech: ["ankle hold", "tackle ring", "cover position"],
    intent: "First defence. The village raider only Toe Touches; select the defender next to his target and Ankle Hold on the ring. Tapping Hold (no tackle) gifts him the touch. Stop 2 of his 4 raids, concede no more than 3.",
    op: "ooooooo", g: 1, w: 1.1, moves: M1D, def: D1, flow: "defend", defs: 4,
    ai: ai("Village raider", 0.25, ["toe"], ["walk"], 0),
    goal: { stops: 2, maxOpp: 3 }, stars: [S("stops", 3, "Stop 3 raids"), S("oppMax", 1, "Concede at most 1")],
  },
  {
    id: 5, ch: 1, name: "Match the Hold", type: "Defend Stand", role: "teach", theme: "Village Mat",
    intro: ["thigh hold"], mech: ["ankle hold", "thigh hold", "tackle ring", "read the raider's move"],
    intent: "The raider now mixes Hand Touches and Toe Touches and his move is telegraphed. Ankle Hold beats a Toe Touch, Thigh Hold beats a Hand Touch — the wrong hold fails 3 times in 4. Aha: match the hold to the move. Stop 3 of 5.",
    op: "ooooooo", g: 1, w: 1.05, moves: M1D, def: D2, flow: "defend", defs: 5,
    ai: ai("Village raider", 0.3, ["hand", "toe"], ["walk"], 0),
    goal: { stops: 3, maxOpp: 4 }, stars: [S("stops", 4, "Stop 4 raids"), S("oppMax", 2, "Concede at most 2")],
  },
  {
    id: 6, ch: 1, name: "Cover Tackle", type: "Defend Stand", role: "twist", theme: "Village Mat",
    intro: ["return tackle", "cover position"], mech: ["ankle hold", "thigh hold", "cover position", "return tackle"],
    intent: "Twist: the raider now Dashes home after his touch. The touched man tackles at 82% of full strength, his cover beside him at full strength, two away at about half; on the way home an Ankle Hold beats a Dash, a Thigh Hold beats a walk (READ: best stops ~57% on the touch, 44-48% going home). Aha: let the cover make the tackle, and keep a second chance for the return. Stop 3 of 5.",
    op: "ooooooo", g: 1, w: 1, moves: M1D, def: D2, flow: "defend", defs: 5,
    ai: ai("Village raider", 0.35, ["hand", "toe"], ["walk", "dash"], 0),
    goal: { stops: 3, maxOpp: 5 }, stars: [S("stops", 4, "Stop 4 raids"), S("oppMax", 2, "Concede at most 2")],
  },
  {
    id: 7, ch: 1, name: "Grip and Rip", type: "Raid Puzzle", role: "teach", theme: "Village Mat",
    intro: ["struggle (pull-away)"], mech: ["hand touch", "dash home", "struggle (pull-away)", "thigh-holders"],
    intent: "Five Thigh-holders with strong grips around one rookie: even good raids get held here. Held raiders play the struggle — the pull-away breaks free about half the time, and the defender holding you counts as touched when you do. Aha: a hold is not the end — keep raiding the rookie gap and rip loose when grabbed. Score 3 in 5 raids; caught 3 times and it's over.",
    op: "TToToTT", g: 0.65, moves: M1D, flow: "raid", raids: 5,
    goal: { pts: 3, maxCaught: 3 }, stars: [S("escapes", 1, "Break free from a hold"), S("noCaught", 0, "Never tackled out")],
  },
  {
    id: 8, ch: 1, name: "Village Fair", type: "Match", role: "breather", theme: "Village Mat",
    intro: ["raid and defend in turns"], mech: ["hand touch", "dash home", "ankle hold", "thigh hold", "alternating raids"],
    intent: "Breather and the first real match flow: 3 raids each against a gentle village side (one Thigh-holder, a Hand-Touch-only raider). The sides swap after every raid — the referee panel calls 'your raid' / 'defend' — so the lesson is the rhythm: score, then stop him straight back. Win the segment by 1; 3 stars for winning by 4.",
    op: "oooTooo", g: 0.45, moves: M1D, def: D2, flow: "alt", first: 0, raids: 3, defs: 3,
    ai: ai("Fair raider", 0.2, ["hand"], ["walk"], 0),
    goal: { margin: 1 }, stars: [S("margin", 3, "Win by 3"), S("margin", 4, "Win by 4")],
  },
  {
    id: 9, ch: 1, name: "Two-Way Duel", type: "Match", role: "combine", theme: "Village Mat",
    intro: [], mech: ["hand touch", "dash home", "ankle hold", "thigh hold", "return tackle", "thigh-holders"],
    intent: "Combine both halves of chapter 1: T's guard both corners and the centre, so raid the gaps and Dash home; their raider mixes Hand/Toe and walks or Dashes, so match the hold and use the cover. 4 raids each; win by 2.",
    op: "TooToTo", g: 0.5, moves: M1D, def: D2, flow: "alt", first: 0, raids: 4, defs: 4,
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
    intro: ["full 2x20 match", "half-time swap"], mech: ["hand touch", "dash home", "struggle (pull-away)", "ankle hold", "thigh hold", "full match"],
    intent: "Chapter boss and the first whole match: the Village Final as a Blitz (2x10 game minutes, ~14 raids each, half-time swap). Everything from chapter 1 — raid the gaps, Dash past T's, match the hold — over a match where the score swings and all-outs and revivals happen for real. Win the match.",
    op: "oTToTTo", g: 0.4, moves: M1D, def: D2, flow: "alt", first: 0, clock: [0, 1200], half: 600,
    ai: ai("Village captain", 0.35, ["hand", "toe"], ["walk", "dash"], 0, { k: 2 }),
    goal: { margin: 1 }, stars: [S("margin", 6, "Win by 6"), S("margin", 12, "Win by 12")],
  },

  // ═════════════════════ CHAPTER 2 — DISTRICT CUP ═════════════════════
  {
    id: 12, ch: 2, name: "Long Reach", type: "Raid Puzzle", role: "teach", theme: "District Cup",
    intro: ["toe touch"], mech: ["toe touch", "hand touch", "dash home", "thigh-holders"],
    intent: "Seven Thigh-holders and no gap at all. A Hand Touch into a T gets you held about 1 time in 5, the Toe Touch's long low reach only 3% (see READ). Aha: change the move, not the target. 3 points in 4 raids.",
    op: "TTTTTTT", g: 0.4, moves: M2T, flow: "raid", raids: 4,
    goal: { pts: 3, maxCaught: 2 }, stars: [S("noCaught", 0, "Never get caught"), S("pts", 5, "Score 5 points")],
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
    intent: "Four Blockers (B) form a wall on the midline: Dash home into them and you are held most of the time (READ). The Dubki ducks under their arms and the T's reach. Aha: dubki under a reach. Score 3 points with at least one Dubki or Toe Touch scoring.",
    op: "TBBoBBT", g: 0.45, moves: M2, flow: "raid", raids: 4,
    goal: { pts: 3, maxCaught: 2, need: { lowMove: 1 } }, stars: [S("dubki", 2, "Score with Dubki twice"), S("noCaught", 0, "Never get caught")],
  },
  {
    id: 15, ch: 2, name: "Build the Wall", type: "Defend Stand", role: "teach", theme: "District Cup",
    intro: ["block (defensive wall)"], mech: ["block (defensive wall)", "ankle hold", "thigh hold", "return tackle"],
    intent: "The district raider always Dashes home. Let the touch go and form the Block on the midline (the best stop vs his Dash, see READ), or Ankle him — a Thigh Hold on a Dash mostly fails. Aha: defend the way home, not the touch. Stop 3 of 5.",
    op: "ooooooo", g: 1, w: 1, moves: M2, def: D3, flow: "defend", defs: 5,
    ai: ai("District sprinter", 0.45, ["hand", "toe"], ["dash"], 0),
    goal: { stops: 3, maxOpp: 5 }, stars: [S("stops", 4, "Stop 4 raids"), S("oppMax", 2, "Concede at most 2")],
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
    id: 17, ch: 2, name: "Their Do-or-Die", type: "Do-or-Die Drill", role: "twist", theme: "District Cup",
    intro: ["do-or-die raid"], mech: ["do-or-die raid", "ankle hold", "thigh hold", "block (defensive wall)"],
    intent: "Twist: THEIR raider is on 2 empty raids, so his first raid is Do-or-Die: he cannot play safe and must touch someone, so his telegraphed move is always a real attempt. Tackle the touch with the matching hold (Thigh on a Hand, Ankle on a Toe) — 'Hold' just hands him the point he needs. Aha: a Do-or-Die raider is predictable, so punish it. Stop 2 of his 4 raids, concede no more than 4.",
    op: "ooooooo", g: 1, w: 1.1, moves: M2, def: D3, flow: "defend", defs: 4, empty: [0, 2],
    ai: ai("Desperate raider", 0.38, ["hand", "toe"], ["walk", "dash"], 0),
    goal: { stops: 2, maxOpp: 4 }, stars: [S("stops", 3, "Stop 3 raids"), S("oppMax", 1, "Concede at most 1")],
  },
  {
    id: 18, ch: 2, name: "Do-or-Die", type: "Do-or-Die Drill", role: "teach", theme: "District Cup",
    intro: [], mech: ["do-or-die raid", "toe touch", "hand touch", "dubki", "ankle-catchers", "blocker wall"],
    intent: "Two empty raids already: your next raid is Do-or-Die and an empty return puts you out. Ankle-catchers on the corners, a Blocker wall in the middle. The wall shuts the Dash home and the corner A's read the Dubki, so the safe way back is a plain walk (READ). Aha: in a Do-or-Die take the one SAFE touch (Hand on an A, walk home), never the greedy second. Win the Do-or-Die raid and score 2 in 3 raids; out twice and it's over.",
    op: "AoBBBoA", g: 0.55, moves: M2, flow: "raid", raids: 3, empty: [2, 0],
    goal: { pts: 2, maxCaught: 2, need: { dodWin: 1 } }, stars: [S("pts", 4, "Score 4 points"), S("noCaught", 0, "Never get caught")],
  },
  {
    id: 19, ch: 2, name: "Bonus Line", type: "Raid Puzzle", role: "teach", theme: "District Cup",
    intro: ["bonus line"], mech: ["bonus line", "toe touch", "hand touch", "dubki", "thigh-holders"],
    intent: "Teach the bonus line: with 6+ defenders on the mat a hop over the bonus line scores 1 and puts nobody out. Rookie corners make the hop safe. Aha: bonus first — every touch puts a man out and below 6 the bonus line is dead. Earn 2 bonus points and 4 points total in 4 raids.",
    op: "oTToTTo", g: 0.45, moves: M2B, flow: "raid", raids: 4,
    goal: { pts: 4, maxCaught: 2, need: { bonus: 2 } }, stars: [S("bonus", 3, "Earn 3 bonus points"), S("noCaught", 0, "Never get caught")],
  },
  {
    id: 20, ch: 2, name: "One-Point Thriller", type: "Do-or-Die Drill", role: "spike", theme: "District Cup",
    intro: [], mech: ["do-or-die raid", "bonus line", "toe touch", "dubki", "block (defensive wall)", "ankle-catchers"],
    intent: "Spike: level at 13-13 with 3 raids each left, and you are on 2 empty raids — your first raid is Do-or-Die. Ankle-catchers guard the corners (so the bonus hop is dangerous) and their raider goes for the bonus and two-touch raids. Win by 1.",
    op: "ATTBTTA", g: 0.5, moves: M2B, def: D3, flow: "alt", first: 0, raids: 3, defs: 3, score: [13, 13], empty: [2, 1],
    ai: ai("District star", 0.45, ["hand", "toe", "bonus"], ["walk", "dash", "dubki"], 0, { k: 2, bonusRate: 0.3 }),
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
    intent: "Chapter boss with a Do-or-Die finish: the second half of the District Final, two down at 12-14 from 20:00 (~14 raids each). A, T and B defenders and a raider who hops the bonus and Dubkis home; Do-or-Die is live on both sides, so the empty raids you spend early decide who is forced at the end. Win the match.",
    op: "ATTBTTA", g: 0.45, moves: M2B, def: D3, flow: "alt", first: 0, clock: [1200, 2400], score: [12, 14],
    ai: ai("District captain", 0.42, ["hand", "toe", "bonus"], ["walk", "dash", "dubki"], 0, { k: 2, bonusRate: 0.25 }),
    goal: { margin: 1 }, stars: [S("margin", 5, "Win by 5"), S("margin", 10, "Win by 10")],
  },

  // ═════════════════════ CHAPTER 3 — STATE LEAGUE ═════════════════════
  {
    id: 23, ch: 3, name: "Rushers", type: "Raid Puzzle", role: "teach", theme: "State League",
    intro: ["backward kick", "rusher defenders"], mech: ["backward kick", "rusher defenders", "hand touch", "toe touch", "dash home"],
    intent: "Teach the Backward Kick: Rushers (R) charge the raider and hold about a third of Hand or Toe Touches near them, but a Backward Kick tags a charging R at a fraction of that risk (READ). Aha: let the rusher come to you. Score 2 Kicks and 3 points in 4 raids.",
    op: "RoRoRoR", g: 0.5, moves: M3K, flow: "raid", raids: 4,
    goal: { pts: 3, maxCaught: 2, need: { kick: 2 } }, stars: [S("kick", 3, "Score with 3 kicks"), S("noCaught", 0, "Never get caught")],
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
    goal: { stops: 2, maxOpp: 3 }, stars: [S("stops", 3, "Stop 3 raids"), S("oppMax", 1, "Concede at most 1")],
  },
  {
    id: 26, ch: 3, name: "Super Tackle", type: "Super Challenge", role: "teach", theme: "State League",
    intro: ["super tackle"], mech: ["super tackle", "all-out", "ankle hold", "thigh hold", "block (defensive wall)", "defender rush"],
    intent: "Teach the Super Tackle: you have only 3 on the mat, so any tackle is worth 2 — but he goes for two touches, and lose all 3 and the all-out gives them +2. Aha: three defenders are a threat, not a weakness. Land a Super Tackle within 3 raids and concede no more than 1.",
    op: "ooooooo", me: "oo---o-", g: 1, moves: M3, def: D4, flow: "defend", defs: 3,
    ai: ai("State raider", 0.4, ["hand", "toe"], ["walk", "dash"], 1, { k: 2 }),
    goal: { maxOpp: 1, need: { superTackle: 1 } }, stars: [S("superTackle", 2, "Two Super Tackles"), S("oppMax", 1, "Concede at most 1")],
  },
  {
    id: 27, ch: 3, name: "Turn the Raid", type: "Match", role: "twist", theme: "State League",
    intro: ["defence reads repeats"], mech: ["defence reads repeats", "backward kick", "rusher defenders", "revival", "thigh-holders", "ankle hold", "thigh hold", "defender rush"],
    intent: "Twist: state sides scout you — a touch move or way home you used on your previous raid is now read and punished, so the safe Kick can't be your every raid. You are down to 5 on the mat and their Rushers sit beside Thigh-holders: alternate the Kick on a charging R with a Toe on a T and vary the way home; every point revives a team-mate, and drop to 3 and you fail. Score with a Backward Kick and win the 4-raid segment by 1.",
    op: "oRTRToR", me: "o--oooo", g: 0.55, moves: M3, def: D4, flow: "alt", first: 0, raids: 4, defs: 3,
    ai: ai("State raider", 0.42, ["hand", "toe"], ["walk", "dash"], 0),
    goal: { margin: 1, minMat: 4, need: { kick: 1 } }, stars: [S("fullSide", 0, "Finish with all 7"), S("kick", 2, "Score with 2 kicks")],
  },
  {
    id: 28, ch: 3, name: "All Out!", type: "Super Challenge", role: "teach", theme: "State League",
    intro: ["all-out"], mech: ["all-out", "hand touch", "toe touch", "backward kick", "dubki"],
    intent: "Teach the all-out: only a Thigh-holder and a rookie are left. Touch both out (one greedy 2-touch raid or two clean ones) and the all-out is +2 with their whole side coming back. Aha: finish the job — a lone survivor revives them. Inflict the all-out within 3 raids.",
    op: "--o--T-", g: 0.6, moves: M3, flow: "raid", raids: 3,
    goal: { maxCaught: 2, need: { allOut: 1 } }, stars: [S("fast", 1, "All-out in one raid"), S("noCaught", 0, "Never get caught")],
  },
  {
    id: 29, ch: 3, name: "The Kicker", type: "Defend Stand", role: "twist", theme: "State League",
    intro: ["CPU backward kick"], mech: ["CPU backward kick", "defender rush", "thigh hold", "ankle hold", "block (defensive wall)"],
    intent: "Twist on the kick: now THEIR raider touches once and Backward-Kicks the defender who chases him — the briefing and the telegraph show a kick coming. No hold stops a kick well, and a Rush into it almost never works, so when the kick is shown, let it go and Block his Dash home (the best stop on the board); when he shows a Hand, Thigh Hold the touch. Aha: never chase a kicker — beat his way home. Stop 3 of 5.",
    op: "ooooooo", g: 1, moves: M3, def: D4, flow: "defend", defs: 5,
    ai: ai("State kicker", 0.45, ["hand", "kick"], ["walk", "dash"], 0, { k: 2 }),
    goal: { stops: 3, maxOpp: 6 }, stars: [S("stops", 4, "Stop 4 raids"), S("oppMax", 3, "Concede at most 3")],
  },
  {
    id: 30, ch: 3, name: "Rush Hour", type: "Match", role: "combine", theme: "State League",
    intro: [], mech: ["defence reads repeats", "backward kick", "rusher defenders", "blocker wall", "dubki", "defender rush", "block (defensive wall)", "bonus line"],
    intent: "Combine chapter 3: a mat of Rushers around a Blocker and two T's, and a raider who hops the bonus or Dashes home. Kick the rushers, Dubki past the wall; Rush his hop, Block his Dash. 4 raids each, win by 2.",
    op: "RTRBRTR", g: 0.5, moves: M3, def: D4, flow: "alt", first: 0, raids: 4, defs: 4,
    ai: ai("State raider", 0.45, ["hand", "toe", "bonus"], ["walk", "dash"], 0, { bonusRate: 0.35 }),
    goal: { margin: 2 }, stars: [S("margin", 4, "Win by 4"), S("noCaught", 0, "Never get caught")],
  },
  {
    id: 31, ch: 3, name: "Revival Run", type: "Revival Run", role: "spike", theme: "State League",
    intro: ["revival"], mech: ["revival", "all-out", "super tackle", "backward kick", "escape lunge", "dubki"],
    intent: "Spike: all out at minute 5 — 5-9 down and only 3 back on the mat. Each point you score revives a team-mate, and with 3 or fewer every tackle is a Super Tackle. Aha: sacrifice greed for revivals — safe single touches rebuild the side. Reach 20:00 within 2 points; trail by 9 and it's over. A Super Tackle from three is the 3-star swing.",
    op: "oTRoBTo", me: "--o-o-o", g: 0.5, moves: M3, def: D4, flow: "alt", first: 0, clock: [900, 1200], score: [5, 9],
    ai: ai("State raider", 0.42, ["hand", "toe"], ["walk", "dash"], 0),
    goal: { margin: -2, maxTrail: 8 }, stars: [S("margin", 0, "Draw level"), S("superTackle", 1, "Land a Super Tackle")],
  },
  {
    id: 32, ch: 3, name: "Floodlight Friendly", type: "Match", role: "breather", theme: "State League",
    intro: [], mech: ["backward kick", "bonus line", "hand touch", "toe touch", "ankle hold", "thigh hold"],
    intent: "Breather after the revival spike: a friendly against a second-string side — two rookies, one rusher to kick, bonus line open. 3 raids each; win by 2, 3 stars for 5.",
    op: "ooRooTo", g: 0.45, moves: M3, def: D4, flow: "alt", first: 0, raids: 3, defs: 3,
    ai: ai("Reserve raider", 0.25, ["hand", "toe"], ["walk"], 0),
    goal: { margin: 2 }, stars: [S("margin", 4, "Win by 4"), S("margin", 5, "Win by 5")],
  },
  {
    id: 33, ch: 3, name: "State Final", type: "Full Match", role: "boss", theme: "State League",
    intro: [], mech: ["full match", "comeback", "revival", "super tackle", "backward kick", "escape lunge", "defender rush", "rusher defenders"],
    intent: "Chapter boss with a comeback: the State Final, joined at 10:00 already 3-9 down after the champions' opening raids. Full mat of Rushers, Blockers and T's; a raider who kicks chasers and hops the bonus. Win the match.",
    op: "RTBoBTR", g: 0.45, moves: M3, def: D4, flow: "alt", first: 0, clock: [600, 2400], score: [3, 9],
    ai: ai("State champion", 0.45, ["hand", "toe", "bonus", "kick"], ["walk", "dash", "dubki"], 1, { k: 2, bonusRate: 0.25 }),
    goal: { margin: 1 }, stars: [S("margin", 4, "Win by 4"), S("margin", 8, "Win by 8")],
  },

  // ═════════════════════ CHAPTER 4 — AUCTION SEASON ═════════════════════
  {
    id: 34, ch: 4, name: "The Auction", type: "Auction", role: "teach", theme: "Auction Hall",
    intro: ["auction", "player roles"], mech: ["auction", "player roles", "purse"],
    intent: "Teach the auction: 6 lots — a star Raider and a cheap one, two Corners, two Anchors — and an 85-lakh purse against AI franchises. The star goes for 45-60, so buying him leaves barely enough for a Corner and an Anchor and nothing for the stars; the budget Raider, a Corner and an Anchor cost about 55. Aha: price the whole squad, not the lot — a lot you pass on has a cheaper twin later. Buy a Raider, a Corner and an Anchor.",
    op: "ooooooo", g: 0.5, moves: M3, def: D4, flow: "auction", purse: 85,
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
    goal: { stops: 3, maxOpp: 5 }, stars: [S("stops", 4, "Stop 4 raids"), S("oppMax", 2, "Concede at most 2")],
  },
  {
    id: 36, ch: 4, name: "The Anchor", type: "Defend Stand", role: "teach", theme: "Auction Hall",
    intro: ["anchor"], mech: ["anchor", "hold specialists", "ankle hold", "thigh hold", "block (defensive wall)"],
    intent: "Teach the Anchor: K in slot 4 adds strength to every hold and his holds rarely slip, so whenever the raider's target is within one slot of him (slots 3-5), tackle with the Anchor whatever the move; at the corners, use the corner specialist only when his hold matches the move, otherwise the defender beside him. Aha: the specialists need the right read, the Anchor just needs to be in range. Stop 3 of 5.",
    op: "ooooooo", me: "AooKooT", g: 1, moves: M3, def: D4, flow: "defend", defs: 5,
    ai: ai("League raider", 0.4, ["hand", "toe"], ["walk", "dash", "dubki"], 0),
    goal: { stops: 3, maxOpp: 5 }, stars: [S("stops", 4, "Stop 4 raids"), S("oppMax", 2, "Concede at most 2")],
  },
  {
    id: 37, ch: 4, name: "Bluff Raider", type: "Defend Stand", role: "twist", theme: "Auction Hall",
    intro: ["feints"], mech: ["feints", "anchor", "hold specialists", "block (defensive wall)", "ankle hold", "thigh hold"],
    intent: "Twist: this raider feints — 35% of the time the telegraphed move is not the real one. Committing to the counter of a feint fails. Aha: against a bluffer use the all-round Anchor, Ankle a Dash home (works on both Dash and Dubki) and let doubtful touches go. Stop 2 of 5, concede no more than 5.",
    op: "ooooooo", me: "AooKooT", g: 1, moves: M3, def: D4, flow: "defend", defs: 5,
    ai: ai("Feinting raider", 0.5, ["hand", "toe"], ["walk", "dash", "dubki"], 0, { bluff: 0.35 }),
    goal: { stops: 2, maxOpp: 5 }, stars: [S("stops", 3, "Stop 3 raids"), S("oppMax", 3, "Concede at most 3")],
  },
  {
    id: 38, ch: 4, name: "Draft Day", type: "Auction", role: "practise", theme: "Auction Hall",
    intro: [], mech: ["auction", "player roles", "hold specialists", "anchor", "alternating raids"],
    intent: "Build the squad, then play it: 7 lots (a star Raider, two Corners, Anchor, Cover, a second Anchor, a budget Raider last) on 100 lakh — enough for the three you need plus one extra if you don't overpay, then a 4-raid league match where YOUR buys defend and YOUR raider's stats raid. Aha: the raider's reach and speed you paid for show up in every touch. Buy a Raider, a Corner and an Anchor, then win by 1.",
    op: "ATBoBTA", g: 0.5, moves: M3, def: D4, flow: "alt", first: 0, raids: 4, defs: 4, purse: 100,
    lots: [
      lot("Arjun Dhillon", "Raider", "o", 20, 25, 45, [8, 6, 7, 6]),
      lot("Manav Kher", "Corner", "T", 15, 15, 30),
      lot("Yash Kale", "Corner", "A", 12, 14, 26),
      lot("Sardar Gill", "Anchor", "K", 20, 20, 36),
      lot("Nikhil Rane", "Cover", "C", 10, 10, 22),
      lot("Kuldeep Negi", "Anchor", "K", 15, 18, 32),
      lot("Rohit Bansal", "Raider", "o", 10, 10, 20, [6, 6, 6, 6]),
    ],
    needRoles: ["Raider", "Corner", "Anchor"],
    ai: ai("League raider", 0.45, ["hand", "toe"], ["walk", "dash"], 1),
    goal: { margin: 1 }, stars: [S("margin", 3, "Win by 3"), S("purse", 10, "Keep 10 lakh in the purse")],
  },
  {
    id: 39, ch: 4, name: "Switch!", type: "Defend Stand", role: "twist", theme: "Auction Hall",
    intro: ["defender switch"], mech: ["defender switch", "hold specialists", "anchor", "ankle hold", "thigh hold", "block (defensive wall)"],
    intent: "Twist: a two-touch raider — after the first touch he turns for a second defender, so the defender in range changes mid-raid. Switch to whoever covers the new target (the tap-select is instant). Aha: defend the raider's NEXT target, not the last one. Stop 2 of 4 and concede no more than 3.",
    op: "ooooooo", me: "AoTKToA", g: 1, moves: M3, def: D4, flow: "defend", defs: 4,
    ai: ai("Two-touch raider", 0.45, ["hand", "toe"], ["walk", "dash"], 1, { k: 2 }),
    goal: { stops: 2, maxOpp: 3 }, stars: [S("stops", 3, "Stop 3 raids"), S("oppMax", 1, "Concede at most 1")],
  },
  {
    id: 40, ch: 4, name: "Specialist Derby", type: "Match", role: "combine", theme: "Auction Hall",
    intro: [], mech: ["defence reads repeats", "hold specialists", "anchor", "feints", "backward kick", "rusher defenders", "blocker wall", "ankle-catchers"],
    intent: "Combine: your specialist squad (A corners, T covers, Anchor) against a full league mat (A, T, B, R) and a Medium raider who feints 15%. Every raid is a read on both ends. 4 raids each, win by 2.",
    op: "ATBRBTA", me: "AToKoTA", g: 0.5, moves: M3, def: D4, flow: "alt", first: 0, raids: 4, defs: 4,
    ai: ai("League star", 0.5, ["hand", "toe"], ["walk", "dash", "dubki"], 1, { bluff: 0.15 }),
    goal: { margin: 2 }, stars: [S("margin", 4, "Win by 4"), S("oppMax", 2, "Concede at most 2")],
  },
  {
    id: 41, ch: 4, name: "Scout's Choice", type: "Auction", role: "combine", theme: "Auction Hall",
    intro: [], mech: ["auction", "hold specialists", "anchor", "ankle hold", "thigh hold", "scouting"],
    intent: "Combine auction and defence: the scouting report says their raider is a Toe-Touch specialist who Dubkis home — both beaten by Ankle holds. The Ankle Corner is the one you want, so the rival franchises bid him up; the Thigh Corner goes cheap and the Anchor sits between. 70 lakh buys the Ankle Corner and an Anchor only if you don't overpay. Aha: buy for the opponent you will face, not the bargain. Buy a Corner and an Anchor, then stop 3 of his 5 raids.",
    op: "ooooooo", g: 1, moves: M3, def: D4, flow: "defend", defs: 5, purse: 70,
    lots: [
      lot("Harpreet Sandhu", "Corner", "T", 8, 10, 18),
      lot("Imran Qureshi", "Corner", "A", 22, 26, 38),
      lot("Bhim Yadav", "Anchor", "K", 16, 18, 30),
    ],
    needRoles: ["Corner", "Anchor"],
    ai: ai("Toe specialist", 0.4, ["toe"], ["dubki"], 0),
    goal: { stops: 3, maxOpp: 5 }, stars: [S("stops", 4, "Stop 4 raids"), S("purse", 10, "Keep 10 lakh in the purse")],
  },
  {
    id: 42, ch: 4, name: "Squad Test", type: "Auction", role: "spike", theme: "Auction Hall",
    intro: [], mech: ["auction", "player roles", "hold specialists", "anchor", "Hard CPU", "feints", "backward kick"],
    intent: "Spike — the first squad-dependent test: a tight 90-lakh purse for 5 lots (a star and a budget Raider, one Corner, two Anchors), then 5 raids each against the league's Hard franchise: its raider is no athlete, but a schemer (Hard brain: he reads your shape, feints 20%, knows the Do-or-Die). The budget Raider plus a Corner and the cheaper Anchor is a winning mid-cost squad; overpaying for both stars is not. Buy a Raider, a Corner and an Anchor, then win by 1.",
    op: "ATRBRTA", g: 0.5, moves: M3, def: D4, flow: "alt", first: 0, raids: 5, defs: 5, purse: 90,
    lots: [
      lot("Devraj Thakur", "Raider", "o", 25, 28, 48, [8, 7, 7, 6]),
      lot("Sunny Bains", "Raider", "o", 12, 12, 24, [5, 5, 6, 6]),
      lot("Zubin Mistry", "Corner", "A", 12, 14, 26),
      lot("Pawan Saini", "Anchor", "K", 18, 20, 34),
      lot("Ajay Rathi", "Anchor", "K", 15, 18, 30),
    ],
    needRoles: ["Raider", "Corner", "Anchor"],
    ai: ai("Franchise schemer", 0.55, ["hand", "toe", "bonus"], ["walk", "dash", "dubki"], 2, { bluff: 0.2, k: 2, bonusRate: 0.25 }),
    goal: { margin: 1 }, stars: [S("margin", 3, "Win by 3"), S("purse", 10, "Keep 10 lakh in the purse")],
  },
  {
    id: 43, ch: 4, name: "Fans' Day", type: "Match", role: "breather", theme: "Auction Hall",
    intro: [], mech: ["hold specialists", "anchor", "bonus line", "backward kick", "alternating raids"],
    intent: "Breather after the squad test: your full specialist squad against an exhibition side with an easy raider. Enjoy the toolkit — bonus line open, one rusher to kick. 3 raids each, win by 2.",
    op: "oRooToo", me: "AToKoTA", g: 0.45, raider: [7, 6, 6, 6], moves: M3, def: D4, flow: "alt", first: 0, raids: 3, defs: 3,
    ai: ai("Exhibition raider", 0.3, ["hand", "toe"], ["walk"], 0),
    goal: { margin: 2 }, stars: [S("margin", 4, "Win by 4"), S("oppMax", 1, "Concede at most 1")],
  },
  {
    id: 44, ch: 4, name: "Season Final", type: "Full Match", role: "boss", theme: "Auction Hall",
    intro: [], mech: ["full match", "auction", "player roles", "hold specialists", "anchor", "feints", "defender switch"],
    intent: "Chapter boss: auction your own squad (7 lots, 110 lakh), then play the full 2x20 Season Final with it against a Medium-Hard franchise that reads your specialists and feints. Win the match.",
    op: "ATRBRTA", g: 0.45, moves: M3, def: D4, flow: "alt", first: 0, clock: [0, 2400], purse: 110,
    lots: [
      lot("Raghav Chauhan", "Raider", "o", 25, 30, 55, [8, 7, 8, 6]),
      lot("Om Prakash", "Raider", "o", 12, 12, 25, [6, 6, 5, 7]),
      lot("Firoz Ali", "Corner", "A", 12, 14, 28),
      lot("Lakshya Joshi", "Corner", "T", 12, 14, 28),
      lot("Tenzin Norbu", "Cover", "C", 10, 10, 22),
      lot("Gurtej Mann", "Anchor", "K", 18, 20, 36),
      lot("Mohit Dahiya", "Anchor", "K", 15, 18, 30),
    ],
    needRoles: ["Raider", "Corner", "Anchor"],
    ai: ai("Franchise captain", 0.45, ["hand", "toe", "bonus"], ["walk", "dash", "dubki"], 1, { bluff: 0.15, k: 2, bonusRate: 0.25 }),
    goal: { margin: 1 }, stars: [S("margin", 5, "Win by 5"), S("margin", 10, "Win by 10")],
  },

  // ═════════════════════ CHAPTER 5 — CONTINENTAL CUP ═════════════════════
  {
    id: 45, ch: 5, name: "Super Raid", type: "Super Challenge", role: "teach", theme: "Continental Cup",
    intro: ["super raid"], mech: ["super raid", "raid clock", "hand touch", "toe touch", "dubki", "thigh-holders"],
    intent: "Teach the Super Raid: three touches in one raid. Three touches take 21 of the 30 seconds and every touch makes the way home harder (depth ×1.7 at three). Aha: string the touches along one side (rookies first, Toe on the T's), then Dubki home before the clock. Land a Super Raid within 4 raids.",
    op: "ooToTTo", g: 0.45, moves: M3, flow: "raid", raids: 4,
    goal: { maxCaught: 3, need: { superRaid: 1 } }, stars: [S("superRaid", 2, "Two Super Raids"), S("fast", 1, "Super Raid on the first raid")],
  },
  {
    id: 46, ch: 5, name: "Two Defenders, One Chain", type: "Defend Stand", role: "teach", theme: "Continental Cup",
    intro: ["chain tackle"], mech: ["chain tackle", "ankle hold", "thigh hold", "block (defensive wall)", "defender rush"],
    intent: "Teach the Chain Tackle: two adjacent defenders link — strong against every touch and every way home except the Dubki, and a chained raider rarely slips. Aha: two defenders, one chain — chain the pair around his target. Land 2 chain tackles in 5 raids and concede no more than 4.",
    op: "ooooooo", g: 1, moves: M3, def: D5, flow: "defend", defs: 5,
    ai: ai("Continental raider", 0.5, ["hand", "toe"], ["walk", "dash"], 0),
    goal: { maxOpp: 4, need: { chain: 2 } }, stars: [S("chain", 3, "Three chain tackles"), S("oppMax", 2, "Concede at most 2")],
  },
  {
    id: 47, ch: 5, name: "Last Three Standing", type: "Super Challenge", role: "twist", theme: "Continental Cup",
    intro: [], mech: ["chain tackle", "super tackle", "super raid", "all-out"],
    intent: "Twist: three rookies left in the middle of your mat, no specialists, against a raider hunting a super raid (2-3 touches a raid). Any tackle from 3 is a Super Tackle (+2), but a failed tackle on the touch costs two men and brings the all-out close. Aha: let the first touch go and chain him on the way home, when every tackle still counts as Super. Land a Super Tackle within 3 raids, concede no more than 1.",
    op: "ooooooo", me: "--ooo--", g: 1, moves: M3, def: D5, flow: "defend", defs: 3,
    ai: ai("Super raider", 0.5, ["hand", "toe"], ["walk", "dash"], 0, { k: 3 }),
    goal: { maxOpp: 1, need: { superTackle: 1 } }, stars: [S("chain", 1, "Super Tackle with a chain"), S("oppMax", 0, "Concede nothing")],
  },
  {
    id: 48, ch: 5, name: "The Cage", type: "Raid Puzzle", role: "teach", theme: "Formation: Cage",
    intro: ["formation theme: Cage", "chain links"], mech: ["formation theme: Cage", "chain links", "dubki", "toe touch", "hand touch"],
    intent: "Teach formation themes with the Cage: two chained pairs (C C) either side of the centre. Walking or dashing home past two chains is held most of the time; the Dubki ducks under both (READ). Aha: in the Cage, the way home is the puzzle. Score 4 in 4 raids.",
    op: "oCCoCCo", g: 0.55, moves: M3, flow: "raid", raids: 4,
    goal: { pts: 4, maxCaught: 2 }, stars: [S("dubki", 3, "Score with 3 Dubkis"), S("noCaught", 0, "Never get caught")],
  },
  {
    id: 49, ch: 5, name: "Pincer", type: "Raid Puzzle", role: "twist", theme: "Formation: Pincer",
    intro: ["formation theme: Pincer"], mech: ["formation theme: Pincer", "ankle-catchers", "rusher defenders", "bonus line", "backward kick"],
    intent: "Twist theme, the Pincer: Ankle-catcher corners and Rushers inside — the bonus hop runs straight into both (READ). The cheap points are Kicks on the charging R's and Hand Touches on the A's. Aha: the open bonus line is the bait. Score 3 in 4 raids with a Kick.",
    op: "ARoBoRA", g: 0.55, moves: M3, flow: "raid", raids: 4,
    goal: { pts: 3, maxCaught: 2, need: { kick: 1 } }, stars: [S("noCaught", 0, "Never get caught"), S("pts", 5, "Score 5 points")],
  },
  {
    id: 50, ch: 5, name: "Third Umpire", type: "Raid Puzzle", role: "teach", theme: "Continental Cup",
    intro: ["DRS review"], mech: ["DRS review", "toe touch", "dubki", "thigh-holders", "blocker wall"],
    intent: "Teach DRS: close touches are called by the referee, and 'very tight' calls are wrong almost half the time ('tight' ones 1 in 5). 2 reviews: a failed review is lost. Aha: review the very tight calls, accept the merely tight. Score 4 in 5 raids.",
    op: "TToBoTT", g: 0.5, moves: M3, flow: "raid", raids: 5, drs: 2,
    goal: { pts: 4, maxCaught: 2 }, stars: [S("drsWin", 1, "Win a DRS review"), S("noCaught", 0, "Never get caught")],
  },
  {
    id: 51, ch: 5, name: "Ghost Gate", type: "Ghost Duel", role: "twist", theme: "Formation: Ghost Gate",
    intro: ["ghost gate"], mech: ["ghost gate", "chain tackle", "block (defensive wall)", "ankle hold", "thigh hold", "defender rush"],
    intent: "Twist: defend against a recorded ghost raider. Its 5 raids are known before you start (GHOST PLAN row: a Toe and Dash home, a Hand and walk, a bonus hop, a two-touch raid with a Dubki home, a corner Toe and Dash) and replay exactly — no feints. Aha: a ghost can be solved: plan the perfect counter for each raid. Stop 3 of 5 and concede no more than 4.",
    op: "ooooooo", g: 1, moves: M3, def: D5, flow: "defend", defs: 5,
    ai: ai("Ghost raider", 0.62, ["hand", "toe", "bonus"], ["walk", "dash", "dubki"], 0),
    gate: ["toe@1>dash", "hand@3>walk", "bonus>walk", "hand@5,toe@4>dubki", "toe@0>dash"],
    goal: { stops: 3, maxOpp: 4 }, stars: [S("stops", 4, "Stop 4 raids"), S("chain", 1, "Land a chain tackle")],
  },
  {
    id: 52, ch: 5, name: "Diamond", type: "Match", role: "combine", theme: "Formation: Diamond",
    intro: ["formation theme: Diamond"], mech: ["defence reads repeats", "formation theme: Diamond", "super raid", "chain tackle", "rusher defenders", "blocker wall", "thigh-holders"],
    intent: "Combine with the Diamond theme: a Blocker at the point, Rushers on the shoulders, T's behind — and a Hard raider who chains touches. Kick the rushers, Dubki the wall, chain his deep raids. 4 raids each, win by 2.",
    op: "oTRBRTo", g: 0.5, moves: M3, def: D5, flow: "alt", first: 0, raids: 4, defs: 4,
    ai: ai("Continental raider", 0.55, ["hand", "toe"], ["walk", "dash", "dubki"], 2, { k: 2, bluff: 0.1 }),
    goal: { margin: 2 }, stars: [S("margin", 4, "Win by 4"), S("superRaid", 1, "Land a Super Raid")],
  },
  {
    id: 53, ch: 5, name: "Ghost Duel: Cage", type: "Ghost Duel", role: "spike", theme: "Formation: Cage",
    intro: ["weekly ladder ghost"], mech: ["ghost duel", "formation theme: Cage", "chain links", "DRS review", "super raid", "dubki"],
    intent: "Spike: this week's ladder ghost raided the Cage (two chained pairs, T's at the corners) 5 times and its score is on the board. Beat it in 5 raids — the chains make every walk or Dash home a gamble, so Dubki home, and you need at least one two-touch raid. 2 DRS reviews for the very tight calls; a lost review is gone.",
    op: "TCCoCCT", g: 0.9, moves: M3, flow: "raid", raids: 5, drs: 2, ghost: "cage",
    goal: { ghost: true, maxCaught: 3 }, stars: [S("drsWin", 1, "Win a DRS review"), S("superRaid", 1, "Land a Super Raid")],
  },
  {
    id: 54, ch: 5, name: "Fan Zone", type: "Match", role: "breather", theme: "Continental Cup",
    intro: [], mech: ["chain tackle", "super raid", "bonus line", "alternating raids"],
    intent: "Breather after the ghost spike: a fan-zone exhibition against a young side (rookies, one T) and an Easy raider who never feints; the young side barely reads repeats. Try the super raid for fun. 3 raids each, win by 2.",
    op: "oooTooo", g: 0.45, read: 0.1, moves: M3, def: D5, flow: "alt", first: 0, raids: 3, defs: 3,
    ai: ai("Young raider", 0.3, ["hand", "toe"], ["walk", "dash"], 0),
    goal: { margin: 2 }, stars: [S("superRaid", 1, "Land a Super Raid"), S("margin", 5, "Win by 5")],
  },
  {
    id: 55, ch: 5, name: "Continental Semi-Final", type: "Full Match", role: "boss", theme: "Continental Cup",
    intro: [], mech: ["full match", "chain tackle", "super raid", "DRS review", "formation theme: Cage", "feints", "Hard CPU"],
    intent: "Chapter boss: the Continental Semi-Final as a Blitz (2x10), joined at 5:00 already 4-6 down after a bad start, against a Hard side that defends in the Cage (Dubki home, Toe on the T corners) and raids with feints and two-touch raids (chain the return). One DRS review. Win the match.",
    op: "TCCBCCT", g: 0.45, moves: M3, def: D5, flow: "alt", first: 0, clock: [300, 1200], half: 600, score: [4, 6], drs: 1, raider: [7, 6, 6, 6],
    ai: ai("Continental captain", 0.52, ["hand", "toe", "bonus"], ["walk", "dash", "dubki"], 2, { k: 2, bluff: 0.2, bonusRate: 0.2 }),
    goal: { margin: 1 }, stars: [S("margin", 4, "Win by 4"), S("drsWin", 1, "Win a DRS review")],
  },

  // ═════════════════════ CHAPTER 6 — WORLD CHAMPIONSHIP ═════════════════════
  {
    id: 56, ch: 6, name: "Rotation", type: "Match", role: "teach", theme: "World Championship",
    intro: ["fatigue", "raider rotation"], mech: ["fatigue", "raider rotation", "chain tackle", "super raid", "dubki"],
    intent: "Teach fatigue: your star raider Veer (reach 8) tires after two raids (stamina 3); Kabir (reach 6, stamina 8) can go all day. A tired raider reaches less and is held more. Aha: rotate — the star for the big raids, the workhorse in between. 6 raids each, win by 3.",
    op: "oTRBRTo", g: 0.5, moves: M3, def: D5, flow: "alt", first: 0, raids: 6, defs: 5, fatigue: true,
    raiders: [{ name: "Veer", st: [8, 7, 7, 3] }, { name: "Kabir", st: [6, 6, 5, 8] }],
    ai: ai("World raider", 0.5, ["hand", "toe"], ["walk", "dash", "dubki"], 1, { k: 2 }),
    goal: { margin: 3 }, stars: [S("margin", 5, "Win by 5"), S("noCaught", 0, "Never get caught")],
  },
  {
    id: 57, ch: 6, name: "Iron Anchor", type: "Raid Puzzle", role: "teach", theme: "World Championship",
    intro: ["rival captain"], mech: ["rival captain", "backward kick", "ankle-catchers", "thigh-holders", "dubki"],
    intent: "Teach rival captains: their captain K anchors the centre — every move near him is dangerous and he guards every way home. His one weakness: he chases, so a Backward Kick on him is the safest touch on the mat (READ k on slot 4), and the kick tags him out of the way home too. Aha: kick the captain, don't avoid him. Score 4 in 4 raids.",
    op: "oTAKATo", kWeak: "kick", g: 0.5, moves: M3, flow: "raid", raids: 4,
    goal: { pts: 4, maxCaught: 2 }, stars: [S("kick", 2, "Kick the captain twice"), S("noCaught", 0, "Never get caught")],
  },
  {
    id: 58, ch: 6, name: "Dubki King", type: "Defend Stand", role: "teach", theme: "World Championship",
    intro: ["rival raider signature"], mech: ["rival raider signature", "ankle hold", "chain tackle", "block (defensive wall)", "thigh hold"],
    intent: "Rival raider: the Dubki King always ducks home — under thighs, chains and walls. Only the Ankle Hold reads the dubki — the best answer on the board (READ). Aha: a signature move is a promise — let the touch go and ankle him on the way home. Stop 3 of 5 and concede no more than 3.",
    op: "ooooooo", g: 1, moves: M3, def: D5, flow: "defend", defs: 5,
    ai: ai("The Dubki King", 0.5, ["hand", "toe"], ["dubki"], 2, { k: 2 }),
    goal: { stops: 3, maxOpp: 3 }, stars: [S("stops", 4, "Stop 4 raids"), S("oppMax", 1, "Concede at most 1")],
  },
  {
    id: 59, ch: 6, name: "Feint Master", type: "Defend Stand", role: "twist", theme: "World Championship",
    intro: [], mech: ["feints", "rival raider signature", "chain tackle", "anchor", "ankle hold"],
    intent: "Twist on rival raiders: the Feint Master's telegraph lies 1 time in 5. Your Anchor stands between two Covers, so a chain through the centre is the strongest tackle on your mat whichever touch is real, and the Ankle covers both Dash and Dubki home. Aha: when you can't read him, defend with the move that has no weakness. Stop 3 of 5 and concede no more than 3.",
    op: "ooooooo", me: "ooCKCoo", g: 1, moves: M3, def: D5, flow: "defend", defs: 5,
    ai: ai("The Feint Master", 0.6, ["hand", "toe"], ["walk", "dash", "dubki"], 1, { bluff: 0.2 }),
    goal: { stops: 3, maxOpp: 3 }, stars: [S("stops", 4, "Stop 4 raids"), S("chain", 2, "Two chain tackles")],
  },
  {
    id: 60, ch: 6, name: "Endurance", type: "Match", role: "combine", theme: "World Championship",
    intro: [], mech: ["defence reads repeats", "fatigue", "raider rotation", "rival captain", "backward kick", "chain tackle", "dubki"],
    intent: "Combine: the last 15 minutes of a group match, 17-19 down, with three raiders to rotate (one star, two workhorses) against a mat anchored by a rival captain weak to the Toe Touch. Fatigue decides it. Win by 1.",
    op: "RTAKATR", kWeak: "toe", g: 0.5, moves: M3, def: D5, flow: "alt", first: 0, clock: [1500, 2400], score: [17, 19], read: 0.25, fatigue: true,
    raiders: [{ name: "Veer", st: [8, 7, 7, 3] }, { name: "Kabir", st: [6, 6, 5, 8] }, { name: "Dev", st: [6, 7, 6, 6] }],
    ai: ai("World raider", 0.52, ["hand", "toe", "bonus"], ["walk", "dash", "dubki"], 2, { k: 2, bluff: 0.15, bonusRate: 0.2 }),
    goal: { margin: 1 }, stars: [S("margin", 3, "Win by 3"), S("noCaught", 0, "Never get caught")],
  },
  {
    id: 61, ch: 6, name: "Captain's Cage", type: "Raid Puzzle", role: "combine", theme: "Formation: Cage",
    intro: [], mech: ["rival captain", "formation theme: Cage", "chain links", "dubki", "backward kick", "super raid"],
    intent: "Combine: the Cage with a rival captain locking its centre. The captain is weak to the Dubki home — but the chains beside him also hate it, so the Dubki is the only way home. Find the touches (Toe on the corners, Kick on the captain) and duck out — one clean point a raid is enough, and a Super Raid along the rookie corner and the captain is the 3-star swing. Score 4 in 5 raids.",
    op: "oCCKCCo", kWeak: "dubki", g: 0.5, moves: M3, flow: "raid", raids: 5,
    goal: { pts: 4, maxCaught: 2 }, stars: [S("superRaid", 1, "Land a Super Raid"), S("noCaught", 0, "Never get caught")],
  },
  {
    id: 62, ch: 6, name: "Night Wall", type: "Match", role: "combine", theme: "Formation: Wall",
    intro: ["formation theme: Wall"], mech: ["formation theme: Wall", "rival captain", "blocker wall", "DRS review", "feints", "chain tackle"],
    intent: "Combine with the Wall theme: four Blockers and a captain weak to the Toe Touch, against a Hard feinting raider. No Dash in this trial — the wall would eat it — so it's walk or Dubki home, chosen against what they read from your last raid; review the very tight calls. 5 raids each, win by 1.",
    op: "BBTKTBB", kWeak: "toe", g: 0.5, read: 0.35, moves: M3.filter((m) => m !== "dash"), def: D5, flow: "alt", first: 0, raids: 5, defs: 5, drs: 1,
    ai: ai("World raider", 0.55, ["hand", "toe"], ["walk", "dash", "dubki"], 2, { k: 2, bluff: 0.25 }),
    goal: { margin: 1 }, stars: [S("margin", 3, "Win by 3"), S("drsWin", 1, "Win a DRS review")],
  },
  {
    id: 63, ch: 6, name: "Lap of Honour", type: "Match", role: "breather", theme: "World Championship",
    intro: [], mech: ["bonus line", "super raid", "chain tackle", "alternating raids"],
    intent: "Breather before the last push: a lap-of-honour friendly against a veterans' side (rookies and one T, six on the mat) with a slow Easy raider; the veterans barely read repeats. 3 raids each, win by 2; 3 stars for a Super Raid.",
    op: "ooTooo-", g: 0.45, read: 0.1, moves: M3, def: D5, flow: "alt", first: 0, raids: 3, defs: 3,
    ai: ai("Veteran raider", 0.25, ["hand", "toe"], ["walk"], 0),
    goal: { margin: 2 }, stars: [S("margin", 4, "Win by 4"), S("superRaid", 1, "Land a Super Raid")],
  },
  {
    id: 64, ch: 6, name: "Last Stand", type: "Revival Run", role: "spike", theme: "World Championship",
    intro: [], mech: ["revival", "super tackle", "all-out", "chain tackle", "rival captain", "Hard CPU"],
    intent: "Spike: the last 5 minutes of a world group decider, 24-25 down with only 3 on the mat. Every tackle is a Super Tackle (+2) and every point you score revives a team-mate, so one Super Tackle plus a kick on their captain (his weakness) turns it. Trail by 9 and it's over. Win by 1.",
    op: "oTAKATo", kWeak: "kick", me: "--oKo--", g: 0.45, moves: M3, def: D5, flow: "alt", first: 0, clock: [2100, 2400], score: [24, 25],
    ai: ai("World raider", 0.5, ["hand", "toe"], ["walk", "dash", "dubki"], 2, { k: 2, bluff: 0.15 }),
    goal: { margin: 1, maxTrail: 9 }, stars: [S("margin", 3, "Win by 3"), S("superTackle", 1, "Land a Super Tackle")],
  },
  {
    id: 65, ch: 6, name: "Champion's Gauntlet", type: "Comeback", role: "spike", theme: "World Championship",
    intro: [], mech: ["fatigue", "raider rotation", "rival captain", "feints", "super raid", "chain tackle", "DRS review"],
    intent: "The last 10 minutes of the World semi-final, 1 point down, against the champions' feinting raider and a captain weak to the Kick, with two raiders to rotate and one DRS review. About 7 raids each: rest the star for the closing raids. Win by 1.",
    op: "RTAKATR", kWeak: "kick", g: 0.48, moves: M3, def: D5, flow: "alt", first: 0, clock: [1800, 2400], score: [18, 19], read: 0.3, fatigue: true, drs: 1,
    raiders: [{ name: "Veer", st: [8, 7, 7, 6] }, { name: "Kabir", st: [6, 6, 5, 8] }],
    ai: ai("Champion raider", 0.55, ["hand", "toe", "bonus"], ["walk", "dash", "dubki"], 2, { k: 2, bluff: 0.25, bonusRate: 0.2 }),
    goal: { margin: 1 }, stars: [S("margin", 4, "Win by 4"), S("drsWin", 1, "Win a DRS review")],
  },
  {
    id: 66, ch: 6, name: "World Final", type: "Full Match", role: "boss", theme: "World Championship",
    intro: ["all mechanics combined"], mech: ["defence reads repeats", "full match", "rival captain", "rival raider signature", "fatigue", "raider rotation", "feints", "DRS review", "chain tackle", "super raid", "revival"],
    intent: "Final boss on Hard: the full 2x20 World Final. Their captain anchors a Pincer-Cage mat (weak to the Kick), their scouts read every repeated move, their raider is the Feint Master with a Dubki home, and you rotate three raiders through fatigue with one DRS review. Finish ahead.",
    op: "ACRKRCA", kWeak: "kick", g: 0.45, read: 0.45, moves: M3, def: D5, flow: "alt", first: 0, clock: [0, 2400], fatigue: true, drs: 1,
    raiders: [{ name: "Veer", st: [8, 7, 7, 4] }, { name: "Kabir", st: [6, 6, 5, 8] }, { name: "Dev", st: [6, 7, 6, 6] }],
    ai: ai("World captain", 0.55, ["hand", "toe", "bonus"], ["walk", "dash", "dubki"], 2, { k: 3, bluff: 0.3, bonusRate: 0.2 }),
    goal: { margin: 1 }, stars: [S("margin", 4, "Win by 4"), S("margin", 8, "Win by 8")],
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
