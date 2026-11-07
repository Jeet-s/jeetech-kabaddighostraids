/**
 * Raid Trial engine — pure TypeScript, no UI. Plays one content unit (types.ts UnitDef) on the kabaddi rules
 * (rules.ts) with a seeded RNG, so the same inputs always give the same match (ghost replays, server re-sim).
 *
 * The real-time controls of the match screen (drag path, move arcs, tackle ring, struggle taps) all end in one of
 * the discrete DECISIONS below; execution (reach, the timing ring, the hold meter) is resolved by the engine:
 *   my raid:     "hand@3" "toe@0" "kick@5" "bonus"  → touch beat        "walk" "dash" "dubki" → go home
 *   held:        "pull" (timed pull-away)  "lunge" (dive for the midline)
 *   my defence:  "ankle@2" "thigh@4" "rush@0" "chain@2" (slot 2 + the next defender) "block" "hold"
 *   DRS:         "review" "accept"            rotation: "pick@1"            auction: "bid" "pass"
 * Every decision whose result is random is PENDING until "go" resolves it (the UI plays the move animation in
 * between) — so a decision is always taken on what the player can see, never on the dice.
 */
import {
  alive, bonusLive, count, DEAD_TIME, FULL, HALF_SECONDS, isDoOrDie, MAT, newMatch, RAID_CLOCK, raiderSlotOf,
  scoreRaid, slotsOf, type Match, type RaidResult, type RefEvent, type Side,
} from "./rules";
import type { AIRaider, DefMove, Lot, ReturnMove, Role, Star, Trait, TouchMove, UnitDef } from "./types";
import { ALL_UNITS as UNITS } from "./units";
import { GHOSTS } from "./ghosts";

export type Phase = "pick" | "touch" | "ret" | "str" | "drs" | "dtouch" | "dret" | "bid" | "done";

export interface Raid {
  tc: number[]; // defenders touched so far (slots)
  bn: 0 | 1; // bonus hop made
  tm: number; // raid clock used (s)
  dd: 0 | 1; // do-or-die raid
  st: number; // defenders on the mat at the start of the raid
  hold: number; // holder slot while held (-1 = free)
  used: string; // moves of landed touches: h t k
  ret: string; // return move: w d u (dubki) / e (escape)
  slot: number; // raiding-side slot that leaves the mat if the raider is out
}

export interface Plan { d: number; m: TouchMove; show: TouchMove; r: ReturnMove; rshow: ReturnMove; k: number }

export interface Tally {
  pts: number; opp: number; stops: number; esc: number; sT: number; sR: number; bon: number; kick: number;
  dub: number; toe: number; caught: number; raids: number; defs: number; empty: number; allOut: number;
  drsW: number; drsL: number; chain: number; dodWin: number; oppScored: number;
}

export interface Auction { i: number; price: number; lead: -1 | 0 | 1; purse: number; val: number; got: number[] }

export interface Drs { side: Side; d: number; truth: 0 | 1; call: 0 | 1; tight: 1 | 2; tm: TouchMove }

export interface S {
  u: number;
  r: number; // rng state
  moves: number; // decisions taken (not part of the state's identity)
  m: Match;
  ph: Phase;
  turn: Side;
  rd: Raid | null;
  ai: Plan | null;
  pd: string | null; // pending decision, resolved by "go"
  tl: Tally;
  dr: Drs | null;
  rv: number; // DRS reviews left
  au: Auction | null;
  sta: number[] | null; // raider stamina (rotation units)
  ri: number; // current raider
  gi: number; // ghost-gate plan index
  me: string; // my roles by slot
  rs: [number, number, number, number]; // my raider reach, agility, speed, stamina
  end: 0 | 1 | 2; // 1 won, 2 lost
  why: string; // result reason
  ev: RefEvent[]; // referee events of the last finished raid (UI)
  half: 0 | 1;
  lm: string; // my previous raid's touch moves + way home (h t k b / w d u) — what the defence has read
  toJSON?: () => string;
}

// ───────────────────────────── rng (mulberry32, mixed with every decision) ─────────────────────────────
function next(s: S): number {
  s.r = (s.r + 0x6d2b79f5) | 0;
  let t = Math.imul(s.r ^ (s.r >>> 15), 1 | s.r);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
}
function mix(r: number, key: string): number {
  let h = r ^ 0x9e3779b9;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 0x01000193);
  return h | 0;
}

// ───────────────────────────── tables ─────────────────────────────
type TT = Record<Trait, Record<TouchMove, number>>;
/** Danger to MY raider on a touch attempt: defender trait × my move (target ×1, the defenders beside him ×0.5). */
const TOUCH_THREAT: TT = {
  o: { hand: 0.08, toe: 0.07, kick: 0.07, bonus: 0.06 },
  T: { hand: 0.55, toe: 0.08, kick: 0.15, bonus: 0.12 },
  A: { hand: 0.07, toe: 0.55, kick: 0.1, bonus: 0.4 },
  B: { hand: 0.12, toe: 0.1, kick: 0.1, bonus: 0.08 },
  R: { hand: 0.32, toe: 0.3, kick: 0.03, bonus: 0.55 },
  C: { hand: 0.16, toe: 0.14, kick: 0.14, bonus: 0.1 },
  K: { hand: 0.42, toe: 0.42, kick: 0.42, bonus: 0.42 },
};
/** Danger to MY raider going home: every defender on the mat × the way home. */
const RET_THREAT: Record<Trait, Record<ReturnMove, number>> = {
  o: { walk: 0.03, dash: 0.025, dubki: 0.03 },
  T: { walk: 0.24, dash: 0.08, dubki: 0.035 },
  A: { walk: 0.07, dash: 0.035, dubki: 0.32 },
  B: { walk: 0.12, dash: 0.42, dubki: 0.04 },
  R: { walk: 0.1, dash: 0.03, dubki: 0.09 },
  C: { walk: 0.2, dash: 0.22, dubki: 0.03 }, // only when chained to an adjacent C
  K: { walk: 0.32, dash: 0.32, dubki: 0.32 },
};
const HOLD_STRENGTH: Record<Trait, number> = { o: 0.04, T: 0.12, A: 0.12, B: 0.08, R: 0.06, C: 0.22, K: 0.2 };
const TOUCH_BASE: Record<TouchMove, number> = { hand: 0.93, toe: 0.88, kick: 0.78, bonus: 0.92 };
const TIME: Record<TouchMove | "ret" | "str", number> = { hand: 7, toe: 7, kick: 7, bonus: 5, ret: 6, str: 4 };

/** My tackle vs the CPU raider's touch move. */
const DEF_TOUCH: Record<DefMove, Record<TouchMove, number>> = {
  ankle: { hand: 0.28, toe: 0.74, kick: 0.25, bonus: 0.45 },
  thigh: { hand: 0.72, toe: 0.26, kick: 0.3, bonus: 0.3 },
  rush: { hand: 0.42, toe: 0.45, kick: 0.06, bonus: 0.78 },
  chain: { hand: 0.6, toe: 0.55, kick: 0.45, bonus: 0.35 },
  block: { hand: 0, toe: 0, kick: 0, bonus: 0 },
  hold: { hand: 0, toe: 0, kick: 0, bonus: 0 },
};
/** My tackle vs the CPU raider's way home. */
const DEF_RET: Record<DefMove, Record<ReturnMove, number>> = {
  ankle: { walk: 0.4, dash: 0.64, dubki: 0.72 },
  thigh: { walk: 0.7, dash: 0.34, dubki: 0.12 },
  block: { walk: 0.42, dash: 0.8, dubki: 0.14 },
  chain: { walk: 0.74, dash: 0.64, dubki: 0.2 },
  rush: { walk: 0.3, dash: 0.22, dubki: 0.3 },
  hold: { walk: 0, dash: 0, dubki: 0 },
};
const ROLE_MULT: Record<Role, Partial<Record<DefMove, number>>> = {
  o: {},
  A: { ankle: 1.25, thigh: 0.85 },
  T: { thigh: 1.25, ankle: 0.85 },
  C: { chain: 1.2, block: 1.1 },
  K: { ankle: 1.15, thigh: 1.15, chain: 1.15, rush: 1.15, block: 1.15 },
  R: { rush: 1.3 },
};

