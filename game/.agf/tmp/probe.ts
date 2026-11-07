// probe: npx tsx .agf/tmp/probe.ts <id> '<json overrides>' '<knob>=v1,v2,...'
import { sim } from "../../src/game/sim";
import { UNITS } from "../../src/game/units";
import { winRate } from "../../scripts/bots";
import { midSkill } from "../../scripts/tune-units";
const id = Number(process.argv[2]), i = id - 1;
const ov = JSON.parse(process.argv[3] || "{}");
const u = UNITS[i] as any;
for (const [k, v] of Object.entries(ov)) { if (k === "ai") u.ai = { ...u.ai, ...(v as object) }; else u[k] = v; }
const [knob, vals] = (process.argv[4] || "x=0").split("=");
for (const v of vals.split(",").map(Number)) {
  if (knob === "g") u.g = v; else if (knob === "s") u.ai = { ...u.ai, s: v };
  const c = winRate(sim, sim.start(i), "casual", 150).rate, sk = winRate(sim, sim.start(i), "skilled", 150).rate, m = midSkill(i);
  console.log(`L${id} ${knob}=${v} g=${u.g.toFixed(2)} s=${u.ai?.s?.toFixed(2) ?? "-"} casual ${(c * 100).toFixed(0)} mid ${(m * 100).toFixed(0)} skilled ${(sk * 100).toFixed(0)}`);
}
