import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { GameButton, Popup, feedback, fonts, palette, springs } from "../../ui";
import { art } from "../../art";
import type { RefEvent } from "../../game/rules";
import type { Lot, UnitDef } from "../../game/types";
import { marketOf } from "../../game/engine";
import { Gem } from "./Gem";

/** Full-width diagonal slash banner (crimson + gold): YOUR RAID / DEFEND / DO-OR-DIE / SUPER RAID / HALF TIME. */
export function Banner({ text, sub, tone, n, gold, hold = 650, k = 1, top, subLines = 2 }: {
  text: string; sub?: string; tone: "gold" | "crimson" | "cyan"; n: number; gold?: [string, string];
  /** ms the banner stays up; `k` scales every duration (QA mode runs faster); `top` overrides the 30 % default. */
  hold?: number; k?: number; top?: number;
  /** lines the sub-line may take (a referee call / reversal explains the new mat in up to 4). */
  subLines?: number;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = 0;
    t.value = withSequence(withTiming(1, { duration: 230 * k, easing: Easing.out(Easing.back(1.4)) }), withDelay(hold * k, withTiming(2, { duration: 240 * k })));
  }, [n, t, hold, k]);
  // SLAMS in on the spot (big → its size, ease-out-back) and fades out where it stands — it never slides across the
  // screen (QA render_defects 2026-11-07: a frame mid-slide showed "ON! / odi Panthers" cut off at the left edge)
  const st = useAnimatedStyle(() => ({
    opacity: t.value < 1 ? 0.3 + 0.7 * Math.min(1, t.value * 1.6) : 2 - t.value,
    transform: [{ rotate: "-6deg" }, { scaleX: t.value < 1 ? 1.5 - 0.5 * t.value : 1 + (t.value - 1) * 0.05 }, { scaleY: t.value < 1 ? 1.5 - 0.5 * t.value : 1 + (t.value - 1) * 0.05 }],
  }));
  // "gold" = your side: the Raid Banner you wear from the Kit Album (default saffron)
  const colors = tone === "crimson" ? ["#FF4D55", "#A81E26"] : tone === "cyan" ? ["#4FE3FF", "#1468B8"] : gold ?? ["#FFE27A", "#E08A00"];
  const darkInk = tone === "gold" && (!gold || gold[0] === "#FFE27A" || gold[0] === "#8CF06A" || gold[0] === "#5CFFC8");
  return (
    <View pointerEvents="none" style={[styles.bannerBox, top !== undefined ? { top } : null]}>
      <Animated.View style={[styles.slash, st]}>
        <LinearGradient colors={colors as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.slashFace}>
          <Text style={[styles.bannerText, darkInk ? { color: "#3A1C00" } : null]} numberOfLines={1} adjustsFontSizeToFit>{text}</Text>
          {sub ? <Text style={[styles.bannerSub, darkInk ? { color: "#4A2600" } : null]} numberOfLines={subLines}>{sub}</Text> : null}
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const KIND_LABEL: Record<RefEvent["kind"], string> = {
  touch: "Touch point", bonus: "Bonus point", tackle: "Tackle point", super_tackle: "SUPER TACKLE", super_raid: "SUPER RAID",
  all_out: "ALL OUT", revival: "Revival", empty_raid: "Empty raid", do_or_die: "Do-or-Die raid", do_or_die_out: "Do-or-Die: out",
  time_out: "Raid clock: out", escape: "Escaped the hold", half_time: "Half time",
};

/** The four scoring heads of a raid; every point-carrying event falls in exactly one. */
const HEADS: { k: string; label: string; kinds: RefEvent["kind"][] }[] = [
  { k: "touch", label: "TOUCH", kinds: ["touch"] },
  { k: "bonus", label: "BONUS", kinds: ["bonus"] },
  { k: "tackle", label: "TACKLE", kinds: ["tackle", "super_tackle", "time_out", "do_or_die_out"] },
  { k: "all_out", label: "ALL OUT", kinds: ["all_out"] },
];
const NOTE_KINDS: RefEvent["kind"][] = ["super_raid", "super_tackle", "escape", "empty_raid", "do_or_die_out", "time_out", "revival", "half_time"];

/**
 * The referee's call for the finished raid — built from the SAME events the scoreboard adds up. It slides down and
 * bounces in, then shows the raid's points breakdown (touch points, bonus, tackle, all-out — YOU : THEM per head),
 * the special calls (super raid, escape, revival…) and, after a caught raid, WHY it went wrong (`note`).
 */
export function RefereePanel({ events, n, top, note, inline }: {
  events: RefEvent[]; n: number; top?: number; note?: string;
  /** drawn IN the bottom control bar (over the empty gem row) instead of over the mat — it never covers a defender
   *  (QA render_defects 2026-11-07: the floating card hid the top defenders and the court's far edge). */
  inline?: boolean;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = 0;
    t.value = withSpring(1, springs.pop);
  }, [n, t]);
  const st = useAnimatedStyle(() => ({ opacity: Math.min(1, 0.3 + t.value), transform: [{ translateY: (1 - t.value) * -40 }, { scale: 0.8 + 0.2 * t.value }] }));
  const shown = events.filter((e) => e.kind !== "do_or_die");
  const mine = shown.filter((e) => e.side === 0).reduce((a, e) => a + e.points, 0);
  const theirs = shown.filter((e) => e.side === 1).reduce((a, e) => a + e.points, 0);
  const sum = (kinds: RefEvent["kind"][], side: 0 | 1) => shown.filter((e) => e.side === side && kinds.includes(e.kind)).reduce((a, e) => a + e.points, 0);
  const notes = shown.filter((e) => NOTE_KINDS.includes(e.kind));
  if (inline) {
    return (
      <View pointerEvents="none" style={styles.refInlineBox}>
        <Animated.View style={[styles.refCard, styles.refInline, st]}>
          <View style={styles.refHead}>
            <Text style={styles.refWhistle}>📣</Text>
            <Text style={[styles.refTitle, { fontSize: 15 }]} numberOfLines={1}>REFEREE'S CALL</Text>
            <Text style={[styles.refPts, { color: palette.mine }]}>+{mine}</Text>
            <Text style={styles.refDash}>:</Text>
            <Text style={[styles.refPts, { color: palette.theirs }]}>+{theirs}</Text>
          </View>
          <View style={styles.heads}>
            {HEADS.map((h, i) => {
              const a = sum(h.kinds, 0), b = sum(h.kinds, 1);
              return (
                <RefRow key={h.k} i={i} n={n} style={[styles.head, styles.headInline, a + b ? styles.headOn : null]}>
                  <Text style={styles.headK}>{h.label}</Text>
                  <Text style={[styles.headV, { color: a ? palette.mine : "rgba(255,255,255,0.35)" }]}>{a ? `+${a}` : "0"}</Text>
                  <Text style={[styles.headV, styles.headTheirs, { color: b ? palette.theirs : "rgba(255,255,255,0.35)" }]}>{b ? `+${b}` : "0"}</Text>
                </RefRow>
              );
            })}
          </View>
          {notes.length ? (
            <View style={styles.noteChips}>
              {notes.slice(0, 3).map((e, i) => (
                <RefRow key={`${e.kind}${i}`} i={HEADS.length + i} n={n} style={[styles.noteChip, { borderColor: e.side === 0 ? palette.mine : palette.theirs }]}>
                  <Text style={styles.noteChipText} numberOfLines={1}>
                    {KIND_LABEL[e.kind]}{e.kind === "revival" && e.slots?.length ? ` ×${e.slots.length}` : ""} · {e.side === 0 ? "YOU" : "THEM"}
                  </Text>
                </RefRow>
              ))}
            </View>
          ) : null}
          {note ? <Text style={[styles.refNote, { fontSize: 12, marginTop: 3 }]} numberOfLines={2}>{note}</Text> : null}
        </Animated.View>
      </View>
    );
  }
  return (
    <View pointerEvents="none" style={[styles.refBox, { top }]}>
      <Animated.View style={[styles.refCard, st]}>
        <View style={styles.refHead}>
          <Text style={styles.refWhistle}>📣</Text>
          <Text style={styles.refTitle}>REFEREE</Text>
          <Text style={[styles.refPts, { color: palette.mine }]}>+{mine}</Text>
          <Text style={styles.refDash}>:</Text>
          <Text style={[styles.refPts, { color: palette.theirs }]}>+{theirs}</Text>
        </View>
        <View style={styles.heads}>
          {HEADS.map((h, i) => {
            const a = sum(h.kinds, 0), b = sum(h.kinds, 1);
            return (
              <RefRow key={h.k} i={i} n={n} style={[styles.head, a + b ? styles.headOn : null]}>
                <Text style={styles.headK}>{h.label}</Text>
                <Text style={[styles.headV, { color: a ? palette.mine : "rgba(255,255,255,0.35)" }]}>{a ? `+${a}` : "0"}</Text>
                <Text style={[styles.headV, styles.headTheirs, { color: b ? palette.theirs : "rgba(255,255,255,0.35)" }]}>{b ? `+${b}` : "0"}</Text>
              </RefRow>
            );
          })}
        </View>
        {notes.map((e, i) => (
          <RefRow key={`${e.kind}${i}`} i={HEADS.length + i} n={n} style={styles.refRow}>
            <View style={[styles.refDot, { backgroundColor: e.side === 0 ? palette.mine : palette.theirs }]} />
            <Text style={styles.refKind} numberOfLines={1} adjustsFontSizeToFit>
              {KIND_LABEL[e.kind]}{e.kind === "revival" && e.slots?.length ? ` ×${e.slots.length}` : ""}
            </Text>
            <Text style={styles.refSide}>{e.side === 0 ? "YOU" : "THEM"}</Text>
          </RefRow>
        ))}
        {note ? <Text style={styles.refNote}>{note}</Text> : null}
      </Animated.View>
    </View>
  );
}

