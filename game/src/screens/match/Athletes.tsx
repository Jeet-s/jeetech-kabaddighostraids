import { useEffect, useRef } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue } from "react-native-reanimated";
import { Tappable, fonts } from "../../ui";
import { art, type ArtId } from "../../art";

const ASPECT: Partial<Record<ArtId, number>> = { raider_saffron: 504 / 512, defender_teal: 463 / 512, defender_saffron: 463 / 512, raider_teal: 463 / 512, ghost_raider: 445 / 512 };

export interface Badge { text: string; color: string; plain?: boolean; letter: string; name: string }

/** Trait / role badges with a shape mark (colour-blind safe: shape + letter + colour). `text` = legend / prompt copy. */
export const TRAIT_BADGE: Record<string, Badge> = {
  o: { text: "● Rookie", color: "#C9CCE8", plain: true, letter: "●", name: "Rookie" },
  T: { text: "▲ Thigh", color: "#FF8A1F", letter: "T", name: "Thigh-holder" },
  A: { text: "▼ Ankle", color: "#B07CFF", letter: "A", name: "Ankle-holder" },
  B: { text: "■ Wall", color: "#4B6BFF", letter: "W", name: "Wall" },
  R: { text: "◆ Rush", color: "#E8363D", letter: "R", name: "Rusher" },
  C: { text: "⛓ Chain", color: "#12B5E5", letter: "C", name: "Chain" },
  K: { text: "♛ Captain", color: "#FFC93C", letter: "K", name: "Captain" },
};
export const ROLE_BADGE: Record<string, Badge> = {
  o: { text: "● All-round", color: "#C9CCE8", plain: true, letter: "●", name: "All-rounder" },
  A: { text: "▼ Ankle pro", color: "#B07CFF", letter: "A", name: "Ankle pro" },
  T: { text: "▲ Thigh pro", color: "#FF8A1F", letter: "T", name: "Thigh pro" },
  C: { text: "⛓ Cover", color: "#12B5E5", letter: "C", name: "Cover" },
  K: { text: "♛ Anchor", color: "#FFC93C", letter: "K", name: "Anchor" },
  R: { text: "◆ Rusher", color: "#E8363D", letter: "R", name: "Rusher" },
};

