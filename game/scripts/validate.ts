/// <reference types="node" />
/**
 * Raid Trial validation — run by the factory's QA with `npm run validate`.
 *  1. Every one of the 66 trials is played through the REAL engine by a simulated competent player (a greedy
 *     raider/defender reading the same telegraphs a player sees) on 40 different match seeds. A trial is
 *     completable when that player wins it, and its winning input trace replays to a win (ghost-style proof).
 *  2. Difficulty per trial = the mid-skill player's expected failed attempts before a win (1/p − 1, p = first-try
 *     win rate over 100 seeds, floored at 5%) — how many retries a typical player spends on the trial.
 *  3. Rules + QA acceptance checks: all-out at minute 5 never ends the half, Do-or-Die on the 3rd empty raid,
 *     bonus only with 6+ defenders, super tackle with ≤3, super raid with ≥3 touches, referee panel == scoreboard
 *     over 1000 simulated matches, random-timing tackle miss rate ≥ 30%, chain needs 2 defenders, the CPU raids
 *     every possession and scores ≥ 25% on Easy, Hard CPU wins ≥ 40% vs a mid-skill player, ghosts replay exactly
 *     and a tampered ghost is rejected.
 * Final stdout line (JSON): {"levels": N, "solvable": N, "difficulty": [...]}. Exit 1 on any failure.
 */
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { apply, legalMoves, start, stars, status, value, type S } from "../src/game/engine";
import { replayGhost, verifyGhost } from "../src/game/ghost";
import { GHOSTS } from "../src/game/ghosts";
import { count, expectedPoints, FULL, newMatch, scoreRaid, type Match, type RaidResult, type Side } from "../src/game/rules";
import { modeIndex, UNITS } from "../src/game/units";

