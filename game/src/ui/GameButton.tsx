import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { palette, radius, shadow, springs, type } from "./theme";
import { haptic, play, type Sfx } from "../audio/sfx";

type Variant = "primary" | "secondary" | "accent" | "danger" | "light";
const COLORS: Record<Variant, { top: string; bottom: string; lip: string; text: string }> = {
  // primary CTA: gold pill with a dark-gold lip (art: btn_primary_gold)
  primary: { top: "#FFE27A", bottom: "#FFA800", lip: "#A65F00", text: "#4A2600" },
  // secondary: royal blue with a gold hairline (art: btn_secondary_blue)
  secondary: { top: "#4D5CF0", bottom: "#1E2A9E", lip: "#0E1460", text: "#FFFFFF" },
  accent: { top: "#FFD25A", bottom: "#FF8A1F", lip: "#A24A00", text: "#4A1C00" },
  danger: { top: "#FF6A6F", bottom: palette.danger, lip: palette.dangerDark, text: "#FFFFFF" },
  light: { top: "#2E358F", bottom: "#191E63", lip: "#0B0D2B", text: palette.ink },
};

/**
 * Chunky casual-game button: gradient face, darker 3D lip, squash + darken on
 * press, tap sound + haptic. Use for EVERY tappable action (Tappable for
 * anything that isn't button-shaped).
 *
 * Feel (QA 2026-10-20..28, "taps show little to no response in 0.1-0.3 s" in every game reviewed): the response
 * starts on TOUCH-DOWN — a 50 ms press into the lip with a darkened face, sound + haptic at once — and the release
 * springs back past rest. A spring-only press took ~150 ms to show and read as "no pressed state".
 * Labels never wrap ("Re/start" on a 720x1280 phone, layout_small 2026-10-21): one line, shrinking to fit.
 */
export function GameButton({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  disabled,
  sound = "tap",
  style,
}: {
  label?: string;
  onPress?: () => void;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  disabled?: boolean;
  sound?: Sfx;
  style?: ViewStyle;
}) {
  const c = COLORS[variant];
  const press = useSharedValue(0);
  const face = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.max(0, press.value) * 5 }, { scale: 1 - press.value * 0.08 }],
  }));
  const shade = useAnimatedStyle(() => ({ opacity: Math.max(0, press.value) * 0.18 }));
  const h = size === "lg" ? 68 : size === "sm" ? 44 : 56;
  const lip = size === "sm" ? 4 : 6;
  return (
    <Pressable
      disabled={disabled}
      onPressIn={() => {
        press.value = withTiming(1, { duration: 50 });
        play(sound);
        haptic("light");
      }}
      // Back past rest (-0.4 ≈ 3 % bigger) and settle: the release pops instead of fading back.
      onPressOut={() => (press.value = withSequence(withTiming(-0.4, { duration: 110 }), withSpring(0, springs.press)))}
      onPress={() => onPress?.()}
      style={[{ height: h + lip, opacity: disabled ? 0.5 : 1 }, style]}
      hitSlop={6}
    >
      <View style={[styles.lip, { height: h, top: lip, backgroundColor: c.lip, borderRadius: radius.lg }, shadow]} />
      <Animated.View style={[{ height: h, borderRadius: radius.lg, overflow: "hidden" }, face]}>
        <LinearGradient colors={[c.top, c.bottom]} style={[styles.face, { paddingHorizontal: size === "sm" ? 12 : 22, borderRadius: radius.lg }, variant === "secondary" || variant === "light" ? styles.goldLine : null]}>
          <View style={styles.shine} />
          {icon}
          {label ? (
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
              style={[type.button, { color: c.text, fontSize: size === "lg" ? 24 : size === "sm" ? 16 : 20, flexShrink: 1 }, variant === "primary" || variant === "accent" ? styles.lightText : styles.darkText]}
            >
              {label}
            </Text>
          ) : null}
        </LinearGradient>
        <Animated.View pointerEvents="none" style={[styles.shade, shade]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lip: { position: "absolute", left: 0, right: 0 },
  face: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  shade: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "#000" },
  goldLine: { borderWidth: 1.5, borderColor: "rgba(255,201,60,0.85)" },
  lightText: { textShadowColor: "rgba(255,255,255,0.55)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 0 },
  darkText: { textShadowColor: "rgba(0,0,0,0.45)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 2 },
  shine: { position: "absolute", top: 4, left: 10, right: 10, height: "38%", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.22)" },
});
