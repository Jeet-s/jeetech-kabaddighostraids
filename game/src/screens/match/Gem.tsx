import { useEffect } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming, cancelAnimation } from "react-native-reanimated";
import { Tappable, fonts, palette } from "../../ui";
import { art, type ArtId } from "../../art";

/** Each decision has its own gem colour + glyph (art direction: Hand saffron, Dash crimson, Dubki cyan, Toe violet, Kick green). */
export const MOVE_LOOK: Record<string, { gem: ArtId; glyph: string; label: string }> = {
  hand: { gem: "gem_saffron", glyph: "✋", label: "Hand Touch" },
  toe: { gem: "gem_violet", glyph: "🦶", label: "Toe Touch" },
  kick: { gem: "gem_green", glyph: "🦵", label: "Back Kick" },
  bonus: { gem: "gem_gold", glyph: "★", label: "Bonus" },
  walk: { gem: "gem_navy", glyph: "↩", label: "Walk Home" },
  dash: { gem: "gem_crimson", glyph: "⚡", label: "Dash Home" },
  dubki: { gem: "gem_cyan", glyph: "⤵", label: "Dubki" },
  pull: { gem: "gem_saffron", glyph: "💪", label: "Pull Away" },
  lunge: { gem: "gem_crimson", glyph: "➜", label: "Lunge" },
  ankle: { gem: "gem_violet", glyph: "🦶", label: "Ankle Hold" },
  thigh: { gem: "gem_saffron", glyph: "✊", label: "Thigh Hold" },
  rush: { gem: "gem_crimson", glyph: "⚡", label: "Rush" },
  chain: { gem: "gem_cyan", glyph: "⛓", label: "Chain" },
  block: { gem: "gem_navy", glyph: "▮▮", label: "Block" },
  hold: { gem: "gem_green", glyph: "✋", label: "Stay Back" },
  review: { gem: "gem_cyan", glyph: "📺", label: "Review" },
  accept: { gem: "gem_navy", glyph: "✓", label: "Accept" },
  bid: { gem: "gem_gold", glyph: "＋", label: "Bid" },
  pass: { gem: "gem_navy", glyph: "✕", label: "Pass" },
};

/**
 * Thumb-reachable glossy move gem (baked art gem_* with a gold bevel). Squashes on touch-down (Tappable).
 * `chip` = the real chance the engine gives this choice (e.g. "12% held"), `coach` = the coach's pick pulses.
 */
