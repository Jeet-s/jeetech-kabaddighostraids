/**
 * Ghost pipeline: a raid run is stored as a compact input trace (the decisions + the seed + the unit) and
 * replayed through the shared deterministic engine. The same trace always reproduces the same score and final
 * state hash, so a server can re-simulate an uploaded ghost and reject a tampered one (verifyGhost).
 */
import { apply, legalMoves, start, status, type S } from "./engine";
import type { GhostTrace } from "./ghosts";

export function stateHash(s: S): string {
  const str = s.toJSON ? s.toJSON() : JSON.stringify(s);
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** Replay a trace; `ok` is false if any decision was not legal at that point (a forged trace). */
export function replayGhost(unit: number, seed: number, moves: string[]): { state: S; ok: boolean } {
  let s = start(unit, seed);
  for (const m of moves) {
    if (status(s) !== "playing" || !legalMoves(s).includes(m)) return { state: s, ok: false };
    s = apply(s, m);
  }
  return { state: s, ok: true };
}

/** Server-side check of an uploaded ghost: legal decisions, same score, same final state. */
export function verifyGhost(g: GhostTrace): boolean {
  const r = replayGhost(g.unit, g.seed, g.moves);
  return r.ok && r.state.tl.pts === g.pts && stateHash(r.state) === g.hash;
}

/** Record a run: `choose` picks each decision (the match screen's input, or a bot). */
export function recordGhost(id: string, unit: number, seed: number, by: string, choose: (s: S, legal: string[]) => string): GhostTrace {
  let s = start(unit, seed);
  const moves: string[] = [];
  while (status(s) === "playing" && moves.length < 400) {
    const m = choose(s, legalMoves(s));
    moves.push(m);
    s = apply(s, m);
  }
  return { id, unit, seed, moves, pts: s.tl.pts, hash: stateHash(s), by };
}

export interface GhostRaid { plan: string[]; pts: number; caught: boolean }
const NICE: Record<string, string> = { hand: "Hand", toe: "Toe", kick: "Kick", bonus: "Bonus", walk: "Walk", dash: "Dash", dubki: "Dubki", pull: "Pull free", lunge: "Lunge" };
/** A decision of a trace in player words ("toe@4" → "Toe #5"). */
export const ghostMoveText = (m: string) => { const [k, sl] = m.split("@"); return `${NICE[k] ?? k}${sl !== undefined ? ` #${Number(sl) + 1}` : ""}`; };

/**
 * The ghost's run split into its raids (what the Ghost Duel shows the player: the ghost's raid N plan and what it
 * scored), replayed through the real engine from the trace — never a canned copy.
 */
export function ghostRaids(g: GhostTrace): GhostRaid[] {
  let s = start(g.unit, g.seed);
  const out: GhostRaid[] = [];
  let cur: string[] = [], pts0 = s.tl.pts, c0 = s.tl.caught, r0 = s.tl.raids;
  for (const m of g.moves) {
    if (status(s) !== "playing" || !legalMoves(s).includes(m)) break;
    if (!m.startsWith("go")) cur.push(m);
    s = apply(s, m);
    if (s.tl.raids !== r0) {
      out.push({ plan: cur, pts: s.tl.pts - pts0, caught: s.tl.caught > c0 });
      cur = []; pts0 = s.tl.pts; c0 = s.tl.caught; r0 = s.tl.raids;
    }
  }
  return out;
}
export const ghostRaidText = (r: GhostRaid) => `${r.plan.map(ghostMoveText).join(" → ") || "No touch"}: ${r.caught ? "caught" : r.pts ? `+${r.pts}` : "empty"}`;
