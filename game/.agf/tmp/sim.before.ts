/**
 * Simulation interface for the factory's bot playtesters (scripts/playtest.ts) and the level report.
 * Implemented on the REAL engine (engine.ts + rules.ts): bots take the same decisions the match screen offers.
 */
import { apply, defenceRead, legalMoves, marketOf, raidRead, readOf, scoutRise, start, status, value, type S } from "./engine";
import PROOF from "./proof.json";
import { UNITS } from "./units";
import { GHOSTS } from "./ghosts";
import type { UnitDef } from "./types";

export type Status = "playing" | "won" | "lost";

export interface LevelBrief {
  grid: string;
  legend: string;
  intent: string;
  mechanics: string[];
}

export interface Sim<S, M> {
  levelCount: number;
  start(index: number): S;
  moves(state: S): M[];
  apply(state: S, move: M): S;
  status(state: S): Status;
  progress(state: S): number;
  describe(index: number): LevelBrief;
}

export const LEGEND =
  "KABADDI RAID TRIAL (content unit; the player raids and defends in turns). OPP MAT = 7 defender slots, left corner → right corner ('-' = out). " +
  "Defender traits: o rookie; T Thigh-holder (beats Hand Touch + walking home); A Ankle-catcher (beats Toe Touch, bonus hop, Dubki); " +
  "B Blocker (midline wall, beats the Dash home); R Rusher (charges: beats hops and touches; a Backward Kick tags him); " +
  "C Chain link (two adjacent C's chain: beat walk/dash home, Dubki ducks under); K rival captain (strong at everything except his one listed weakness). " +
  "Danger comes from the target and his neighbours and grows with every touch already made. SCOUTED: from trial 27 a move used on my previous raid is read — its gem shows a SCOUTED tag and the higher % (capped at ~8 points). " +
  "READ rows = the % the game shows on each option gem, never a recommendation (h/t/k = Hand/Toe/Kick touch on that slot). " +
  "My raid: touch beats (7 s) + optional bonus hop (5 s, 6+ defenders) + way home (6 s) inside the 30 s raid clock; held → struggle (pull or lunge). " +
  "My defence vs the CPU raider's telegraphed move: Ankle, Thigh, Rush (by a defender within two of his target), Chain (two adjacent), Block (way home only), Hold (no tackle; vs a real Kick it is the step-back counter). " +
  "Feints: a feinting raider's telegraph lies at his feint rate; a TELL (FEINT? flicker) marks some feints openly. MOMENT = a one-off referee call or mid-match reversal that changes the mat/raider. " +
  "MY SIDE roles: A ankle / T thigh specialist, C cover, K anchor, R rusher. Rules: 1 point per touch, tackle 1 (Super Tackle 2 with ≤3 defenders), bonus only with 6+ defenders, " +
  "all-out +2, every point revives one, the 3rd straight empty raid is Do-or-Die. CPU: skill s, Easy/Medium/Hard brain. PROOF = validate's simulated players on the real engine over 40/100 match seeds.";

const TRAIT_KEY: Record<string, string> = {
  o: "o rookie", T: "T thigh-holder (Hand/walk risky)", A: "A ankle-catcher (Toe/hop/Dubki risky)", B: "B blocker (Dash risky)",
  R: "R rusher (touch/hop risky, Kick safe)", C: "C chain link (walk/Dash risky when paired)", K: "K captain",
};

const LOT_ROLE: Record<string, string> = { o: "", A: "ankle corner", T: "thigh corner", C: "cover", K: "anchor", R: "rusher" };

