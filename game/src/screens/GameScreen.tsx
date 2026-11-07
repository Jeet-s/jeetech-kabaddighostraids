import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from "react-native-reanimated";
import {
  Background, Burst, Confetti, FailPopup, FloatingText, GameButton, Pop, Popup, Tappable, WinPopup, feedback, fonts, palette, useShake,
} from "../ui";
import { art } from "../art";
import {
  GO_FRAMES, apply, escapeChance, legalMoves, readOf, returnCatch, start, starMet, stars as starsOf, tacklePower, touchCatch, touchLand, unitOf, value, type S,
} from "../game/engine";
import { HALF_SECONDS, count, slotsOf, type RefEvent } from "../game/rules";
import { ALL_UNITS } from "../game/units";
import type { Moment, ReturnMove, TouchMove, UnitDef } from "../game/types";
import { GHOSTS } from "../game/ghosts";
import { ghostRaids, ghostRaidText } from "../game/ghost";
import { equipped } from "../game/kit";
import {
  MY_TEAM, bgFor, coachTip, ctxTitle, objectiveLines, recordResult, reward, rivalName, unitIndexOf, type Ctx,
} from "../game/meta";
import { store } from "../modules/store";
import { ads } from "../modules/ads";
import { analytics } from "../modules/analytics";
import { review } from "../modules/review";
import { useBottomInset } from "../modules/layout";
import { qa } from "../modules/qa";
import type { Match as MpMatch, Emote } from "../modules/multiplayer";
import { multiplayer } from "../modules/multiplayer";
import { isBackRow, makeGeom, slotSpot } from "./match/geom";
import { MatCanvas } from "./match/MatCanvas";
import { Hud } from "./match/Hud";
import { Gem, MOVE_LOOK } from "./match/Gem";
import { Defender, ROLE_BADGE, Runner, TRAIT_BADGE, runTo } from "./match/Athletes";
import { Dust, Impact } from "./match/Fx";
import { AidCanvas, AidCaption, AidLabel, FeintTag, WallLabel, type AidRing, type AidWall } from "./match/Aids";
import { AuctionPanel, Banner, BriefingPopup, DrsPanel, PickPanel, RefereePanel, TapMark, TugMeter } from "./match/Overlays";

/** Screenshot / demo mode: decisions replayed on mount (seeded), an optional selection, an optional result. */
export interface Demo { seed: number; moves: string[]; select?: number; result?: "win"; refEvents?: boolean }

