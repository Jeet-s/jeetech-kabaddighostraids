import { sim } from "../../src/game/sim";
import { start, starMet, status } from "../../src/game/engine";
import { playOnce, reseed, rand } from "../../scripts/bots";
import { UNITS } from "../../src/game/units";
const ids = process.argv[2] ? process.argv[2].split(",").map(Number) : UNITS.map((u) => u.id);
for (const id of ids) {
  const i = id - 1, u = UNITS[i];
  reseed("stars" + id);
  let wins = 0; const hit = [0, 0];
  for (let k = 0; k < 40; k++) {
    let s = start(i, 0x5eed + k * 104729);
    for (let n = 0; n < 600 && status(s) === "playing"; n++) {
      const ms = sim.moves(s); let pick = ms[0], bv = -Infinity;
      for (const m of ms) { const nx = sim.apply(s, m); const v = sim.status(nx) === "won" ? Infinity : sim.progress(nx) + rand() * 1e-6; if (v > bv) { bv = v; pick = m; } }
      s = sim.apply(s, pick);
    }
    if (status(s) === "won") { wins++; u.stars.forEach((st, j) => { if (starMet(s, st)) hit[j]++; }); }
  }
  const bad = hit.some((h) => h === 0);
  if (bad || process.argv[2]) console.log(`L${id} ${u.name}: wins ${wins}/40 | ${u.stars.map((st, j) => `${st.label} ${hit[j]}`).join(" | ")} | goal ${JSON.stringify(u.goal)}`);
}
