import { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";

const HAND = { up: "👆", down: "👇", left: "👈", right: "👉" } as const;
const SIZE = 46;

/**
 * Animated pointer demonstrating a tap at `from` or a swipe from → to. Show on the first levels.
 * `dir` = where the finger points. The fingertip sits ON `from` and the hand body extends AWAY from it, so pointing
 * at a button with a label under it uses "left"/"right" (hand beside the button) or "down" (hand above) — an "up"
 * hand on a button covered its own label (QA render_defects 2026-11-07, 'Hand Touch' hidden under the hand).
 * Hide it whenever a result popup / banner opens (the caller unmounts it).
 */
export function TutorialHand({ from, to, dir = "up" }: { from: { x: number; y: number }; to?: { x: number; y: number }; dir?: keyof typeof HAND }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withSequence(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.cubic) }), withTiming(1, { duration: 400 }), withTiming(0, { duration: 0 })), -1);
  }, [t]);
  // offset from the glyph's top-left to its fingertip, and the tap "poke" direction
  const tip = dir === "up" ? { x: 20, y: 8 } : dir === "down" ? { x: 26, y: SIZE + 6 } : dir === "left" ? { x: 2, y: 30 } : { x: SIZE + 4, y: 30 };
  const poke = dir === "up" ? { x: 0, y: 1 } : dir === "down" ? { x: 0, y: -1 } : dir === "left" ? { x: 1, y: 0 } : { x: -1, y: 0 };
  const style = useAnimatedStyle(() => {
    const dest = to ?? from;
    const x = from.x + (dest.x - from.x) * t.value;
    const y = from.y + (dest.y - from.y) * t.value;
    const k = to ? 0 : Math.sin(Math.PI * t.value);
    // the tap: the hand pulls back a few dp and pokes in, and squeezes a little at the press
    return {
      transform: [{ translateX: x - tip.x + poke.x * 10 * (1 - k) }, { translateY: y - tip.y + poke.y * 10 * (1 - k) }, { scale: 1 - 0.12 * k }],
      opacity: t.value > 0.98 ? 0.6 : 1,
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.hand, style]}>
      <Text style={styles.emoji}>{HAND[dir]}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hand: { position: "absolute", left: 0, top: 0 },
  emoji: { fontSize: SIZE, textShadowColor: "rgba(0,0,0,0.4)", textShadowRadius: 8 },
});
