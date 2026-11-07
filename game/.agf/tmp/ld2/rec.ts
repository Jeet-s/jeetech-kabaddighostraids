import { writeFileSync, readFileSync } from "fs";
import path from "path";
import { recordGhost, verifyGhost } from "../../../src/game/ghost";
import { value, apply } from "../../../src/game/engine";
import { GHOSTS, type GhostTrace } from "../../../src/game/ghosts";
import { sim } from "../../../src/game/sim";
import { UNITS } from "../../../src/game/units";
import { winRate } from "../../../scripts/bots";
import { AIM } from "../../../scripts/tune-units";
import { midSkill } from "../../../scripts/tune-units";

const greedy = (s: Parameters<typeof value>[0], legal: string[]) => {
  let best = legal[0], bv = -Infinity;
  for (const m of legal) { const v = value(apply(s, m)); if (v > bv) { bv = v; best = m; } }
  return best;
};
const want = process.argv.slice(2); // ids to record, e.g. rival rematch cage:4
const slots: Record<string, string> = {
  rival: "Ghost of your rival Sameer (Gold division)",
  rematch: "Ghost of your friend Arun (Gold division)",
  cage: "Ghost of Ravi 'Cage-breaker' (Legend division)",
};
for (const w of want) {
  const [id, ptsS, gS] = w.split(":");
  const unit = UNITS.findIndex((u) => u.ghost === id);
  if (gS) UNITS[unit].g = Number(gS);
  const goal = UNITS[unit].goal;
  UNITS[unit].goal = { pts: 99, maxCaught: goal.maxCaught };
  const runs: GhostTrace[] = [];
  for (let k = 0; k < 40; k++) runs.push(recordGhost(id, unit, 20261107 + k * 31, slots[id], greedy));
  UNITS[unit].goal = goal;
  const byPts = new Map<number, GhostTrace>();
  for (const r of runs) if (!byPts.has(r.pts)) byPts.set(r.pts, r);
  let best: GhostTrace | null = null, err = Infinity;
  for (const [pts, r] of [...byPts].sort((a, b) => a[0] - b[0])) {
    if (ptsS && ptsS !== "*" && pts !== Number(ptsS)) continue;
    GHOSTS[id] = r;
    const rate = (winRate(sim, sim.start(unit), "casual", 150).rate + midSkill(unit)) / 2;
    console.log(`  ${id}: ghost ${pts} pts → blend ${(rate * 100).toFixed(0)}% (aim ${AIM[UNITS[unit].id]})`);
    if (Math.abs(rate - AIM[UNITS[unit].id]) < err) { err = Math.abs(rate - AIM[UNITS[unit].id]); best = r; }
  }
  if (process.env.DRY) continue;
  if (!best || !verifyGhost(best)) throw new Error(`ghost ${id} does not verify`);
  GHOSTS[id] = best;
  console.log(`${id}: kept ${best.pts} points`);
}
const file = path.join(__dirname, "..", "..", "..", "src", "game", "ghosts.ts");
const src = readFileSync(file, "utf8").replace(/export const GHOSTS[\s\S]*$/, `export const GHOSTS: Record<string, GhostTrace> = ${JSON.stringify(GHOSTS)};\n`);
writeFileSync(file, src);