/**
 * A phase card springs in over the mat (ease-out-back, from 35 % — never from 0, never a layout `entering`), and
 * punches again whenever `pulse` changes (a new auction lot, a raised price).
 */
function CardIn({ children, style, pulse }: { children: React.ReactNode; style?: object; pulse?: string | number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.back(1.7)) });
  }, [t]);
  const k = useSharedValue(0);
  useEffect(() => {
    if (pulse === undefined) return;
    k.value = withSequence(withTiming(1, { duration: 80 }), withSpring(0, springs.pop));
  }, [pulse, k]);
  const st = useAnimatedStyle(() => ({ opacity: 0.35 + 0.65 * Math.min(1, t.value), transform: [{ scale: (0.82 + 0.18 * t.value) * (1 + k.value * 0.035) }] }));
  return <Animated.View style={[styles.card, style, st]}>{children}</Animated.View>;
}

/** A light sweep across the DRS tablet — the replay being scanned (three passes, then still). */
function Scan() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withSequence(withTiming(1, { duration: 700 }), withTiming(0, { duration: 0 }), withTiming(1, { duration: 700 }), withTiming(0, { duration: 0 }), withTiming(1, { duration: 700 }));
  }, [t]);
  const st = useAnimatedStyle(() => ({ opacity: t.value > 0.98 ? 0 : 0.5, transform: [{ translateY: t.value * 150 }] }));
  return <Animated.View pointerEvents="none" style={[styles.scan, st]} />;
}