// ───────────────────────────── helpers ─────────────────────────────
export const unitOf = (s: S): UnitDef => UNITS[s.u];
const traitAt = (u: UnitDef, slot: number): Trait => {
  const c = u.op[slot];
  return (c === "-" ? "o" : c) as Trait;
};
const roleAt = (s: S, slot: number): Role => {
  const c = s.me[slot];
  return (c === "-" ? "o" : c) as Role;
};
const clamp = (x: number, lo: number, hi: number) => (x < lo ? lo : x > hi ? hi : x);
const parseSlot = (mv: string) => Number(mv.slice(mv.indexOf("@") + 1));
/** How hard the opponent's defence punishes a move I used on my previous raid (they read repeats). */
export const readOf = (u: UnitDef) => u.read ?? (u.id < 27 ? 0 : u.ch === 3 ? 0.2 : u.ch === 4 ? 0.22 : u.ch === 5 ? 0.25 : u.ch >= 6 ? 0.3 : u.ch === 0 ? 0.35 : 0);
export const READ_RISK = 0.6;

function clone(s: S): S {
  return {
    ...s,
    m: { sc: [s.m.sc[0], s.m.sc[1]], al: [s.m.al[0], s.m.al[1]], q: [s.m.q[0].slice(), s.m.q[1].slice()], em: [s.m.em[0], s.m.em[1]], t: s.m.t },
    rd: s.rd ? { ...s.rd, tc: s.rd.tc.slice() } : null,
    ai: s.ai ? { ...s.ai } : null,
    tl: { ...s.tl },
    dr: s.dr ? { ...s.dr } : null,
    au: s.au ? { ...s.au, got: s.au.got.slice() } : null,
    sta: s.sta ? s.sta.slice() : null,
    ev: [],
  };
}

/** Fatigue: a tired raider reaches less and is easier to hold. */
function fit(s: S): number {
  if (!s.sta) return 1;
  const max = unitOf(s).raiders![s.ri].st[3];
  return 0.68 + 0.32 * clamp(s.sta[s.ri] / max, 0, 1);
}

function ghostPts(u: UnitDef): number {
  return u.ghost ? GHOSTS[u.ghost]?.pts ?? 99 : 0; // an unrecorded ghost can't be beaten
}

// ───────────────────────────── my raid: probabilities ─────────────────────────────
/** Chance a touch attempt gets my raider held. */
export function touchCatch(s: S, d: number, mv: TouchMove): { p: number; holder: number } {
  const u = unitOf(s), al = s.m.al[1], ranks = slotsOf(al), rd = s.rd!;
  let risk = 0, best = -1, holder = ranks[0] ?? 0;
  const add = (slot: number, w: number) => {
    let t = traitAt(u, slot);
    let th = TOUCH_THREAT[t][mv];
    if (t === "K" && u.kWeak === mv) th = 0.05;
    th *= w;
    risk += th;
    if (th > best) { best = th; holder = slot; }
  };
  if (mv === "bonus") {
    add(ranks[0], 1);
    if (ranks.length > 1) add(ranks[ranks.length - 1], 1);
    for (const sl of ranks) if (traitAt(u, sl) === "R" && sl !== ranks[0] && sl !== ranks[ranks.length - 1]) add(sl, 0.5);
  } else {
    const i = ranks.indexOf(d);
    for (let j = i - 1; j <= i + 1; j++) if (j >= 0 && j < ranks.length) add(ranks[j], j === i ? 1 : 0.5);
  }
  if (s.lm.includes(mv === "bonus" ? "b" : mv[0])) risk += READ_RISK * readOf(u);
  risk *= u.g * (1 + 0.35 * rd.tc.length) * (1 - 0.03 * (s.rs[0] - 5)) / fit(s);
  return { p: 1 - Math.exp(-risk), holder };
}

export function touchLand(s: S, d: number, mv: TouchMove): number {
  const u = unitOf(s);
  let p = TOUCH_BASE[mv] + 0.015 * (s.rs[0] - 5);
  if (mv === "kick" && traitAt(u, d) === "R") p = 0.92;
  if (mv !== "bonus" && traitAt(u, d) === "K") p *= 0.85;
  return clamp(p * Math.sqrt(fit(s)), 0.3, 0.97);
}

const DEPTH = [0.35, 1, 1.35, 1.7, 2];
/** Chance my raider is held on the way home with this move. */
export function returnCatch(s: S, r: ReturnMove): { p: number; holder: number } {
  const u = unitOf(s), ranks = slotsOf(s.m.al[1]), rd = s.rd!;
  let risk = 0, best = -1, holder = ranks[0] ?? 0;
  for (let i = 0; i < ranks.length; i++) {
    const sl = ranks[i];
    let t = traitAt(u, sl);
    if (t === "C") {
      const chained = (i > 0 && traitAt(u, ranks[i - 1]) === "C") || (i + 1 < ranks.length && traitAt(u, ranks[i + 1]) === "C");
      if (!chained) t = "o";
    }
    let th = RET_THREAT[t][r];
    if (t === "K" && u.kWeak === r) th = 0.04;
    risk += th;
    if (th > best) { best = th; holder = sl; }
  }
  const depth = rd.tc.length === 0 ? (rd.bn ? 0.6 : DEPTH[0]) : DEPTH[Math.min(4, rd.tc.length)];
  const mod = r === "walk" ? 1 - 0.02 * (s.rs[2] - 5) : r === "dash" ? 1 - 0.05 * (s.rs[2] - 5) : 1 - 0.05 * (s.rs[1] - 5);
  if (s.lm.includes(r === "walk" ? "w" : r === "dash" ? "d" : "u")) risk += READ_RISK * readOf(u);
  risk *= u.g * depth * mod / fit(s);
  return { p: 1 - Math.exp(-risk), holder };
}

export function escapeChance(s: S, how: "pull" | "lunge"): number {
  const u = unitOf(s), rd = s.rd!;
  const ranks = slotsOf(s.m.al[1]);
  let t = traitAt(u, rd.hold);
  if (t === "C") {
    const i = ranks.indexOf(rd.hold);
    const chained = (i > 0 && traitAt(u, ranks[i - 1]) === "C") || (i + 1 < ranks.length && traitAt(u, ranks[i + 1]) === "C");
    if (!chained) t = "o";
  }
  const hs = HOLD_STRENGTH[t] * u.g;
  const staRatio = s.sta ? clamp(s.sta[s.ri] / unitOf(s).raiders![s.ri].st[3], 0, 1) : 0.4 + 0.06 * s.rs[3];
  const p = how === "pull"
    ? 0.3 + 0.28 * staRatio + 0.03 * (s.rs[1] - 5) - hs
    : 0.66 - 0.17 * rd.tc.length + 0.03 * (s.rs[1] - 5) - hs;
  return clamp(p, 0.04, 0.9);
}

function bestEscape(s: S): number {
  const mv = unitOf(s).moves;
  let b = escapeChance(s, "pull");
  if (mv.includes("lunge")) b = Math.max(b, escapeChance(s, "lunge"));
  return b;
}

/** Best chance of getting home from here (used for the provisional value of an unfinished raid). */
function safeHome(s: S): number {
  if (s.ph === "str") return bestEscape(s);
  const u = unitOf(s);
  let best = 0;
  for (const r of ["walk", "dash", "dubki"] as ReturnMove[]) {
    if (!u.moves.includes(r)) continue;
    if (s.rd!.tm + TIME.ret > RAID_CLOCK) return 0;
    const c = returnCatch(s, r);
    const held = clone(s);
    held.ph = "str"; held.rd!.hold = c.holder;
    best = Math.max(best, 1 - c.p + c.p * bestEscape(held));
  }
  return best;
}

// ───────────────────────────── my defence: probabilities ─────────────────────────────
function rankDist(mask: number, a: number, b: number): number {
  const ranks = slotsOf(mask);
  return Math.abs(ranks.indexOf(a) - ranks.indexOf(b));
}
function nextRank(mask: number, a: number): number {
  const ranks = slotsOf(mask), i = ranks.indexOf(a);
  return i >= 0 && i + 1 < ranks.length ? ranks[i + 1] : -1;
}
const evade = (ai: AIRaider) => 1.15 - 0.5 * ai.s;

