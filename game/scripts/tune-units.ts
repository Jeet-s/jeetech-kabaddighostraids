/// <reference types="node" />
/**
 * Raid Trial tuner: for each unit, search ONE difficulty knob until the casual bot's win rate (the same bots and
 * trial count as the factory playtest) sits on the target pacing curve. Design (formation, moves, goals) is never
 * changed here — only how hard the opponent grips (g), how good the CPU raider is (s), or the auction purse.
 *   npx tsx scripts/tune-units.ts <from> <to>      → writes .agf/tmp/tune_<id>.json per unit
 *   npx tsx scripts/tune-units.ts --merge           → folds them into src/game/tuning.json
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { sim } from "../src/game/sim";
import { UNITS } from "../src/game/units";
import { playOnce, reseed, winRate } from "./bots";
import { start } from "../src/game/engine";

const TMP = path.join(__dirname, "..", ".agf", "tmp");
const TUNING = path.join(__dirname, "..", "src", "game", "tuning.json");
const TRIALS = Number(process.env.TUNE_TRIALS ?? 150);

/** Target casual win rate per unit (chapter climb, spikes, breathers; last third 30-65%). */
export const AIM: Record<number, number> = {
  1: 0.98, 2: 0.94, 3: 0.93, 4: 0.92, 5: 0.93, 6: 0.93, 7: 0.92, 8: 0.87, 9: 0.88, 10: 0.86, 11: 0.82,
  12: 0.92, 13: 0.88, 14: 0.8, 15: 0.85, 16: 0.8, 17: 0.82, 18: 0.8, 19: 0.8, 20: 0.72, 21: 0.86, 22: 0.74,
  23: 0.78, 24: 0.74, 25: 0.76, 26: 0.76, 27: 0.72, 28: 0.76, 29: 0.76, 30: 0.68, 31: 0.65, 32: 0.84, 33: 0.62,
  34: 0.8, 35: 0.76, 36: 0.76, 37: 0.68, 38: 0.72, 39: 0.7, 40: 0.66, 41: 0.72, 42: 0.7, 43: 0.84, 44: 0.64,
  45: 0.68, 46: 0.66, 47: 0.6, 48: 0.64, 49: 0.66, 50: 0.62, 51: 0.66, 52: 0.62, 53: 0.62, 54: 0.74, 55: 0.57,
  56: 0.62, 57: 0.62, 58: 0.6, 59: 0.66, 60: 0.55, 61: 0.62, 62: 0.56, 63: 0.7, 64: 0.6, 65: 0.6, 66: 0.56,
};

type Knob = "g" | "s" | "purse";
/**
 * Sane ranges (level review 2026-11-07: difficulty must come from decisions, not stat inflation): the opponent's
 * grip keeps the RIGHT raid option under ~50% held, the CPU raider's skill keeps my right tackle above ~45%.
 */
export const gDesign = (ch: number) => 0.5 + 0.1 * ch;
const gMax = (ch: number) => 0.45 + 0.12 * ch;
const S_MIN = 0.1, S_MAX = 0.7;
/** Teach units and breathers keep a gentle CPU raider (review: "s 0.69 isn't a breather"); difficulty comes from grip/design. */
const sMax = (role: string, ch = 0) => (role === "teach" || role === "breather" ? (role === "teach" && ch >= 5 ? 0.55 : 0.45) : role === "boss" || role === "spike" || (role === "twist" && ch >= 5) ? S_MAX : 0.65);
const sCap = (u: { role: string; ch: number }) => (u.ch <= 2 && (u.role === "boss" || u.role === "spike") ? 0.5 : sMax(u.role, u.ch));

/** Per-trial grip ceilings the level review asked for (66: "lower the grip" from 1.59 — the final's difficulty comes from
 *  its Hard-thinking raider and the three systems, not from stat inflation). */
const G_CAP: Record<number, number> = { 66: 1.45 };

function stages(i: number): { k: Knob; lo: number; hi: number; harder: 1 | -1 }[] {
  const u = UNITS[i];
  if (u.flow === "auction") return []; // the purse is designed (scarcity is the lesson), never tuned
  if (u.flow === "defend") return [{ k: "s", lo: S_MIN, hi: sCap(u), harder: 1 }];
  if (u.flow === "raid") return [{ k: "g", lo: 0.15, hi: gMax(u.ch), harder: 1 }];
  // matches: the CPU raider's strength first (grip at the chapter's design level), then grip within its cap
  // chapter bosses may grip harder (a final is a final), still well short of the old stat walls
  return [{ k: "s", lo: S_MIN, hi: sCap(u), harder: 1 }, { k: "g", lo: 0.3, hi: Math.min(G_CAP[u.id] ?? 9, gMax(u.ch) + (u.role === "boss" ? 0.45 : 0.15)), harder: 1 }];
}