/** One referee call line: slides in after the one above it, so a multi-point raid reads call by call. */
function RefRow({ i, n, children, style }: { i: number; n: number; children: React.ReactNode; style?: object }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = 0;
    t.value = withDelay(120 + i * 110, withTiming(1, { duration: 200, easing: Easing.out(Easing.back(1.8)) }));
  }, [n, i, t]);
  const st = useAnimatedStyle(() => ({ opacity: 0.25 + 0.75 * Math.min(1, t.value), transform: [{ translateX: (1 - t.value) * -24 }] }));
  return <Animated.View style={[style ?? styles.refRow, st]}>{children}</Animated.View>;
}

/** Held: the struggle. Pull away on a timed tug, or lunge for the midline. Real chances on the gems. */
/**
 * The struggle, in the bottom bar (never a card over the mat — QA render_defects 2026-11-07 "HELD! modal covers the
 * whole raid area"): a tug-of-war rope between the holder (crimson, left) and you (gold, right) split at your best
 * real escape chance, with the knot shuddering as both sides pull (a finite 4.8 s tug, then it rests).
 */
/**
 * The tutorial / coach marker on the mat: a bouncing "TAP ▼" tag that sits just above the target defender's badge
 * (x, y = the tag's bottom centre). It pops in, then bobs in place — one fixed pose, never over another sprite.
 */
