import { start, apply, legalMoves, status, value } from "../../../src/game/engine";
const i = Number(process.argv[2] ?? 48); let agg = { bon: 0, kick: 0, pts: 0, won: 0, hopTried: 0 };
for (let k = 0; k < 60; k++) {
  let s = start(i, 1000 + k * 7919);
  for (let n = 0; n < 400 && status(s) === "playing"; n++) {
    const ms = legalMoves(s); let best = ms[0], bv = -Infinity;
    for (const m of ms) { const nx = apply(s, m); const v = status(nx) === "won" ? 99 : value(nx); if (v > bv) { bv = v; best = m; } }
    if (best === "bonus") agg.hopTried++;
    s = apply(s, best);
  }
  if (k < 6) console.log(s.why, JSON.stringify({bon:s.tl.bon,kick:s.tl.kick,pts:s.tl.pts,caught:s.tl.caught,raids:s.tl.raids}), s.lm);
  agg.bon += s.tl.bon; agg.kick += s.tl.kick; agg.pts += s.tl.pts; if (status(s) === "won") agg.won++;
}
console.log(agg);
