import { readFileSync, writeFileSync } from "fs";
import { UNITS, CHAPTERS } from "../../src/game/units";
const pt = JSON.parse(readFileSync(".agf/playtest.json", "utf8"));
const doc = readFileSync("docs/CONTENT.md", "utf8");
let out = "## Every trial\n";
for (const c of CHAPTERS) {
  out += `\n### Chapter ${c.n} — ${c.name} (trials ${c.from}-${c.to})\n\n| # | Trial | Type · role | Introduces | What it tests (aha) | Casual / skilled bot |\n|---|---|---|---|---|---|\n`;
  for (const u of UNITS.filter((x) => x.ch === c.n)) {
    out += `| ${u.id} | ${u.name} | ${u.type} · ${u.role} | ${u.intro.join(", ") || "—"} | ${u.intent.replace(/\|/g, "/")} | ${Math.round(pt.personas.casual[u.id - 1] * 100)}% / ${Math.round(pt.personas.skilled[u.id - 1] * 100)}% |\n`;
  }
}
const a = doc.indexOf("## Every trial"), b = doc.indexOf("## Screens");
writeFileSync("docs/CONTENT.md", doc.slice(0, a) + out + "\n" + doc.slice(b));