export function TapMark({ x, y }: { x: number; y: number }) {
  const t = useSharedValue(0), b = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.back(2.2)) });
    b.value = withDelay(220, withRepeat(withSequence(withTiming(1, { duration: 380, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 380, easing: Easing.in(Easing.quad) })), 24));
  }, [t, b]);
  const st = useAnimatedStyle(() => ({ opacity: Math.min(1, t.value * 2), transform: [{ translateY: -b.value * 7 }, { scale: 0.5 + 0.5 * t.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[styles.tapMark, { left: x - 31, top: y - 26 }, st]}>
      <View style={styles.tapPill}><Text style={styles.tapText}>TAP</Text></View>
      <Text style={styles.tapArrow}>▼</Text>
    </Animated.View>
  );
}

export function TugMeter({ escape, holder }: { escape: number; holder: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = 0;
    t.value = withTiming(1, { duration: 4800, easing: Easing.linear });
  }, [holder, t]);
  const [w, setW] = useState(0);
  const at = Math.max(0.08, Math.min(0.92, 1 - escape)); // the knot: more red rope = a stronger hold
  const knot = useAnimatedStyle(() => ({ transform: [{ translateX: w * at - 9 + Math.sin(t.value * 40) * 5 * (1 - t.value) }, { scale: 1 + 0.2 * Math.abs(Math.sin(t.value * 20)) * (1 - t.value) }] }));
  return (
    <View style={styles.tug}>
      <Text style={[styles.tugSide, { color: "#FF8A8F" }]}>#{holder}</Text>
      <View style={styles.tugRope} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        <View style={[styles.tugRed, { width: `${at * 100}%` }]} />
        <View style={[styles.tugGold, { left: `${at * 100}%` }]} />
        {w ? <Animated.View style={[styles.tugKnot, knot]} /> : null}
      </View>
      <Text style={[styles.tugSide, { color: palette.gold }]}>YOU {Math.round(escape * 100)}%</Text>
    </View>
  );
}

/** DRS review tablet: a close call, the on-field decision, and the reviews left. */
export function DrsPanel({ mine, call, target, reviews, onPick, coach }: { mine: boolean; call: 0 | 1; target: number; reviews: number; onPick: (m: string) => void; coach: string | null }) {
  useEffect(() => { feedback("unlock", "light"); }, []); // the DRS beep
  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <CardIn style={[styles.cardCyan, { overflow: "hidden" }]}>
        <Scan />
        <Text style={styles.cardTitle}>DRS · CLOSE CALL</Text>
        <Text style={styles.cardBody}>
          {mine ? `Your touch on #${target + 1}` : `Their raider on your #${target + 1}`}: the referee says{" "}
          <Text style={{ color: call ? palette.success : palette.danger }}>{call ? "TOUCH" : "NO TOUCH"}</Text>. Reviews left: {reviews}
        </Text>
        <View style={styles.gemRow}>
          {reviews > 0 ? <Gem move="review" coach={coach === "review"} onPress={() => onPick("review")} size={64} /> : null}
          <Gem move="accept" coach={coach === "accept"} onPress={() => onPick("accept")} size={64} />
        </View>
      </CardIn>
    </View>
  );
}

/** Raider rotation: pick who raids, by stamina (fatigue units). */
export function PickPanel({ u, sta, onPick }: { u: UnitDef; sta: number[]; onPick: (i: number) => void }) {
  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <CardIn>
        <Text style={styles.cardTitle}>WHO RAIDS?</Text>
        <Text style={styles.cardBody}>A tired raider reaches less and escapes less. Rest your star for the big raids.</Text>
        {u.raiders!.map((r, i) => {
          const f = sta[i] / r.st[3];
          return (
            <GameButton key={r.name} style={{ marginTop: 8 }} variant={i === 0 ? "primary" : "secondary"} size="sm"
              label={`${r.name} · Reach ${r.st[0]} · Agility ${r.st[1]} · Stamina ${Math.round(f * 100)}%`} onPress={() => onPick(i)} />
          );
        })}
      </CardIn>
    </View>
  );
}

const ROLE_COL: Record<Lot["role"], string> = { Raider: "#FF8A1F", Corner: "#12B5E5", Cover: "#3DDC84", Anchor: "#FFC93C" };
const TRAIT_NAME: Record<string, string> = { o: "All-rounder", A: "Ankle-hold specialist", T: "Thigh-hold specialist", C: "Cover (chains)", K: "Anchor", R: "Rusher" };

