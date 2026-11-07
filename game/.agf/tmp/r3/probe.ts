/** probe: casual/skilled (playtest bots) + competent/mid (validate players) for trial ids; OV env = {"id":{"g":..,"s":..}} */
import { sim } from "../../../src/game/sim";
import { UNITS } from "../../../src/game/units";
import { winRate, reseed } from "../../../scripts/bots";
import { apply, legalMoves, start, status, value } from "../../../src/game/engine";
const OV: Record<string, any> = JSON.parse(process.env.OV ?? "{}");
let seedState = 1;
const rnd = () => { seedState = (seedState + 0x6d2b79f5) | 0; let t = Math.imul(seedState ^ (seedState >>> 15), 1 | seedState); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32; };
function play(unit: number, seed: number, noise: number) {
  let s = start(unit, seed);
  for (let n = 0; n < 600 && status(s) === "playing"; n++) {
    const ms = legalMoves(s); let pick = ms[Math.floor(rnd() * ms.length)];
    if (rnd() >= noise) { let bv = -Infinity; for (const m of ms) { const nx = apply(s, m); const v = status(nx) === "won" ? Infinity : value(nx) + rnd() * 1e-6; if (v > bv) { bv = v; pick = m; } } }
    s = apply(s, pick);
  }
  return status(s) === "won";
}
const seedOf = (k: number) => 0x5eed + k * 104729;
for (const id of process.argv.slice(2).map(Number)) {
  const i = id - 1, u = UNITS[i], o = OV[id];
  if (o) { const { s: sk, ai, ...rest } = o; Object.assign(u, rest); if (u.ai && (sk !== undefined || ai)) u.ai = { ...u.ai, ...(ai ?? {}), ...(sk !== undefined ? { s: sk } : {}) }; }
  reseed(`probe${id}`);
  const c = winRate(sim, sim.start(i), "casual", 150).rate, sk = winRate(sim, sim.start(i), "skilled", 150).rate;
  seedState = 12345 + id * 7919;
  let w = 0; for (let k = 0; k < 40; k++) if (play(i, seedOf(k), 0.04)) w++;
  let m = 0; for (let k = 0; k < 100; k++) if (play(i, seedOf(1000 + k), 0.3)) m++;
  console.log(`L${id} ${u.role} g=${u.g} s=${u.ai?.s ?? "-"} casual ${(c * 100).toFixed(0)} skilled ${(sk * 100).toFixed(0)} competent ${w}/40 mid ${m}`);
}