function get(i: number, k: Knob): number {
  const u = UNITS[i];
  return k === "g" ? u.g : k === "s" ? u.ai!.s + (1 - (u.w ?? 1)) / 0.4 : u.purse ?? 100;
}
function set(i: number, k: Knob, v: number) {
  const u = UNITS[i];
  if (k === "g") u.g = v;
  else if (k === "s") { u.ai = { ...u.ai!, s: Math.min(1, v) }; u.w = Number((1 - Math.max(0, v - 1) * 0.4).toFixed(3)); }
  else u.purse = Math.round(v);
}

/**
 * The tuner's casual rate blends the factory playtest (fixed start seed, 150 bot runs) with the mid-skill player on
 * 100 FRESH match seeds (what validate's PROOF row reports), so the two numbers the review sees agree.
 */
export function midSkill(i: number, n = 100): number {
  reseed(`mid|${i}|${UNITS[i].g}|${UNITS[i].ai?.s ?? 0}|${UNITS[i].purse ?? 0}`);
  let w = 0;
  for (let k = 0; k < n; k++) if (playOnce(sim, start(i, 0x5eed + (1000 + k) * 104729), 0.3).won) w++;
  return w / n;
}
const rate = (i: number) => (winRate(sim, sim.start(i), "casual", TRIALS).rate + midSkill(i)) / 2;

function search(i: number, k: Knob, L: number, H: number, harder: 1 | -1, aim: number) {
  let lo = L, hi = H, best = { v: get(i, k), r: -1, err: Infinity };
  for (let it = 0; it < (k === "purse" ? 7 : 9); it++) {
    const v = (lo + hi) / 2;
    set(i, k, v);
    const r = rate(i);
    const err = Math.abs(r - aim);
    if (err < best.err) best = { v, r, err };
    if (err < 0.015) break;
    const tooEasy = r > aim; // too easy → make it harder
    if ((tooEasy && harder === 1) || (!tooEasy && harder === -1)) lo = v; else hi = v;
  }
  set(i, k, k === "purse" ? Math.round(best.v) : Number(best.v.toFixed(3)));
  return best;
}

function tune(i: number) {
  const u = UNITS[i], id = u.id, aim = AIM[id];
  if (u.ghost) { console.log(`L${id} ghost duel — paced by the ghost's score (scripts/record-ghosts.ts)`); return; }
  if (u.flow === "alt") u.g = gDesign(u.ch);
  const out: Record<string, number> = { id, aim };
  for (const st of stages(i)) {
    const b = search(i, st.k, st.lo, st.hi, st.harder, aim);
    out[st.k] = get(i, st.k);
    if (b.err < 0.04) break;
  }
  if (u.flow === "alt") out.g = u.g;
  const r = winRate(sim, sim.start(i), "casual", TRIALS).rate, mid = midSkill(i), skilled = winRate(sim, sim.start(i), "skilled", TRIALS).rate;
  Object.assign(out, { casual: r, mid, skilled });
  mkdirSync(TMP, { recursive: true });
  writeFileSync(path.join(TMP, `tune_${id}.json`), JSON.stringify(out));
  console.log(`L${id} g=${u.g.toFixed(2)} s=${u.ai?.s.toFixed(2) ?? "-"} w=${u.w ?? 1} casual ${(r * 100).toFixed(0)}% mid ${(mid * 100).toFixed(0)}% (aim ${(aim * 100).toFixed(0)}%) skilled ${(skilled * 100).toFixed(0)}%`);
}

if (require.main !== module) {
  // imported for AIM only
} else if (process.argv[2] === "--merge") {
  const t: Record<string, Record<string, number>> = existsSync(TUNING) ? JSON.parse(readFileSync(TUNING, "utf8")) : {};
  for (const f of readdirSync(TMP).filter((f) => f.startsWith("tune_"))) {
    const r = JSON.parse(readFileSync(path.join(TMP, f), "utf8"));
    const e: Record<string, number> = { ...(t[r.id] ?? {}) };
    for (const k of ["g", "s", "purse"]) if (r[k] !== undefined) e[k] = r[k];
    if (r.s !== undefined) { e.s = Math.min(1, r.s); e.w = Number((1 - Math.max(0, r.s - 1) * 0.4).toFixed(3)); }
    t[r.id] = e;
  }
  writeFileSync(TUNING, JSON.stringify(t, null, 1) + "\n");
  console.log(`merged ${Object.keys(t).length} units into src/game/tuning.json`);
} else {
  if (process.argv[2]?.includes(",")) for (const id of process.argv[2].split(",").map(Number)) tune(id - 1);
  else {
    const from = Number(process.argv[2] ?? 1), to = Number(process.argv[3] ?? UNITS.length);
    for (let i = from - 1; i < to; i++) tune(i);
  }
}