/** Auction hall: one lot on the block, the purse, who leads, Bid (+5) or Pass. */
export function AuctionPanel({ u, lot, index, price, lead, purse, got, onPick, coach }: {
  u: UnitDef; lot: Lot; index: number; price: number; lead: -1 | 0 | 1; purse: number; got: number[]; onPick: (m: string) => void; coach: string | null;
}) {
  const next = lead === -1 ? lot.base : price + 5;
  const canBid = lead !== 0 && purse >= next;
  const stats: [string, number | undefined][] = [["Reach", lot.reach], ["Agility", lot.agility], ["Speed", lot.speed], ["Stamina", lot.stamina]];
  const lots = u.lots!;
  const [lo, hi] = marketOf(u, index);
  // a rival franchise chases the FIRST lot of its role (its premium is already in the market range)
  const chaser = u.rival && lots.findIndex((l) => l.role === u.rival!.role) === index ? u.rival.name : null;
  const have = new Set(got.map((i) => lots[i].role));
  const need = u.needRoles ? [...new Set(u.needRoles)] : [];
  const missing = need.filter((r) => !have.has(r));
  const needText = !u.needRoles ? "Optional: buy who you like, or nobody" : missing.length ? `Still need ${missing.join(", ")}` : "Every role bought";
  // purse helper: the cheapest squad still on the list — this lot at my next bid (or my lead), later lots at the
  // middle of their market range (the same estimate the coach uses)
  const helper = (() => {
    if (!u.show?.purse || !missing.length) return null;
    let cost = 0;
    const gone: string[] = [];
    for (const r of missing) {
      const options: number[] = [];
      if (lot.role === r) options.push(lead === 0 ? price : next);
      lots.forEach((l, j) => { if (j > index && l.role === r) { const [a, b] = marketOf(u, j); options.push(Math.max(l.base, Math.round((a + b) / 2))); } });
      if (!options.length) gone.push(r);
      else cost += Math.min(...options);
    }
    const keep = u.goal.purse ?? 0;
    if (gone.length) return { text: `No ${gone.join(", ")} left on the list!`, ok: false };
    const ok = cost <= purse - keep;
    return { text: `Cheapest squad left ≈ ${cost} · purse ${purse}${keep ? ` (keep ${keep})` : ""} ${ok ? "✓" : "— over!"}`, ok };
  })();
  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <CardIn style={{ paddingTop: 12 }} pulse={`${index}:${price}:${lead}`}>
        <View style={styles.auctionHead}>
          <Text style={styles.cardTitle}>AUCTION HALL</Text>
          <Text style={styles.lotCount}>Lot {index + 1}/{u.lots!.length}</Text>
        </View>
        <LinearGradient colors={["#2C338F", "#10133F"]} style={[styles.lotCard, { borderColor: ROLE_COL[lot.role] }]}>
          <Image source={lot.role === "Raider" ? art.raider_saffron : art.defender_saffron} style={styles.lotImg} resizeMode="contain" />
          <View style={{ flex: 1 }}>
            <Text style={styles.lotName} numberOfLines={1} adjustsFontSizeToFit>{lot.name}</Text>
            <Text style={[styles.lotRole, { color: ROLE_COL[lot.role] }]}>{lot.role.toUpperCase()}{lot.role !== "Raider" ? ` · ${TRAIT_NAME[lot.trait]}` : ""}</Text>
            {lot.role === "Raider" ? stats.map(([k, v]) => (
              <View key={k} style={styles.statRow}>
                <Text style={styles.statK}>{k}</Text>
                <View style={styles.statTrack}><View style={[styles.statFill, { width: `${(v ?? 5) * 10}%` }]} /></View>
                <Text style={styles.statV}>{v ?? 5}</Text>
              </View>
            )) : null}
            <Text style={styles.lotMarket}>Opens {lot.base} · Market estimate {lo}-{hi}</Text>
            {chaser ? (
              <View style={styles.chaser}><Text style={styles.chaserText} numberOfLines={1} adjustsFontSizeToFit>{chaser} chasing (+{u.rival!.plus})</Text></View>
            ) : null}
          </View>
        </LinearGradient>
        <View style={styles.bidRow}>
          <View style={styles.bidBox}><Text style={styles.bidK}>PRICE</Text><Text style={styles.bidV}>{lead === -1 ? lot.base : price}</Text></View>
          <View style={styles.bidBox}><Text style={styles.bidK}>LEADS</Text><Text style={[styles.bidV, { fontSize: 16 }]} numberOfLines={1} adjustsFontSizeToFit>{lead === -1 ? "No bid" : lead === 0 ? "YOU" : chaser ?? "Franchise"}</Text></View>
          <View style={styles.bidBox}><Text style={styles.bidK}>PURSE</Text><Text style={[styles.bidV, { color: palette.success }]}>{purse}</Text></View>
        </View>
        <Text style={styles.squadLine} numberOfLines={2}>
          Squad: {got.length ? got.map((i) => lots[i].role).join(", ") : "nobody yet"} · {needText}
        </Text>
        {helper ? <Text style={[styles.purseLine, { color: helper.ok ? palette.success : "#FF8A8F" }]} numberOfLines={2}>{helper.text}</Text> : null}
        <View style={styles.gemRow}>
          {canBid ? <Gem move="bid" label={`Bid ${next}`} coach={coach === "bid"} onPress={() => onPick("bid")} size={64} /> : null}
          <Gem move="pass" coach={coach === "pass"} onPress={() => onPick("pass")} size={64} />
        </View>
      </CardIn>
    </View>
  );
}

