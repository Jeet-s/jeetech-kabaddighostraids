import { sim } from "../../src/game/sim";
for (const id of process.argv.slice(2).map(Number)) { const d: any = sim.describe!(id - 1); const g = String(d.grid ?? d); console.log(`L${id} ` + g.split("\n").filter((l) => /OPP MAT|READ|AUCTION|GOAL|CPU/.test(l)).join("\n   ")); }
