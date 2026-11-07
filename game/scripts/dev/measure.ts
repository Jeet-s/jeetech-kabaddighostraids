/// <reference types="node" />
// Dev: per-unit bot win rates. tsx scripts/dev/measure.ts [from] [to] [trials]
import { sim } from "../../src/game/sim";
import { winRate } from "../bots";
const from = Number(process.argv[2] ?? 1), to = Number(process.argv[3] ?? sim.levelCount), N = Number(process.argv[4] ?? 60);
for (let l = from - 1; l < to; l++) {
  const t0 = Date.now();
  const c = winRate(sim, sim.start(l), "casual", N), k = winRate(sim, sim.start(l), "skilled", N);
  console.log(`L${l + 1}\tcasual ${(c.rate * 100).toFixed(0)}%\tskilled ${(k.rate * 100).toFixed(0)}%\tmoves ${c.avgMoves.toFixed(0)}\t${Date.now() - t0}ms`);
}