/** Compact badge: the number disc + a one-letter role chip (the full role name lives in the legend and on select). */
export function BadgeChip({ badge, num, selected, touched }: { badge: Badge; num: number; selected?: boolean; touched?: boolean }) {
  return (
    <View style={[styles.badge, selected ? styles.badgeSel : null, touched ? styles.badgeTouched : null]}>
      <View style={[styles.numDisc, { borderColor: badge.color }]}>
        <Text style={styles.numText}>{num}</Text>
      </View>
      {badge.plain ? null : (
        <View style={[styles.roleChip, { backgroundColor: badge.color }]}>
          <Text style={styles.roleText}>{badge.letter}</Text>
        </View>
      )}
      {/* touched this raid: a fixed-size check chip in the badge row (QA 2026-11-07: a "TOUCHED" label over the torso
          wrapped to "TOUCHE / D" and hid the body) — one glyph, never wraps, never covers the sprite */}
      {touched ? (
        <View style={styles.tickChip}>
          <Text style={styles.tickText}>✓</Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * One defender on the mat: contact shadow, danger disc, selection ring, the sprite and its compact badge.
 * Feel: touch-DOWN squash (Tappable 0.92) + a white glow flash + a ripple ring at the feet; `hit` changes → a
 * knock-back wobble; `lean` (-1..1) crouches him toward the incoming raider (the chain reacting to the run, a full
 * lunge for the holder); `cheer` changes → three celebration hops (a CAUGHT raid).
 */
export function Defender({ x, y, h, img, badge, num, selected, touched, target, danger, onPress, hit, z, hitW, lean = 0, cheer = 0, out = false, side = 1 }: {
  x: number; y: number; h: number; img: ArtId; badge: Badge; num: number; selected: boolean; touched: boolean; target: boolean; danger: number;
  onPress?: () => void; hit: number; z: number; hitW: number; lean?: number; cheer?: number;
  /** this defender is going OUT at the end of the raid: he sinks, turns grey and walks off toward his lobby. */
  out?: boolean;
  /** which lobby he leaves to (-1 left, 1 right) — and the side a hit knocks him toward (away from the raider). */
  side?: number;
}) {
  const w = h * (ASPECT[img] ?? 0.9);
  const wob = useSharedValue(0);
  const flash = useSharedValue(0);
  useEffect(() => {
    if (!hit) return;
    // a touch lands: a white hit-flash on the sprite + a recoil away from the raider (knocked back, then steadies)
    wob.value = withSequence(withTiming(1, { duration: 60 }), withTiming(-0.5, { duration: 110 }), withTiming(0, { duration: 180 }));
    flash.value = withSequence(withTiming(0.95, { duration: 40 }), withTiming(0, { duration: 260 }));
  }, [hit, wob, flash]);
  const gone = useSharedValue(0);
  useEffect(() => {
    gone.value = out ? withDelay(380, withTiming(1, { duration: 620, easing: Easing.in(Easing.quad) })) : 0;
  }, [out, gone]);
  const ln = useSharedValue(0);
  useEffect(() => {
    ln.value = withTiming(lean, { duration: lean ? 160 : 260, easing: Easing.out(Easing.back(1.6)) });
  }, [lean, ln]);
  const hop = useSharedValue(0);
  const cheer0 = useRef(cheer); // a defender revived / remounted later doesn't replay an old celebration
  useEffect(() => {
    if (!cheer || cheer === cheer0.current) return;
    const up = withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) }), down = withTiming(0, { duration: 130, easing: Easing.in(Easing.quad) });
    hop.value = withDelay((num % 3) * 60, withSequence(up, down, withTiming(1, { duration: 140 }), withTiming(0, { duration: 130 }), withTiming(0.7, { duration: 120 }), withTiming(0, { duration: 120 })));
  }, [cheer, hop, num]);
  const st = useAnimatedStyle(() => ({
    transform: [
      { translateX: ln.value * w * 0.28 + wob.value * side * 10 + gone.value * side * w * 0.9 },
      { translateY: -wob.value * 8 - hop.value * h * 0.28 + Math.abs(ln.value) * h * 0.06 + gone.value * h * 0.08 },
      { rotate: `${wob.value * side * 14 + ln.value * 14}deg` },
      { scale: (1 + hop.value * 0.06) * (1 - gone.value * 0.15) },
    ],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  // a defender going out walks off toward his lobby and is gone by the time play resumes — no lingering ghost and
  // no pop-out between frames
  const goneStyle = useAnimatedStyle(() => ({ opacity: 1 - gone.value }));
  const press = useSharedValue(0);
  const pressIn = () => {
    press.value = 0;
    press.value = withTiming(1, { duration: 380, easing: Easing.out(Easing.quad) });
  };
  const glowStyle = useAnimatedStyle(() => ({ opacity: press.value > 0 && press.value < 1 ? 0.55 * (1 - press.value) : 0 }));
  const rippleStyle = useAnimatedStyle(() => ({ opacity: press.value > 0 && press.value < 1 ? 1 - press.value : 0, transform: [{ scaleX: 0.5 + 0.9 * press.value }, { scaleY: 0.5 + 0.9 * press.value }] }));
  const ring = w * 1.05;
  const body = (
    <>
      {selected ? <View style={[styles.selGlow, { width: w * 1.05, height: h * 0.9, borderRadius: w, top: h * 0.08 }]} /> : null}
      <Animated.View style={st}>
        <Image source={art[img]} style={{ width: w, height: h }} resizeMode="contain" />
        <Animated.Image pointerEvents="none" source={art[img]} style={[{ position: "absolute", width: w, height: h, tintColor: "#FFFFFF" }, flashStyle]} resizeMode="contain" />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.pressGlow, { width: w * 0.9, height: h * 0.85, borderRadius: w, top: h * 0.08 }, glowStyle]} />
    </>
  );
  const top = 18; // badge strip above the head
  return (
    <Animated.View pointerEvents="box-none" style={[{ position: "absolute", left: x - hitW / 2, top: y - h - top, width: hitW, height: h + top + 12, zIndex: z }, goneStyle]}>
      {danger > 0.02 ? (
        <Image source={art.danger_zone_disc} style={[styles.disc, { width: ring, height: ring * 0.42, left: hitW / 2 - ring / 2, top: h + top - ring * 0.21, opacity: 0.12 + 0.7 * danger }]} resizeMode="stretch" />
      ) : null}
      <View style={[styles.shadow, { width: w * 0.7, height: w * 0.2, left: hitW / 2 - w * 0.35, top: h + top - w * 0.1 }]} />
      {selected || target ? (
        <Image source={art.defender_selected_ring} style={[styles.disc, { width: ring, height: ring * 0.4, left: hitW / 2 - ring / 2, top: h + top - ring * 0.2, tintColor: target && !selected ? "#FF4D55" : undefined }]} resizeMode="stretch" />
      ) : null}
      <Animated.View pointerEvents="none" style={[styles.ripple, { width: ring, height: ring * 0.42, borderRadius: ring, left: hitW / 2 - ring / 2, top: h + top - ring * 0.21 }, rippleStyle]} />
      {onPress ? (
        <Tappable onPress={onPress} onPressIn={pressIn} scaleTo={0.92} sound="tap" hapticKind="select" containerStyle={{ position: "absolute", left: 0, top: top - 4, width: hitW, height: h + 10 }} style={{ width: hitW, height: h + 10, alignItems: "center" }} accessibilityLabel={`Defender ${num}, ${badge.name}`}>
          <View style={{ height: 4 }} />
          {body}
        </Tappable>
      ) : (
        <View pointerEvents="none" style={{ position: "absolute", left: 0, top, width: hitW, height: h, alignItems: "center" }}>{body}</View>
      )}
      {touched ? <View pointerEvents="none" style={[styles.touchRing, { width: ring * 0.8, height: ring * 0.32, borderRadius: ring, left: hitW / 2 - ring * 0.4, top: h + top - ring * 0.16 }]} /> : null}
      <View pointerEvents="none" style={styles.badgeRow}>
        <BadgeChip badge={badge} num={num} selected={selected} touched={touched} />
      </View>
    </Animated.View>
  );
}

/** A moving athlete (my raider / the CPU raider / the ghost): position + scale in shared values, feet at (x, y). */
export function Runner({ x, y, s, base, img, ghost, flip, label, kick = 0, run = 0, runMs = 500, cheer = 0, z = 50 }: {
  /** draw order: feet y + 1, so he stands in front of the defenders behind him and behind the ones in front */
  z?: number;
  x: SharedValue<number>; y: SharedValue<number>; s: SharedValue<number>; base: number; img: ArtId; ghost?: boolean; flip?: boolean; label?: string;
  /** changes on every accepted move: the athlete squashes, then springs up (anticipation → pop). */
  kick?: number;
  /** changes when a run starts: stride bobs + a forward lean for `runMs` (the run along the raid path). */
  run?: number; runMs?: number;
  /** changes on a scored raid / a won trial: victory hops. */
  cheer?: number;
}) {
  const w = base * (ASPECT[img] ?? 0.95);
  const st = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value - w / 2 }, { translateY: y.value - base / 2 - (base * s.value) / 2 }, { scale: s.value }],
  }));
  const sq = useSharedValue(0);
  useEffect(() => {
    if (!kick) return;
    sq.value = withSequence(withTiming(1, { duration: 70 }), withTiming(-0.7, { duration: 120 }), withTiming(0, { duration: 180 }));
  }, [kick, sq]);
  const stride = useSharedValue(0), tilt = useSharedValue(0);
  const mount = useRef({ run, cheer }); // remounting between raids doesn't replay the last run / celebration
  useEffect(() => {
    if (!run || run === mount.current.run) return;
    const step = 120, n = Math.max(1, Math.round(runMs / (step * 2)));
    stride.value = withRepeat(withSequence(withTiming(1, { duration: step, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: step, easing: Easing.in(Easing.quad) })), n);
    tilt.value = withSequence(withTiming(1, { duration: 90 }), withDelay(Math.max(0, runMs - 180), withTiming(0, { duration: 160 })));
  }, [run, runMs, stride, tilt]);
  const hop = useSharedValue(0);
  useEffect(() => {
    if (!cheer || cheer === mount.current.cheer) return;
    hop.value = withSequence(withTiming(1, { duration: 150 }), withTiming(0, { duration: 140 }), withTiming(1, { duration: 150 }), withTiming(0, { duration: 140 }));
  }, [cheer, hop]);
  // squash around the feet: wider + shorter, then taller + a small hop; strides bob, the run leans him in
  const body = useAnimatedStyle(() => ({
    transform: [
      { translateY: base / 2 }, { scaleX: 1 + sq.value * 0.12 }, { scaleY: 1 - sq.value * 0.14 }, { rotate: `${tilt.value * 8}deg` }, { translateY: -base / 2 },
      { translateY: (sq.value < 0 ? sq.value * 10 : 0) - stride.value * base * 0.07 - hop.value * base * 0.22 },
    ],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.runner, { width: w, height: base, zIndex: z }, st]}>
      <View style={[styles.goldRing, { width: w * 0.9, height: w * 0.26, left: w * 0.05, top: base - w * 0.13 }, ghost ? styles.ghostRing : null]} />
      {ghost ? (
        // hologram afterimages trailing the ghost raider
        <>
          <Image source={art[img]} style={[styles.after, { width: w, height: base, opacity: 0.18, left: -w * 0.22 }]} resizeMode="contain" />
          <Image source={art[img]} style={[styles.after, { width: w, height: base, opacity: 0.3, left: -w * 0.11 }]} resizeMode="contain" />
        </>
      ) : null}
      <Animated.View style={body}>
        {/* a sticker outline (4 offset cream silhouettes) keeps the raider's edge distinct from any defender he
            passes or touches — PIECE READABILITY (QA render_defects 2026-11-07: raider merged with #3 and #5) */}
        {ghost ? null : OUTLINE.map(([dx, dy]) => (
          <Image key={`${dx}:${dy}`} source={art[img]} style={{ position: "absolute", left: dx, top: dy, width: w, height: base, tintColor: "#FFF3C4", transform: flip ? [{ scaleX: -1 }] : undefined }} resizeMode="contain" />
        ))}
        <Image source={art[img]} style={{ width: w, height: base, opacity: ghost ? 0.62 : 1, transform: flip ? [{ scaleX: -1 }] : undefined }} resizeMode="contain" />
      </Animated.View>
      {label ? <Text style={styles.runnerLabel} numberOfLines={1}>{label}</Text> : null}
    </Animated.View>
  );
}

