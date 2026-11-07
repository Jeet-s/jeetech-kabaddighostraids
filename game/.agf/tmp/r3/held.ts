import { apply, start, legalMoves } from "../../../src/game/engine";
for (let seed = 1; seed < 400; seed++) {
  let s = start(1, seed); s = apply(s, "hand@2"); s = apply(s, legalMoves(s).find((m) => m.startsWith("go"))!);
  if (s.ph === "str") { console.log("seed", seed, legalMoves(s)); break; }
}
