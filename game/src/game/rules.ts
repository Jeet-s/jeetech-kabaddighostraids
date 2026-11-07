/**
 * Kabaddi rules engine — the single source of truth for the scoreboard AND the referee panel.
 * Every raid ends in one RaidResult; scoreRaid() turns it into RefEvents and the new match state.
 * The scoreboard is the fold of those events, so the referee animation and the score can never disagree.
 *
 * Rules (official style):
 *  - 7 players a side. Each defender touched by a raider who gets home is out: +1 per touch to the raiding side.
 *  - Bonus point: only when the defence had 6 or more on the mat at the start of the raid. It puts nobody out.
 *  - Tackle: raider held on the defenders' half → raider out, +1 to the defence. With 3 or fewer defenders on the
 *    mat at the start of the raid it is a SUPER TACKLE: +2.
 *  - Super raid: 3 or more touch points in one raid.
 *  - Revival: for every opponent a side puts out it revives one of its own out players (first out, first back).
 *    Bonus and all-out points revive nobody.
 *  - All-out: a side with nobody left on the mat concedes +2 and all 7 come straight back. The half goes on —
 *    an all-out never ends a half.
 *  - Empty raid: no point and the raider not out. The THIRD consecutive empty raid of a side is a Do-or-Die raid:
 *    if it is empty too, the raider is out and the defence gets +1.
 *  - Raid clock 30 s: a raider still on the defenders' half at 30 s is out (+1 to the defence).
 *  - Halves are 20 game minutes; the clock never stops for an all-out.
 */

export type Side = 0 | 1; // 0 = the player's team, 1 = the opponent
export const MAT = 7;
export const FULL = (1 << MAT) - 1;
export const HALF_SECONDS = 20 * 60;
export const RAID_CLOCK = 30;
/** Game seconds between raids (walk back, line up, referee signal). With the 5x clock scale ≈ 5 s real. */
export const DEAD_TIME = 28;

export type RefKind =
  | "touch" | "bonus" | "tackle" | "super_tackle" | "super_raid" | "all_out" | "revival"
  | "empty_raid" | "do_or_die" | "do_or_die_out" | "time_out" | "escape" | "half_time";

export interface RefEvent {
  kind: RefKind;
  side: Side; // the side the event is credited to (points go to this side)
  points: number;
  slots?: number[]; // players put out / revived
}

export interface Match {
  sc: [number, number];
  al: [number, number]; // on-mat bitmask per side (bit i = slot i on the mat)
  q: [number[], number[]]; // out order per side (first out, first back)
  em: [number, number]; // consecutive empty raids per side
  t: number; // game clock, seconds since kick-off
}

export interface RaidResult {
  raider: Side;
  touched: number[]; // defender slots touched (and out) — empty when the raider was out
  bonus: boolean;
  out: "tackle" | "time" | null; // raider out by a tackle / the raid clock (do-or-die outs are decided here)
  raiderSlot: number; // which raiding-side slot leaves the mat if the raider is out
  escaped?: boolean; // the raider broke a hold and crossed the midline
  defendersAtStart: number;
  doOrDie: boolean;
}

export const count = (mask: number) => {
  let n = 0;
  for (let m = mask; m; m &= m - 1) n++;
  return n;
};
export const alive = (mask: number, slot: number) => ((mask >> slot) & 1) === 1;
export const slotsOf = (mask: number) => {
  const out: number[] = [];
  for (let i = 0; i < MAT; i++) if (alive(mask, i)) out.push(i);
  return out;
};

/** The order in which a raiding side loses its raider when the raider is out: centre / in-positions first. */
const RAIDER_SLOTS = [3, 2, 4, 1, 5, 0, 6];
export const raiderSlotOf = (mask: number) => RAIDER_SLOTS.find((s) => alive(mask, s)) ?? 3;

export function newMatch(): Match {
  return { sc: [0, 0], al: [FULL, FULL], q: [[], []], em: [0, 0], t: 0 };
}

export function cloneMatch(m: Match): Match {
  return { sc: [m.sc[0], m.sc[1]], al: [m.al[0], m.al[1]], q: [m.q[0].slice(), m.q[1].slice()], em: [m.em[0], m.em[1]], t: m.t };
}

/** Is the next raid of `side` a Do-or-Die raid? (two empty raids in a row already) */
export const isDoOrDie = (m: Match, side: Side) => m.em[side] >= 2;
/** Bonus line is live only with 6+ defenders on the mat. */
export const bonusLive = (m: Match, defending: Side) => count(m.al[defending]) >= 6;

function putOut(m: Match, side: Side, slots: number[]) {
  for (const s of slots) {
    if (!alive(m.al[side], s)) continue;
    m.al[side] &= ~(1 << s);
    m.q[side].push(s);
  }
}

