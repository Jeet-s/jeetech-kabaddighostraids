/// <reference types="node" />
// Dev: prints the per-unit lines of docs/CONTENT.md from src/game/units.ts (keep the doc and the data in step).
import { readFileSync } from "fs";
import { UNITS, CHAPTERS } from "../../src/game/units";
const pt = JSON.parse(readFileSync(".agf/playtest.json", "utf8")).personas;
for (const c of CHAPTERS) {
  console.log(`\n### Chapter ${c.n} — ${c.name} (trials ${c.from}-${c.to})\n`);
  console.log("| # | Trial | Type · role | Introduces | What it tests (aha) | Casual / skilled bot |");
  console.log("|---|---|---|---|---|---|");
  for (const u of UNITS.filter((x) => x.ch === c.n)) {
    const i = u.id - 1;
    console.log(`| ${u.id} | ${u.name} | ${u.type} · ${u.role} | ${u.intro.join(", ") || "—"} | ${u.intent.replace(/\|/g, "/")} | ${Math.round(pt.casual[i] * 100)}% / ${Math.round(pt.skilled[i] * 100)}% |`);
  }
}
