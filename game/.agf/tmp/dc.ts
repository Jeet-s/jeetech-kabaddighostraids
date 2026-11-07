import { difficultyCurve } from "../../../../lib/qa/static";
import { readFileSync } from "fs";
console.log(difficultyCurve(JSON.parse(readFileSync(".agf/tmp/val.json","utf8")).difficulty).message);
