import { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";
import { art } from "../../art";

/**
 * Contact impact: the gold starburst sprite (fx_impact_burst) slams in at the touch / tackle point and fades —
 * one shared value, plain views (mounted per event with a new key, never a Skia canvas per hit).
 */
export function Impact({ x, y, size = 110, tint }: { x: number; y: number; size?: number; tint?: string }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
  }, [t]);
  const st = useAnimatedStyle(() => ({
    opacity: t.value < 0.35 ? 1 : 1 - (t.value - 0.35) / 0.65,
    transform: [{ scale: 0.35 + 0.85 * Math.min(1, t.value * 2.2) }, { rotate: `${t.value * 25}deg` }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.abs, { left: x - size / 2, top: y - size / 2, width: size, height: size }, st]}>
      <Image source={art.fx_impact_burst} style={{ width: size, height: size * (512 / 470), tintColor: tint }} resizeMode="contain" />
    </Animated.View>
  );
}

/** Mat dust: a few sand puffs kicked up at the athlete's feet (bigger + streaks on a Dash / Rush). */
export function Dust({ x, y, big }: { x: number; y: number; big?: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: big ? 620 : 480, easing: Easing.out(Easing.quad) });
  }, [t, big]);
  const n = big ? 7 : 5;
  return (
    <View pointerEvents="none" style={[styles.abs, { left: x, top: y }]}>
      {Array.from({ length: n }, (_, i) => (
        <Puff key={i} t={t} dx={(i - (n - 1) / 2) * (big ? 16 : 12)} r={(big ? 14 : 10) + (i % 3) * 3} lift={8 + (i % 2) * 10} />
      ))}
      {big ? [0, 1, 2].map((i) => <Streak key={`s${i}`} t={t} dy={-28 - i * 12} />) : null}
    </View>
  );
}

function Puff({ t, dx, r, lift }: { t: SharedValue<number>; dx: number; r: number; lift: number }) {
  const st = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - t.value),
    transform: [{ translateX: dx * (0.4 + t.value) }, { translateY: -lift * t.value }, { scale: 0.5 + t.value * 1.1 }],
  }));
  return <Animated.View style={[styles.puff, { width: r * 2, height: r * 1.3, left: -r, top: -r * 0.65, borderRadius: r }, st]} />;
}

function Streak({ t, dy }: { t: SharedValue<number>; dy: number }) {
  const st = useAnimatedStyle(() => ({ opacity: 0.8 * (1 - t.value), transform: [{ translateX: -20 - 50 * t.value }, { scaleX: 0.4 + t.value }] }));
  return <Animated.View style={[styles.streak, { top: dy }, st]} />;
}

const styles = StyleSheet.create({
  abs: { position: "absolute" },
  puff: { position: "absolute", backgroundColor: "#E9C99A" },
  streak: { position: "absolute", left: -30, width: 60, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.9)" },
});