/** Chance my tackle holds the CPU raider, for a response vs the raider's ACTUAL move. */
export function tacklePower(s: S, resp: string, actual: TouchMove | ReturnMove, beat: "touch" | "ret"): number {
  const u = unitOf(s), ai = u.ai!, d = s.ai!.d, al = s.m.al[0];
  if (resp === "hold") return 0;
  const [move, slotStr] = resp.split("@");
  const dm = move as DefMove;
  const base = beat === "touch" ? DEF_TOUCH[dm][actual as TouchMove] : DEF_RET[dm][actual as ReturnMove];
  if (!base) return 0;
  let pos = 1, role = 1;
  if (dm === "block") {
    role = ROLE_MULT.C.block! > 1 && slotsOf(al).some((sl) => roleAt(s, sl) === "C") ? 1.1 : 1;
  } else {
    const x = Number(slotStr);
    const dist = rankDist(al, x, d);
    if (dm === "chain") {
      const y = nextRank(al, x);
      const dd = Math.min(dist, rankDist(al, y, d));
      pos = dd === 0 ? 1 : dd === 1 ? 0.75 : 0.4;
      role = ((ROLE_MULT[roleAt(s, x)].chain ?? 1) + (ROLE_MULT[roleAt(s, y)].chain ?? 1)) / 2;
    } else {
      pos = beat === "touch" ? [0.82, 1, 0.55][Math.min(2, dist)] ?? 0.3 : [1, 0.88, 0.5][Math.min(2, dist)] ?? 0.3;
      role = ROLE_MULT[roleAt(s, x)][dm] ?? 1;
    }
  }
  // a good raider is hardest to stop on the way home (he picks his line); on the touch he is committed
  return clamp(base * pos * role * (u.w ?? 1) * (beat === "touch" ? evade(ai) : 1.1 - 0.7 * ai.s), 0, 0.93);
}

function aiEscape(s: S, resp: string): number {
  const ai = unitOf(s).ai!;
  let e = 0.1 + 0.2 * ai.s;
  if (resp.startsWith("chain")) e *= 0.5;
  if (resp === "block") e *= 0.7;
  const x = resp.includes("@") ? parseSlot(resp) : -1;
  if (x >= 0 && roleAt(s, x) === "K") e *= 0.7;
  return e;
}

function aiTouchLand(s: S): number {
  // a Do-or-Die raider is under pressure: the whole defence presses him
  return clamp((0.7 + 0.25 * unitOf(s).ai!.s) * (s.rd?.dd ? 0.72 : 1), 0.4, 0.96);
}

/** What the player believes the CPU raider will really do (telegraph + its known bluff rate). */
function belief<T extends string>(shown: T, options: T[], bluff: number): { m: T; p: number }[] {
  const others = options.filter((o) => o !== shown);
  if (!others.length || bluff <= 0) return [{ m: shown, p: 1 }];
  return [{ m: shown, p: 1 - bluff }, ...others.map((o) => ({ m: o, p: bluff / others.length }))];
}

// ───────────────────────────── start ─────────────────────────────
export function start(index: number, seed?: number): S {
  const u = UNITS[index];
  const m = newMatch();
  const opAl = [...u.op].reduce((a, c, i) => (c === "-" ? a & ~(1 << i) : a), FULL);
  const me = u.me ?? "ooooooo";
  const meAl = [...me].reduce((a, c, i) => (c === "-" ? a & ~(1 << i) : a), FULL);
  m.al = [meAl, opAl];
  m.q = u.outQ ? [u.outQ[0].slice(), u.outQ[1].slice()] : [[...me].flatMap((c, i) => (c === "-" ? [i] : [])), [...u.op].flatMap((c, i) => (c === "-" ? [i] : []))];
  if (u.score) m.sc = [u.score[0], u.score[1]];
  if (u.empty) m.em = [u.empty[0], u.empty[1]];
  m.t = u.clock ? u.clock[0] : 0;
  const s: S = {
    u: index, r: seed ?? (0x5eed + index * 7919), moves: 0, m, ph: "touch", turn: u.first ?? (u.flow === "defend" ? 1 : 0),
    rd: null, ai: null, pd: null,
    tl: { pts: 0, opp: 0, stops: 0, esc: 0, sT: 0, sR: 0, bon: 0, kick: 0, dub: 0, toe: 0, caught: 0, raids: 0, defs: 0, empty: 0, allOut: 0, drsW: 0, drsL: 0, chain: 0, dodWin: 0, oppScored: 0 },
    dr: null, rv: u.drs ?? 0, au: null, sta: u.raiders ? u.raiders.map((r) => r.st[3]) : null, ri: 0, gi: 0,
    me: me.replace(/-/g, "o"), rs: u.raider ?? (u.raiders ? u.raiders[0].st : [5, 5, 5, 5]),
    end: 0, why: "", ev: [], lm: "", half: m.t >= (u.half ?? HALF_SECONDS) ? 1 : 0,
  };
  attachJSON(s);
  if (u.lots?.length) {
    s.ph = "bid";
    s.au = { i: 0, price: u.lots[0].base, lead: -1, purse: u.purse ?? 100, val: 0, got: [] };
    s.au.val = drawVal(s, u.lots[0]);
    return s;
  }
  beginRaid(s);
  return s;
}

function attachJSON(s: S) {
  s.toJSON = function (this: S) {
    const t = this.tl;
    return [this.u, this.r, this.ph, this.turn, this.m.sc, this.m.al, this.m.q, this.m.em, this.m.t, this.pd ?? "",
      this.rd ? [this.rd.tc, this.rd.bn, this.rd.tm, this.rd.hold, this.rd.used, this.rd.ret] : 0,
      this.ai ? [this.ai.d, this.ai.m, this.ai.show, this.ai.r, this.ai.k] : 0,
      [t.pts, t.opp, t.stops, t.esc, t.sT, t.sR, t.bon, t.kick, t.dub, t.toe, t.caught, t.raids, t.defs, t.allOut, t.drsW, t.drsL, t.chain],
      this.dr ? [this.dr.d, this.dr.truth, this.dr.call] : 0, this.rv, this.au ? [this.au.i, this.au.price, this.au.lead, this.au.purse, this.au.got] : 0,
      this.sta ?? 0, this.ri, this.gi, this.end, this.lm].join("|");
  };
}

function drawVal(s: S, lot: Lot): number {
  return Math.round(lot.lo + next(s) * (lot.hi - lot.lo));
}

function beginRaid(s: S) {
  const u = unitOf(s);
  if (s.turn === 0) {
    s.rd = { tc: [], bn: 0, tm: 0, dd: isDoOrDie(s.m, 0) ? 1 : 0, st: count(s.m.al[1]), hold: -1, used: "", ret: "", slot: raiderSlotOf(s.m.al[0]) };
    s.ai = null;
    s.ph = s.sta && u.raiders!.length > 1 ? "pick" : "touch";
  } else {
    s.rd = { tc: [], bn: 0, tm: 0, dd: isDoOrDie(s.m, 1) ? 1 : 0, st: count(s.m.al[0]), hold: -1, used: "", ret: "", slot: raiderSlotOf(s.m.al[1]) };
    s.ai = plan(s, true);
    s.ph = s.ai.m === "bonus" || s.ai.k > 0 ? "dtouch" : "dret";
  }
}

