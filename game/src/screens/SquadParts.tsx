import { useEffect } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { Tappable, fonts, palette } from "../ui";
import { art } from "../art";
import { ART_RATIO, SKILLS, artFor, ovr, player, skillsOf } from "../game/squad";

export const ROLE_COLOR: Record<string, [string, string]> = {
  Raider: ["#FF8A3C", "#C0262E"],
  Corner: ["#4FE3FF", "#0A7FA6"],
  Cover: ["#7D8BFF", "#2D3BCB"],
  "All-rounder": ["#8CF06A", "#2E8B57"],
};
export const SKILL_SHORT = ["REACH", "GRIP", "SPEED", "STAMINA", "AGILITY"];

/** A skill bar that eases to its new value (training grows it visibly) and flashes on a rise. */
export function SkillBar({ label, value, color = palette.accent, compact }: { label: string; value: number; color?: string; compact?: boolean }) {
  const w = useSharedValue(value);
  const flash = useSharedValue(0);
  useEffect(() => {
    if (value > w.value) flash.value = withSequence(withTiming(1, { duration: 120 }), withTiming(0, { duration: 700 }));
    w.value = withTiming(value, { duration: 650, easing: Easing.out(Easing.cubic) });
  }, [value, w, flash]);
  const fill = useAnimatedStyle(() => ({ width: `${Math.max(3, Math.min(100, w.value))}%` }));
  const glow = useAnimatedStyle(() => ({ opacity: flash.value }));
  return (
    <View style={styles.skill}>
      <Text style={[styles.skillLabel, compact ? { fontSize: 10, width: 58 } : null]}>{label}</Text>
      <View style={[styles.track, compact ? { height: 9 } : null]}>
        <Animated.View style={[styles.fill, { backgroundColor: color }, fill]} />
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, glow]} />
      </View>
      <Text style={[styles.skillValue, compact ? { fontSize: 12, width: 24 } : null]}>{value}</Text>
    </View>
  );
}

/** Squad card: portrait, OVR badge, name, role. */
export function PlayerCard({ id, mine = true, onPress, highlight, width }: { id: string; mine?: boolean; onPress?: () => void; highlight?: boolean; width: number }) {
  const p = player(id);
  const a = artFor(p, mine);
  const h = Math.round(width * 0.62);
  const body = (
    <LinearGradient colors={highlight ? ["rgba(255,201,60,0.35)", "rgba(20,24,80,0.95)"] : ["rgba(44,51,143,0.95)", "rgba(16,19,63,0.96)"]} style={[styles.card, { width }, highlight ? styles.cardOn : null]}>
      <View style={[styles.portrait, { height: h }]}>
        <Image source={art[a]} style={{ width: h * (ART_RATIO[a] ?? 0.9), height: h }} resizeMode="contain" />
        <View style={styles.ovr}><Text style={styles.ovrText}>{ovr(id)}</Text></View>
        <Text style={styles.no}>#{p.no}</Text>
      </View>
      <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{p.name.split(" ")[0]}</Text>
      <LinearGradient colors={ROLE_COLOR[p.role]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.role}>
        <Text style={styles.roleText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{p.role}</Text>
      </LinearGradient>
    </LinearGradient>
  );
  if (!onPress) return body;
  return <Tappable onPress={onPress} scaleTo={0.92} accessibilityLabel={`${p.name}, ${p.role}`}>{body}</Tappable>;
}

/** All 5 skills of a player as bars. */
export function SkillList({ id, compact }: { id: string; compact?: boolean }) {
  const sk = skillsOf(id);
  return (
    <View style={{ gap: compact ? 3 : 6 }}>
      {SKILLS.map((name, k) => <SkillBar key={name} label={compact ? SKILL_SHORT[k] : name} value={sk[k]} compact={compact} color={k === 0 ? "#FF8A3C" : k === 1 ? "#4FE3FF" : k === 2 ? "#FFD24A" : k === 3 ? "#3DDC84" : "#C792FF"} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  skill: { flexDirection: "row", alignItems: "center", gap: 6 },
  skillLabel: { fontFamily: fonts.body, fontSize: 12, color: palette.ink, width: 84 },
  track: { flex: 1, height: 12, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.5)", overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" },
  fill: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 999 },
  flash: { backgroundColor: "rgba(255,255,255,0.55)", borderRadius: 999 },
  skillValue: { fontFamily: fonts.display, fontSize: 14, color: "#fff", width: 28, textAlign: "right" },
  card: { borderRadius: 14, borderWidth: 1.5, borderColor: "rgba(255,201,60,0.5)", paddingBottom: 6, alignItems: "center", overflow: "hidden" },
  cardOn: { borderColor: palette.gold, borderWidth: 2 },
  portrait: { alignSelf: "stretch", alignItems: "center", justifyContent: "flex-end", backgroundColor: "rgba(255,180,0,0.08)" },
  ovr: { position: "absolute", left: 4, top: 4, minWidth: 26, height: 22, borderRadius: 8, backgroundColor: "#FFC93C", alignItems: "center", justifyContent: "center", paddingHorizontal: 3, borderWidth: 1, borderColor: "#A65F00" },
  ovrText: { fontFamily: fonts.display, fontSize: 13, color: "#4A2600" },
  no: { position: "absolute", right: 5, top: 4, fontFamily: fonts.display, fontSize: 11, color: "rgba(255,255,255,0.8)" },
  name: { fontFamily: fonts.display, fontSize: 13, color: "#fff", marginTop: 3, paddingHorizontal: 3 },
  role: { marginTop: 3, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1, maxWidth: "92%" },
  roleText: { fontFamily: fonts.body, fontSize: 9.5, color: "#fff" },
});
