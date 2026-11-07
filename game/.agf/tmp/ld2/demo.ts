import { start, apply, legalMoves } from "../../../src/game/engine";
const chk = (name: string, unit: number, seed: number, moves: string[]) => {
  let s = start(unit - 1, seed); const bad: string[] = [];
  for (const m of moves) { if (!legalMoves(s).includes(m)) bad.push(`${m} (legal: ${legalMoves(s).slice(0, 12).join(",")})`); s = apply(s, m); }
  console.log(name, bad.length ? "BAD " + bad.join(" | ") : "ok", "ev:", s.ev.map((e) => e.kind).join(","), "tc", s.rd?.tc, "ph", s.ph);
};
chk("raid", 45, 1, ["toe@0", "go", "hand@3", "go"]);
chk("superraid", 45, 1, ["hand@0", "go", "hand@2", "go", "hand@4", "go", "pull", "go"]);
for (let seed = 1; seed < 400; seed++) {
  let s = start(44, seed); const mv = ["hand@0", "go", "hand@1", "go", "hand@2", "go", "dubki", "go"]; let ok = true;
  for (const m of mv) { if (!legalMoves(s).includes(m)) { ok = false; break; } s = apply(s, m); }
  if (ok && s.ev.some((e) => e.kind === "super_raid")) { console.log("superraid seed", seed, s.ev.map((e) => e.kind).join(",")); break; }
}
