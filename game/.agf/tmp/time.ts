import { sim } from "../../src/game/sim";
import { start } from "../../src/game/engine";
import { winRate, playOnce, reseed } from "../../scripts/bots";
for (const id of (process.argv[2] ?? "1,11,22,44,66").split(",").map(Number)) {
  const t0 = Date.now();
  const r = winRate(sim, sim.start(id - 1), "casual", 150).rate;
  const t1 = Date.now();
  reseed("mid" + id); let w = 0;
  for (let k = 0; k < 100; k++) if (playOnce(sim, start(id - 1, 0x5eed + (1000 + k) * 104729), 0.3).won) w++;
  console.log(id, "casual", r.toFixed(2), (t1 - t0) + "ms", "mid", w, (Date.now() - t1) + "ms");
}
