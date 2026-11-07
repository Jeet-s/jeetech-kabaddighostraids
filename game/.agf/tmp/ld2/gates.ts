import { readFileSync } from "fs";
import { playtestChecks } from "../../../../../lib/qa/static";
const p = JSON.parse(readFileSync(process.argv[2], "utf8"));
for (const c of playtestChecks(p.personas)) console.log(c.ok ? "ok  " : "FAIL", c.id, c.message);