/**
 * Trial briefing — kept light (QA game_feel 2026-11-07: "lighten the intro card"): the goal in big type, how you lose
 * and the star goals as short lines, one coach line. Start squashes on touch-down, then the card flies off the top
 * before play begins (no hard cut from card to mat).
 */
/**
 * One briefing row springing into place on its own beat (QA game_feel 2026-11-07: "the Start card appears over a
 * dimmed board with no entrance motion"). The row's box is final from the first frame; only its face moves, and it
 * starts at 35 % opacity, never invisible.
 */
function Rise({ i, on, from = "below", children }: { i: number; on: boolean; from?: "below" | "left"; children: React.ReactNode }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (!on) return;
    t.value = 0;
    t.value = withDelay(140 + i * 110, withTiming(1, { duration: 380, easing: Easing.out(Easing.back(1.8)) }));
  }, [on, i, t]);
  const st = useAnimatedStyle(() => ({
    opacity: 0.35 + 0.65 * Math.min(1, t.value),
    transform: from === "left" ? [{ translateX: (1 - t.value) * -40 }] : [{ translateY: (1 - t.value) * 26 }, { scale: 0.92 + 0.08 * t.value }],
  }));
  return <Animated.View style={st}>{children}</Animated.View>;
}

export function BriefingPopup({ visible, title, type, goal, lose, stars, tip, scout = [], onStart }: {
  visible: boolean; title: string; type: string; goal: string[]; lose: string[]; stars: string[]; tip: string;
  /** what the scouts know about their raider (personality, feint tell) */
  scout?: string[];
  onStart: () => void;
}) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => { if (visible) setLeaving(false); }, [visible]);
  const go = () => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(onStart, 230);
  };
  return (
    <Popup visible={visible} title={title} onClose={go} leaving={leaving}>
      <Rise i={0} on={visible}><Text style={styles.briefType}>{type.toUpperCase()}</Text></Rise>
      <Rise i={1} on={visible}>
        <View style={styles.briefBox}>
          {goal.map((g) => <Text key={g} style={styles.briefGoal}>{g}</Text>)}
          {lose.length ? <Text style={styles.briefLose}>Lose if: {lose.map((l) => l.charAt(0).toLowerCase() + l.slice(1)).join(" · ")}</Text> : null}
          <View style={styles.briefStars}>
            {["Win", ...stars].map((g, i) => (
              <Rise key={g} i={2 + i} on={visible} from="left">
                <View style={styles.briefStar}>
                  <Text style={styles.briefStarGlyph}>★</Text>
                  <Text style={styles.briefStarText}>{i === 0 ? "Win" : g}</Text>
                </View>
              </Rise>
            ))}
          </View>
          {scout.length ? <Text style={styles.briefScout}>Scouting: {scout.join(" ")}</Text> : null}
        </View>
      </Rise>
      <Rise i={5} on={visible}>
        <View style={styles.tip}>
          <Text style={styles.tipK}>COACH</Text>
          <Text style={styles.tipText}>{tip}</Text>
        </View>
      </Rise>
      <Rise i={6} on={visible}><GameButton label="Start" variant="primary" size="lg" sound="whoosh" onPress={go} /></Rise>
    </Popup>
  );
}

