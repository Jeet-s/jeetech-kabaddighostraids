import { sim } from "../../../src/game/sim";
import { winRate } from "../../../scripts/bots";
import { midSkill } from "../../../scripts/tune-units";
for (const a of process.argv.slice(2)) { const i = Number(a) - 1; console.log(`L${a} casual ${winRate(sim, sim.start(i), "casual", 150).rate.toFixed(3)} mid ${midSkill(i).toFixed(2)}`); }