function revive(m: Match, side: Side, n: number): number[] {
  const back: number[] = [];
  while (n-- > 0 && m.q[side].length) {
    const s = m.q[side].shift()!;
    m.al[side] |= 1 << s;
    back.push(s);
  }
  return back;
}

/**
 * Apply one finished raid. Returns the events (in referee order) and mutates a COPY of the match.
 * Score = Σ event points, credited per event side — the referee panel shows exactly these events.
 */
export function scoreRaid(match: Match, r: RaidResult): { match: Match; events: RefEvent[] } {
  const m = cloneMatch(match);
  const events: RefEvent[] = [];
  const att = r.raider;
  const def: Side = att === 0 ? 1 : 0;
  const award = (e: RefEvent) => {
    events.push(e);
    m.sc[e.side] += e.points;
  };
  if (r.doOrDie) events.push({ kind: "do_or_die", side: att, points: 0 });

  let raiderOut: "tackle" | "time" | "dod" | null = r.out;
  const touches = raiderOut ? [] : r.touched.filter((s) => alive(m.al[def], s));
  const bonus = !!r.bonus && r.defendersAtStart >= 6; // never a bonus with fewer than 6 defenders
  if (!raiderOut && r.doOrDie && touches.length === 0 && !bonus) raiderOut = "dod";

  if (bonus) award({ kind: "bonus", side: att, points: 1 });
  if (raiderOut) {
    putOut(m, att, [r.raiderSlot]);
    if (raiderOut === "tackle") {
      const superT = r.defendersAtStart <= 3;
      award({ kind: superT ? "super_tackle" : "tackle", side: def, points: superT ? 2 : 1, slots: [r.raiderSlot] });
    } else {
      award({ kind: raiderOut === "time" ? "time_out" : "do_or_die_out", side: def, points: 1, slots: [r.raiderSlot] });
    }
    const back = revive(m, def, 1);
    if (back.length) events.push({ kind: "revival", side: def, points: 0, slots: back });
    m.em[att] = 0;
  } else {
    if (touches.length) {
      if (r.escaped) events.push({ kind: "escape", side: att, points: 0 });
      award({ kind: "touch", side: att, points: touches.length, slots: touches });
      putOut(m, def, touches);
      if (touches.length >= 3) events.push({ kind: "super_raid", side: att, points: 0 });
      const back = revive(m, att, touches.length);
      if (back.length) events.push({ kind: "revival", side: att, points: 0, slots: back });
    }
    if (touches.length === 0 && !bonus) {
      m.em[att] += 1;
      events.push({ kind: "empty_raid", side: att, points: 0 });
    } else m.em[att] = 0;
  }
  // All-out: a side with nobody on the mat concedes 2 and the whole side comes back. Play goes on.
  for (const side of [def, att] as Side[]) {
    if (m.al[side] === 0) {
      const other: Side = side === 0 ? 1 : 0;
      award({ kind: "all_out", side: other, points: 2 });
      const back = m.q[side].slice();
      m.q[side] = [];
      m.al[side] = FULL;
      events.push({ kind: "revival", side, points: 0, slots: back });
    }
  }
  return { match: m, events };
}

/** Independent recount of a raid's points (used by validate to prove referee panel == scoreboard). */
export function expectedPoints(match: Match, r: RaidResult): [number, number] {
  const att = r.raider, def = att === 0 ? 1 : 0;
  const pts: [number, number] = [0, 0];
  const bonus = r.bonus && r.defendersAtStart >= 6 ? 1 : 0;
  const liveTouches = r.out ? 0 : r.touched.filter((s) => alive(match.al[def], s)).length;
  const dodOut = !r.out && r.doOrDie && liveTouches === 0 && !bonus;
  pts[att] += bonus;
  if (r.out === "tackle") pts[def] += r.defendersAtStart <= 3 ? 2 : 1;
  else if (r.out === "time" || dodOut) pts[def] += 1;
  else pts[att] += liveTouches;
  // all-out check on a scratch copy of the mats
  let defMask = match.al[def], attMask = match.al[att];
  const q = [match.q[0].slice(), match.q[1].slice()];
  if (r.out || dodOut) {
    attMask &= ~(1 << r.raiderSlot);
    if (q[def].length) defMask |= 1 << q[def][0];
  } else {
    let n = 0;
    for (const s of r.touched) if (alive(defMask, s)) { defMask &= ~(1 << s); n++; }
    for (let i = 0; i < n && i < q[att].length; i++) attMask |= 1 << q[att][i];
  }
  if (defMask === 0) pts[att] += 2;
  if (attMask === 0) pts[def] += 2;
  return pts;
}