// ───────────────────────────── CPU raider brain ─────────────────────────────
function gatePlan(s: S, first: boolean): Plan | null {
  const u = unitOf(s);
  if (!u.gate) return null;
  const spec = u.gate[s.gi % u.gate.length];
  const [touches, ret] = spec.split(">");
  const list = touches ? touches.split(",") : [];
  const done = s.rd!.tc.length + (s.rd!.bn ? 1 : 0);
  const step = first ? 0 : done;
  const al = s.m.al[0];
  const r = (ret || "walk") as ReturnMove;
  if (step >= list.length) return { d: s.ai?.d ?? 3, m: "hand", show: "hand", r, rshow: r, k: 0 };
  const [mv, sl] = list[step].split("@");
  let d = sl === undefined ? slotsOf(al)[0] : Number(sl);
  if (!alive(al, d) || s.rd!.tc.includes(d)) {
    const ranks = slotsOf(al).filter((x) => !s.rd!.tc.includes(x));
    d = ranks.reduce((b, x) => (Math.abs(x - d) < Math.abs(b - d) ? x : b), ranks[0] ?? 3);
  }
  if (mv === "bonus") d = slotsOf(al)[0];
  return { d, m: mv as TouchMove, show: mv as TouchMove, r, rshow: r, k: list.filter((x) => !x.startsWith("bonus")).length };
}

/** Best response quality the player has against (target, move) — what a smart CPU raider avoids. */
function threatOf(s: S, d: number, m: TouchMove): number {
  const role = roleAt(s, d);
  let best = 0;
  for (const dm of unitOf(s).def ?? []) {
    const b = DEF_TOUCH[dm][m] * (ROLE_MULT[role][dm] ?? 1);
    if (b > best) best = b;
  }
  return best;
}

function plan(s: S, first: boolean): Plan {
  const g = gatePlan(s, first);
  if (g) return g;
  const u = unitOf(s), ai = u.ai!, al = s.m.al[0], rd = s.rd!;
  const targets = slotsOf(al).filter((x) => !rd.tc.includes(x));
  const smartP = ai.smart === 0 ? 0 : ai.smart === 1 ? 0.6 : 0.85;
  const dod = rd.dd === 1 && ai.smart === 2;
  const pickTouch = (): { d: number; m: TouchMove } => {
    const moves = ai.mv.filter((m) => m !== "bonus");
    if (!moves.length || !targets.length) return { d: targets[0] ?? 3, m: "hand" };
    if (next(s) < smartP) {
      let best = { d: targets[0], m: moves[0] }, bv = Infinity;
      for (const d of targets) for (const m of moves) {
        if (m === "kick" && roleAt(s, d) !== "R" && rd.tc.length === 0) continue;
        const v = threatOf(s, d, m) + next(s) * 0.05;
        if (v < bv) { bv = v; best = { d, m }; }
      }
      return best;
    }
    const d = targets[Math.floor(next(s) * targets.length)];
    let m = moves[Math.floor(next(s) * moves.length)];
    if (m === "kick" && roleAt(s, d) !== "R" && rd.tc.length === 0) m = moves.find((x) => x !== "kick") ?? "hand";
    return { d, m };
  };
  let d: number, m: TouchMove;
  const bonusOk = first && ai.mv.includes("bonus") && bonusLive(s.m, 0) && !rd.bn;
  if (bonusOk && (next(s) < (ai.bonusRate ?? 0.3) || (dod && next(s) < 0.8))) {
    const ranks = slotsOf(al);
    d = next(s) < 0.5 ? ranks[0] : ranks[ranks.length - 1];
    m = "bonus";
  } else ({ d, m } = pickTouch());
  // way home
  let r = ai.ret[Math.floor(next(s) * ai.ret.length)];
  if (ai.ret.length > 1 && next(s) < smartP) {
    let bv = Infinity;
    for (const x of ai.ret) {
      let best = 0;
      for (const dm of u.def ?? []) {
        let b = DEF_RET[dm][x];
        for (const sl of slotsOf(al)) b = Math.max(b, DEF_RET[dm][x] * (ROLE_MULT[roleAt(s, sl)][dm] ?? 1));
        best = Math.max(best, b);
      }
      const v = best + next(s) * 0.05;
      if (v < bv) { bv = v; r = x; }
    }
  }
  // how deep
  let k = 1;
  if (m === "bonus") k = 0;
  if (ai.k > 1 && !dod) {
    const roll = next(s);
    if (ai.smart === 0) k = roll < 0.2 ? 2 : k;
    else if (roll < 0.35) k = Math.min(ai.k, k + 1 + (roll < 0.12 ? 1 : 0));
  }
  if (!first) k = s.ai!.k;
  // feints
  let show = m, rshow = r;
  if (ai.bluff > 0 && next(s) < ai.bluff) {
    const alt = ai.mv.filter((x) => x !== m && x !== "bonus");
    if (alt.length && m !== "bonus") show = alt[Math.floor(next(s) * alt.length)];
  }
  if (ai.bluff > 0 && ai.ret.length > 1 && next(s) < ai.bluff) {
    const alt = ai.ret.filter((x) => x !== r);
    rshow = alt[Math.floor(next(s) * alt.length)];
  }
  return { d, m, show, r, rshow, k };
}

// ───────────────────────────── legal decisions ─────────────────────────────
/**
 * A pending decision resolves when its animation ends. The input trace records which quarter of the release
 * frame it landed on (go, go', go'', go'''): that seeds what happens AFTER this resolution, never its result.
 */
export const GO_FRAMES = ["go", "go'", "go''", "go'''"];
export function legalMoves(s: S): string[] {
  if (s.end) return [];
  if (s.pd) return GO_FRAMES;
  const u = unitOf(s);
  switch (s.ph) {
    case "bid": {
      const a = s.au!, lot = u.lots![a.i];
      const my = a.lead === -1 ? lot.base : a.price + 5;
      const out = ["pass"];
      if (a.lead !== 0 && a.purse >= my) out.unshift("bid");
      return out;
    }
    case "pick":
      return u.raiders!.map((_, i) => `pick@${i}`);
    case "touch": {
      const rd = s.rd!, out: string[] = [];
      if (rd.tm + TIME.hand <= RAID_CLOCK) {
        for (const sl of slotsOf(s.m.al[1])) {
          if (rd.tc.includes(sl)) continue;
          for (const mv of ["hand", "toe", "kick"] as TouchMove[]) {
            if (!u.moves.includes(mv)) continue;
            if (mv === "kick" && traitAt(u, sl) !== "R" && rd.tc.length === 0) continue;
            out.push(`${mv}@${sl}`);
          }
        }
      }
      if (u.moves.includes("bonus") && !rd.bn && rd.st >= 6 && rd.tm + TIME.bonus <= RAID_CLOCK) out.push("bonus");
      for (const r of ["walk", "dash", "dubki"]) if (u.moves.includes(r as ReturnMove)) out.push(r);
      return out;
    }
    case "ret":
      return ["walk", "dash", "dubki"].filter((r) => u.moves.includes(r as ReturnMove));
    case "str":
      return u.moves.includes("lunge") ? ["pull", "lunge"] : ["pull"];
    case "drs":
      return s.rv > 0 ? ["accept", "review"] : ["accept"];
    case "dtouch":
    case "dret": {
      const def = u.def ?? ["ankle"], al = s.m.al[0], ranks = slotsOf(al), out = ["hold"];
      const di = ranks.indexOf(s.ai!.d);
      for (let j = Math.max(0, di - 2); j <= Math.min(ranks.length - 1, di + 2); j++) {
        const x = ranks[j];
        for (const dm of ["ankle", "thigh", "rush"] as DefMove[]) if (def.includes(dm)) out.push(`${dm}@${x}`);
        if (def.includes("chain") && j + 1 < ranks.length && Math.abs(j - di) <= 1 && (j === di || j + 1 === di || j + 1 === di + 1 || j === di - 1))
          out.push(`chain@${x}`);
      }
      if (s.ph === "dret" && def.includes("block") && ranks.length >= 3) out.push("block");
      return [...new Set(out)];
    }
  }
  return [];
}

// ───────────────────────────── outcomes of a pending decision ─────────────────────────────
type Outcome = { p: number; k: string };