function goalText(u: UnitDef): string {
  const g = u.goal, out: string[] = [];
  if (g.pts) out.push(`score ${g.pts}`);
  if (g.stops) out.push(`stop ${g.stops} raids`);
  if (g.margin !== undefined) out.push(g.margin > 0 ? `win by ${g.margin}+` : g.margin === 0 ? "finish level or ahead" : `finish within ${-g.margin}`);
  if (g.ghost) out.push(`beat the ghost's ${GHOSTS[u.ghost!]?.pts ?? "?"} points`);
  if (g.fullSide) out.push("all 7 back on the mat");
  for (const [k, v] of Object.entries(g.need ?? {})) out.push(`${v}x ${k}`);
  if (u.needRoles) out.push(`buy ${u.needRoles.join(" + ")}`);
  if (g.purse !== undefined) out.push(`keep ${g.purse}+ lakh`);
  const fail: string[] = [];
  if (g.maxOpp !== undefined) fail.push(`opp scores > ${g.maxOpp}`);
  if (g.maxTrail !== undefined) fail.push(`trail by > ${g.maxTrail}`);
  if (g.maxCaught !== undefined) fail.push(`raider out ${g.maxCaught}x`);
  if (g.minMat !== undefined) fail.push(`< ${g.minMat} on mat`);
  return `GOAL: ${out.join(", ") || "complete the auction"}${fail.length ? ` | FAIL: ${fail.join(", ")}` : ""} | STARS: ${u.stars.map((s) => s.label).join("; ")}`;
}

const mmss = (t: number) => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;