export function Gem({ move, onPress, chip, chipBad, coach, size = 58, label, tag, fired }: {
  /** the decision just taken, shown while it plays out: it lands with the press flash + rings and a gold halo stays */
  fired?: boolean;
  /** absent = a display-only gem (the decision being played out), drawn without a touch target */
  move: string; onPress?: () => void; chip?: string; chipBad?: boolean; coach?: boolean; size?: number; label?: string;
  /** a small warning chip over the gem's crown ("SCOUTED", "WALLED") — the chip % already includes it. */
  tag?: string;
}) {
  const look = MOVE_LOOK[move] ?? MOVE_LOOK.hand;
  const glow = useSharedValue(0);
  useEffect(() => {
    if (fired) glow.value = withTiming(1, { duration: 120 });
    else if (coach) glow.value = withRepeat(withSequence(withTiming(1, { duration: 450 }), withTiming(0.2, { duration: 450 })), 12);
    else { cancelAnimation(glow); glow.value = 0; }
  }, [coach, glow, fired]);
  const ring = useAnimatedStyle(() => ({ opacity: glow.value, transform: [{ scale: 1 + glow.value * 0.08 }] }));
  // a new choice row springs up out of the bar (the face only — the layout box is final from the first frame)
  const pop = useSharedValue(0);
  useEffect(() => {
    pop.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.back(2)) });
  }, [pop]);
  const popStyle = useAnimatedStyle(() => (fired ? { opacity: 1 } : { opacity: 0.35 + 0.65 * Math.min(1, pop.value), transform: [{ scale: 0.55 + 0.45 * pop.value }] }));
  // touch-DOWN answer (QA game_feel 2026-11-07): a white glow flash on the face + a ripple ring leaving the rim, both
  // started in onPressIn together with Tappable's 0.92 squash — visible in the first 0.1 s, before the release.
  const press = useSharedValue(0);
  const pressIn = () => {
    press.value = 0;
    press.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.quad) });
  };
  // the pressed gem is replaced by its "fired" copy the same frame (the row empties while the raid plays out), so the
  // press answer must live on in that copy (QA game_feel 2026-11-07: "+0 to +0.13 s frames look nearly identical"):
  // it mounts already flashing, its rings leave the rim and the face punches down-and-up
  const punch = useSharedValue(fired ? 1 : 0);
  useEffect(() => {
    if (!fired) return;
    press.value = 0.05;
    press.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) });
    punch.value = withSequence(withTiming(1, { duration: 1 }), withSpring(0, { damping: 7, stiffness: 260 }));
  }, [fired, press, punch]);
  const punchStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 - punch.value * 0.2 }] }));
  // a strong answer (QA game_feel 2026-11-07: "in the burst frames the button barely changes"): the face flashes
  // white, two gold rings leave the rim and a gold disc lights up behind the gem for ~0.65 s
  const glowStyle = useAnimatedStyle(() => ({ opacity: press.value > 0 && press.value < 1 ? 0.9 * (1 - press.value) : 0 }));
  const rippleStyle = useAnimatedStyle(() => ({
    opacity: press.value > 0 && press.value < 1 ? 1 - press.value : 0,
    transform: [{ scale: 0.9 + 1.0 * press.value }],
  }));
  const ripple2 = useAnimatedStyle(() => ({
    opacity: press.value > 0.15 && press.value < 1 ? 0.8 * (1 - press.value) : 0,
    transform: [{ scale: 0.8 + 0.7 * press.value }],
  }));
  const backStyle = useAnimatedStyle(() => ({ opacity: press.value > 0 && press.value < 1 ? 0.75 * (1 - press.value) : 0, transform: [{ scale: 1 + 0.25 * press.value }] }));
  const body = (
    <>
      <Animated.View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, popStyle, fired ? punchStyle : null]}>
        {fired ? <View pointerEvents="none" style={[styles.halo, { width: size + 20, height: size + 20, borderRadius: (size + 20) / 2 }]} /> : null}
        <Animated.View pointerEvents="none" style={[styles.coach, { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2 }, ring]} />
        <Animated.View pointerEvents="none" style={[styles.back, { width: size + 14, height: size + 14, borderRadius: (size + 14) / 2 }, backStyle]} />
        <Animated.View pointerEvents="none" style={[styles.ripple, { width: size, height: size, borderRadius: size / 2 }, rippleStyle]} />
        <Animated.View pointerEvents="none" style={[styles.ripple, styles.ripple2, { width: size, height: size, borderRadius: size / 2 }, ripple2]} />
        <Image source={art[look.gem]} style={{ width: size, height: size * 1.04, position: "absolute" }} resizeMode="contain" />
        {look.gem === "gem_navy" ? <View pointerEvents="none" style={[styles.navyRim, { width: size * 0.8, height: size * 0.8, borderRadius: size }]} /> : null}
        <Animated.View pointerEvents="none" style={[styles.glow, { width: size * 0.86, height: size * 0.86, borderRadius: size / 2 }, glowStyle]} />
        <Text style={[styles.glyph, { fontSize: size * 0.4 }]}>{look.glyph}</Text>
      </Animated.View>
      {tag ? (
        <View pointerEvents="none" style={[styles.tag, { width: size + 14 }]}>
          <Text style={styles.tagText} numberOfLines={1} adjustsFontSizeToFit>{tag}</Text>
        </View>
      ) : null}
      <View style={[styles.labelBox, coach || fired ? styles.labelLit : null]}>
        <Text style={[styles.label, coach || fired ? styles.labelLitText : null]} numberOfLines={1} adjustsFontSizeToFit>{label ?? look.label}</Text>
      </View>
      {chip ? (
        <View style={[styles.chip, chipBad ? styles.chipBad : styles.chipGood]}>
          <Text style={styles.chipText} numberOfLines={1} adjustsFontSizeToFit>{chip}</Text>
        </View>
      ) : null}
    </>
  );
  if (!onPress) return <View pointerEvents="none" style={[styles.wrap, { width: size + 18 }]}>{body}</View>;
  return (
    <Tappable onPress={onPress} onPressIn={pressIn} scaleTo={0.86} sound="pop" hapticKind="medium" style={[styles.wrap, { width: size + 18 }]} accessibilityLabel={label ?? look.label}>
      {body}
    </Tappable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  ripple: { position: "absolute", borderWidth: 4, borderColor: "#FFF6D0" },
  ripple2: { borderColor: "#FFC93C", borderWidth: 3 },
  back: { position: "absolute", backgroundColor: "#FFC93C" },
  // the navy gems (Walk Home, Block, Accept, Pass) read as live, not disabled: a bright inner rim
  navyRim: { position: "absolute", borderWidth: 2.5, borderColor: "#9FC2FF" },
  glow: { position: "absolute", backgroundColor: "#FFFFFF" },
  coach: { position: "absolute", borderWidth: 3, borderColor: "#FFF6B0", backgroundColor: "rgba(255,240,150,0.18)" },
  glyph: { color: "#fff", textShadowColor: "rgba(0,0,0,0.55)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 2, marginTop: -2 },
  // clears the coach ring (size + 8, scaled up to 12 % while it pulses) so the ring never crosses the label
  labelBox: { marginTop: 7, paddingHorizontal: 5, minHeight: 18, borderRadius: 8, borderWidth: 1.5, borderColor: "transparent", justifyContent: "center", maxWidth: "100%" },
  labelLit: { backgroundColor: "#FFC93C", borderColor: "#FFF6D0" },
  label: { fontFamily: fonts.displayMedium, fontSize: 12, lineHeight: 15, color: palette.ink, textShadowColor: "#000", textShadowRadius: 3, textAlign: "center" },
  labelLitText: { color: "#3A1E00", textShadowRadius: 0 },
  halo: { position: "absolute", backgroundColor: "rgba(255,201,60,0.35)", borderWidth: 2, borderColor: "#FFE27A" },
  chip: { marginTop: 2, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, borderWidth: 1 },
  chipGood: { backgroundColor: "rgba(20,90,50,0.85)", borderColor: "#3DDC84" },
  chipBad: { backgroundColor: "rgba(120,16,24,0.85)", borderColor: "#FF6A6F" },
  tag: { position: "absolute", top: -3, alignItems: "center", backgroundColor: "rgba(150,20,32,0.95)", borderRadius: 6, borderWidth: 1, borderColor: "#FFD1D3", paddingHorizontal: 3 },
  tagText: { fontFamily: fonts.display, fontSize: 9, lineHeight: 12, color: "#fff", letterSpacing: 0.5 },
  chipText: { fontFamily: fonts.body, fontSize: 10, color: "#fff" },
});