const OUTLINE: [number, number][] = [[-2.5, 0], [2.5, 0], [0, -2.5], [0, 2.5]];

export const runTo = (v: SharedValue<number>, to: number, ms: number, ease: "inOut" | "out" | "in" = "inOut") => {
  const e = ease === "out" ? Easing.out(Easing.cubic) : ease === "in" ? Easing.in(Easing.quad) : Easing.inOut(Easing.cubic);
  v.value = withTiming(to, { duration: ms, easing: e });
};

const styles = StyleSheet.create({
  disc: { position: "absolute" },
  shadow: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(0,0,0,0.35)" },
  badgeRow: { position: "absolute", left: 0, right: 0, top: 0, alignItems: "center" },
  badge: { flexDirection: "row", alignItems: "center", gap: 2, padding: 1, borderRadius: 9, backgroundColor: "rgba(6,8,30,0.82)" },
  badgeSel: { backgroundColor: "#12B5E5" },
  numDisc: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, alignItems: "center", justifyContent: "center", backgroundColor: "#1B1F5E" },
  numText: { fontFamily: fonts.display, fontSize: 10, lineHeight: 12, color: "#fff" },
  roleChip: { minWidth: 14, height: 14, borderRadius: 4, paddingHorizontal: 2, alignItems: "center", justifyContent: "center" },
  roleText: { fontFamily: fonts.display, fontSize: 10, lineHeight: 12, color: "#1A1030" },
  pressGlow: { position: "absolute", backgroundColor: "#FFFFFF" },
  ripple: { position: "absolute", borderWidth: 3, borderColor: "#FFF6D0" },
  selGlow: { position: "absolute", backgroundColor: "rgba(120,230,255,0.38)", borderWidth: 2, borderColor: "rgba(255,255,255,0.8)" },
  badgeTouched: { backgroundColor: "rgba(150,90,0,0.95)", borderWidth: 1, borderColor: "#FFE27A" },
  tickChip: { width: 14, height: 14, borderRadius: 7, alignItems: "center", justifyContent: "center", backgroundColor: "#FFC93C" },
  tickText: { fontFamily: fonts.display, fontSize: 10, lineHeight: 12, color: "#3A1C00" },
  touchRing: { position: "absolute", borderWidth: 2.5, borderColor: "#FFC93C", backgroundColor: "rgba(255,201,60,0.18)" },
  after: { position: "absolute", top: 0, tintColor: "#4FE3FF" },
  runner: { position: "absolute", left: 0, top: 0, zIndex: 50 },
  goldRing: { position: "absolute", borderRadius: 999, borderWidth: 3, borderColor: "#FFC93C", backgroundColor: "rgba(255,180,0,0.25)" },
  ghostRing: { borderColor: "#4FE3FF", backgroundColor: "rgba(79,227,255,0.2)" },
  runnerLabel: { position: "absolute", top: -14, alignSelf: "center", fontFamily: fonts.display, fontSize: 11, color: "#4FE3FF", textShadowColor: "#000", textShadowRadius: 3 },
});