export function describeUnit(i: number): LevelBrief {
  const u = UNITS[i];
  const rows: string[] = [];
  const traits = [...new Set([...u.op, ...(u.moment?.op ?? "")].filter((c) => c !== "-"))];
  const rd = readOf(u);
  rows.push(`[${u.type} · ${u.role} · Ch${u.ch} ${u.theme}] OPP MAT: ${[...u.op].join(" ")}${u.kWeak ? ` (captain weak to ${u.kWeak})` : ""} · grip ${u.g.toFixed(2)}` +
    ` · KEY: ${traits.map((c) => TRAIT_KEY[c]).join(", ")}` +
    (rd && u.flow !== "defend" && u.flow !== "auction" ? ` · SCOUTED: a move from your last raid is tagged on its gem and ~${Math.round(scoutRise(u) * 100)} pts more likely held (capped, same on every mat)` : ""));
  const me = u.me ?? "ooooooo";
  rows.push(`MY SIDE: ${[...me].join(" ")} (${[...me].filter((c) => c !== "-").length} on mat)` +
    (u.raiders ? ` · raiders ${u.raiders.map((r) => `${r.name} R${r.st[0]} A${r.st[1]} S${r.st[2]} st${r.st[3]}`).join(", ")} (fatigue)` : u.raider ? ` · raider reach ${u.raider[0]} agi ${u.raider[1]} spd ${u.raider[2]}` : ""));
  const raids = u.clock ? Math.round((u.clock[1] - u.clock[0]) / 43) : 0;
  const flow = u.flow === "raid" ? `you raid ${u.raids}x` : u.flow === "defend" ? `you defend ${u.defs} CPU raids` : u.flow === "auction" ? "auction only" :
    u.clock ? `alternate raids ${mmss(u.clock[0])}→${mmss(u.clock[1])} (~${raids} raids in all, ~${Math.ceil(raids / 2)} each${u.half && u.clock[1] > u.half && u.clock[0] < u.half ? `, half-time swap at ${mmss(u.half)}` : ""})` : `alternate: ${u.raids} raids / ${u.defs} defences`;
  rows.push(`FLOW: ${flow}${u.score ? ` · start score ${u.score[0]}-${u.score[1]}` : ""}${u.empty ? ` · empty raids ${u.empty[0]}/${u.empty[1]}` : ""}${u.drs ? ` · DRS reviews ${u.drs}` : ""}`);
  rows.push(`MY MOVES: ${u.moves.join(" ")}${u.def ? ` | DEFENCE: ${u.def.join(" ")} hold` : ""}`);
  if (u.ai && u.flow !== "raid" && u.flow !== "auction") {
    const a = u.ai;
    rows.push(`CPU RAIDER "${a.name}": s ${a.s.toFixed(2)} · ${["Easy", "Medium", "Hard"][a.smart]} · touches ${a.mv.join("/")} · home ${a.ret.join("/")} · up to ${a.k} touch${a.k > 1 ? "es" : ""}` +
      (a.greedy ? ` · personality: goes for all ${a.k} touches ${Math.round(a.greedy * 100)}% of raids` : "") +
      (a.bluff ? ` · feints ${Math.round(a.bluff * 100)}%` : "") +
      (a.bluff && a.tell ? ` · TELL on ${Math.round(a.tell * 100)}% of feints (telegraph flickers → it is a lie; a clean telegraph is true ${Math.round((1 - (a.bluff * (1 - a.tell)) / (1 - a.bluff * a.tell)) * 100)}%)` : "") +
      (u.gate ? ` · GHOST PLAN: ${u.gate.join(" | ")}` : ""));
  }
  if (u.moment) {
    const m = u.moment;
    rows.push(`MOMENT (${m.kind}, ${m.atHalf ? "at half-time" : `after raid ${m.at}`}): "${m.text}"${m.op ? ` → OPP MAT becomes ${[...m.op].join(" ")}` : ""}` +
      `${m.ai ? ` → CPU raider ${Object.entries(m.ai).map(([k, v]) => `${k} ${Array.isArray(v) ? v.join("/") : v}`).join(", ")}` : ""}${m.out ? ` → slot ${m.out.map((x) => x + 1).join(", ")} sent off` : ""}`);
  }
  const aids = Object.entries(u.show ?? {}).filter(([, v]) => v);
  if (aids.length) rows.push(`ON SCREEN: ${aids.map(([k, v]) => k === "cover" ? "cover ring (target 82% / neighbours 100% / two away 55%)" : k === "anchor" ? `Anchor range ring (±${v} slot)` : k === "wall" ? "Blocker wall drawn on the midline over the Dash gem" : k === "plan" ? "the ghost's next raid plan shown above the mat" : "purse helper (still needed + cheapest squad left)").join("; ")}`);
  if (u.bw) rows.push(`BLOCK WINDOW: ×${u.bw} (wider timing for the teaching unit)`);
  if (u.lots) {
    rows.push(`AUCTION (purse ${u.purse}${u.goal.purse !== undefined ? `, must keep ${u.goal.purse}` : ""}): ${u.lots.map((l, j) => { const [lo, hi] = marketOf(u, j); return `${l.role}${LOT_ROLE[l.trait] ? `(${LOT_ROLE[l.trait]})` : ""}${l.reach ? ` R${l.reach}` : ""} open ${l.base} market ${lo}-${hi}`; }).join("; ")}`);
    if (u.rival) rows.push(`RIVAL BIDDER: ${u.rival.name} chase the FIRST ${u.rival.role} (+${u.rival.plus} lakh on his value), then stop`);
  }
  if (u.flow !== "defend" && u.flow !== "auction") {
    const r = raidRead(i);
    rows.push(`READ (gem % held) touch: ${r.touch.join(" ")} | home after 1 touch: ${r.home} | after 2: ${r.home2} | if held: ${r.escape}`);
  }
  if (u.flow !== "raid" && u.flow !== "auction") rows.push(`READ (gem % stop, made by the cover): ${defenceRead(i)}`);
  rows.push(goalText(u));
  const pf = (PROOF as Record<string, { wins: number; casual: number; stars: number }>)[String(u.id)];
  if (pf) rows.push(`PROOF (validate, real engine, fresh match seeds): a competent player won ${pf.wins}/40 (best ${pf.stars}★), a mid-skill player ${pf.casual}/100`);
  return { grid: rows.join("\n"), legend: LEGEND, intent: u.intent, mechanics: u.mech };
}

export const sim: Sim<S, string> = {
  levelCount: UNITS.length,
  start: (i) => start(i),
  moves: legalMoves,
  apply,
  status,
  progress: value,
  describe: describeUnit,
};
