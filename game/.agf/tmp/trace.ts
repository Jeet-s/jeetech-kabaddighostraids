import { sim } from "../../src/game/sim";
import { start, status } from "../../src/game/engine";
import { rand, reseed } from "../../scripts/bots";
const i = Number(process.argv[2]) - 1; reseed("t");
let s = start(i, 0x5eed + 3 * 104729); const log: string[] = [];
for (let n = 0; n < 600 && status(s) === "playing"; n++) {
  const ms = sim.moves(s); let pick = ms[0], bv = -Infinity;
  for (const m of ms) { const nx = sim.apply(s, m); const v = sim.status(nx) === "won" ? Infinity : sim.progress(nx) + rand() * 1e-6; if (v > bv) { bv = v; pick = m; } }
  s = sim.apply(s, pick); if (!pick.startsWith("go")) log.push(pick); else if (s.ph === "done" || s.ev.length) log.push(`[${s.m.sc}|al${s.m.al[1].toString(2)}|r${s.tl.raids}${s.ev.map(e=>e.kind).join(",")}]`);
}
console.log(status(s), s.why, log.join(" "));