function outcomes(s: S, mv: string): Outcome[] {
  const u = unitOf(s);
  if (mv === "bid") {
    const a = s.au!, lot = u.lots![a.i];
    const my = a.lead === -1 ? lot.base : a.price + 5;
    const q = lot.hi <= lot.lo ? (my + 5 > lot.hi ? 1 : 0) : clamp((my + 5 - lot.lo) / (lot.hi - lot.lo), 0, 1);
    return [{ p: q, k: "win" }, { p: 1 - q, k: "raise" }];
  }
  if (mv === "review") {
    const q = s.dr!.tight === 2 ? 0.45 : 0.2;
    return [{ p: q, k: "over" }, { p: 1 - q, k: "stand" }];
  }
  if (s.ph === "touch") {
    const tm = (mv.includes("@") ? mv.split("@")[0] : mv) as TouchMove;
    const d = mv.includes("@") ? parseSlot(mv) : -1;
    const c = touchCatch(s, d, tm), l = touchLand(s, d, tm);
    return [{ p: c.p, k: "held" }, { p: (1 - c.p) * l, k: "land" }, { p: (1 - c.p) * (1 - l), k: "miss" }];
  }
  if (s.ph === "ret") {
    const c = returnCatch(s, mv as ReturnMove);
    return [{ p: c.p, k: "held" }, { p: 1 - c.p, k: "home" }];
  }
  if (s.ph === "str") {
    const e = escapeChance(s, mv as "pull" | "lunge");
    return [{ p: e, k: "esc" }, { p: 1 - e, k: "out" }];
  }
  if (s.ph === "dtouch" || s.ph === "dret") {
    // The player's belief: telegraph + bluff rate. Resolution uses the hidden actual move.
    const ai = u.ai!, beat = s.ph === "dtouch" ? "touch" : "ret";
    const bl = u.gate ? 0 : ai.bluff;
    const opts = beat === "touch"
      ? belief<TouchMove>(s.ai!.show, s.ai!.show === "bonus" ? ["bonus"] : ai.mv.filter((x) => x !== "bonus"), bl)
      : belief<ReturnMove>(s.ai!.rshow, ai.ret, bl);
    const out: Outcome[] = [];
    const land = beat === "touch" ? (s.ai!.show === "bonus" ? 0.8 + 0.15 * ai.s : aiTouchLand(s)) : 0;
    for (const o of opts) {
      const pt = tacklePower(s, mv, o.m, beat);
      const e = aiEscape(s, mv);
      out.push({ p: o.p * pt * (1 - e), k: "stop" });
      out.push({ p: o.p * pt * e, k: "slip" });
      const tag = mv === "hold" ? 0 : beat === "touch" ? 0.75 : 0.6;
      if (beat === "touch") {
        out.push({ p: o.p * (1 - pt) * tag * land, k: "tagT" });
        out.push({ p: o.p * (1 - pt) * tag * (1 - land), k: "tag" });
        out.push({ p: o.p * (1 - pt) * (1 - tag) * land, k: "T" });
        out.push({ p: o.p * (1 - pt) * (1 - tag) * (1 - land), k: "none" });
      } else {
        out.push({ p: o.p * (1 - pt) * tag, k: "tag" });
        out.push({ p: o.p * (1 - pt) * (1 - tag), k: "none" });
      }
    }
    return out.filter((o) => o.p > 0);
  }
  return [{ p: 1, k: "" }];
}

// ───────────────────────────── apply ─────────────────────────────
export function apply(s0: S, mv: string): S {
  const s = clone(s0);
  const go = mv.startsWith("go");
  s.r = mix(s.r, go ? "go" : mv);
  s.moves++;
  if (go) {
    const pd = s.pd!;
    s.pd = null;
    resolve(s, pd, null);
    // the release frame only seeds what comes AFTER this resolution — never its own result
    if (mv !== "go") s.r = mix(s.r, mv);
    return s;
  }
  switch (s.ph) {
    case "bid":
      if (mv === "pass") { lotLost(s); return s; }
      s.pd = mv;
      return s;
    case "pick":
      s.ri = parseSlot(mv);
      s.rs = unitOf(s).raiders![s.ri].st;
      s.ph = "touch";
      return s;
    case "drs":
      if (mv === "accept") { settleDrs(s, s.dr!.call); return s; }
      s.pd = mv;
      return s;
    default:
      if (s.ph === "touch" && (mv === "walk" || mv === "dash" || mv === "dubki")) s.ph = "ret";
      s.pd = mv;
      return s;
  }
}

/** Resolve a pending decision. `forced` picks the outcome (EV enumeration); null draws it from the rng. */
function resolve(s: S, pd: string, forced: string | null) {
  const u = unitOf(s);
  let k = forced;
  let roll = 0;
  if (k === null) {
    const os = outcomes(s, pd);
    roll = next(s);
    let acc = 0;
    k = os[os.length - 1].k;
    for (const o of os) { acc += o.p; if (roll < acc) { k = o.k; break; } }
  }
  if (pd === "bid") {
    const a = s.au!, lot = u.lots![a.i];
    const my = a.lead === -1 ? lot.base : a.price + 5;
    const win = forced === null ? s.au!.val < my + 5 : k === "win"; // the franchises only raise while the lot is worth it to them
    if (win) { a.purse -= my; a.price = my; a.got.push(a.i); nextLot(s); }
    else { a.price = my + 5; a.lead = 1; if (a.purse < a.price + 5) lotLost(s); }
    return;
  }
  if (pd === "review") {
    const dr = s.dr!;
    const over = forced === null ? dr.truth !== dr.call : k === "over";
    if (over) { s.tl.drsW++; settleDrs(s, forced === null ? dr.truth : dr.call ? 0 : 1); }
    else { s.tl.drsL++; s.rv--; settleDrs(s, dr.call); }
    return;
  }
  const rd = s.rd!;
  switch (s.ph) {
    case "touch": {
      const tm = (pd.includes("@") ? pd.split("@")[0] : pd) as TouchMove;
      const d = pd.includes("@") ? parseSlot(pd) : -1;
      rd.tm += TIME[tm];
      if (k === "held") {
        rd.hold = touchCatch(s, d, tm).holder;
        s.ph = "str";
        return;
      }
      // a close call on the touch (the roll sat on the land/miss edge) → the player may send it to DRS
      if (forced === null && u.drs && s.rv > 0 && tm !== "bonus" && (k === "land" || k === "miss")) {
        const c = touchCatch(s, d, tm).p, l = touchLand(s, d, tm);
        const margin = Math.abs(roll - (c + (1 - c) * l)) / Math.max(0.05, 1 - c);
        if (margin < 0.1) {
          const truth: 0 | 1 = k === "land" ? 1 : 0;
          const tight: 1 | 2 = margin < 0.04 ? 2 : 1;
          const wrong = next(s) < (tight === 2 ? 0.45 : 0.2);
          s.dr = { side: 0, d, truth, call: (wrong ? 1 - truth : truth) as 0 | 1, tight, tm };
          s.ph = "drs";
          return;
        }
      }
      if (k === "land") landTouch(s, d, tm);
      return;
    }
    case "ret": {
      rd.tm += TIME.ret;
      rd.ret = pd === "walk" ? "w" : pd === "dash" ? "d" : "u";
      if (rd.tm > RAID_CLOCK) { endMyRaid(s, "time"); return; }
      if (k === "held") { rd.hold = returnCatch(s, pd as ReturnMove).holder; s.ph = "str"; return; }
      endMyRaid(s, null);
      return;
    }
    case "str": {
      rd.tm += TIME.str;
      if (k === "esc") {
        if (!rd.tc.includes(rd.hold)) rd.tc.push(rd.hold);
        rd.ret = "e";
        s.tl.esc++;
        endMyRaid(s, null, true);
      } else endMyRaid(s, "tackle");
      return;
    }
    case "dtouch":
    case "dret":
      resolveDefence(s, pd, k!, forced !== null);
      return;
  }
}

function settleDrs(s: S, touched: 0 | 1) {
  const dr = s.dr!;
  s.dr = null;
  if (dr.side === 0) {
    s.ph = "touch";
    if (touched) landTouch(s, dr.d, dr.tm);
  } else {
    if (touched && !s.rd!.tc.includes(dr.d)) s.rd!.tc.push(dr.d);
    afterDefBeat(s);
  }
}

function landTouch(s: S, d: number, tm: TouchMove) {
  const rd = s.rd!;
  if (tm === "bonus") { rd.bn = 1; return; }
  if (!rd.tc.includes(d)) rd.tc.push(d);
  rd.used += tm === "hand" ? "h" : tm === "toe" ? "t" : "k";
}

