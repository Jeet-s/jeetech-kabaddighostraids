import { apply, legalMoves, start, status, value } from "../../src/game/engine";
const id = Number(process.argv[2]), noise = Number(process.argv[3] ?? 0.3);
let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const why: Record<string, number> = {}; let w = 0;
for (let k = 0; k < 200; k++) {
  let s = start(id - 1, 1000 + k);
  for (let n = 0; n < 600 && status(s) === "playing"; n++) {
    const ms = legalMoves(s); let pick = ms[Math.floor(rnd() * ms.length)];
    if (rnd() >= noise) { let bv = -Infinity; for (const m of ms) { const v = value(apply(s, m)); if (v > bv) { bv = v; pick = m; } } }
    s = apply(s, pick);
  }
  if (status(s) === "won") w++; else why[s.why] = (why[s.why] ?? 0) + 1;
}
console.log(`L${id} won ${w}/200`, why);
