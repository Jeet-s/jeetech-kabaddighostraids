import { playtestChecks, difficultyCurve } from "../../../../lib/qa/static";
import { readFileSync } from "fs";
const p = JSON.parse(process.argv[2] ? readFileSync(process.argv[2], "utf8") : "{}");
for (const c of playtestChecks(p.personas)) console.log(c.ok ? "ok  " : "FAIL", c.id, c.message);
const d = JSON.parse(require('fs').readFileSync('.agf/tmp/r4_d.txt','utf8'));
console.log(difficultyCurve(d).message);
