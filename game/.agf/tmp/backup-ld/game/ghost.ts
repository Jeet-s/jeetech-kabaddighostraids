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