const styles = StyleSheet.create({
  bannerBox: { position: "absolute", left: 0, right: 0, top: "30%", alignItems: "center" },
  slash: { width: "112%", },
  slashFace: { paddingVertical: 10, alignItems: "center", borderTopWidth: 3, borderBottomWidth: 3, borderColor: "#FFE9A8" },
  bannerText: { fontFamily: fonts.display, fontSize: 40, color: "#fff", letterSpacing: 1, textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 1, paddingHorizontal: 40 },
  bannerSub: { fontFamily: fonts.body, fontSize: 14, color: "#fff", marginTop: -2, paddingHorizontal: 50, textAlign: "center" },
  refBox: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  refInlineBox: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  refInline: { width: "100%", maxWidth: 440, minWidth: 0, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 14 },
  headInline: { paddingVertical: 2 },
  noteChips: { flexDirection: "row", justifyContent: "center", gap: 4, marginTop: 2 },
  noteChip: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 1, backgroundColor: "rgba(255,255,255,0.06)" },
  noteChipText: { fontFamily: fonts.body, fontSize: 11, color: "#fff" },
  refCard: { minWidth: 240, maxWidth: 320, backgroundColor: "rgba(8,10,40,0.94)", borderRadius: 18, borderWidth: 2, borderColor: palette.gold, padding: 12 },
  refHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  refWhistle: { fontSize: 20 },
  refTitle: { flex: 1, fontFamily: fonts.display, fontSize: 18, color: palette.gold, letterSpacing: 1 },
  refPts: { fontFamily: fonts.display, fontSize: 22 },
  refDash: { fontFamily: fonts.display, fontSize: 20, color: palette.ink },
  refRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 3, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" },
  refDot: { width: 10, height: 10, borderRadius: 5 },
  heads: { flexDirection: "row", gap: 4, marginBottom: 4 },
  head: { flex: 1, alignItems: "center", paddingVertical: 4, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.05)" },
  headOn: { backgroundColor: "rgba(255,201,60,0.16)", borderWidth: 1, borderColor: "rgba(255,201,60,0.55)" },
  headK: { fontFamily: fonts.body, fontSize: 9, letterSpacing: 1, color: palette.inkSoft },
  headV: { fontFamily: fonts.display, fontSize: 18, lineHeight: 21 },
  headTheirs: { fontSize: 12, lineHeight: 14 },
  refNote: { fontFamily: fonts.body, fontSize: 13, color: "#FFD1D3", marginTop: 6, textAlign: "center" },
  refKind: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: "#fff" },
  refSide: { fontFamily: fonts.body, fontSize: 11, color: palette.inkSoft, width: 38 },
  refVal: { fontFamily: fonts.display, fontSize: 18, color: palette.gold, width: 30, textAlign: "right" },
  tug: { flexDirection: "row", alignItems: "center", gap: 6, width: "100%", paddingHorizontal: 6 },
  tugSide: { fontFamily: fonts.display, fontSize: 11, lineHeight: 14 },
  tugRope: { flex: 1, height: 10, borderRadius: 5, backgroundColor: "#1B1F5E", overflow: "visible", borderWidth: 1, borderColor: "rgba(255,255,255,0.5)" },
  tugRed: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: "#E8363D", borderTopLeftRadius: 5, borderBottomLeftRadius: 5 },
  tugGold: { position: "absolute", right: 0, top: 0, bottom: 0, backgroundColor: "#FFC93C", borderTopRightRadius: 5, borderBottomRightRadius: 5 },
  tugKnot: { position: "absolute", top: -5, left: 0, width: 18, height: 18, borderRadius: 9, backgroundColor: "#FFF6D0", borderWidth: 2, borderColor: "#3A1C00" },
  overlay: { position: "absolute", left: 0, right: 0, top: 40, bottom: 60, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  card: { width: "100%", maxWidth: 400, backgroundColor: "rgba(12,14,52,0.96)", borderRadius: 24, borderWidth: 2.5, borderColor: palette.gold, padding: 16 },
  scan: { position: "absolute", left: 0, right: 0, top: 0, height: 26, backgroundColor: "rgba(79,227,255,0.35)" },
  cardDanger: { borderColor: palette.danger },
  cardCyan: { borderColor: palette.accent },
  cardTitle: { fontFamily: fonts.display, fontSize: 26, color: palette.gold, textAlign: "center", textShadowColor: "#000", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 1 },
  cardBody: { fontFamily: fonts.bodyRegular, fontSize: 15, color: palette.ink, textAlign: "center", marginTop: 4, marginBottom: 8 },
  gemRow: { flexDirection: "row", justifyContent: "center", gap: 20, marginTop: 6 },
  auctionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  lotCount: { fontFamily: fonts.body, fontSize: 13, color: palette.inkSoft },
  lotCard: { flexDirection: "row", gap: 10, borderRadius: 16, borderWidth: 2, padding: 10, marginTop: 8 },
  lotImg: { width: 78, height: 92 },
  lotName: { fontFamily: fonts.display, fontSize: 20, color: "#fff" },
  lotRole: { fontFamily: fonts.body, fontSize: 12, marginBottom: 4 },
  statRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 1 },
  statK: { fontFamily: fonts.bodyRegular, fontSize: 11, color: palette.inkSoft, width: 50 },
  statTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.12)", overflow: "hidden" },
  statFill: { height: 6, backgroundColor: palette.gold },
  statV: { fontFamily: fonts.display, fontSize: 12, color: "#fff", width: 16, textAlign: "right" },
  lotMarket: { fontFamily: fonts.bodyRegular, fontSize: 12, color: palette.ink, marginTop: 4 },
  bidRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  bidBox: { flex: 1, alignItems: "center", backgroundColor: "rgba(0,0,0,0.35)", borderRadius: 12, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(255,201,60,0.3)" },
  bidK: { fontFamily: fonts.body, fontSize: 10, letterSpacing: 1.2, color: palette.inkSoft },
  bidV: { fontFamily: fonts.display, fontSize: 22, color: palette.gold },
  purseLine: { fontFamily: fonts.body, fontSize: 13, textAlign: "center", marginTop: 4 },
  chaser: { alignSelf: "flex-start", marginTop: 4, backgroundColor: "rgba(232,54,61,0.9)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1, borderWidth: 1, borderColor: "#FFD1D3" },
  chaserText: { fontFamily: fonts.display, fontSize: 11, color: "#fff" },
  squadLine: { fontFamily: fonts.bodyRegular, fontSize: 13, color: palette.ink, textAlign: "center", marginTop: 8 },
  briefType: { fontFamily: fonts.body, fontSize: 12, letterSpacing: 2, color: palette.accent, textAlign: "center", marginTop: -8, marginBottom: 8 },
  briefBox: { backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "rgba(255,201,60,0.25)" },
  briefGoal: { fontFamily: fonts.display, fontSize: 19, color: palette.gold, textAlign: "center" },
  briefLose: { fontFamily: fonts.bodyRegular, fontSize: 12.5, color: "#FFB3B6", textAlign: "center", marginTop: 4 },
  briefStars: { marginTop: 8, gap: 2 },
  briefStar: { flexDirection: "row", alignItems: "center", gap: 6 },
  briefStarGlyph: { fontSize: 13, color: palette.star },
  briefStarText: { flex: 1, fontFamily: fonts.bodyRegular, fontSize: 13.5, color: palette.ink },
  briefScout: { fontFamily: fonts.bodyRegular, fontSize: 12.5, color: "#BFEFFF", marginTop: 6 },
  tip: { flexDirection: "row", gap: 8, alignItems: "flex-start", marginVertical: 10, backgroundColor: "rgba(18,181,229,0.14)", borderRadius: 14, padding: 10, borderWidth: 1, borderColor: "rgba(18,181,229,0.5)" },
  tipK: { fontFamily: fonts.display, fontSize: 12, color: palette.accent, marginTop: 2 },
  tipText: { flex: 1, fontFamily: fonts.bodyRegular, fontSize: 14, color: "#fff" },
  tapMark: { position: "absolute", width: 62, height: 30, alignItems: "center", zIndex: 6000 },
  tapPill: { backgroundColor: "#FFC93C", borderRadius: 9, borderWidth: 2, borderColor: "#FFF6D0", paddingHorizontal: 8, minHeight: 20, justifyContent: "center" },
  tapText: { fontFamily: fonts.display, fontSize: 12, lineHeight: 15, color: "#3A1E00", letterSpacing: 1 },
  tapArrow: { fontSize: 10, lineHeight: 11, color: "#FFC93C", marginTop: -2, textShadowColor: "#000", textShadowRadius: 2 },
});