function resolveDefence(s: S, resp: string, k: string, forced: boolean) {
  const rd = s.rd!, pl = s.ai!, beat = s.ph === "dtouch" ? "touch" : "ret";
  rd.tm += beat === "touch" ? TIME[pl.m] : TIME.ret;
  const x = resp.includes("@") ? parseSlot(resp) : -1;
  // with a real draw, decide on the hidden ACTUAL move (feints are real)
  if (!forced) {
    const pt = tacklePower(s, resp, beat === "touch" ? pl.m : pl.r, beat);
    const e = aiEscape(s, resp);
    const u1 = next(s), u2 = next(s), u3 = next(s);
    const land = beat === "touch" ? (pl.m === "bonus" ? 0.8 + 0.15 * unitOf(s).ai!.s : aiTouchLand(s)) : 0;
    const tag = resp === "hold" ? 0 : beat === "touch" ? 0.75 : 0.6;
    if (u1 < pt) k = u2 < e ? "slip" : "stop";
    else {
      const tagged = u2 < tag, landed = u3 < land;
      k = beat === "touch" ? (tagged ? (landed ? "tagT" : "tag") : landed ? "T" : "none") : tagged ? "tag" : "none";
      // close call on the touch → the player may review it
      if (beat === "touch" && pl.m !== "bonus" && unitOf(s).drs && s.rv > 0 && Math.abs(u3 - land) < 0.1 && !tagged) {
        const tight: 1 | 2 = Math.abs(u3 - land) < 0.04 ? 2 : 1;
        const truth: 0 | 1 = landed ? 1 : 0;
        const wrong = next(s) < (tight === 2 ? 0.45 : 0.2);
        s.dr = { side: 1, d: pl.d, truth, call: (wrong ? 1 - truth : truth) as 0 | 1, tight, tm: pl.m };
        s.ph = "drs";
        return;
      }
    }
  }
  const holder = resp === "block" ? pl.d : resp.startsWith("chain") ? x : x;
  if (k === "stop") {
    if (resp.startsWith("chain")) s.tl.chain++;
    endAIRaid(s, "tackle");
    return;
  }
  if (k === "slip") {
    if (holder >= 0 && !rd.tc.includes(holder)) rd.tc.push(holder);
    endAIRaid(s, null, true);
    return;
  }
  // a broken chain costs both links: the raider tags his way out through the pair
  const tagged = resp.startsWith("chain") ? [x, nextRank(s.m.al[0], x)].filter((y) => y >= 0) : x >= 0 ? [x] : [];
  if (beat === "touch") {
    if (k === "tagT" || k === "tag") for (const y of tagged) if (!rd.tc.includes(y)) rd.tc.push(y);
    if (k === "tagT" || k === "T") {
      if (pl.m === "bonus") rd.bn = 1;
      else if (!rd.tc.includes(pl.d)) rd.tc.push(pl.d);
    }
    afterDefBeat(s);
    return;
  }
  if (k === "tag") for (const y of tagged) if (!rd.tc.includes(y)) rd.tc.push(y);
  if (rd.tm > RAID_CLOCK) { endAIRaid(s, "time"); return; }
  endAIRaid(s, null);
}

function afterDefBeat(s: S) {
  const rd = s.rd!, pl = s.ai!;
  s.ph = "dtouch";
  const touches = rd.tc.length;
  const more = touches < pl.k && rd.tm + TIME.hand + TIME.ret <= RAID_CLOCK && slotsOf(s.m.al[0]).some((x) => !rd.tc.includes(x));
  if (more) {
    const np = plan(s, false);
    s.ai = { ...np, k: pl.k, r: pl.r, rshow: pl.rshow };
    if (s.ai.m === "bonus") s.ai.m = s.ai.show = "hand";
    return;
  }
  s.ph = "dret";
  if (rd.tc.length) s.ai = { ...pl, d: rd.tc[rd.tc.length - 1] };
}

// ───────────────────────────── raid ends ─────────────────────────────
function endMyRaid(s: S, out: "tackle" | "time" | null, escaped = false) {
  const rd = s.rd!;
  const res: RaidResult = { raider: 0, touched: rd.tc, bonus: rd.bn === 1, out, raiderSlot: rd.slot, escaped, defendersAtStart: rd.st, doOrDie: rd.dd === 1 };
  const { match, events } = scoreRaid(s.m, res);
  const t = s.tl;
  t.raids++;
  if (out) t.caught++;
  if (!out && events.some((e) => e.kind === "do_or_die_out")) t.caught++;
  if (!out) {
    const scored = events.some((e) => e.kind === "touch");
    if (scored) {
      if (rd.used.includes("k")) t.kick++;
      if (rd.used.includes("t")) t.toe++;
      if (rd.ret === "u") t.dub++;
    }
    if (rd.dd && (scored || events.some((e) => e.kind === "bonus"))) t.dodWin++;
  }
  s.lm = rd.used.replace(/(.)(?=.*\1)/g, "") + (rd.bn ? "b" : "") + (rd.ret === "e" ? "" : rd.ret);
  if (s.sta) {
    const cost = 1 + (rd.tc.length >= 2 ? 1 : 0) + (rd.hold >= 0 ? 1 : 0);
    s.sta = s.sta.map((v, i) => (i === s.ri ? Math.max(0, v - cost) : Math.min(unitOf(s).raiders![i].st[3], v + 1)));
  }
  finishRaid(s, match, events, rd.tm);
}

function endAIRaid(s: S, out: "tackle" | "time" | null, escaped = false) {
  const rd = s.rd!;
  const res: RaidResult = { raider: 1, touched: rd.tc, bonus: rd.bn === 1, out, raiderSlot: rd.slot, escaped, defendersAtStart: rd.st, doOrDie: rd.dd === 1 };
  const { match, events } = scoreRaid(s.m, res);
  s.tl.defs++;
  if (out === "tackle" || events.some((e) => e.kind === "do_or_die_out" || e.kind === "time_out")) s.tl.stops++;
  if (events.some((e) => e.kind === "super_tackle")) s.tl.sT++;
  if (unitOf(s).gate) s.gi++;
  finishRaid(s, match, events, rd.tm);
}

function finishRaid(s: S, match: Match, events: RefEvent[], used: number) {
  const t = s.tl;
  for (const e of events) {
    if (e.side === 0) t.pts += e.points; else { t.opp += e.points; if (e.points) t.oppScored++; }
    if (e.kind === "super_raid" && e.side === 0) t.sR++;
    if (e.kind === "bonus" && e.side === 0) t.bon++;
    if (e.kind === "empty_raid" && e.side === 0) t.empty++;
    if (e.kind === "all_out" && e.side === 0) t.allOut++;
  }
  const before = match.t, half = unitOf(s).half ?? HALF_SECONDS;
  match.t += Math.max(used, 8) + DEAD_TIME;
  if (before < half && match.t >= half && unitOf(s).clock && unitOf(s).clock![1] > half) {
    events.push({ kind: "half_time", side: 0, points: 0 });
    match.t = half; // the half runs its full length; the second half starts on the whistle
    s.half = 1;
  }
  s.m = match;
  s.ev = events;
  s.rd = null;
  s.ai = null;
  s.ph = "done";
  const swapHalf = events.some((e) => e.kind === "half_time");
  s.turn = swapHalf ? ((unitOf(s).first ?? 0) === 0 ? 1 : 0) : s.turn === 0 ? 1 : 0;
  advance(s);
}

