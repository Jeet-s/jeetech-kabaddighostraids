import { sim } from "../../../src/game/sim";
for (const a of process.argv.slice(2)) { const d = sim.describe(Number(a) - 1); console.log(`== L${a}\n${d.grid.split("\n").filter((l) => /READ|GOAL|PROOF|OPP MAT|CPU/.test(l)).map((l) => l.slice(0, 260)).join("\n")}`); }