const SPEED = () => (qa.level != null ? 0.45 : 1);
const mmss = (t: number) => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
const moveOf = (mv: string) => (mv.includes("@") ? mv.split("@")[0] : mv);
const slotOf = (mv: string) => (mv.includes("@") ? Number(mv.split("@")[1]) : -1);
/** The defence's read: the letter of a move in S.lm (h t k b = touches + bonus, w d u = walk / Dash / Dubki). */
const scoutLetter = (m: string) => (m === "bonus" ? "b" : m === "dubki" ? "u" : m[0]);
const SHORT: Record<string, string> = { hand: "Hand", toe: "Toe", kick: "Kick", bonus: "Bonus", walk: "Walk", dash: "Dash", dubki: "Dubki" };
const RET_VERB: Record<ReturnMove, string> = { walk: "walks home", dash: "Dashes home", dubki: "Dubkis home" };
/** A recorded ghost raid ("toe@4,hand@5>dubki") in player words: "Toe #5, Hand #6 → Dubki". */
const planText = (spec: string) => {
  const [touches, ret] = spec.split(">");
  const list = (touches ? touches.split(",") : []).map((x) => { const [m, sl] = x.split("@"); return `${SHORT[m] ?? m}${sl !== undefined ? ` #${Number(sl) + 1}` : ""}`; });
  return `${list.join(", ") || "No touch"} → ${SHORT[ret || "walk"] ?? ret}`;
};
/** A moment's banner: its own shouted headline ("LOBBY!", "REVERSAL!") over the explanation. */
const momentLines = (mo: Moment) => {
  const m = /^([A-Z][A-Z' -]*!)\s*(.*)$/.exec(mo.text);
  return m ? { head: m[1], sub: m[2] } : { head: mo.kind === "ref" ? "REFEREE'S CALL" : "REVERSAL!", sub: mo.text };
};
/** What the scouts know about their raider — shown on the briefing. */
const scoutLines = (u: UnitDef): string[] => {
  const ai = u.ai, out: string[] = [];
  if (!ai) return out;
  const who = ai.name.split(",")[0];
  if (ai.greedy) out.push(`${who} is greedy: about ${Math.round(ai.greedy * 10)} raids in 10 he goes for all ${ai.k} touches${ai.ret.length === 1 ? ` and always ${RET_VERB[ai.ret[0]]}` : ""}. His extra touch is your chance to tackle.`);
  if (ai.tell && ai.bluff) out.push(`His feints have a tell: on about ${Math.round(ai.tell * 10)} in 10 the telegraph flickers (FEINT?). A flickering move is a lie.`);
  return out;
};

/** Coach / solver: the decision with the best expected value on the real engine (what the skilled bot plays). */
function bestMove(s: S): string | null {
  let best: string | null = null, bv = -Infinity;
  for (const mv of legalMoves(s)) {
    if (mv.startsWith("go")) continue;
    const v = value(apply(s, mv));
    if (v > bv) { bv = v; best = mv; }
  }
  return best;
}

type Fx = { n: number; x: number; y: number; text?: string; color?: string; burst?: string; impact?: boolean; dust?: "small" | "big"; size?: number; keep?: boolean };

/** One Raid Trial / match: the mat, the athletes, the HUD, the move gems and the result flow. */
export function GameScreen({ ctx, onExit, onSettings, onNext, demo, online, onlineSeed }: {
  ctx: Ctx; onExit: () => void; onSettings: () => void; onNext: (next: Ctx | null) => void; demo?: Demo;
  online?: MpMatch | null; onlineSeed?: number;
}) {
  const unitIdx = unitIndexOf(ctx);
  const u = ALL_UNITS[unitIdx];
  const level = u.id;
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const freshSeed = () => (demo ? demo.seed : onlineSeed ?? ((Date.now() ^ (Math.random() * 1e9)) & 0x7fffffff));
  const initial = useMemo(() => {
    let st = start(unitIdx, freshSeed());
    if (demo) for (const mv of demo.moves) st = apply(st, mv);
    return st;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [s, setS] = useState<S>(initial);
  const sRef = useRef(s);
  sRef.current = s;
  const [frozen, setFrozen] = useState<S | null>(() => {
    // demo of a referee call: hold the raid's last picture (all moves but the final resolution)
    if (!demo?.refEvents) return null;
    let st = start(unitIdx, demo.seed);
    for (const mv of demo.moves.slice(0, -1)) st = apply(st, mv);
    return st;
  }); // the finished raid, held on the mat while the referee calls it
  const [sel, setSel] = useState<number | null>(demo?.select ?? null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ text: string; sub?: string; tone: "gold" | "crimson" | "cyan"; n: number; hold?: number; subLines?: number } | null>(null);
  const [ref, setRef] = useState<{ events: RefEvent[]; n: number; note?: string } | null>(demo?.refEvents && initial.ev.length ? { events: initial.ev, n: 1 } : null);
  const [lastCall, setLastCall] = useState<string>("");
  const [fx, setFx] = useState<Fx[]>([]);
  const [hits, setHits] = useState<Record<number, number>>({});
  const [result, setResult] = useState<"win" | "fail" | null>(null);
  const [celebrate, setCelebrate] = useState(0);
  const [briefing, setBriefing] = useState(!demo && qa.level == null && ctx.kind !== "online");
  const [paused, setPaused] = useState(false);
  const [coachLeft, setCoachLeft] = useState(3);
  const [coachMv, setCoachMv] = useState<string | null>(null);
  const [mat, setMat] = useState({ y: 0, w: 0, h: 0 });
  const [bar, setBar] = useState({ y: 0 });
  const [doubled, setDoubled] = useState(false);
  const [adNote, setAdNote] = useState("");
  const [rival, setRival] = useState<{ sc: [number, number]; done: boolean; left?: boolean } | null>(null);
  const [emote, setEmote] = useState<{ e: string; n: number; mine: boolean } | null>(null);
  const [kick, setKick] = useState(0); // every accepted move: the athlete squashes + pops
  const [run, setRun] = useState(0); // a run along the raid path starts: strides + lean
  const [cheerD, setCheerD] = useState(0); // the defenders on the mat celebrate (a caught raid / my tackle)
  const [cheerR, setCheerR] = useState(0); // the raider celebrates (points / a won trial)
  const [lesson, setLesson] = useState<string>(""); // why the last raid failed + what to try (until the next tap)
  // the decision being played out: its gem stays up in the bar (bounced in, glowing) with a line saying what is
  // happening — never an empty "…" bar while the raid resolves (QA game_feel 2026-11-07)
  const [committed, setCommitted] = useState<{ mv: string; n: number; chip?: string; label?: string } | null>(null);
  const [busyLine, setBusyLine] = useState("");
  const rowARef = useRef<{ mv: string; chip?: string; label?: string }[]>([]);
  // the board fades to a clean backdrop before a result card opens (no half-emptied mat ghosting behind it)
  const outro = useSharedValue(0);
  const outroStyle = useAnimatedStyle(() => ({ opacity: outro.value }));
  const holdRef = useRef<{ holder: number; during: "touch" | "ret"; target: number; move: string } | null>(null);
  const gemPos = useRef<Record<string, { x: number; y: number }>>({});
  const rows = useRef<Record<number, { x: number; y: number }>>({});
  const [, setTick] = useState(0);
  const fxN = useRef(0);
  const { style: shakeStyle, shake: shakeRaw } = useShake(6);
  const rm = !!store.get().reducedMotion;
  const shake = () => { if (!rm) shakeRaw(); };
  const leftHand = !!store.get().leftHand;
  const flash = useSharedValue(0);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const redFlash = useSharedValue(0);
  const redFlashStyle = useAnimatedStyle(() => ({ opacity: redFlash.value }));
  const flashGold = (a: number, ms = 300) => { flash.value = withSequence(withTiming(a, { duration: 60 }), withTiming(0, { duration: ms })); };
  const flashRed = (a: number, ms = 420) => { redFlash.value = withSequence(withTiming(a, { duration: 60 }), withTiming(0, { duration: ms })); };
  // retry assist: after a failed attempt, Try Again opens with the coach guiding the first raid (glowing pick + step
  // line), so a player who failed is shown the solution's first move instead of guessing again
  const [assist, setAssist] = useState(false);
  // last-chance rescue in chapter 1: one more caught raid would fail the trial → the coach guides the next raid for
  // free (QA game_feel 2026-11-07: "a fail-then-retry loop needs a gentler recovery, a hint offered BEFORE the failure")
  const rescue = ctx.kind === "trial" && (u.ch ?? 1) <= 1 && !demo && u.goal.maxCaught !== undefined && u.goal.maxCaught > 1 && s.tl.caught === u.goal.maxCaught - 1 && s.turn === 0;
  const tutorial = (ctx.kind === "trial" && [1, 2, 4].includes(ctx.trial) && !(store.get().stars?.[`t${ctx.trial}`]) && !demo) || assist || rescue;

  const view = frozen ?? s;
  // the LIVE unit: once its moment fires (S.mo) the formation and the CPU raider are the shifted ones
  const uv = unitOf(view);
  const traitOf = (slot: number) => (uv.op[slot] === "-" || !uv.op[slot] ? "o" : uv.op[slot]);
  // the side of the last raid stays on screen after the final whistle
  const lastSide = useRef<0 | 1>(u.flow === "defend" ? 1 : 0);
  if (view.rd) lastSide.current = view.turn;
  const defend = view.rd ? view.turn === 1 : lastSide.current === 1;
  const ch = u.ch || 6;
  const g = useMemo(() => makeGeom(mat.w || width - 12, mat.h || 300), [mat.w, mat.h, width]);
  const base = Math.min(g.w * 0.24, g.h * 0.27);
  // defenders are scaled to the mat width so the staggered chain never touches (front-row gap ≈ 4 % of the mat)
  const defH = base * 0.86;
  const ghost = u.ghost ? GHOSTS[u.ghost] : null;
  // the ghost's run raid by raid (replayed from its trace): the duel shows what the ghost did on THIS raid number
  const ghostRun = useMemo(() => (ghost ? ghostRaids(ghost) : []), [ghost]);
  const kit = useMemo(() => ({ crest: equipped("crest").colors, trail: equipped("trail").colors[0], banner: equipped("banner").colors }), []);
  const oppName = rivalName(ctx);

  // ── analytics: start ──
  useEffect(() => {
    if (demo) return;
    if (ctx.kind === "trial") analytics.track("level_start", { level: ctx.trial });
    analytics.track(u.flow === "alt" && u.clock ? "match_start" : "trial_start", { unit: u.id });
    if (ctx.kind === "online") analytics.track("mp_match", { bot: ctx.bot, mode: "raid_race" });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── online race: the rival plays the same seeded match; live score + emotes ──
  useEffect(() => {
    if (!online || online.bot) return;
    online.onMove((m) => {
      const mv = m as { sc?: [number, number]; done?: boolean };
      if (mv?.sc) setRival({ sc: mv.sc, done: !!mv.done });
    });
    online.onEmote((e) => setEmote({ e, n: Date.now(), mine: false }));
    online.onLeave(() => setRival((r) => ({ sc: r?.sc ?? [0, 0], done: true, left: true })));
    return () => { online.leave().catch(() => {}); };
  }, [online]);

  // ── where the moving athlete stands (derived from the engine state) ──
  const raiderSpot = useCallback((st: S): { u: number; d: number } => {
    const rd = st.rd;
    if (st.turn === 0) {
      if (!rd) return { u: 0, d: 0.03 };
      const near = (slot: number, k = 0.13) => { const p = slotSpot(slot, false); return { u: p.u * 0.94, d: p.d - k }; };
      // a back-row target: he stops in the opened lane a little short of him (reaching in), so the target's body and
      // badge stay readable above the raider's head instead of disappearing behind him
      if (st.pd && st.ph === "touch") return st.pd === "bonus" ? { u: -0.2, d: g.bonus + 0.05 } : near(slotOf(st.pd), isBackRow(slotOf(st.pd)) ? 0.17 : 0.11);
      if (st.pd && st.ph === "ret") { const l = rd.tc.length ? slotSpot(rd.tc[rd.tc.length - 1], false).u : 0; return { u: l * 0.3, d: -0.02 }; }
      // held on the way HOME (rd.ret is set by the return move): he is caught short of the midline, where he was
      // running — never pulled back up the mat to the holder's spot (a back-row holder dragged him into the back row)
      if (st.ph === "str" && rd.hold >= 0 && rd.ret) { const l = rd.tc.length ? slotSpot(rd.tc[rd.tc.length - 1], false).u : 0; return { u: l * 0.3, d: 0.1 }; }
      if (st.ph === "str" && rd.hold >= 0) return near(rd.hold, 0.09);
      if (st.ph === "drs" && st.dr) return near(st.dr.d);
      // between touches he steps back to the baulk side, toward his last touch — clear of the front row's feet
      // (QA 2026-11-07: resting 0.2 in front of a back-row defender left him standing inside the front row)
      if (rd.tc.length) return { u: slotSpot(rd.tc[rd.tc.length - 1], false).u * 0.6, d: 0.22 };
      if (rd.bn) return { u: -0.2, d: g.bonus + 0.02 };
      return { u: 0, d: 0.03 };
    }
    if (!st.ai || !rd) return { u: 0, d: 0.97 };
    const t = slotSpot(st.ai.d, true);
    if (st.pd && st.ph === "dtouch") return { u: t.u * 0.95, d: t.d + 0.1 };
    if (st.pd && st.ph === "dret") return { u: t.u * 0.35, d: 1.02 };
    if (rd.tc.length || st.ph === "dret") return { u: t.u * 0.9, d: t.d + 0.16 };
    return { u: t.u * 0.45, d: 0.78 };
  }, [g.bonus]);

  const rx = useSharedValue(g.w / 2), ry = useSharedValue(g.h), rs = useSharedValue(1);
  const spot = raiderSpot(view);
  const spotP = g.P(spot.u, spot.d);
  // a run along the planned path: x eases out, y eases in-out → the raider curves like the dashed trail he follows
  const RUN_MS = 520;
  useEffect(() => {
    if (!mat.h) return;
    const ms = (view.pd ? RUN_MS : 380) * SPEED();
    runTo(rx, spotP.x, ms, view.pd ? "out" : "inOut"); runTo(ry, spotP.y, ms); runTo(rs, spotP.s, ms);
  }, [spotP.x, spotP.y, spotP.s, mat.h, view.pd]); // eslint-disable-line react-hooks/exhaustive-deps

  // Callout words (TOUCH! / HELD! / SAFE! …) never sit on a piece (QA render_defects 2026-11-07: "TOUCH!" covered
  // #3's badge and head): the burst / dust / impact stays where it happens, the WORD flies up in the free lane of the
  // mat (between the baulk and bonus lines on my raid, mid-mat on my defence), where no defender stands.
  const addFx = (f: Omit<Fx, "n">) => {
    const list: Omit<Fx, "n">[] = [];
    if (f.text && mat.h && !f.keep) {
      const { text, color, ...rest } = f;
      if (rest.burst || rest.dust || rest.impact) list.push(rest);
      const q = g.P(0, defend ? 0.64 : (g.baulk + g.bonus) / 2);
      list.push({ x: q.x, y: q.y + mat.y + 14, text, color });
    } else list.push(f);
    setFx((old) => [...old.slice(-7), ...list.map((x) => ({ ...x, n: ++fxN.current }))]);
  };
  const slotXY = (slot: number, dfd: boolean) => { const p = slotSpot(slot, dfd); const q = g.P(p.u, p.d); return { x: q.x, y: q.y + mat.y - base * q.s * 0.5 }; };
  /** a defender's feet: contact bursts land on the ground ring, never over his badge or face */
  const feetXY = (slot: number, dfd: boolean) => { const p = slotSpot(slot, dfd); const q = g.P(p.u, p.d); return { x: q.x, y: q.y + mat.y - base * q.s * 0.1 }; };
  const runnerXY = () => ({ x: spotP.x, y: spotP.y + mat.y - base * spotP.s * 0.6 });

  // ── banners at the start of each raid ──
  const raidBanner = (st: S, prev: S | null) => {
    if (st.end || !st.rd) return;
    // the unit's one-off moment fired at the end of that raid: the referee's call / the reversal, then the new mat
    const mo = u.moment;
    if (prev && mo && st.mo && !prev.mo) {
      const { head, sub } = momentLines(mo);
      const half = st.ev.some((e) => e.kind === "half_time");
      setBanner({ text: head, sub: `${half && !/half/i.test(head) ? "Half time — " : ""}${sub}`, tone: mo.kind === "ref" ? "cyan" : "crimson", n: Date.now(), hold: 2600, subLines: 4 });
      setLastCall(mo.kind === "ref" ? `Referee: ${head} Re-read the mat` : `${head} Re-read the mat`);
      feedback(mo.kind === "ref" ? "unlock" : "whoosh", "heavy");
      return;
    }
    // (the finished raid's events live on the NEW state: apply() starts every step with ev = [])
    if (prev && (st.ev.some((e) => e.kind === "half_time") || prev.ev.some((e) => e.kind === "half_time"))) { setBanner({ text: "HALF TIME", sub: "Sides swap — second half", tone: "gold", n: Date.now() }); return; }
    if (st.rd.dd) { setBanner({ text: "DO-OR-DIE!", sub: st.turn === 0 ? "Score, or your raider is out" : "Stop him — he must score", tone: "crimson", n: Date.now() }); return; }
    if (u.flow === "alt" || !prev) setBanner(st.turn === 0 ? { text: "YOUR RAID", tone: "gold", n: Date.now() } : { text: "DEFEND!", sub: `${unitOf(st).ai?.name ?? "Their raider"} attacks`, tone: "cyan", n: Date.now() });
  };
  useEffect(() => {
    if (!briefing && !demo) raidBanner(s, null);
  }, [briefing]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── the decision ──
  const decide = (mv: string) => {
    const st = sRef.current;
    if (busy || result || st.end || !legalMoves(st).includes(mv)) return;
    const s1 = apply(st, mv);
    analytics.qa("move", { level });
    setCoachMv(null);
    const m = moveOf(mv);
    // juice at the touched target on the mat, at once
    const tgt = slotOf(mv);
    if (tgt >= 0) {
      const p = feetXY(tgt, st.turn === 1);
      addFx({ x: p.x, y: p.y, burst: st.turn === 1 ? "#4FE3FF" : "#FFE27A" });
    } else addFx({ ...runnerXY(), burst: "#FFFFFF" });
    // the athlete kicks off: dust at his feet (a Dash / Rush / Lunge streaks)
    if (st.ph !== "bid" && st.ph !== "pick" && st.ph !== "drs") {
      addFx({ x: spotP.x, y: spotP.y + mat.y - 4, dust: m === "dash" || m === "rush" || m === "lunge" || m === "dubki" ? "big" : "small" });
      setKick((k) => k + 1);
    }
    feedback(m === "dash" || m === "rush" || m === "lunge" ? "whoosh" : "move", "medium");
    if (m === "bid" || m === "pick" || m === "pass") analytics.track(m === "bid" ? "auction_bid" : m === "pass" ? "auction_pass" : "raider_pick", { unit: u.id });
    else if (st.turn === 0) analytics.track("raid_move_used", { move: m });
    else analytics.track("tackle_attempt", { move: m });
    setS(s1);
    setLesson("");
    const g0 = rowARef.current.find((x) => x.mv === mv);
    setCommitted({ mv, n: Date.now(), chip: g0?.chip, label: g0?.label });
    setBusyLine(actionLine(st, mv));
    if (!s1.pd) { after(st, s1); return; }
    setBusy(true);
    const resolve = () => {
      const frame = GO_FRAMES[Math.floor(Date.now() / 37) % 4];
      const s2 = apply(s1, frame);
      analytics.qa("move", { level });
      setS(s2);
      after(s1, s2);
    };
    const contact = s1.ph === "touch" || s1.ph === "ret" || s1.ph === "str" || s1.ph === "dtouch" || s1.ph === "dret";
    if (!contact) { setTimeout(resolve, (m === "bid" ? 420 : 620) * SPEED()); return; }
    // 1) the run: the athlete follows the raid path (strides, lean, the chain crouches toward him)
    if (s1.ph !== "str") setRun((r) => r + 1);
    // 2) contact at the end of the run: impact starburst + sparks at the touch point, a 4 px shake and a brief
    //    hit-stop (the picture holds ~120 ms) — 3) then the engine's real outcome lands (setS) with its result fx
    setTimeout(() => {
      const t = slotOf(mv);
      const at = t >= 0 ? feetXY(t, s1.turn === 1) : s1.ph === "ret" || s1.ph === "dret"
        ? (() => { const sp = raiderSpot(s1), q = g.P(sp.u, sp.d); return { x: q.x, y: q.y + mat.y - base * q.s * 0.5 }; })()
        : runnerXY();
      addFx({ x: at.x, y: at.y, impact: true, size: 96 });
      addFx({ x: at.x, y: at.y, burst: s1.ph === "ret" || s1.ph === "dret" ? "#FFFFFF" : "#FFE27A", size: 96 });
      flashGold(0.14, 160);
      shake();
      feedback("pop", "heavy");
      setTimeout(resolve, 120 * SPEED());
    }, (s1.ph === "str" ? 260 : RUN_MS) * SPEED());
  };

  /** What the decision just taken is doing, in player words (shown in the bar while it plays out). */
  const actionLine = (st: S, mv: string): string => {
    const m = moveOf(mv), t = slotOf(mv), look = MOVE_LOOK[m]?.label ?? m;
    if (st.ph === "touch") return m === "bonus" ? "Hopping for the bonus line…" : t >= 0 ? `${look} on #${t + 1}…` : m === "walk" ? "Walking home — over the red midline!" : m === "dash" ? "Dashing for the midline!" : "Dubki — ducking under their arms!";
    if (st.ph === "ret") return m === "walk" ? "Walking home — over the red midline!" : m === "dash" ? "Dashing for the midline!" : "Dubki — ducking under their arms!";
    if (st.ph === "str") return m === "lunge" ? "Lunging for the midline…" : "Pulling free of the hold…";
    if (st.ph === "dtouch" || st.ph === "dret") return m === "hold" ? "Staying back — let him come…" : m === "block" ? "Linking arms on the midline…" : t >= 0 ? `#${t + 1} goes for the ${look}…` : `${look}…`;
    if (st.ph === "bid") return m === "bid" ? "Paddle up — bidding…" : "Passing on this lot…";
    if (st.ph === "drs") return m === "review" ? "Third umpire checking the replay…" : "Accepting the call…";
    return "…";
  };

  /** Outcome juice + the referee flow after a resolved decision. */
  const after = (prev: S, next: S) => {
    const ended = next.ev.length > 0 || (!!next.end && !prev.end);
    // where the athlete stands at the end of his run (the pending decision's spot), not where he started
    const rp = (() => { const sp = raiderSpot(prev), q = g.P(sp.u, sp.d); return { x: q.x, y: q.y + mat.y - base * q.s * 0.6 }; })();
    // remember who grabbed the raider and on which beat: the CAUGHT explanation is built from it
    if (next.ph === "str" && next.rd && next.rd.hold >= 0 && prev.pd && (prev.ph === "touch" || prev.ph === "ret"))
      holdRef.current = { holder: next.rd.hold, during: prev.ph, target: slotOf(prev.pd), move: moveOf(prev.pd) };
    if (prev.ph === "touch" && prev.pd) {
      const t = slotOf(prev.pd);
      if (next.ph === "str") { addFx({ ...rp, text: "HELD!", color: "#FF6A6F", burst: "#FF4D55" }); shake(); flashRed(0.22); feedback("error", "heavy"); }
      else if (next.ph === "drs") { addFx({ ...rp, text: "CLOSE CALL", color: "#4FE3FF" }); feedback("pop", "medium"); }
      else if (prev.pd === "bonus") {
        if (next.rd?.bn) { addFx({ ...rp, text: "BONUS!", color: "#FFE27A", burst: "#FFE27A" }); addFx({ x: 46, y: insets.top + 96, text: "+1", color: "#FFE27A", keep: true }); feedback("star2", "medium"); } else addFx({ ...rp, text: "No bonus", color: "#B9B6D9" });
      } else if (next.rd && next.rd.tc.length > (prev.rd?.tc.length ?? 0)) {
        const p = feetXY(t, false);
        setHits((h) => ({ ...h, [t]: (h[t] ?? 0) + 1 }));
        addFx({ x: p.x, y: p.y, text: "TOUCH!", color: "#FFE27A", burst: "#FFB400", size: 70 });
        // the point is live at once: "+1" rises off the touched defender's spot toward my shield (scores at the midline)
        addFx({ x: 46, y: insets.top + 96, text: "+1", color: "#FFE27A", keep: true });
        feedback("star1", "heavy");
        flashGold(0.25, 220);
      } else addFx({ ...rp, text: "Missed", color: "#B9B6D9" });
    } else if (prev.ph === "ret" && prev.pd) {
      if (next.ph === "str") { addFx({ ...rp, text: "HELD!", color: "#FF6A6F", burst: "#FF4D55" }); shake(); flashRed(0.22); feedback("error", "heavy"); }
      else if (!next.ev.some((e) => e.side === 1 && e.points > 0)) { addFx({ x: rp.x, y: rp.y + base * 0.5, dust: "big" }); addFx({ ...rp, text: "SAFE!", color: "#3DDC84" }); }
    } else if (prev.ph === "str" && prev.pd) {
      if (next.tl.esc > prev.tl.esc) { addFx({ x: rp.x, y: rp.y + base * 0.5, dust: "big" }); addFx({ ...rp, text: "ESCAPED!", color: "#3DDC84", burst: "#3DDC84" }); feedback("success", "heavy"); analytics.track("struggle_result", { escaped: true }); }
      else { addFx({ ...rp, text: "TACKLED", color: "#FF6A6F", burst: "#FF4D55" }); shake(); feedback("fail", "heavy"); analytics.track("struggle_result", { escaped: false }); }
    } else if ((prev.ph === "dtouch" || prev.ph === "dret") && prev.pd) {
      const stopped = next.tl.stops > prev.tl.stops;
      const resp = prev.pd;
      analytics.track("tackle_result", { move: moveOf(resp), stop: stopped });
      if (stopped) {
        addFx({ ...rp, impact: true, size: next.tl.sT > prev.tl.sT ? 150 : 115 });
        addFx({ x: rp.x, y: rp.y + base * 0.5, dust: "big" });
        addFx({ ...rp, text: next.tl.sT > prev.tl.sT ? "SUPER TACKLE!" : resp.startsWith("chain") ? "CHAIN TACKLE!" : "TACKLE!", color: "#3DDC84", burst: "#FFE27A" });
        shake(); feedback("success", "heavy");
        flashGold(0.3, 240);
      } else if (next.ph === "drs") addFx({ ...rp, text: "CLOSE CALL", color: "#4FE3FF" });
      else {
        const tagged = (next.rd?.tc ?? []).filter((x) => !(prev.rd?.tc ?? []).includes(x));
        for (const x of tagged) setHits((h) => ({ ...h, [x]: (h[x] ?? 0) + 1 }));
        addFx({ ...rp, text: ended ? "He got away" : tagged.length ? "Tagged!" : "Missed him", color: "#FF8A8F", burst: "#16B8C4" });
        feedback(tagged.length ? "error" : "pop", "medium");
      }
    } else if (prev.ph === "bid" && prev.pd) {
      const a0 = prev.au!, a1 = next.au;
      if (a1 && a1.got.length > a0.got.length) { addFx({ x: width / 2, y: mat.y + mat.h * 0.3, text: "SOLD TO YOU!", color: "#FFE27A", burst: "#FFB400" }); feedback("coin", "success"); analytics.track("auction_win", { unit: u.id }); }
      else if (a1 && a1.i === a0.i) addFx({ x: width / 2, y: mat.y + mat.h * 0.3, text: `Raised to ${a1.price}`, color: "#FF8A8F" });
      else addFx({ x: width / 2, y: mat.y + mat.h * 0.3, text: "Lot lost", color: "#FF8A8F" });
    } else if (prev.ph === "drs" && prev.pd) {
      addFx({ x: width / 2, y: mat.y + mat.h * 0.3, text: next.tl.drsW > prev.tl.drsW ? "OVERTURNED!" : "Decision stands", color: next.tl.drsW > prev.tl.drsW ? "#3DDC84" : "#FF8A8F" });
      analytics.track("drs_used", { won: next.tl.drsW > prev.tl.drsW });
    }
    setSel(null);
    if (!ended) {
      setTimeout(() => { setBusy(false); setCommitted(null); }, 160 * SPEED());
      if (!prev.pd && next.rd && prev.ph === "pick") raidBanner(next, null);
      return;
    }
    if (assist) setAssist(false);
    // the raid is over: hold its last picture on the mat — 1) the result banner slams in (CAUGHT! / POINT!) with a
    // flash and the side that won the raid celebrating, 2) the referee panel drops in with the points breakdown,
    // 3) play goes on (or the match ends). QA mode runs the same beats faster.
    setBusy(true);
    setFrozen(prev);
    const k = SPEED();
    const evs = next.ev;
    let why = "";
    if (evs.length) {
      const mine = evs.filter((e) => e.side === 0).reduce((a, e) => a + e.points, 0), theirs = evs.filter((e) => e.side === 1).reduce((a, e) => a + e.points, 0);
      const myRaid = prev.turn === 0;
      const out = evs.find((e) => e.kind === "tackle" || e.kind === "super_tackle" || e.kind === "time_out" || e.kind === "do_or_die_out");
      const superR = evs.some((e) => e.kind === "super_raid"), allOut = evs.some((e) => e.kind === "all_out");
      const n = Date.now();
      if (myRaid && out) {
        why = caughtWhy(prev, next, out.kind);
        setLesson(why);
        setBanner({ text: out.kind === "time_out" ? "TIME OUT!" : "CAUGHT!", sub: theirs ? `+${theirs} to ${oppName}` : undefined, tone: "crimson", n, hold: 520 });
        flashRed(0.42, 520); shake(); setCheerD((c) => c + 1);
        feedback("fail", "heavy");
      } else if (myRaid && mine) {
        setBanner({ text: superR ? `SUPER RAID! +${mine}` : allOut ? `ALL OUT! +${mine}` : mine === 1 ? "POINT! +1" : `+${mine} POINTS!`, sub: "Over the midline — it counts!", tone: "gold", n, hold: 900 });
        flashGold(0.4, 480); setCheerR((c) => c + 1); shake();
        // the midline lights up where he crossed: a burst on the line, confetti out of the board
        const mp = g.P(spot.u * 0.3, 0);
        addFx({ x: mp.x, y: mp.y + mat.y, burst: "#FFE27A", size: 150, impact: true });
        addFx({ x: width / 2, y: mat.y + mat.h * 0.42, burst: "#FFE27A", size: 140 });
        if (mine >= 2 || next.end === 1) setCelebrate((c) => c + 1);
        feedback("coin", "success");
      } else if (!myRaid && out) {
        setBanner({ text: out.kind === "super_tackle" ? `SUPER TACKLE! +${mine}` : `STOPPED! +${mine}`, tone: "gold", n, hold: 520 });
        flashGold(0.4, 480); setCheerD((c) => c + 1);
        feedback("coin", "success");
      } else if (!myRaid && theirs) {
        setBanner({ text: `THEY SCORE +${theirs}`, sub: "Watch his move — match the hold to it", tone: "crimson", n, hold: 520 });
        flashRed(0.3, 420);
        feedback("error", "medium");
      } else if (allOut) {
        setBanner({ text: `ALL OUT! +2`, tone: mine ? "gold" : "crimson", n, hold: 520 });
      } else {
        setBanner({ text: "EMPTY RAID", sub: "No touch, no point", tone: "cyan", n, hold: 420 });
      }
      setLastCall(`Last raid  +${mine} : +${theirs}`);
      setBusyLine(myRaid ? (out ? `Caught — +${theirs} to ${oppName}` : mine ? `You score +${mine}!` : "Empty raid — no point") : out ? `Stopped! +${mine} to you` : theirs ? `He scores +${theirs}` : "Empty raid — he scores nothing");
      // the points fly up into the scoreboard shields
      if (mine) addFx({ x: 42, y: insets.top + 128, text: `+${mine}`, color: "#FFE27A", keep: true, burst: "#FFE27A", size: 90 });
      if (theirs) addFx({ x: width - 42, y: insets.top + 128, text: `+${theirs}`, color: "#8FB4FF", keep: true, burst: "#8FB4FF", size: 90 });
      for (const e of evs) {
        if (e.kind === "super_raid") analytics.track("super_raid");
        if (e.kind === "super_tackle") analytics.track("super_tackle");
        if (e.kind === "all_out") analytics.track("all_out");
        if (e.kind === "bonus") analytics.track("bonus_point");
        if (e.kind === "do_or_die") analytics.track("do_or_die_triggered");
        if (e.kind === "revival") analytics.track("revival");
      }
      analytics.track("raid_result", { side: prev.turn, me: mine, them: theirs });
      if (online && !online.bot) online.sendMove({ sc: next.m.sc, done: !!next.end }).catch(() => {});
      setTimeout(() => setRef({ events: evs, n: Date.now(), note: why || undefined }), 900 * k);
    }
    setTimeout(() => {
      setRef(null);
      setFrozen(null);
      setCommitted(null);
      holdRef.current = null;
      if (next.end) finish(next);
      else { setBusy(false); raidBanner(next, prev); }
    }, (evs.length ? 2500 : 1500) * k);
  };

  /** Why my raider was caught, and the move to try instead — from the real engine state (no canned copy). */
  const caughtWhy = (prev: S, next: S, kind: RefEvent["kind"]): string => {
    if (kind === "time_out") return "Out — the 30 s raid clock ran out. Fewer touches, then head home.";
    if (kind === "do_or_die_out") return "Out — a Do-or-Die raid must score a touch or the bonus.";
    const op = unitOf(prev).op;
    const trait = (slot: number) => (op[slot] === "-" || !op[slot] ? "o" : op[slot]);
    const nm = (slot: number) => (TRAIT_BADGE[trait(slot)] ?? TRAIT_BADGE.o).name;
    const hc = holdRef.current;
    let head = "Caught.";
    if (hc && hc.during === "touch") {
      head = hc.holder === hc.target || hc.target < 0
        ? `Caught — #${hc.holder + 1} is a ${nm(hc.holder)}: he grabbed your ${MOVE_LOOK[hc.move]?.label ?? "touch"}.`
        : `Caught — the ${nm(hc.holder)} next to him (#${hc.holder + 1}) grabbed you.`;
    } else if (hc) head = `Caught on the way home — #${hc.holder + 1}, a ${nm(hc.holder)}, cut you off.`;
    // advice: the safest touch on the NEXT raid, by the engine's own catch chance
    if (!next.end && next.turn === 0 && next.ph === "touch" && next.rd) {
      let best = -1, bp = 2;
      for (const mv of legalMoves(next)) {
        const t = slotOf(mv);
        if (t < 0) continue;
        const p = touchCatch(next, t, moveOf(mv) as TouchMove).p;
        if (p < bp) { bp = p; best = t; }
      }
      if (best >= 0) {
        const ranks = slotsOf(next.m.al[1]), i = ranks.indexOf(best);
        const gap = trait(best) === "o" && [ranks[i - 1], ranks[i + 1]].some((x) => x !== undefined && trait(x) !== "o");
        const who = trait(best) === "o" ? (gap ? "the rookie in the gap" : "the rookie") : `the ${nm(best)}`;
        return `${head} Pick #${best + 1}, ${who} — only ${Math.round(bp * 100)}% held.`;
      }
    }
    if (hc && hc.during === "ret") return `${head} Check the % caught before you head home.`;
    return `${head} Read the badges: touch where the % held is lowest.`;
  };

  const finish = (st: S) => {
    const won = st.end === 1;
    setBusyLine(won ? (ctx.kind === "trial" ? "Trial won!" : "Victory!") : ctx.kind === "trial" ? "Trial lost — try again" : "Defeat");
    const n = starsOf(st);
    if (demo) { setResult(won ? "win" : "fail"); return; }
    const unlocks = recordResult(ctx, won, n);
    unlockedRef.current = unlocks.unlocked;
    if (ctx.kind === "trial") {
      if (won) {
        analytics.track("level_complete", { level: ctx.trial, stars: n });
        review.levelWon(ctx.trial);
        if (ctx.trial === 1 && !store.get().tutorialDone) { store.set({ tutorialDone: true }); analytics.track("tutorial_done"); }
      } else analytics.track("level_fail", { level: ctx.trial });
    }
    analytics.track(u.flow === "alt" && u.clock ? "match_end" : won ? "trial_complete" : "trial_fail", { unit: u.id, won, stars: n });
    for (const k of unlocks.unlocked) analytics.track("mode_unlocked", { mode: k });
    if (won) {
      setCelebrate((c) => c + 1);
      setTimeout(() => setCelebrate((c) => c + 1), 450 * SPEED());
      setBanner({ text: ctx.kind === "trial" ? "TRIAL WON!" : "VICTORY!", sub: `${MY_TEAM} ${st.m.sc[0]} - ${st.m.sc[1]} ${oppName}`, tone: "gold", n: Date.now() });
      // the mat celebrates first: gold flash, confetti out of the board, my athletes jump — then the win card
      setCheerR((c) => c + 1);
      if (defend) setCheerD((c) => c + 1);
      addFx({ x: width / 2, y: mat.y + mat.h * 0.5, burst: "#FFE27A", size: 160 });
      flashGold(0.45, 420);
      feedback("success", "success");
      outro.value = withDelay(650 * SPEED(), withTiming(0.85, { duration: 450 }));
      setTimeout(() => setResult("win"), 1300 * SPEED());
    } else {
      shake();
      setBanner({ text: ctx.kind === "trial" ? "TRIAL LOST" : "DEFEAT", sub: st.why || undefined, tone: "crimson", n: Date.now() });
      feedback("fail", "error");
      outro.value = withDelay(450 * SPEED(), withTiming(0.85, { duration: 400 }));
      setTimeout(() => setResult("fail"), 1000 * SPEED());
    }
  };
  const unlockedRef = useRef<string[]>([]);

  // demo: show the result popup at once
  useEffect(() => {
    if (demo?.result === "win") setTimeout(() => setResult("win"), 400);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // a banner unmounts once it has slid away (a mounted-but-invisible banner kept hints hidden / nothing else knew)
  useEffect(() => {
    if (!banner) return;
    const n = banner.n;
    const id = setTimeout(() => setBanner((b) => (b && b.n === n ? null : b)), (520 + (banner.hold ?? 650)) * SPEED() + 80);
    return () => clearTimeout(id);
  }, [banner]);

  const restart = (assisted = false) => {
    const st = start(unitIdx, freshSeed());
    setS(st); setFrozen(null); setSel(null); setBusy(false); setResult(null); setRef(null); setFx([]); setCoachLeft(3); setDoubled(false); setAdNote(""); setCoachMv(null); setLesson("");
    setCommitted(null); setBusyLine(""); outro.value = 0;
    if (ctx.kind === "trial") analytics.track("level_start", { level: ctx.trial });
    if (assisted) { analytics.track("retry_assist", { unit: u.id }); setBanner({ text: "COACH ASSIST", sub: "Follow the glow for your first raid", tone: "cyan", n: Date.now(), hold: 900 }); }
    else raidBanner(st, null);
  };

  // ── coach / tutorial ──
  const askCoach = () => {
    const bought = store.get().hints ?? 0;
    if (busy || (coachLeft <= 0 && bought <= 0) || s.end) return;
    const mv = bestMove(s);
    if (!mv) return;
    if (coachLeft > 0) setCoachLeft((c) => c - 1);
    else store.set({ hints: bought - 1 });
    analytics.track("hint_used", { unit: u.id });
    setCoachMv(mv);
    const t = slotOf(mv);
    if (t >= 0 && (s.ph === "touch" || s.ph === "dtouch" || s.ph === "dret")) setSel(t);
    feedback("unlock", "light");
  };
  const tutMove = useMemo(() => (tutorial && !busy && !frozen && !briefing && !result ? bestMove(s) : null), [tutorial, busy, frozen, briefing, result, s]);

  // what the coach / tutorial points at: an asked hint, else the tutorial's best move
  const guide = coachMv ?? tutMove;

  // ── what the player can choose right now ──
  const legal = view === s && !busy && !s.end ? legalMoves(s) : [];
  const live = legal.length > 0 && !legal[0].startsWith("go");
  const rd = view.rd;
  const pct = (p: number) => `${Math.round(p * 100)}%`;
  type G = { mv: string; chip?: string; bad?: boolean; label?: string; tag?: string };
  // SCOUTED: the defence read this move off my last raid (the % already carries the penalty); WALLED: the Blockers
  // link arms on the midline against the Dash
  const show = uv.show ?? {};
  const wallUp = !defend && !!show.wall && slotsOf(view.m.al[1]).some((x) => traitOf(x) === "B");
  const tagOf = (mv: string) => {
    const m = moveOf(mv), tags: string[] = [];
    if (readOf(uv) > 0 && s.lm.includes(scoutLetter(m))) tags.push("SCOUTED");
    if (m === "dash" && wallUp) tags.push("WALLED");
    return tags.join(" · ") || undefined;
  };
  let rowA: G[] = [];
  let prompt = "";
  if (live && s.ph === "touch" && rd) {
    if (sel !== null && legal.some((m) => m.endsWith(`@${sel}`))) {
      // the Kick also shows its landing chance (a missed Kick is safe but scores nothing — on a captain it is 2 in 3)
      rowA = legal.filter((m) => m.endsWith(`@${sel}`)).map((m) => { const mm = moveOf(m) as TouchMove, p = touchCatch(s, sel, mm).p; return { mv: m, chip: `${pct(p)} held`, bad: p > 0.3, label: mm === "kick" ? `Kick · lands ${pct(touchLand(s, sel, mm))}` : MOVE_LOOK[mm].label, tag: tagOf(m) }; });
      prompt = `#${sel + 1} ${(TRAIT_BADGE[traitOf(sel)] ?? TRAIT_BADGE.o).name} — pick your touch`;
    } else {
      prompt = rd.tc.length || rd.bn ? "Touch another defender — or head home to score" : rd.dd ? "DO-OR-DIE: you must score this raid" : "Tap a defender to plan your raid";
      if (legal.includes("bonus")) { const p = touchCatch(s, -1, "bonus").p; rowA.push({ mv: "bonus", chip: `${pct(p)} held`, bad: p > 0.3, tag: tagOf("bonus") }); }
      rowA.push(...legal.filter((m) => m === "walk" || m === "dash" || m === "dubki").map((m) => { const p = returnCatch(s, m as "walk").p; return { mv: m, chip: `${pct(p)} caught`, bad: p > 0.3, tag: tagOf(m) }; }));
    }
  } else if (live && s.ph === "ret" && rd) {
    prompt = "Choose your way home — cross the red midline";
    rowA = legal.map((m) => { const p = returnCatch(s, m as "walk").p; return { mv: m, chip: `${pct(p)} caught`, bad: p > 0.3, tag: tagOf(m) }; });
  } else if (live && (s.ph === "dtouch" || s.ph === "dret") && s.ai) {
    const told = s.ph === "dtouch" ? s.ai.ft === 1 : s.ai.fr === 1;
    const beat = s.ph === "dtouch" ? "touch" : "ret";
    const shown = beat === "touch" ? s.ai.show : s.ai.rshow;
    const look = MOVE_LOOK[shown]?.label ?? shown;
    const bluffs = !!uv.ai?.bluff && !uv.gate;
    prompt = beat === "touch"
      ? `He shows ${look.toUpperCase()} on #${s.ai.d + 1}${told ? " — it FLICKERED: FEINT?" : bluffs ? " (he may feint)" : ""} — pick a defender`
      : `He's going home: ${look.toUpperCase()}${told ? " — it FLICKERED: FEINT?" : bluffs ? " (or a feint)" : ""} — last chance`;
    // a flickering telegraph is a lie (AIRaider.tell): the real move is one of his OTHER moves, so the grip shown is
    // the average over them (the engine's own belief once the tell shows)
    const others: string[] = !told || !uv.ai ? [] : beat === "touch" ? uv.ai.mv.filter((x) => x !== shown && x !== "bonus") : uv.ai.ret.filter((x) => x !== shown);
    const grip = (m: string) => others.length
      ? others.reduce((a, o) => a + tacklePower(s, m, o as TouchMove, beat), 0) / others.length
      : tacklePower(s, m, shown as TouchMove, beat);
    if (sel !== null) {
      for (const dm of ["ankle", "thigh", "rush"]) if (legal.includes(`${dm}@${sel}`)) { const p = grip(`${dm}@${sel}`); rowA.push({ mv: `${dm}@${sel}`, chip: `${pct(p)} grip`, bad: p < 0.3, label: MOVE_LOOK[dm].label }); }
      const ranks = slotsOf(s.m.al[0]);
      const prev = ranks[ranks.indexOf(sel) - 1];
      const ch = legal.includes(`chain@${sel}`) ? `chain@${sel}` : prev !== undefined && legal.includes(`chain@${prev}`) ? `chain@${prev}` : null;
      if (ch) { const p = grip(ch); rowA.push({ mv: ch, chip: `${pct(p)} grip`, bad: p < 0.3, label: "Chain" }); }
      if (!rowA.length) prompt = `#${sel + 1} is too far from his target — pick one nearer`;
      else prompt = `${look.toUpperCase()} on #${s.ai.d + 1}${told ? " — FEINT?" : ""}: #${sel + 1} ${(ROLE_BADGE[s.me[sel]] ?? ROLE_BADGE.o).name} — pick the hold`;
    }
    if (legal.includes("block")) { const p = grip("block"); rowA.push({ mv: "block", chip: `${pct(p)} grip`, bad: p < 0.3 }); }
    rowA.push({ mv: "hold", label: "Stay Back" });
  } else if (live && s.ph === "str" && rd) {
    // HELD: the struggle plays in the bottom bar (QA render_defects 2026-11-07: a full HELD! card over the mat hid the
    // raider, the holder and the lower defenders) — the mat stays visible with the holder lunging on the raider
    prompt = `HELD by #${rd.hold + 1}! Break free to the midline — he counts as touched`;
    rowA = legal.filter((m) => m === "pull" || m === "lunge").map((m) => { const p = escapeChance(s, m as "pull"); return { mv: m, chip: `${pct(p)} escape`, bad: p < 0.35 }; });
  } else if (busy || frozen) prompt = busyLine || (frozen ? "Referee's call…" : "Get set…");
  rowARef.current = rowA;

  const gemSize = Math.max(42, Math.min(60, Math.floor((width - 16) / Math.max(1, rowA.length)) - 20));
  const coachSel = guide && slotOf(guide) >= 0 ? slotOf(guide) : null;

  // ── coach / tutorial hint: STEP-BASED, rebuilt from the live state every render ──
  // (QA 2026-11-07: one "Tap the glowing defender" line + hand sat on screen for many frames while the player did
  // other things, and nothing said why a raid failed.) Each step names what to do NOW and reacts to what the player
  // did: a different defender selected → why that one is risky; a caught raid → why (lesson) and the safer pick.
  // Hints and the hand hide whenever a banner, the referee call, a phase card or a result popup is up.
  const quiet = !busy && !result && !briefing && !frozen && !banner && !ref && !!mat.h && !paused;
  // the tutorial marks its target IN PLACE (QA render_defects 2026-11-07: a floating pointing hand beside the target
  // covered #3 / #5 and flipped between left / right poses): a bouncing "TAP" tag over the defender's badge (free
  // space above his head), or the gem's own lit label in the bar — nothing drawn over another piece
  let tapMark: { x: number; y: number; n: number } | null = null;
  let coachLine = "";
  const nameOf = (slot: number) => (defend ? ROLE_BADGE[s.me[slot]] ?? ROLE_BADGE.o : TRAIT_BADGE[traitOf(slot)] ?? TRAIT_BADGE.o).name;
  if ((tutorial || coachMv) && guide && quiet && live) {
    const t = slotOf(guide);
    // step = the decision count of this raid (pick → touch → pick again / head home), so the line visibly advances
    const step = s.turn === 0 && rd ? 1 + 2 * rd.tc.length + (rd.bn ? 2 : 0) + (sel !== null ? 1 : 0) : 0;
    const more = !!rd && rd.tc.length > 0;
    if (t >= 0 && sel !== t && (s.ph === "touch" || s.ph === "dtouch" || s.ph === "dret")) {
      // the finger points at his badge from the side with free space (never over his feet or a neighbour's sprite)
      const sp = slotSpot(t, s.turn === 1), q = g.P(sp.u, sp.d), hh = defH * q.s;
      tapMark = { x: q.x, y: q.y + mat.y - hh - 18 - 13, n: t + 1 };
      if (s.turn === 0) {
        const pg = touchCatch(s, t, moveOf(guide) as TouchMove).p;
        if (sel !== null && s.ph === "touch") {
          const opts = legal.filter((m) => m.endsWith(`@${sel}`));
          const ps = opts.length ? Math.min(...opts.map((m) => touchCatch(s, sel, moveOf(m) as TouchMove).p)) : 1;
          coachLine = `#${sel + 1} is a ${nameOf(sel)} — ${pct(ps)} held. Tap the glowing #${t + 1} instead (${pct(pg)}).`;
        } else coachLine = `${more ? "One more? " : ""}Tap the glowing #${t + 1} — only ${pct(pg)} held`;
      } else coachLine = `Tap #${t + 1}, next to his target: the cover makes the best tackle`;
    } else if (rowA.some((x) => x.mv === guide)) {
      const m = moveOf(guide);
      const chip = rowA.find((x) => x.mv === guide)?.chip;
      coachLine = m === "walk" || m === "dash" || m === "dubki"
        ? `${MOVE_LOOK[m].label} — cross the midline to score`
        : m === "pull" || m === "lunge" ? `${MOVE_LOOK[m].label} — your best escape${chip ? ` (${chip})` : ""}`
        : s.turn === 0 ? `${MOVE_LOOK[m].label}${chip ? ` — ${chip}` : ""}` : `${MOVE_LOOK[m].label} — match the hold to his move`;
    }
  }
  // the lesson of a caught raid stays up until the player picks a defender
  const whyLine = lesson && quiet && live && sel === null && s.turn === 0 ? lesson : "";

  // ── HUD numbers ──
  const halfLen = u.half ?? HALF_SECONDS;
  const clock = u.clock
    ? mmss(Math.min(halfLen, Math.min(u.clock[1], s.m.t) - (s.half ? halfLen : 0)))
    : u.flow === "raid" ? `${Math.min(u.raids ?? 3, s.tl.raids + 1)}/${u.raids ?? 3}`
    : u.flow === "defend" ? `${Math.min(u.defs ?? 3, s.tl.defs + 1)}/${u.defs ?? 3}`
    : u.flow === "auction" ? `${(s.au?.i ?? 0) + 1}/${u.lots?.length ?? 0}`
    : `${Math.min((u.raids ?? 0) + (u.defs ?? 0), s.tl.raids + s.tl.defs + 1)}/${(u.raids ?? 0) + (u.defs ?? 0)}`;
  const sub = u.clock ? (s.half ? "2ND HALF" : "1ST HALF") : u.flow === "raid" ? "RAID" : u.flow === "defend" ? "DEFENCE" : u.flow === "auction" ? "LOT" : "RAIDS";
  const goalText = (() => {
    const gl = u.goal, t = s.tl, parts: string[] = [];
    // touches + bonus of the raid in progress count LIVE (they bank when he crosses the midline)
    const pend = s.turn === 0 && s.rd && !s.end ? s.rd.tc.length + s.rd.bn : 0;
    if (gl.pts) parts.push(`Points ${Math.min(t.pts, gl.pts)}/${gl.pts}${pend ? ` (+${pend} live)` : ""}`);
    if (gl.stops) parts.push(`Stops ${Math.min(t.stops, gl.stops)}/${gl.stops}`);
    if (gl.margin !== undefined) parts.push(`Margin ${s.m.sc[0] - s.m.sc[1] >= 0 ? "+" : ""}${s.m.sc[0] - s.m.sc[1]} (need ${gl.margin > 0 ? "+" + gl.margin : gl.margin})`);
    if (gl.ghost && ghost) parts.push(`Ghost ${ghost.pts} · You ${t.pts}`);
    if (gl.maxCaught !== undefined) parts.push(`Caught ${t.caught}/${gl.maxCaught}`);
    return parts.join(" · ") || objectiveLines(u).goal[0];
  })();
  const myPend = s.turn === 0 && s.rd && !s.end && s.ph !== "bid" ? s.rd.tc.length + s.rd.bn : 0;
  const oppPend = s.turn === 1 && s.rd && !s.end ? s.rd.tc.length + s.rd.bn : 0;
  const emptyPips = s.m.em[s.turn];
  const obj = objectiveLines(u);
  const rw = reward(ctx, starsOf(s));
  const won = s.end === 1;

  // ── result popups ──
  const nextCtx = (): Ctx | null => {
    if (ctx.kind === "trial") return ctx.trial < 66 ? { kind: "trial", trial: ctx.trial + 1 } : null;
    if (ctx.kind === "quick") return ctx;
    if (ctx.kind === "cup") { const c = store.get().cup; return c && c.id === ctx.cup ? { kind: "cup", cup: c.id, round: c.round } : null; }
    return null;
  };
  const winTitle = ctx.kind === "trial" ? (u.flow === "auction" ? "Squad Complete!" : "Trial Won!") : ctx.kind === "cup" && !nextCtx() ? "Cup Winners!" : "Victory!";
  const nextLabel = ctx.kind === "trial" ? (ctx.trial < 66 ? `Next · Trial ${ctx.trial + 1}` : "Home") : ctx.kind === "quick" ? "Play Again" : ctx.kind === "cup" && nextCtx() ? "Next Round" : "Continue";

  const coachPick = (m: string) => (guide === m ? m : null);
  const legend = (() => {
    if (!mat.h || s.ph === "bid") return [] as (typeof TRAIT_BADGE)[string][];
    const seen = new Map<string, (typeof TRAIT_BADGE)[string]>();
    for (const slot of slotsOf(view.m.al[defend ? 0 : 1])) {
      const b = defend ? ROLE_BADGE[s.me[slot]] ?? ROLE_BADGE.o : TRAIT_BADGE[traitOf(slot)] ?? TRAIT_BADGE.o;
      seen.set(b.name, b);
    }
    return seen.size > 1 || [...seen.values()].some((b) => !b.plain) ? [...seen.values()].slice(0, 4) : [];
  })();

  // ── teaching aids on the mat (UnitDef.show — display only, the numbers are the engine's) ──
  const aids = (() => {
    const rings: AidRing[] = [], labels: { x: number; y: number; text: string; color: string }[] = [];
    let wall: AidWall | null = null, caption: { title: string; body: string } | null = null, wallAt: { x: number; y: number } | null = null;
    if (!mat.h || s.ph === "bid") return { rings, labels, wall, caption, wallAt };
    const ranks = slotsOf(view.m.al[defend ? 0 : 1]);
    const at = (slot: number) => {
      const sp = slotSpot(slot, defend), p = g.P(sp.u, sp.d), ring = defH * p.s * 0.9 * 1.05;
      return { x: Math.round(p.x), y: Math.round(p.y), rx: Math.round(ring * 0.62), ry: Math.round(ring * 0.25) };
    };
    // L6 cover radius: the tackle's position factor around the CPU raider's target (touch: 82 / 100 / 55 %,
    // the way home: 100 / 88 / 50 %)
    if (defend && show.cover && view.ai && view.rd && (view.ph === "dtouch" || view.ph === "dret")) {
      const di = ranks.indexOf(view.ai.d), touch = view.ph === "dtouch";
      if (di >= 0) ranks.forEach((slot, ri) => {
        const dist = Math.abs(ri - di);
        if (dist > 2) return;
        const v = touch ? [82, 100, 55][dist] : [100, 88, 50][dist];
        const color = dist === 0 ? "#FF8A8F" : dist === 1 ? "#3DDC84" : "#FFC93C";
        const a = at(slot);
        rings.push({ ...a, color, dash: dist === 2, width: dist === 1 ? 4 : 3, fill: dist === 1 ? "rgba(61,220,132,0.18)" : undefined });
        labels.push({ x: a.x, y: a.y + a.ry - 7, text: `${v}%`, color });
      });
      caption = touch ? { title: "COVER RADIUS", body: "Tackle beside his target: 100%" } : { title: "COVER RADIUS", body: "Way home: tackle on him 100%" };
    }
    // L36 the Anchor's range: the slots within show.anchor places of my K
    if (defend && show.anchor !== undefined) {
      const k = ranks.find((x) => s.me[x] === "K");
      if (k !== undefined) {
        const ki = ranks.indexOf(k);
        ranks.forEach((slot, ri) => {
          if (Math.abs(ri - ki) > show.anchor!) return;
          rings.push({ ...at(slot), color: "#FFC93C", width: ri === ki ? 3 : 2, dash: ri !== ki, fill: "rgba(255,201,60,0.22)" });
        });
        caption = caption ?? { title: "ANCHOR RANGE", body: `Your K covers ${show.anchor} place${show.anchor === 1 ? "" : "s"} each side` };
      }
    }
    // L51 the ghost's recorded raid (the same plan the gate replays)
    if (defend && show.plan && uv.gate?.length) caption = caption ?? { title: "GHOST'S RAID", body: planText(uv.gate[view.gi % uv.gate.length]) };
    // Ghost Duel: the ghost's same-numbered raid, its plan and what it scored (QA level review 2026-11-07: "the ghost is
    // only a static number — show the ghost's raid replay")
    if (!defend && ghost && ghostRun.length) {
      const k = Math.min(ghostRun.length - 1, view.tl.raids);
      const who = ghost.by.replace(/^Ghost of (your )?(friend |rival )?/, "").split(" (")[0];
      caption = caption ?? { title: `${who.toUpperCase()} · RAID ${k + 1}`, body: ghostRaidText(ghostRun[k]) };
    }
    // L14 the Blockers link arms on the midline: the Dash home runs into it
    if (wallUp) {
      const xs = ranks.filter((x) => traitOf(x) === "B").map((x) => Math.round(g.P(slotSpot(x, false).u, 0.02).x));
      const y = Math.round(g.P(0, 0.02).y);
      wall = { x1: Math.min(...xs), x2: Math.max(...xs), y, nodes: xs };
      wallAt = { x: Math.round(g.P(-0.84, 0).x), y: y - 26 };
    }
    return { rings, labels, wall, caption, wallAt };
  })();
  // the CPU raider's feint tell: his telegraph (touch / way home) flickers with a FEINT? tag over him
  const told = defend && live && !!s.ai && ((s.ph === "dtouch" && s.ai.ft === 1) || (s.ph === "dret" && s.ai.fr === 1));

  return (
    <View style={styles.root}>
      <Background image={art[s.ph === "bid" ? "bg_auction_hall" : bgFor(ch)]} dim={s.ph === "bid" ? 0.15 : 0.45} />
      <Animated.View style={[styles.flex, shakeStyle]}>
        <View style={{ paddingTop: insets.top + 6 }}>
          <Hud me={s.m.sc[0]} opp={s.m.sc[1]} myMat={count(s.m.al[0])} oppMat={count(s.m.al[1])} myName={MY_TEAM} oppName={oppName} clock={clock} sub={sub}
            raidUsed={rd?.tm ?? 0} raidLive={!!rd && s.ph !== "bid"} myCrest={kit.crest} myPend={myPend} oppPend={oppPend} />
          <View style={[styles.stripRow, leftHand ? { flexDirection: "row-reverse" } : null]}>
            <Tappable onPress={() => setPaused(true)} style={styles.roundBtn} accessibilityLabel="Pause"><Text style={styles.roundGlyph}>❚❚</Text></Tappable>
            <View style={styles.strip}>
              <Text style={styles.stripGoal} numberOfLines={1} adjustsFontSizeToFit>{goalText}</Text>
              <View style={styles.stripLine}>
                <Text style={styles.stripCall} numberOfLines={1} adjustsFontSizeToFit>{lastCall || ctxTitle(ctx)}</Text>
                <View style={styles.emptyPips}>
                  {[0, 1, 2].map((i) => <View key={i} style={[styles.emptyPip, i < emptyPips ? { backgroundColor: i === 2 || emptyPips >= 2 ? palette.danger : palette.gold } : null]} />)}
                </View>
              </View>
            </View>
            <Tappable onPress={askCoach} disabled={coachLeft + (store.get().hints ?? 0) <= 0} style={styles.roundBtn} accessibilityLabel="Coach hint">
              <Text style={styles.roundGlyph}>💡</Text>
              <View style={styles.coachCount}><Text style={styles.coachCountText}>{coachLeft + (store.get().hints ?? 0)}</Text></View>
            </Tappable>
          </View>
          {online && !online.bot && rival ? (
            <View style={styles.rivalBar}>
              <Text style={styles.rivalText} numberOfLines={1} adjustsFontSizeToFit>
                RIVAL {oppName}: {rival.sc[0]}-{rival.sc[1]} {rival.left ? "(left)" : rival.done ? "(finished)" : "(live)"}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.matArea} onLayout={(e) => setMat({ y: e.nativeEvent.layout.y, w: Math.floor(e.nativeEvent.layout.width), h: Math.floor(e.nativeEvent.layout.height) })}>
          {mat.h > 0 && s.ph !== "bid" ? (
            <>
              <MatCanvas w={mat.w} h={mat.h} ch={ch} defend={defend} flick={told ? s.moves : 0}
                path={(() => {
                  if (!rd) return null;
                  if (!defend) {
                    // the way home: a trail from where he stood back to the midline
                    if (s.pd && view === s && (s.ph === "ret" || (s.ph === "touch" && ["walk", "dash", "dubki"].includes(moveOf(s.pd))))) {
                      const last = rd.tc.length ? slotSpot(rd.tc[rd.tc.length - 1], false).u * 0.6 : 0;
                      const a = g.P(last, rd.tc.length ? 0.22 : 0.03), b = g.P(spot.u, spot.d);
                      return { x1: Math.round(a.x), y1: Math.round(a.y), x2: Math.round(b.x), y2: Math.round(b.y), color: kit.trail };
                    }
                    const t = s.pd && s.ph === "touch" && view === s ? slotOf(s.pd) : sel;
                    if (t === null || t < 0) return null;
                    const a = g.P(spot.u, spot.d), b = slotSpot(t, false), q = g.P(b.u, b.d);
                    return { x1: Math.round(a.x), y1: Math.round(a.y), x2: Math.round(q.x), y2: Math.round(q.y), color: kit.trail };
                  }
                  if (!view.ai) return null;
                  const a = g.P(spot.u, spot.d);
                  const tgt = view.ph === "dret" ? g.P(spot.u * 0.4, 1) : (() => { const b = slotSpot(view.ai!.d, true); return g.P(b.u, b.d); })();
                  return { x1: Math.round(a.x), y1: Math.round(a.y), x2: Math.round(tgt.x), y2: Math.round(tgt.y), color: "#FF5A5F" };
                })()} />
              {aids.rings.length || aids.wall ? <AidCanvas w={mat.w} h={mat.h} rings={aids.rings} wall={aids.wall} /> : null}
              {sel !== null ? (
                <Tappable containerStyle={StyleSheet.absoluteFill} style={styles.flex} scaleTo={1} sound={null} hapticKind="select" onPress={() => setSel(null)} accessibilityLabel="Clear selection">
                  <View />
                </Tappable>
              ) : null}
              {/* line names sit just UNDER their lines (the front row of defenders stands just above the bonus line) */}
              {/* line names sit at the court edge AWAY from the raider (QA render_defects 2026-11-07: the raider stood on
                  "BAULK" and cut it to "BAU"), on a layer above the athletes with a dark plate so they always read */}
              {(() => {
                const lbl = (text: string, d: number, color: string, dy: number, prefLeft: boolean) => {
                  const left = prefLeft ? spot.u > -0.25 : spot.u > 0.15;
                  const q = g.P(left ? -0.84 : 0.84, d);
                  return (
                    <View key={text} pointerEvents="none" style={[styles.linePlate, { top: q.y + dy }, left ? { left: q.x } : { right: mat.w - q.x }]}>
                      <Text style={[styles.lineLabel, { color }]}>{text}</Text>
                    </View>
                  );
                };
                return [
                  lbl("BONUS", defend ? 1 - g.bonus : g.bonus, "#FFD23F", 3, true),
                  lbl("BAULK", defend ? 1 - g.baulk : g.baulk, "#fff", 3, true),
                  lbl("MIDLINE", defend ? 1 : 0, "#FF8A7A", defend ? -18 : -17, false),
                ];
              })()}
              {/* defenders, far ones first */}
              {slotsOf(view.m.al[defend ? 0 : 1]).map((slot, ri, ranks) => {
                const sp = slotSpot(slot, defend), p = g.P(sp.u, sp.d);
                const h = defH * p.s;
                // the chain reacts to the run: the target and his neighbours crouch toward the raider, the holder lunges
                const toward = Math.max(-1, Math.min(1, (spotP.x - p.x) / (g.w * 0.2)));
                const tgt = view.pd ? slotOf(view.pd) : -1, ti = ranks.indexOf(tgt);
                let lean = 0;
                // the target / holder leans IN; his neighbours step ASIDE to open the lane (QA render_defects 2026-11-07:
                // neighbours leaning toward the raider fused #3/#4/#5 and the raider into one shape mid-run)
                const aside = p.x < spotP.x ? -1 : 1;
                if (!defend && view.ph === "str" && view.rd) lean = view.rd.hold === slot ? toward * 0.6 : Math.abs(ranks.indexOf(view.rd.hold) - ri) === 1 ? aside : 0;
                else if (!defend && view.pd && view.ph === "touch" && ti >= 0 && Math.abs(ti - ri) <= 1) lean = ti === ri ? toward * 0.4 : aside;
                else if (!defend && view.pd && view.ph === "ret") lean = toward * 0.35;
                else if (defend && view.pd && (view.ph === "dtouch" || view.ph === "dret") && (tgt === slot || view.pd === "block")) lean = toward * 0.8;
                const touched = !!view.rd?.tc.includes(slot);
                let danger = 0;
                if (!defend && live && s.ph === "touch" && rd && !touched) {
                  const opts = legal.filter((m) => m.endsWith(`@${slot}`));
                  danger = opts.length ? Math.min(...opts.map((m) => touchCatch(s, slot, moveOf(m) as TouchMove).p)) : 0;
                }
                const canTap = live && (defend ? s.ph === "dtouch" || s.ph === "dret" : s.ph === "touch" && !touched);
                const trait = defend ? s.me[slot] : traitOf(slot);
                // the raid is over and he is going out: he walks off toward his lobby while the referee calls it
                const goingOut = !!frozen && !slotsOf(s.m.al[defend ? 0 : 1]).includes(slot);
                return (
                  <Defender key={`${defend ? "m" : "o"}${slot}`} x={p.x} y={p.y} h={h} img={defend ? "defender_saffron" : "defender_teal"}
                    badge={(defend ? ROLE_BADGE : TRAIT_BADGE)[trait] ?? TRAIT_BADGE.o} num={slot + 1}
                    selected={sel === slot || coachSel === slot} touched={touched} target={defend && view.ai?.d === slot} danger={danger}
                    hit={hits[slot] ?? 0} z={Math.round(p.y)} hitW={Math.max(40, Math.round(g.w * 0.12))} lean={Math.round(lean * 10) / 10} cheer={cheerD}
                    out={goingOut} side={p.x < g.w / 2 ? -1 : 1}
                    onPress={canTap ? () => {
                      setSel(slot); setCoachMv((c) => (c && slotOf(c) === slot ? c : null));
                      addFx({ x: p.x, y: p.y + mat.y - h * 0.08, burst: defend ? "#4FE3FF" : "#FFE27A", size: 60 });
                    } : undefined} />
                );
              })}
              {ghost && !defend ? (
                <View pointerEvents="none" style={{ position: "absolute", left: g.P(-0.6, 0.05).x - base * 0.35, top: g.P(-0.6, 0.05).y - base * 0.8, opacity: 0.85 }}>
                  <Image source={art.ghost_raider} style={{ width: base * 0.7, height: base * 0.8 }} resizeMode="contain" />
                  <Text style={styles.ghostTag}>GHOST {ghost.pts}</Text>
                </View>
              ) : null}
              {aids.labels.map((l) => <AidLabel key={`${l.x}:${l.y}`} {...l} />)}
              {aids.wallAt ? <WallLabel {...aids.wallAt} /> : null}
              {aids.caption ? <AidCaption title={aids.caption.title} body={aids.caption.body} maxW={Math.round(mat.w * (ghost && !defend ? 0.34 : 0.3))} /> : null}
              {told ? <FeintTag n={s.moves} x={spotP.x} y={Math.round(spotP.y - base * spotP.s - 20)} /> : null}
              {rd || frozen ? (
                <Runner z={Math.round(spotP.y) + 1} kick={kick} run={run} runMs={RUN_MS * SPEED()} cheer={cheerR} x={rx} y={ry} s={rs} base={base} img={defend ? (u.gate ? "ghost_raider" : "raider_teal") : "raider_saffron"} ghost={defend && !!u.gate} label={defend && u.gate ? "GHOST" : undefined} />
              ) : null}
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, flashStyle]} />
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.redFlash, redFlashStyle]} />
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.outro, outroStyle]} />
            </>
          ) : null}
        </View>

        <View style={[styles.bar, { paddingBottom: bottomInset + 6 }, s.ph === "bid" ? styles.barHidden : null]} onLayout={(e) => setBar({ y: e.nativeEvent.layout.y })}>
          {/* the legend: the full name of every role badge on the mat (the badges carry only a letter) — in the bar,
              never on the court (QA 2026-11-07: legend chips sat over the midline label) */}
          <View style={styles.legendRow} pointerEvents="none">
            {live && s.ph === "str" && rd ? <TugMeter escape={Math.max(0, ...rowA.map((x) => escapeChance(s, moveOf(x.mv) as "pull")))} holder={rd.hold + 1} /> : null}
            {live && s.ph === "str" ? null : legend.map((b) => (
              <View key={b.name} style={styles.legendItem}>
                <View style={[styles.legendChip, { backgroundColor: b.plain ? "#1B1F5E" : b.color, borderColor: b.color }]}>
                  <Text style={[styles.legendLetter, b.plain ? { color: b.color } : null]}>{b.letter}</Text>
                </View>
                <Text style={styles.legendText} numberOfLines={1}>{b.name}</Text>
              </View>
            ))}
          </View>
          {/* one fixed-height line for the prompt / the coach step / why the last raid failed (the mat stays clear) */}
          <View style={[styles.promptBox, whyLine ? styles.whyBox : coachLine ? styles.coachBox : !live && (busy || frozen) ? styles.busyBox : null, ref ? styles.hidden : null]}>
            <Text style={[styles.prompt, whyLine || coachLine ? styles.promptHint : null]} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.8}>
              {whyLine || coachLine || prompt}
            </Text>
          </View>
          <View style={styles.gemRow} onLayout={(e) => { rows.current[0] = { x: e.nativeEvent.layout.x, y: e.nativeEvent.layout.y }; }}>
            {(leftHand ? [...rowA].reverse() : rowA).map((gm) => (
              <View key={gm.mv} onLayout={(e) => {
                const L = e.nativeEvent.layout, r = rows.current[0] ?? { x: 0, y: 0 };
                gemPos.current[gm.mv] = { x: r.x + L.x + L.width / 2, y: bar.y + r.y + L.y + gemSize / 2 };
                setTick((t) => t + 1);
              }}>
                <Gem move={moveOf(gm.mv)} label={gm.label} tag={gm.tag} chip={gm.chip} chipBad={gm.bad} coach={guide === gm.mv} size={gemSize} onPress={() => decide(gm.mv)} />
              </View>
            ))}
            {!rowA.length && committed && !ref && s.ph !== "bid" ? (
              // the decision being played: its gem bounces back up, bigger and lit, until the raid moves on
              <View key={`c${committed.n}`} pointerEvents="none">
                <Gem move={moveOf(committed.mv)} label={committed.label} chip={committed.chip} fired size={Math.min(66, gemSize + 8)} />
              </View>
            ) : null}
          </View>
          {ref ? (
            <View style={styles.refSlot} pointerEvents="none">
              <RefereePanel inline events={ref.events} n={ref.n} note={ref.note} />
            </View>
          ) : null}
        </View>
      </Animated.View>

      {/* overlays for the in-between phases */}
      {live && s.ph === "drs" && s.dr ? (
        <DrsPanel mine={s.dr.side === 0} call={s.dr.call} target={s.dr.d} reviews={s.rv} onPick={decide} coach={coachPick("review") ?? coachPick("accept")} />
      ) : null}
      {live && s.ph === "pick" && s.sta ? <PickPanel u={u} sta={s.sta} onPick={(i) => decide(`pick@${i}`)} /> : null}
      {s.ph === "bid" && s.au && u.lots?.[s.au.i] ? (
        <AuctionPanel u={uv} lot={u.lots[s.au.i]} index={s.au.i} price={s.au.price} lead={s.au.lead} purse={s.au.purse} got={s.au.got} onPick={decide} coach={coachPick("bid") ?? coachPick("pass")} />
      ) : null}
      {banner && !result && (!rm || banner.subLines) ? <Banner {...banner} gold={kit.banner} k={SPEED()} /> : null}
      {fx.map((f) => (
        <View key={f.n} pointerEvents="none" style={StyleSheet.absoluteFill}>
          {f.impact ? <Impact x={f.x} y={f.y} size={f.size} /> : null}
          {f.dust ? <Dust x={f.x} y={f.y} big={f.dust === "big"} /> : null}
          {f.burst ? <Burst x={f.x} y={f.y} color={f.burst} count={10} size={f.size ?? 86} /> : null}
          {f.text ? <FloatingText text={f.text} x={f.x} y={f.y - 30} color={f.color} duration={1000} /> : null}
        </View>
      ))}
      {emote ? <FloatingText key={emote.n} text={`${emote.mine ? "You" : "Rival"}: ${emote.e.toUpperCase()}`} x={width / 2} y={mat.y + 40} color="#4FE3FF" duration={1600} /> : null}
      {online && !online.bot ? (
        <View style={[styles.emotes, { top: mat.y + 4 }]}>
          {multiplayer.EMOTES.map((e) => (
            <Tappable key={e} onPress={() => { online.emote(e as Emote).catch(() => {}); setEmote({ e, n: Date.now(), mine: true }); analytics.track("emote_sent", { e }); }} style={styles.emote} accessibilityLabel={e}>
              <Text style={styles.emoteText}>{e.toUpperCase()}</Text>
            </Tappable>
          ))}
        </View>
      ) : null}
      {tapMark && !whyLine ? <TapMark key={`${tapMark.n}:${Math.round(tapMark.y)}`} x={tapMark.x} y={tapMark.y} /> : null}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Confetti trigger={celebrate} count={70} origin={{ x: width / 2, y: mat.y + mat.h * 0.5 }} />
      </View>

      <BriefingPopup visible={briefing} title={u.name} type={`${u.type}${u.ch ? ` · Chapter ${u.ch}` : ""}`} goal={obj.goal} lose={obj.lose} stars={u.stars.map((x) => x.label)} tip={coachTip(u)} scout={scoutLines(u)}
        onStart={() => setBriefing(false)} />
      <Popup visible={paused} title="Paused" onClose={() => setPaused(false)}>
        <Text style={styles.pauseLine}>{ctxTitle(ctx)}</Text>
        <Text style={styles.pauseGoal}>{obj.goal.join(" · ")}</Text>
        <GameButton label="Resume" size="lg" onPress={() => setPaused(false)} />
        <GameButton style={{ marginTop: 10 }} variant="secondary" label="↻ Restart" onPress={() => { setPaused(false); restart(); }} />
        <GameButton style={{ marginTop: 10 }} variant="light" label="⚙ Settings" onPress={() => { setPaused(false); onSettings(); }} />
        <GameButton style={{ marginTop: 10 }} variant="light" label="Quit" onPress={() => { setPaused(false); onExit(); }} />
      </Popup>
      <WinPopup visible={result === "win"} stars={starsOf(s) || (demo ? 3 : 0)} coins={(demo ? reward(ctx, 3).coins : rw.coins) * (doubled ? 2 : 1)} title={winTitle} nextLabel={nextLabel}
        onNext={() => { ads.showInterstitial(); onNext(nextCtx()); }}
        onReplay={ctx.kind === "online" ? undefined : () => restart()} onMap={onExit}
        footer={(() => {
          // what comes next, so the result card leads somewhere (QA game_feel 2026-11-07: "fill the empty bottom
          // third with a trial summary or next-trial preview")
          const nx = nextCtx();
          if (!nx || nx.kind !== "trial") return null;
          const nu = ALL_UNITS[unitIndexOf(nx)];
          return (
            <Pop delay={2600}>
              <View style={styles.nextCard}>
                <Text style={styles.nextKicker}>NEXT UP · TRIAL {nx.trial}{nu.ch ? ` · CHAPTER ${nu.ch}` : ""}</Text>
                <Text style={styles.nextName} numberOfLines={1} adjustsFontSizeToFit>{nu.name}</Text>
                <Text style={styles.nextGoal} numberOfLines={2}>{nu.type} — {objectiveLines(nu).goal.join(" · ")}</Text>
              </View>
            </Pop>
          );
        })()}>
        {/* the raid summary: what the player just did, ticking in one tile after another */}
        {demo ? null : <View style={styles.sumRow}>
          {[
            { k: "SCORE", v: `${s.m.sc[0]}-${s.m.sc[1]}` },
            u.flow === "defend" ? { k: "STOPS", v: `${s.tl.stops}` } : { k: "POINTS", v: `${s.tl.pts}` },
            { k: "RAIDS", v: `${s.tl.raids + s.tl.defs}` },
            { k: "CAUGHT", v: `${s.tl.caught}` },
          ].map((x, i) => (
            <Pop key={x.k} delay={300 + i * 180}>
              <View style={styles.sumTile}>
                <Text style={styles.sumV}>{x.v}</Text>
                <Text style={styles.sumK}>{x.k}</Text>
              </View>
            </Pop>
          ))}
        </View>}
        <View style={styles.starGoals}>
          {u.stars.map((st) => (
            <Text key={st.label} style={[styles.starGoal, won && starMet(s, st) ? styles.starOn : null]}>{won && starMet(s, st) ? "★" : "☆"} {st.label}</Text>
          ))}
          {rw.tokens ? <Text style={styles.tokens}>+{rw.tokens} Chant Token{rw.tokens > 1 ? "s" : ""}</Text> : null}
          {unlockedRef.current.length ? <Text style={styles.unlock}>Unlocked: {unlockedRef.current.join(", ")}!</Text> : null}
          {online && !online.bot && rival ? (
            <Text style={styles.unlock}>
              Race: your margin {s.m.sc[0] - s.m.sc[1]} vs rival {rival.sc[0] - rival.sc[1]}{rival.done ? (s.m.sc[0] - s.m.sc[1] >= rival.sc[0] - rival.sc[1] ? " — you take the race!" : " — rival takes it") : " (rival still playing)"}
            </Text>
          ) : null}
        </View>
        {/* always offered after a win (opt-in): when no video is loaded the tap says so instead of the button hiding —
            QA's feature tour could not find "double coins" because it only appeared with a video ready */}
        {!demo && !doubled && rw.coins > 0 ? (
          <GameButton style={{ marginBottom: 6 }} size="sm" variant="secondary" label={`🎬 Double coins: +${rw.coins} (watch ad)`}
            onPress={() => {
              analytics.track("rewarded_ad_offered", { what: "double" });
              const shown = ads.showRewarded(() => { store.set({ coins: store.get().coins + rw.coins }); setDoubled(true); setAdNote(`+${rw.coins} bonus coins added — doubled!`); analytics.track("rewarded_ad_completed", { what: "double" }); });
              setAdNote(shown ? "Video playing — your extra coins land when it ends" : "No video ready yet — try again in a moment");
            }} />
        ) : null}
        {adNote ? <Text style={styles.adNote}>{doubled ? `✓ ${adNote}` : adNote}</Text> : null}
      </WinPopup>
      <FailPopup visible={result === "fail"} title={ctx.kind === "trial" ? "Trial Failed" : "Defeat"} message={`${s.why || "Not this time"}. ${lesson || coachTip(u)}`}
        onRetry={ctx.kind === "online" ? onExit : () => { setAssist(true); restart(true); }} mapLabel="Back" onMap={onExit}>
        {ctx.kind !== "online" ? <Text style={styles.assistNote}>Try Again: the coach shows you the best first raid.</Text> : null}
      </FailPopup>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  stripRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, marginTop: 30 },
  roundBtn: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(10,12,48,0.9)", borderWidth: 2, borderColor: palette.gold },
  roundGlyph: { fontFamily: fonts.display, fontSize: 18, color: palette.gold },
  coachCount: { position: "absolute", right: -4, top: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: palette.danger, alignItems: "center", justifyContent: "center" },
  coachCountText: { fontFamily: fonts.display, fontSize: 11, color: "#fff" },
  strip: { flex: 1, minHeight: 46, justifyContent: "center", backgroundColor: "rgba(10,12,48,0.88)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,201,60,0.6)", paddingHorizontal: 10, paddingVertical: 4 },
  stripGoal: { fontFamily: fonts.display, fontSize: 14, color: palette.gold },
  stripLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  stripCall: { flex: 1, fontFamily: fonts.body, fontSize: 11, color: palette.ink },
  emptyPips: { flexDirection: "row", gap: 3 },
  emptyPip: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.15)" },
  rivalBar: { marginHorizontal: 60, marginTop: 4, backgroundColor: "rgba(18,181,229,0.2)", borderRadius: 10, borderWidth: 1, borderColor: palette.accent, paddingVertical: 2, paddingHorizontal: 8 },
  rivalText: { fontFamily: fonts.body, fontSize: 12, color: "#fff", textAlign: "center" },
  matArea: { flex: 1, marginHorizontal: 6, marginTop: 4 },
  linePlate: { position: "absolute", zIndex: 3900, backgroundColor: "rgba(6,8,30,0.55)", borderRadius: 5, paddingHorizontal: 4 },
  lineLabel: { fontFamily: fonts.display, fontSize: 10, lineHeight: 14, color: "#FFD23F", letterSpacing: 1, textShadowColor: "#000", textShadowRadius: 3 },
  ghostTag: { fontFamily: fonts.display, fontSize: 11, color: "#4FE3FF", textAlign: "center", textShadowColor: "#000", textShadowRadius: 3 },
  // full-mat layers sit above every athlete (defenders are z-sorted by their feet, up to the mat height)
  flash: { backgroundColor: "#FFF6D0", zIndex: 4000 },
  redFlash: { backgroundColor: "#E8363D", zIndex: 4000 },
  legendRow: { height: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, overflow: "hidden" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(6,8,30,0.6)", borderRadius: 8, paddingRight: 5, paddingLeft: 1, paddingVertical: 1 },
  outro: { backgroundColor: "#0B0D2B", zIndex: 5000 },
  busyBox: { backgroundColor: "rgba(255,201,60,0.12)", borderColor: "rgba(255,201,60,0.45)" },
  hidden: { opacity: 0 },
  refSlot: { position: "absolute", left: 8, right: 8, top: 4 + 20, height: 146 },
  legendChip: { minWidth: 14, height: 14, borderRadius: 4, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 1 },
  legendLetter: { fontFamily: fonts.display, fontSize: 9, lineHeight: 11, color: "#1A1030" },
  legendText: { fontFamily: fonts.body, fontSize: 10, color: palette.ink },
  bar: { paddingHorizontal: 8, paddingTop: 4, backgroundColor: "rgba(8,10,36,0.72)", borderTopWidth: 1.5, borderTopColor: "rgba(255,201,60,0.55)" },
  barHidden: { opacity: 0, height: 0, minHeight: 0, paddingTop: 0, paddingBottom: 0, overflow: "hidden" },
  promptBox: { height: 52, justifyContent: "center", borderRadius: 12, paddingHorizontal: 8, marginBottom: 2, borderWidth: 1.5, borderColor: "transparent" },
  coachBox: { backgroundColor: "rgba(18,181,229,0.9)", borderColor: "#FFFFFF" },
  whyBox: { backgroundColor: "rgba(150,20,32,0.92)", borderColor: "#FF8A8F" },
  prompt: { fontFamily: fonts.displayMedium, fontSize: 15, lineHeight: 18, color: "#fff", textAlign: "center" },
  promptHint: { fontFamily: fonts.body, fontSize: 13, lineHeight: 15.5 },
  gemRow: { flexDirection: "row", justifyContent: "center", minHeight: 92 },
  emotes: { position: "absolute", right: 4, gap: 4 },
  emote: { backgroundColor: "rgba(10,12,48,0.85)", borderRadius: 10, borderWidth: 1, borderColor: palette.accent, paddingHorizontal: 6, paddingVertical: 6, minWidth: 48, alignItems: "center" },
  emoteText: { fontFamily: fonts.display, fontSize: 10, color: "#fff" },
  pauseLine: { fontFamily: fonts.display, fontSize: 16, color: palette.ink, textAlign: "center" },
  pauseGoal: { fontFamily: fonts.bodyRegular, fontSize: 14, color: palette.inkSoft, textAlign: "center", marginBottom: 14 },
  starGoals: { marginBottom: 12, gap: 3 },
  sumRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: -4, marginBottom: 10 },
  sumTile: { minWidth: 62, alignItems: "center", paddingVertical: 5, paddingHorizontal: 6, borderRadius: 12, backgroundColor: "rgba(4,6,28,0.6)", borderWidth: 1, borderColor: "rgba(255,201,60,0.45)" },
  sumV: { fontFamily: fonts.display, fontSize: 20, lineHeight: 24, color: "#fff" },
  sumK: { fontFamily: fonts.body, fontSize: 9, letterSpacing: 1, color: palette.inkSoft },
  adNote: { fontFamily: fonts.body, fontSize: 12, color: palette.success, textAlign: "center", marginBottom: 8 },
  nextCard: { marginTop: 14, borderRadius: 16, padding: 10, backgroundColor: "rgba(18,181,229,0.14)", borderWidth: 1.5, borderColor: "rgba(79,227,255,0.6)", gap: 2 },
  nextKicker: { fontFamily: fonts.body, fontSize: 10, letterSpacing: 1.2, color: "#4FE3FF" },
  nextName: { fontFamily: fonts.display, fontSize: 17, color: "#fff" },
  nextGoal: { fontFamily: fonts.bodyRegular, fontSize: 12, color: palette.ink },
  starGoal: { fontFamily: fonts.body, fontSize: 14, color: palette.inkSoft, textAlign: "center" },
  starOn: { color: palette.star },
  tokens: { fontFamily: fonts.display, fontSize: 15, color: palette.accent, textAlign: "center", marginTop: 4 },
  unlock: { fontFamily: fonts.display, fontSize: 15, color: palette.success, textAlign: "center", marginTop: 4 },
  assistNote: { fontFamily: fonts.body, fontSize: 13, color: palette.accent, textAlign: "center", marginTop: -8, marginBottom: 12 },
});