// ───────────────────────────── auction ─────────────────────────────
function lotLost(s: S) {
  nextLot(s);
}
function nextLot(s: S) {
  const u = unitOf(s), a = s.au!;
  a.i++;
  if (a.i < u.lots!.length) {
    a.lead = -1;
    a.price = u.lots![a.i].base;
    a.val = drawVal(s, u.lots![a.i]);
    return;
  }
  // squad assembled
  const lots = a.got.map((i) => u.lots![i]);
  const me = [...s.me];
  const place: Record<Lot["role"], number[]> = { Corner: [0, 6], Cover: [1, 5], Anchor: [2, 4], Raider: [3] };
  for (const l of lots) {
    const slot = place[l.role].find((x) => me[x] === "o");
    if (slot !== undefined && l.role !== "Raider") me[slot] = l.trait;
    if (l.role === "Raider") s.rs = [l.reach ?? 5, l.agility ?? 5, l.speed ?? 5, l.stamina ?? 5];
  }
  s.me = me.join("");
  const missing = (u.needRoles ?? []).filter((r) => !lots.some((l) => l.role === r));
  if (missing.length) { s.end = 2; s.why = `No ${missing.join(", ")} in the squad`; s.ph = "done"; return; }
  if (u.flow === "auction") { s.ph = "done"; s.end = 1; s.why = "Squad complete"; return; }
  s.au = { ...a };
  beginRaid(s);
}

// ───────────────────────────── win / lose ─────────────────────────────
function goalsMet(s: S, final: boolean): boolean {
  const u = unitOf(s), g = u.goal, t = s.tl;
  if (g.pts !== undefined && t.pts < g.pts) return false;
  if (g.stops !== undefined && t.stops < g.stops) return false;
  if (g.ghost && t.pts <= ghostPts(u)) return false;
  if (g.need) for (const [k, v] of Object.entries(g.need)) if (needCount(s, k) < (v ?? 0)) return false;
  if (g.margin !== undefined || g.fullSide) {
    if (!final) return false;
    if (g.margin !== undefined && s.m.sc[0] - s.m.sc[1] < g.margin) return false;
    if (g.fullSide && s.m.al[0] !== FULL) return false;
  }
  return true;
}

export function needCount(s: S, k: string): number {
  const t = s.tl;
  switch (k) {
    case "escape": return t.esc;
    case "superTackle": return t.sT;
    case "superRaid": return t.sR;
    case "bonus": return t.bon;
    case "kick": return t.kick;
    case "dubki": return t.dub;
    case "toe": return t.toe;
    case "lowMove": return t.toe + t.dub;
    case "allOut": return t.allOut;
    case "drsWin": return t.drsW;
    case "chain": return t.chain;
    case "dodWin": return t.dodWin;
    default: return 0;
  }
}

function failReason(s: S): string {
  const u = unitOf(s), g = u.goal, t = s.tl;
  if (g.maxOpp !== undefined && t.opp > g.maxOpp) return `Opponent scored ${t.opp}`;
  if (g.maxTrail !== undefined && s.m.sc[1] - s.m.sc[0] > g.maxTrail) return `Trailing by ${s.m.sc[1] - s.m.sc[0]}`;
  if (g.maxCaught !== undefined && t.caught >= g.maxCaught) return `Raider out ${t.caught} times`;
  if (g.minMat !== undefined && count(s.m.al[0]) < g.minMat) return `Only ${count(s.m.al[0])} on the mat`;
  if (u.goal.need?.drsWin && t.drsL >= 2) return "Lost two DRS reviews";
  return "";
}

function finished(s: S): boolean {
  const u = unitOf(s);
  if (u.clock) return s.m.t >= u.clock[1];
  if (u.flow === "raid") return s.tl.raids >= (u.raids ?? 3);
  if (u.flow === "defend") return s.tl.defs >= (u.defs ?? 3);
  return s.tl.raids >= (u.raids ?? 0) && s.tl.defs >= (u.defs ?? 0);
}

function advance(s: S) {
  const f = failReason(s);
  if (f) { s.end = 2; s.why = f; return; }
  const done = finished(s);
  if (goalsMet(s, done)) { s.end = 1; s.why = "Trial complete"; return; }
  if (done) { s.end = 2; s.why = "Goal not reached"; return; }
  const u = unitOf(s);
  if (u.flow === "raid") s.turn = 0;
  else if (u.flow === "defend") s.turn = 1;
  else if (!u.clock) {
    // alternate within the budgets
    if (s.tl.raids >= (u.raids ?? 0)) s.turn = 1;
    else if (s.tl.defs >= (u.defs ?? 0)) s.turn = 0;
  }
  beginRaid(s);
}

export const status = (s: S): "playing" | "won" | "lost" => (s.end === 1 ? "won" : s.end === 2 ? "lost" : "playing");

export function stars(s: S): number {
  if (s.end !== 1) return 0;
  return 1 + unitOf(s).stars.filter((st) => starMet(s, st)).length;
}

export function starMet(s: S, st: Star): boolean {
  const t = s.tl, v = st.v;
  switch (st.k) {
    case "noEmpty": return t.empty === 0;
    case "noCaught": return t.caught === 0;
    case "margin": return s.m.sc[0] - s.m.sc[1] >= v;
    case "pts": return t.pts >= v;
    case "oppMax": return t.opp <= v;
    case "stops": return t.stops >= v;
    case "escapes": return t.esc >= v;
    case "bonus": return t.bon >= v;
    case "fast": return t.raids <= v;
    case "superTackle": return t.sT >= v;
    case "superRaid": return t.sR >= v;
    case "chain": return t.chain >= v;
    case "kick": return t.kick >= v;
    case "dubki": return t.dub >= v;
    case "allOut": return t.allOut >= v;
    case "drsWin": return t.drsW >= v;
    case "purse": return (s.au?.purse ?? 0) >= v;
    case "fullSide": return s.m.al[0] === FULL;
  }
}

// ───────────────────────────── value (what a player "sees" as progress) ─────────────────────────────
const sig = (x: number) => 1 / (1 + Math.exp(-x));

function baseValue(s: S): number {
  if (s.end === 1) return 15;
  if (s.end === 2) return -15;
  const u = unitOf(s), g = u.goal, t = s.tl;
  let pts = t.pts, opp = t.opp, caught = t.caught, diff = s.m.sc[0] - s.m.sc[1];
  const need = { kick: t.kick, toe: t.toe, dub: t.dub, sR: t.sR, esc: t.esc, chain: t.chain };
  let stopsP = t.stops, sTP = t.sT, chainP = t.chain;
  if (s.rd && (s.ph === "touch" || s.ph === "ret" || s.ph === "str" || (s.ph === "drs" && s.dr?.side === 0))) {
    const p = safeHome(s), n = s.rd.tc.length + (s.ph === "str" && !s.rd.tc.includes(s.rd.hold) ? 1 : 0);
    const loss = s.rd.st <= 3 ? 2 : 1;
    const dodLoss = s.rd.dd && n === 0 && !s.rd.bn ? 1 : 0;
    pts += p * n + s.rd.bn; opp += (1 - p) * loss + dodLoss; caught += 1 - p + dodLoss;
    diff += p * n + s.rd.bn - (1 - p) * loss - dodLoss;
    if (n) {
      if (s.rd.used.includes("k")) need.kick += p;
      if (s.rd.used.includes("t")) need.toe += p;
      need.sR += p * Math.min(1, n / 3) * (n >= 3 ? 1 : 0.6);
    }
    if (s.ph === "str") need.esc += p;
  } else if (s.rd && (s.ph === "dtouch" || s.ph === "dret" || s.ph === "drs")) {
    // the CPU raider is still on my half: what my best tackle from here is worth
    const b = s.ph === "drs" ? { p: 0, chain: false } : bestStop(s);
    const n = s.rd.tc.length + s.rd.bn + (s.ph === "dtouch" ? 0.6 : 0);
    const gain = s.rd.st <= 3 ? 2 : 1;
    opp += (1 - b.p) * n; diff += b.p * gain - (1 - b.p) * n;
    stopsP += b.p;
    if (s.rd.st <= 3) sTP += b.p;
    if (b.chain) chainP += b.p;
  }
  let v = 0;
  if (g.pts) v += 3 * Math.min(1, pts / g.pts);
  if (g.stops) v += 3 * Math.min(1, stopsP / g.stops);
  if (g.need) for (const [k, n] of Object.entries(g.need)) {
    const c = k === "kick" ? need.kick : k === "toe" ? need.toe : k === "dubki" ? need.dub : k === "superRaid" ? need.sR : k === "escape" ? need.esc : k === "lowMove" ? need.toe + need.dub : k === "chain" ? chainP : k === "superTackle" ? sTP : needCount(s, k);
    v += 2.5 * Math.min(1, c / (n ?? 1));
  }
  if (g.margin !== undefined || u.flow === "alt") {
    const m = g.margin ?? 1;
    v += 4 * sig((diff - m + 0.5) / 2.2) + 0.08 * (count(s.m.al[0]) - count(s.m.al[1]));
  }
  if (g.ghost) v += 4 * sig((pts - ghostPts(u) - 0.5) / 1.2);
  if (g.maxOpp !== undefined) v -= 9 * (Math.min(opp, g.maxOpp + 1) / (g.maxOpp + 1)) ** 2;
  if (g.maxTrail !== undefined) v -= 1.5 * Math.max(0, -diff - g.maxTrail + 2) / 3;
  if (g.maxCaught !== undefined) v -= 1.6 * caught / g.maxCaught;
  if (g.minMat !== undefined) v -= 0.8 * Math.max(0, g.minMat + 1 - count(s.m.al[0]));
  if (g.fullSide) v += 0.25 * count(s.m.al[0]);
  if (s.au && s.ph === "bid") v += auctionValue(s);
  else if (u.lots) v += 3 + auctionQuality(s);
  return v;
}

