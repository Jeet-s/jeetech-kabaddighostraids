/// <reference types="node" />
// Dev: the factory's playtest pacing gates (copied rules) on .agf/playtest.json
import { readFileSync } from "fs";
const p = JSON.parse(readFileSync(".agf/playtest.json", "utf8")).personas as Record<string, number[]>;
const c = p.casual, k = p.skilled, n = c.length, third = Math.floor(n / 3);
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length, pct = (v: number) => `${Math.round(v * 100)}%`;
const out: string[] = [];
out.push(`onboarding ${c.slice(0, 3).map(pct).join(",")} ${c.slice(0, 3).every((v) => v >= 0.8) ? "ok" : "FAIL"}`);
const walls = c.map((v, i) => (v < 0.1 && k[i] < 0.6 ? i + 1 : 0)).filter(Boolean);
out.push(`walls ${walls.join(",") || "none"}`);
const lc = mean(c.slice(-third)), ls = mean(k.slice(-third)), mc = mean(c.slice(third, n - third));
out.push(`late casual ${pct(lc)} (≤65 ≥30) ${lc <= 0.65 && lc >= 0.3 ? "ok" : "FAIL"} | late skilled ${pct(ls)} (50-95) ${ls >= 0.5 && ls <= 0.95 ? "ok" : "FAIL"} | mid casual ${pct(mc)} (50-85) ${mc >= 0.5 && mc <= 0.85 ? "ok" : "FAIL"}`);
let run = 0, longest = 0; c.forEach((v, i) => { run = i >= 5 && v >= 0.9 ? run + 1 : 0; longest = Math.max(longest, run); });
const share = c.slice(5).filter((v) => v >= 0.9).length / (n - 5);
out.push(`easy run ${longest} (≤2) easy share ${pct(share)} (≤25%)`);
const spikes: string[] = []; for (let i = 3; i < n; i++) { const pv = mean(c.slice(i - 3, i)); if (pv - c[i] > 0.35) spikes.push(`L${i + 1}`); }
out.push(`spikes ${spikes.join(",") || "none"}`);
const rank = (a: number[]) => { const o = a.map((v, i) => [v, i] as const).sort((x, y) => x[0] - y[0]); const r = Array(a.length); o.forEach(([, i], j) => (r[i] = j)); return r as number[]; };
const rx = rank(c.map((_, i) => i)), ry = rank(c); const rho = 1 - (6 * rx.reduce((a, v, i) => a + (v - ry[i]) ** 2, 0)) / (n * (n * n - 1));
out.push(`rho ${rho.toFixed(2)} (≤-0.5) ${rho <= -0.5 ? "ok" : "FAIL"}`);
const inv = c.map((v, i) => (k[i] + 0.02 < v ? `L${i + 1} ${pct(v)}/${pct(k[i])}` : "")).filter(Boolean);
out.push(`skilled<casual: ${inv.join(", ") || "none"}`);
console.log(out.join("\n"));
