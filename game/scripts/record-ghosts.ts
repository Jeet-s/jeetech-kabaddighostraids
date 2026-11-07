/// <reference types="node" />
/**
 * Records the campaign's ghost raids into src/game/ghosts.ts. A ghost is a real run of a strong greedy raider on
 * its own seed. For each ghost slot we record runs on many seeds and keep the one whose score paces the duel on
 * the target curve (the duel's casual win rate measured with the factory bots) — the trace itself is untouched.
 */
import { writeFileSync, readFileSync } from "fs";
import path from "path";
import { recordGhost, verifyGhost } from "../src/game/ghost";
import { value, apply } from "../src/game/engine";
import { GHOSTS, type GhostTrace } from "../src/game/ghosts";
import { sim } from "../src/game/sim";
import { UNITS } from "../src/game/units";
import { winRate } from "./bots";
import { AIM } from "./tune-units";

const greedy = (s: Parameters<typeof value>[0], legal: string[]) => {
  let best = legal[0], bv = -Infinity;
  for (const m of legal) { const v = value(apply(s, m)); if (v > bv) { bv = v; best = m; } }
  return best;
};
const slots = [{ id: "friend", by: "Ghost of your friend Arun (Silver division)" }, { id: "cage", by: "Ghost of Ravi 'Cage-breaker' (Legend division)" }];
const out: Record<string, GhostTrace> = {};
for (const t of slots) {
  const unit = UNITS.findIndex((u) => u.ghost === t.id);
  const goal = UNITS[unit].goal;
  UNITS[unit].goal = { pts: 99, maxCaught: goal.maxCaught }; // the ghost raids for points
  const runs: GhostTrace[] = [];
  for (let k = 0; k < 40; k++) runs.push(recordGhost(t.id, unit, 20261107 + k * 31, t.by, greedy));
  UNITS[unit].goal = goal;
  const byPts = new Map<number, GhostTrace>();
  for (const r of runs) if (!byPts.has(r.pts)) byPts.set(r.pts, r);
  let best: GhostTrace | null = null, err = Infinity;
  for (const [pts, r] of [...byPts].sort((a, b) => a[0] - b[0])) {
    GHOSTS[t.id] = r;
    const rate = winRate(sim, sim.start(unit), "casual", 150).rate;
    console.log(`  ${t.id}: ghost ${pts} pts → casual ${(rate * 100).toFixed(0)}%`);
    if (Math.abs(rate - AIM[UNITS[unit].id]) < err) { err = Math.abs(rate - AIM[UNITS[unit].id]); best = r; }
  }
  if (!best || !verifyGhost(best)) throw new Error(`ghost ${t.id} does not verify`);
  out[t.id] = best;
  GHOSTS[t.id] = best;
  console.log(`${t.id}: kept ${best.pts} points (seed ${best.seed}, ${best.moves.length} decisions, hash ${best.hash})`);
}
const file = path.join(__dirname, "..", "src", "game", "ghosts.ts");
const src = readFileSync(file, "utf8").replace(/export const GHOSTS[\s\S]*$/, `export const GHOSTS: Record<string, GhostTrace> = ${JSON.stringify(out)};\n`);
writeFileSync(file, src);
