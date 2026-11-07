import { memo, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { Easing, withDelay, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { Canvas, Group, LinearGradient, Path, Skia, vec } from "@shopify/react-native-skia";
import { AnimatedNumber, fonts, palette, springs } from "../../ui";

const SH_W = 66, SH_H = 74;
const shieldPath = (() => {
  const b = Skia.PathBuilder.Make();
  b.moveTo(4, 6);
  b.quadTo(SH_W / 2, -2, SH_W - 4, 6);
  b.lineTo(SH_W - 4, 38);
  b.quadTo(SH_W - 6, 60, SH_W / 2, SH_H - 2);
  b.quadTo(6, 60, 4, 38);
  b.close();
  return b.detach();
})();

/** Team crest shield (red = my side, blue = theirs) with a gold bevel. Static canvas, memoised by colour. */
const Shield = memo(function Shield({ c }: { c: [string, string] }) {
  return (
    <Canvas style={{ width: SH_W, height: SH_H, position: "absolute" }} pointerEvents="none">
      <Group transform={[{ translateY: 3 }]}>
        <Path path={shieldPath} color="rgba(0,0,0,0.45)" />
      </Group>
      <Path path={shieldPath}>
        <LinearGradient start={vec(0, 0)} end={vec(0, SH_H)} colors={c} />
      </Path>
      <Path path={shieldPath} style="stroke" strokeWidth={4} color="#FFC93C" />
      <Path path={shieldPath} style="stroke" strokeWidth={1} color="rgba(255,255,255,0.7)" />
    </Canvas>
  );
});

/**
 * Score tick (QA game_feel 2026-11-07): when the score changes the number COUNTS up (AnimatedNumber), the shield
 * punches (scale 1.35 → spring), a gold glow flashes behind it and the digits flash white → gold. No punch on mount.
 */
function Score({ value, colors, pend = 0 }: { value: number; colors: [string, string]; pend?: number }) {
  const s = useSharedValue(1);
  const f = useSharedValue(0);
  const first = useRef(true);
  const last = useRef(value);
  // "+N" rises off the shield when this side scores (QA game_feel 2026-11-07: "the score silently changes 0 → 1")
  const [plus, setPlus] = useState<{ n: number; k: number } | null>(null);
  const up = useSharedValue(0);
  useEffect(() => {
    const d = value - last.current;
    last.current = value;
    if (first.current) { first.current = false; return; }
    s.value = withSequence(withTiming(1.35, { duration: 110 }), withSpring(1, springs.pop));
    f.value = withSequence(withTiming(1, { duration: 90 }), withDelay(500, withTiming(0, { duration: 1100 })));
    if (d > 0) {
      setPlus({ n: d, k: Date.now() });
      up.value = 0;
      up.value = withTiming(1, { duration: 1400, easing: Easing.out(Easing.cubic) });
    }
  }, [value, s, f, up]);
  // points banked on the raid so far (touches + bonus) — they score once he crosses the midline. Shown LIVE under the
  // shield (QA render_defects 2026-11-07: "the scoreboard stays 0-0 after two touches — looks stale"); each new one punches
  const pb = useSharedValue(0);
  const lastPend = useRef(pend);
  useEffect(() => {
    if (pend > lastPend.current) pb.value = withSequence(withTiming(1, { duration: 90 }), withSpring(0, springs.pop));
    lastPend.current = pend;
  }, [pend, pb]);
  const pendStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pb.value * 0.45 }] }));
  const plusStyle = useAnimatedStyle(() => ({ opacity: up.value < 0.7 ? Math.min(1, up.value * 6) : (1 - up.value) / 0.3, transform: [{ translateY: 10 - up.value * 10 }, { scale: 0.6 + 0.5 * Math.min(1, up.value * 3) }] }));
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const glow = useAnimatedStyle(() => ({ opacity: f.value * 0.85, transform: [{ scale: 0.8 + f.value * 0.5 }] }));
  const hot = useAnimatedStyle(() => ({ opacity: f.value }));
  return (
    <View style={styles.shield}>
      <Animated.View pointerEvents="none" style={[styles.glow, glow]} />
      <Shield c={colors} />
      {pend > 0 ? (
        <Animated.View pointerEvents="none" style={[styles.pendBox, pendStyle]}>
          <Text style={styles.pend} numberOfLines={1}>+{pend} LIVE</Text>
        </Animated.View>
      ) : null}
      {plus ? <Animated.View key={plus.k} pointerEvents="none" style={[styles.plusBox, plusStyle]}><Text style={styles.plus}>+{plus.n}</Text></Animated.View> : null}
      <Animated.View style={[styles.scoreBox, st]}>
        <AnimatedNumber value={value} duration={450} style={styles.score} />
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, hot]}>
          <AnimatedNumber value={value} duration={450} style={{ ...styles.score, color: "#FFFFFF" }} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function Pips({ n, mine }: { n: number; mine: boolean }) {
  return (
    <View style={styles.pips}>
      {Array.from({ length: 7 }, (_, i) => (
        <View key={i} style={[styles.pip, i < n ? { backgroundColor: mine ? palette.mine : palette.theirs } : styles.pipOff]} />
      ))}
    </View>
  );
}

