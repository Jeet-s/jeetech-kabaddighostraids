import { UNITS } from "../../../src/game/units";
const ids = process.argv.slice(2).map(Number);
for (const u of UNITS) if (!ids.length || ids.includes(u.id)) {
  const { intent, ...r } = u as any;
  console.log(JSON.stringify({ ...r, ai: r.ai ? { ...r.ai } : undefined, lots: r.lots?.length, gate: r.gate ? r.gate.length : undefined }));
}
