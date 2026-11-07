import { readFileSync, writeFileSync } from "fs";
import { UNITS } from "../../src/game/units";
const pt = JSON.parse(readFileSync(".agf/tmp/r4_pt.json", "utf8")).personas;
const p = "docs/CONTENT.md";
const lines = readFileSync(p, "utf8").split("\n");
let n = 0;
for (let k = 0; k < lines.length; k++) {
  const m = /^\| (\d+) \| /.exec(lines[k]);
  if (!m) continue;
  const u = UNITS.find((x) => x.id === Number(m[1]));
  if (!u) continue;
  const cols = lines[k].split(" | ");
  if (cols.length < 6) continue;
  const pc = (v: number) => `${Math.round(v * 100)}%`;
  lines[k] = `| ${u.id} | ${u.name} | ${u.type} · ${u.role} | ${u.intro.length ? u.intro.join(", ") : "—"} | ${u.intent} | ${pc(pt.casual[u.id - 1])} / ${pc(pt.skilled[u.id - 1])} |`;
  n++;
}
writeFileSync(p, lines.join("\n"));
console.log("rows", n);