/** Raid clock ring: the 30 s raid timer drains gold, crimson in the last 5 s. */
const Ring = memo(function Ring({ used }: { used: number }) {
  const R = 22, left = Math.max(0, 30 - used);
  const p = Skia.PathBuilder.Make();
  p.addArc({ x: 4, y: 4, width: R * 2, height: R * 2 }, -90, (360 * left) / 30);
  const arc = p.detach();
  const bg = Skia.PathBuilder.Make();
  bg.addCircle(4 + R, 4 + R, R);
  return (
    <Canvas style={{ width: R * 2 + 8, height: R * 2 + 8 }} pointerEvents="none">
      <Path path={bg.detach()} style="stroke" strokeWidth={5} color="rgba(255,255,255,0.15)" />
      <Path path={arc} style="stroke" strokeWidth={5} strokeCap="round" color={left <= 5 ? palette.danger : palette.gold} />
    </Canvas>
  );
});

/** The raid-clock badge: ticks with a punch each time the clock moves, throbbing crimson in the last 5 s. */
function RaidClock({ used, live }: { used: number; live: boolean }) {
  const left = live ? Math.max(0, 30 - used) : 30;
  const p = useSharedValue(0);
  useEffect(() => {
    if (!live) return;
    p.value = withSequence(withTiming(left <= 5 ? 1 : 0.45, { duration: 90 }), withSpring(0, springs.pop));
  }, [left, live, p]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: 1 + p.value * 0.22 }] }));
  return (
    <Animated.View style={[styles.ringWrap, left <= 5 && live ? styles.ringHot : null, st]}>
      <Ring used={live ? used : 0} />
      <Text style={[styles.ringText, left <= 5 && live ? { color: "#FFB3B6" } : null]}>{left}s</Text>
    </Animated.View>
  );
}

const THEIRS: [string, string] = ["#4B7BFF", "#1A2C9E"];

export function Hud({ me, opp, myMat, oppMat, myName, oppName, clock, sub, raidUsed, raidLive, myCrest, myPend = 0, oppPend = 0 }: {
  /** points the raid in progress has earned so far (they score at the midline) */
  myPend?: number; oppPend?: number;
  myCrest: [string, string]; me: number; opp: number; myMat: number; oppMat: number; myName: string; oppName: string; clock: string; sub: string; raidUsed: number; raidLive: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.team}>
        <Score value={me} colors={myCrest} pend={myPend} />
        <View style={styles.teamInfo}>
          <Text style={styles.teamName} numberOfLines={2}>{myName}</Text>
          <Pips n={myMat} mine />
        </View>
      </View>
      <View style={styles.clock}>
        <Text style={styles.clockText} numberOfLines={1} adjustsFontSizeToFit>{clock}</Text>
        <Text style={styles.clockSub} numberOfLines={1} adjustsFontSizeToFit>{sub}</Text>
        <RaidClock used={raidUsed} live={raidLive} />
      </View>
      <View style={[styles.team, styles.teamRight]}>
        <View style={[styles.teamInfo, { alignItems: "flex-end" }]}>
          <Text style={[styles.teamName, { textAlign: "right" }]} numberOfLines={2}>{oppName}</Text>
          <Pips n={oppMat} mine={false} />
        </View>
        <Score value={opp} colors={THEIRS} pend={oppPend} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingHorizontal: 8 },
  team: { flex: 1, flexDirection: "row", alignItems: "center", gap: 4 },
  teamRight: { justifyContent: "flex-end" },
  teamInfo: { flexShrink: 1, gap: 3 },
  teamName: { fontFamily: fonts.displayMedium, fontSize: 11, lineHeight: 13, color: palette.ink, maxWidth: 70 },
  shield: { width: SH_W, height: SH_H, alignItems: "center", justifyContent: "center" },
  scoreBox: { marginTop: -6, width: SH_W - 12 },
  score: { fontFamily: fonts.display, fontSize: 30, color: "#FFE9A8", width: SH_W - 12, textAlign: "center", textShadowColor: "#3A0A10", textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 1 },
  glow: { position: "absolute", width: SH_W + 16, height: SH_W + 16, borderRadius: (SH_W + 16) / 2, backgroundColor: "rgba(255,210,80,0.55)" },
  pips: { flexDirection: "row", gap: 2 },
  plusBox: { position: "absolute", top: -2, left: SH_W - 24, zIndex: 5, backgroundColor: "#3DDC84", borderRadius: 10, paddingHorizontal: 5, borderWidth: 1.5, borderColor: "#fff" },
  plus: { fontFamily: fonts.display, fontSize: 14, lineHeight: 18, color: "#0B2A14" },
  pendBox: { position: "absolute", bottom: -9, zIndex: 6, backgroundColor: "#FFC93C", borderRadius: 8, paddingHorizontal: 5, borderWidth: 1.5, borderColor: "#FFF6D0" },
  pend: { fontFamily: fonts.display, fontSize: 11, lineHeight: 14, color: "#3A1E00" },
  pip: { width: 7, height: 7, borderRadius: 2, borderWidth: 1, borderColor: "rgba(0,0,0,0.4)" },
  pipOff: { backgroundColor: "rgba(255,255,255,0.12)" },
  clock: {
    width: 108, alignItems: "center", paddingTop: 4, paddingBottom: 26, borderRadius: 22, borderWidth: 2, borderColor: palette.gold,
    backgroundColor: "rgba(10,12,48,0.88)",
  },
  clockText: { fontFamily: fonts.display, fontSize: 24, color: palette.gold, textShadowColor: "#000", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 1 },
  clockSub: { fontFamily: fonts.body, fontSize: 9, letterSpacing: 1.2, color: palette.ink, marginTop: -2 },
  ringWrap: { position: "absolute", bottom: -28, alignItems: "center", justifyContent: "center", backgroundColor: "#0B0D2B", borderRadius: 30 },
  ringHot: { backgroundColor: "#4A0C14" },
  ringText: { position: "absolute", fontFamily: fonts.display, fontSize: 13, color: "#fff" },
});
