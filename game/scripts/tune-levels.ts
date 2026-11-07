/// <reference types="node" />
/**
 * SHOWCASE level tuner (the builder writes its own for its game): generate many
 * candidate levels per slot, playtest each with human-like bots, keep the one
 * whose win rate is closest to a target pacing curve, write src/game/levels.json.
 * This is how good puzzle games are paced — by measuring, not guessing.
 *   npx tsx scripts/tune-levels.ts
 */
import { writeFileSync } from "fs";
import path from "path";
import { press, solved, type LevelDef } from "../src/game/lights";
import type { Sim } from "../src/game/sim";
import { winRate } from "./bots";

const N = 30;
const CANDIDATES = 40;
const TRIALS = 120;
const CHAPTERS = ["Dawn Garden", "Crystal Caves", "Neon City", "Starfall Peaks", "Aurora Sky"];
const allowed = (par: number) => par * 3 + 4;

let seed = 99;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

/** Target first-try win rate for a casual player: easy start, steady climb, boss + breather every 6. */
export function target(n: number): number {
  const base = 0.95 - 0.55 * ((n - 1) / (N - 1));
  const boss = n % 6 === 0 ? -0.15 : n % 6 === 1 && n > 1 ? +0.1 : 0;
  return Math.max(0.3, Math.min(0.97, base + boss));
}

function casualWinRate(start: boolean[], size: number, par: number): number {
  // Same bots + Sim the factory's QA playtest uses.
  const state = { level: -1, board: start, moves: 0, size, allowed: allowed(par) };
  return winRate(tuneSim, state, "casual", TRIALS).rate;
}

// Sim over an ad-hoc candidate (not yet in LEVELS).
type Cand = { level: number; board: boolean[]; moves: number; size: number; allowed: number };
const tuneSim: Sim<Cand, number> = {
  levelCount: 0,
  start: () => { throw new Error("unused"); },
  moves: (s) => s.board.map((_, i) => i),
  apply: (s, m) => ({ ...s, board: press(s.board, s.size, m), moves: s.moves + 1 }),
  status: (s) => (solved(s.board) ? "won" : s.moves >= s.allowed ? "lost" : "playing"),
  progress: (s) => s.board.filter(Boolean).length / s.board.length,
  describe: () => { throw new Error("unused"); },
};

/** Same board under rotation/mirroring = same puzzle to a player. Key = smallest of the 8 symmetric encodings. */
function canonical(board: boolean[], size: number): string {
  const at = (b: boolean[], r: number, c: number) => b[r * size + c];
  const variants: string[] = [];
  for (let t = 0; t < 8; t++) {
    let key = "";
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++) {
        let [rr, cc] = [r, c];
        for (let k = 0; k < t % 4; k++) [rr, cc] = [cc, size - 1 - rr];
        if (t >= 4) cc = size - 1 - cc;
        key += at(board, rr, cc) ? "1" : "0";
      }
    variants.push(key);
  }
  return `${size}:${variants.sort()[0]}`;
}
const seen = new Set<string>();

const levels: (LevelDef & { winRate: number; target: number })[] = [];
for (let n = 1; n <= N; n++) {
  const size = n === 1 ? 2 : n <= 8 ? 3 : n <= 20 ? 4 : 5; // level 1: a 2×2 warm-up — one tap wins
  const want = target(n);
  let best: (typeof levels)[number] | null = null;
  for (let c = 0; c < CANDIDATES; c++) {
    const presses = 1 + Math.floor(rand() * Math.min(size * size - 3, 2 + Math.floor(n / 3)));
    const chosen = new Set<number>();
    while (chosen.size < presses) chosen.add(Math.floor(rand() * size * size));
    let board = Array<boolean>(size * size).fill(true);
    for (const i of chosen) board = press(board, size, i);
    if (solved(board) || seen.has(canonical(board, size))) continue; // never repeat a puzzle
    const wr = casualWinRate(board, size, chosen.size);
    const cand = {
      id: `L${n}`, number: n, size, start: board, solution: [...chosen], par: chosen.size,
      chapter: CHAPTERS[Math.min(CHAPTERS.length - 1, Math.floor((n - 1) / 6))], winRate: wr, target: want,
    };
    if (!best || Math.abs(wr - want) < Math.abs(best.winRate - want)) best = cand;
  }
  if (!best) throw new Error(`L${n}: no unique candidate — raise CANDIDATES`);
  seen.add(canonical(best.start, size));
  levels.push(best);
  console.log(`L${n} size ${size} par ${best!.par}: win ${best!.winRate.toFixed(2)} (target ${want.toFixed(2)})`);
}
writeFileSync(path.join(__dirname, "../src/game/levels.json"), JSON.stringify(levels.map(({ winRate: _w, target: _t, ...l }) => l)));