/** My best stop chance on the current defensive beat (by the player's belief about the telegraph). */
function bestStop(s: S): { p: number; chain: boolean } {
  const u = unitOf(s), ai = u.ai!, beat = s.ph === "dtouch" ? "touch" : "ret";
  const bl = u.gate ? 0 : ai.bluff;
  const opts = beat === "touch"
    ? belief<TouchMove>(s.ai!.show, s.ai!.show === "bonus" ? ["bonus"] : ai.mv.filter((x) => x !== "bonus"), bl)
    : belief<ReturnMove>(s.ai!.rshow, ai.ret, bl);
  let best = 0, chain = false;
  for (const mv of legalMoves(s)) {
    if (mv === "hold") continue;
    let p = 0;
    for (const o of opts) p += o.p * tacklePower(s, mv, o.m, beat);
    p *= 1 - aiEscape(s, mv);
    if (p > best) { best = p; chain = mv.startsWith("chain"); }
  }
  return { p: best * (beat === "touch" ? 0.85 : 1), chain };
}

function auctionQuality(s: S): number {
  const u = unitOf(s), a = s.au!;
  let q = 0;
  for (const i of a.got) {
    const l = u.lots![i];
    q += l.role === "Raider" ? ((l.reach ?? 5) + (l.agility ?? 5) + (l.speed ?? 5) - 15) * 0.03 : l.trait === "K" ? 0.15 : 0.08;
  }
  return q;
}

function auctionValue(s: S): number {
  const u = unitOf(s), a = s.au!, lots = u.lots!;
  const have = new Set(a.got.map((i) => lots[i].role));
  const need = u.needRoles ?? [];
  const missing = need.filter((r) => !have.has(r));
  let cost = 0, dead = 0;
  for (const r of new Set(missing)) {
    // the current lot at my next bid, later lots at the middle of their market range
    const cur = lots[a.i];
    const options: number[] = [];
    if (cur && cur.role === r) options.push(a.lead === -1 ? cur.base : a.price + 5);
    for (const l of lots.slice(a.i + 1)) if (l.role === r) options.push(Math.max(l.base, (l.lo + l.hi) / 2));
    if (!options.length) { dead++; continue; }
    cost += Math.min(...options);
  }
  const n = Math.max(1, need.length);
  let v = 3 * (need.length - missing.length) / n - 4 * dead / n;
  v += 3 * (missing.length - dead) / n * sig((a.purse - cost) / 6);
  return v + auctionQuality(s) + a.purse * 0.002;
}

export function value(s: S): number {
  if (!s.pd) return baseValue(s);
  let ev = 0;
  for (const o of outcomes(s, s.pd)) {
    if (o.p <= 0) continue;
    const c = clone(s);
    const pd = c.pd!;
    c.pd = null;
    resolve(c, pd, o.k);
    ev += o.p * baseValue(c);
  }
  return ev;
}

export { MAT };

// ───────────────────────────── reads (briefing screen + level report) ─────────────────────────────
/** The unit's start position as seen at the start of one of MY raids (auction units: before the squad is bought). */
export function probeRaid(index: number): S {
  const s = start(index);
  s.au = null; s.pd = null; s.ph = "touch"; s.turn = 0; s.ai = null;
  if (s.sta) s.rs = unitOf(s).raiders![0].st;
  s.rd = { tc: [], bn: 0, tm: 0, dd: isDoOrDie(s.m, 0) ? 1 : 0, st: count(s.m.al[1]), hold: -1, used: "", ret: "", slot: raiderSlotOf(s.m.al[0]) };
  return s;
}

/** Real chances on this mat: % held for each touch move on each defender, and % held going home after 1 touch. */
export function raidRead(index: number): { touch: string[]; home: string; escape: string } {
  const s = probeRaid(index), u = unitOf(s);
  const touch: string[] = [];
  for (const sl of slotsOf(s.m.al[1])) {
    const parts: string[] = [];
    for (const mv of ["hand", "toe", "kick"] as TouchMove[]) {
      if (!u.moves.includes(mv) || (mv === "kick" && traitAt(u, sl) !== "R" && traitAt(u, sl) !== "K")) continue;
      parts.push(`${mv[0]}${Math.round(touchCatch(s, sl, mv).p * 100)}`);
    }
    touch.push(`${sl + 1}${traitAt(u, sl)}:${parts.join("/")}`);
  }
  if (u.moves.includes("bonus") && count(s.m.al[1]) >= 6) touch.push(`bonus:${Math.round(touchCatch(s, -1, "bonus").p * 100)}`);
  const one = clone(s);
  const first = slotsOf(s.m.al[1])[0];
  one.rd!.tc = first === undefined ? [] : [first];
  const home = (["walk", "dash", "dubki"] as ReturnMove[]).filter((r) => u.moves.includes(r)).map((r) => `${r} ${Math.round(returnCatch(one, r).p * 100)}%`).join(", ");
  const held = clone(one); held.ph = "str"; held.rd!.hold = returnCatch(one, "walk").holder;
  const escape = `pull ${Math.round(escapeChance(held, "pull") * 100)}%` + (u.moves.includes("lunge") ? `, lunge ${Math.round(escapeChance(held, "lunge") * 100)}%` : "");
  return { touch, home, escape };
}

/** Real stop chances for my best tackle (made by the target's cover) against each of the CPU raider's moves. */
export function defenceRead(index: number): string {
  const u = UNITS[index];
  if (!u.ai || !u.def) return "";
  const s = start(index);
  const al = s.m.al[0], ranks = slotsOf(al);
  const d = ranks[Math.floor(ranks.length / 2)] ?? 3;
  s.ai = { d, m: "hand", show: "hand", r: "walk", rshow: "walk", k: 1 };
  s.rd = { tc: [], bn: 0, tm: 0, dd: 0, st: count(al), hold: -1, used: "", ret: "", slot: 3 };
  const cover = ranks[ranks.indexOf(d) + 1] ?? ranks[ranks.indexOf(d) - 1] ?? d;
  const best = (actual: TouchMove | ReturnMove, beat: "touch" | "ret") => {
    let b = 0, name = "";
    for (const dm of u.def!) {
      const resp = dm === "block" ? "block" : dm === "chain" ? `chain@${d}` : `${dm}@${cover}`;
      if (dm === "block" && beat === "touch") continue;
      if (dm === "chain" && nextRank(al, d) < 0) continue;
      const p = tacklePower(s, resp, actual, beat) * (1 - aiEscape(s, resp));
      if (p > b) { b = p; name = dm; }
    }
    return `${name} ${Math.round(b * 100)}%`;
  };
  const touch = u.ai.mv.filter((m) => m !== "bonus" || true).map((m) => `${m}→${best(m, "touch")}`).join(", ");
  const home = u.ai.ret.map((r) => `${r}→${best(r, "ret")}`).join(", ");
  return `vs touch ${touch} | vs way home ${home} | his touch lands ${Math.round(aiTouchLand(s) * 100)}% if untackled`;
}