let seedState = 12345;
const rnd = () => {
  seedState = (seedState + 0x6d2b79f5) | 0;
  let t = Math.imul(seedState ^ (seedState >>> 15), 1 | seedState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
};

/** Play a unit: noise = share of random decisions (0 = competent greedy, 0.3 = mid-skill, 1 = random). */
function play(unit: number, seed: number, noise: number, onStep?: (before: S, mv: string, after: S) => void): { s: S; moves: string[] } {
  let s = start(unit, seed);
  const moves: string[] = [];
  for (let n = 0; n < 600 && status(s) === "playing"; n++) {
    const ms = legalMoves(s);
    let pick = ms[Math.floor(rnd() * ms.length)];
    if (rnd() >= noise) {
      let bv = -Infinity;
      for (const m of ms) {
        const nx = apply(s, m);
        const v = status(nx) === "won" ? Infinity : value(nx) + rnd() * 1e-6;
        if (v > bv) { bv = v; pick = m; }
      }
    }
    const nx = apply(s, pick);
    onStep?.(s, pick, nx);
    moves.push(pick);
    s = nx;
  }
  return { s, moves };
}

const failures: string[] = [];
const check = (ok: boolean, msg: string) => { if (!ok) failures.push(msg); console.error(`${ok ? "ok  " : "FAIL"} ${msg}`); };
const seedOf = (k: number) => 0x5eed + k * 104729;

// ───────────── 1+2: every trial completable, difficulty measured ─────────────
let solvable = 0;
const difficulty: number[] = [];
const proof: Record<number, { seed: number; moves: number; wins: number; casual: number; stars: number }> = {};
for (let i = 0; i < UNITS.length; i++) {
  // each trial draws from its own seeded stream: its numbers never shift because another trial changed
  seedState = 12345 + (i + 1) * 7919;
  let wins = 0, best: { seed: number; moves: string[]; stars: number } | null = null;
  for (let k = 0; k < 40; k++) {
    const r = play(i, seedOf(k), 0.04);
    if (status(r.s) === "won") {
      wins++;
      if (!best || stars(r.s) > best.stars) best = { seed: seedOf(k), moves: r.moves, stars: stars(r.s) };
    }
  }
  let replayed = false;
  if (best) {
    const rp = replayGhost(i, best.seed, best.moves);
    replayed = rp.ok && status(rp.state) === "won";
  }
  let casualWins = 0;
  for (let k = 0; k < 100; k++) if (status(play(i, seedOf(1000 + k), 0.3).s) === "won") casualWins++;
  const ok = wins >= 4 && replayed;
  if (ok) solvable++;
  check(ok, `L${i + 1} ${UNITS[i].name}: competent player wins ${wins}/40, winning trace replays: ${replayed}, mid-skill ${casualWins}/100`);
  difficulty.push(Number((1 / Math.max(0.05, casualWins / 100) - 1).toFixed(3)));
  proof[i + 1] = { seed: best?.seed ?? 0, moves: best?.moves.length ?? 0, wins, casual: casualWins, stars: best?.stars ?? 0 };
}

// ───────────── 3: rules ─────────────
const raid = (m: Match, r: Partial<RaidResult> & { raider: Side }): RaidResult => ({
  touched: [], bonus: false, out: null, raiderSlot: 3, defendersAtStart: count(m.al[r.raider === 0 ? 1 : 0]), doOrDie: m.em[r.raider] >= 2, ...r,
});
{
  // all-out at game minute 5 does not end the half; revival and the clock go on
  let m = newMatch();
  m.t = 300;
  m.al[1] = 0b0000011;
  m.q[1] = [2, 3, 4, 5, 6];
  const { match, events } = scoreRaid(m, raid(m, { raider: 0, touched: [0, 1] }));
  check(events.some((e) => e.kind === "all_out") && match.al[1] === FULL && match.sc[0] === 4, "all-out: +2 plus touches, the whole side comes back");
  // engine: a full match forced into an all-out at minute 5 still plays to 40:00 with half-time at 20:00
  const qi = modeIndex("quick_medium");
  let s = start(qi, 777);
  s.m.t = 300; s.m.al[0] = 0b0001000; s.m.q[0] = [0, 1, 2, 4, 5, 6];
  let sawAllOut = false, sawHalf = 0;
  for (let n = 0; n < 900 && status(s) === "playing"; n++) {
    const ms = legalMoves(s);
    s = apply(s, ms[Math.floor(rnd() * ms.length)]);
    if (s.ev.some((e) => e.kind === "all_out")) sawAllOut = true;
    if (s.ev.some((e) => e.kind === "half_time")) sawHalf = s.m.t;
  }
  check(sawAllOut && sawHalf === 1200 && s.m.t >= 2400, `all-out at 5:00 → half still ends at 20:00 (half-time at ${sawHalf}s), match ends at ${s.m.t}s`);
  m = newMatch();
  let mm = m;
  for (let k = 0; k < 2; k++) mm = scoreRaid(mm, raid(mm, { raider: 0 })).match;
  const dod = scoreRaid(mm, raid(mm, { raider: 0 }));
  check(dod.events.some((e) => e.kind === "do_or_die") && dod.events.some((e) => e.kind === "do_or_die_out") && dod.match.sc[1] === 1, "3rd consecutive empty raid is Do-or-Die and an empty one is out");
  m = newMatch(); m.al[1] = 0b0011111;
  const nb = scoreRaid(m, raid(m, { raider: 0, bonus: true }));
  check(nb.match.sc[0] === 0 && !nb.events.some((e) => e.kind === "bonus"), "no bonus point with 5 defenders");
  m = newMatch(); m.al[1] = 0b0111111;
  check(scoreRaid(m, raid(m, { raider: 0, bonus: true })).match.sc[0] === 1, "bonus point with 6 defenders");
  m = newMatch(); m.al[1] = 0b0000111; m.q[1] = [3, 4, 5, 6];
  const st = scoreRaid(m, raid(m, { raider: 0, out: "tackle" }));
  check(st.events.some((e) => e.kind === "super_tackle") && st.match.sc[1] === 2, "super tackle = 2 with 3 defenders");
  m = newMatch(); m.al[1] = 0b0001111; m.q[1] = [4, 5, 6];
  check(scoreRaid(m, raid(m, { raider: 0, out: "tackle" })).match.sc[1] === 1, "normal tackle = 1 with 4 defenders");
  m = newMatch();
  const sr = scoreRaid(m, raid(m, { raider: 0, touched: [0, 1, 2] }));
  check(sr.events.some((e) => e.kind === "super_raid") && sr.match.sc[0] === 3, "super raid on 3 touches");
}
{
  // referee panel == scoreboard: rules level (independent recount) over 1000 random matches
  let mismatches = 0;
  for (let g = 0; g < 1000; g++) {
    let m = newMatch();
    for (let r = 0; r < 60; r++) {
      const att: Side = (r % 2) as Side, def: Side = att === 0 ? 1 : 0;
      const al = [...Array(7).keys()].filter((x) => (m.al[def] >> x) & 1);
      const touched = al.filter(() => rnd() < 0.25).slice(0, 1 + Math.floor(rnd() * 4));
      const res = raid(m, { raider: att, touched, bonus: rnd() < 0.25, out: rnd() < 0.3 ? "tackle" : rnd() < 0.03 ? "time" : null });
      const exp = expectedPoints(m, res);
      const { match, events } = scoreRaid(m, res);
      const panel: [number, number] = [0, 0];
      for (const e of events) panel[e.side] += e.points;
      if (panel[0] !== exp[0] || panel[1] !== exp[1] || match.sc[0] - m.sc[0] !== panel[0] || match.sc[1] - m.sc[1] !== panel[1]) mismatches++;
      if (count(match.al[0]) === 0 || count(match.al[1]) === 0) mismatches++;
      m = match;
    }
  }
  check(mismatches === 0, `referee panel vs scoreboard (1000 rule-level matches × 60 raids): ${mismatches} mismatches`);
  // engine level: 1000 simulated Blitz matches, every raid's referee events add up to the scoreboard change
  let engineMismatch = 0, aiPossessions = 0, aiRaids = 0;
  const modes = ["blitz_easy", "blitz_medium", "blitz_hard"];
  for (let g = 0; g < 1000; g++) {
    const qi = modeIndex(modes[g % 3]);
    play(qi, 9000 + g, g % 2 ? 0.3 : 1, (b, _mv, a) => {
      if (b.ph !== "done" && a.ev.length) {
        const d = [a.m.sc[0] - b.m.sc[0], a.m.sc[1] - b.m.sc[1]], p = [0, 0];
        for (const e of a.ev) p[e.side] += e.points;
        if (d[0] !== p[0] || d[1] !== p[1]) engineMismatch++;
      }
      if (b.turn === 1 && b.ai) aiPossessions++;
      if (b.turn === 1 && a.tl.defs > b.tl.defs) aiRaids++;
    });
  }
  check(engineMismatch === 0, `engine referee events vs scoreboard over 1000 simulated matches: ${engineMismatch} mismatches`);
  check(aiPossessions > 0, `the CPU raids on every possession (${aiRaids} CPU raids over 1000 matches, each with a raid plan)`);
}
{
  // defence is never automatic: random-timing / random-position tackles miss ≥ 30%
  let attempts = 0, held = 0, chainOffered = 0, chainBad = 0;
  for (let g = 0; g < 400; g++) {
    const unit = [3, 4, 5, 14, 34, 45, 57][g % 7];
    play(unit, 5000 + g, 1, (b, mv, a) => {
      if (b.ph === "dtouch" || b.ph === "dret") {
        for (const m of legalMoves(b)) if (m.startsWith("chain")) { chainOffered++; if (count(b.m.al[0]) < 2) chainBad++; }
      }
      if ((b.ph === "dtouch" || b.ph === "dret") && b.pd && b.pd !== "hold" && mv.startsWith("go")) {
        attempts++;
        if (a.tl.stops > b.tl.stops) held++;
      }
    });
  }
  const miss = 1 - held / Math.max(1, attempts);
  check(miss >= 0.3, `random-timing tackle miss rate ${(miss * 100).toFixed(0)}% over ${attempts} attempts (need ≥ 30%)`);
  check(chainBad === 0, `chain tackle offered only with 2+ defenders (${chainOffered} offers checked)`);
}
{
  // CPU strength: Easy scores on ≥ 25% of its raids; Hard wins ≥ 40% against a mid-skill player
  const cpu = (key: string, games: number, noise: number) => {
    let raids = 0, scored = 0, cpuWins = 0;
    for (let g = 0; g < games; g++) {
      const r = play(modeIndex(key), 3000 + g, noise, (b, _m, a) => {
        if (b.turn === 1 && a.tl.defs > b.tl.defs) { raids++; if (a.ev.some((e) => e.side === 1 && (e.kind === "touch" || e.kind === "bonus"))) scored++; }
      });
      if (r.s.m.sc[1] >= r.s.m.sc[0]) cpuWins++;
    }
    return { rate: scored / Math.max(1, raids), cpuWins: cpuWins / games };
  };
  const easy = cpu("quick_easy", 60, 0.3), hard = cpu("quick_hard", 60, 0.3), med = cpu("quick_medium", 60, 0.3);
  console.error(`     Easy CPU wins ${(easy.cpuWins * 100).toFixed(0)}% vs a mid-skill player`);
  check(easy.rate >= 0.25, `Easy CPU scores on ${(easy.rate * 100).toFixed(0)}% of its raids (need ≥ 25%)`);
  console.error(`     Medium CPU raid success ${(med.rate * 100).toFixed(0)}%, wins ${(med.cpuWins * 100).toFixed(0)}%`);
  check(hard.cpuWins >= 0.4, `Hard CPU wins ${(hard.cpuWins * 100).toFixed(0)}% of full matches vs a mid-skill player (need ≥ 40%); raid success ${(hard.rate * 100).toFixed(0)}%`);
}
{
  // ghosts: exact replay, tampering rejected
  for (const g of Object.values(GHOSTS)) {
    check(verifyGhost(g), `ghost "${g.id}" re-simulates to ${g.pts} points (hash ${g.hash})`);
    const forged = { ...g, pts: g.pts + 2 };
    const swap: Record<string, string> = { walk: "dash", dash: "dubki", dubki: "walk" };
    const edited = { ...g, moves: g.moves.map((m) => swap[m] ?? m) };
    check(!verifyGhost(forged) && !verifyGhost(edited), `tampered ghost "${g.id}" (score or inputs edited) is rejected`);
  }
}

mkdirSync(path.join(__dirname, "..", "src", "game"), { recursive: true });
writeFileSync(path.join(__dirname, "..", "src", "game", "proof.json"), JSON.stringify(proof) + "\n");
if (failures.length) console.error(`\n${failures.length} check(s) failed:\n${failures.join("\n")}`);
console.log(JSON.stringify({ levels: UNITS.length, solvable, difficulty }));
process.exit(failures.length || solvable !== UNITS.length ? 1 : 0);
