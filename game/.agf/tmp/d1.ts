import { sim } from "../../src/game/sim";
for (const id of process.argv.slice(2).map(Number)) { const d = sim.describe!(id - 1); console.log(`=== L${id}`); console.log(typeof d === "string" ? d : JSON.stringify(d, null, 1)); }
