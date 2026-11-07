import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Background, CurrencyPill, GameButton, LevelMap, type MapLevel, fonts, palette } from "../ui";
import { art } from "../art";
import { store } from "../modules/store";
import { UNITS, CHAPTERS } from "../game/units";
import { TRIALS, chapterOf, totalStars } from "../game/meta";
import { useBottomInset } from "../modules/layout";

/** The campaign map (from Home's "Trials"): 66 Raid Trials in 6 chapters, stars, crowned chapter bosses. */
export function LevelsScreen({ onPlay, onBack }: { onPlay: (trial: number) => void; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const leaving = useSharedValue(0);
  const leaveStyle = useAnimatedStyle(() => ({ opacity: 1 - leaving.value * 0.55, transform: [{ scale: 1 + leaving.value * 0.04 }] }));
  const play = useCallback((n: number) => {
    leaving.value = withTiming(1, { duration: 160 });
    onPlay(n);
  }, [leaving, onPlay]);
  const bottomInset = useBottomInset();
  const [s, setS] = useState(store.get());
  useEffect(() => store.subscribe(setS), []);
  const current = Math.min(TRIALS, Math.max(1, s.level));
  const levels: MapLevel[] = useMemo(() => UNITS.map((u) => ({
    id: `t${u.id}`,
    number: u.id,
    chapter: `Chapter ${u.ch} · ${CHAPTERS[u.ch - 1].name}`,
    boss: u.role === "boss",
    tag: u.role === "boss" ? "Chapter Final" : u.type,
    stars: u.id < current || s.level > u.id ? s.stars?.[`t${u.id}`] ?? 1 : u.id === current ? 0 : -1,
  })), [current, s.stars, s.level]);
  const select = useCallback((l: MapLevel) => play(l.number), [play]);
  const ch = chapterOf(current);
  return (
    <Animated.View style={[styles.root, leaveStyle]}>
      <Background image={art[current <= 11 ? "bg_village_mat_far" : "bg_night_stadium_far"]} dim={0.55} />
      <LevelMap levels={levels} current={current} onSelect={select} padTop={insets.top + 120} padBottom={bottomInset + 180} />
      <LinearGradient pointerEvents="none" colors={["rgba(11,13,43,1)", "rgba(11,13,43,0.92)", "rgba(11,13,43,0)"]} locations={[0, 0.55, 1]} style={[styles.scrimTop, { height: insets.top + 150 }]} />
      <LinearGradient pointerEvents="none" colors={["rgba(11,13,43,0)", "rgba(11,13,43,0.7)", "rgba(11,13,43,0.95)"]} style={[styles.scrimBottom, { height: bottomInset + 190 }]} />
      <View style={[styles.hud, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <CurrencyPill icon="★" value={totalStars()} color={palette.star} />
        <CurrencyPill image={art.icon_coin} value={s.coins} />
      </View>
      <View style={[styles.titleBox, { top: insets.top + 56 }]} pointerEvents="none">
        <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>Raid Trials</Text>
        <Text style={styles.subtitle} numberOfLines={1} adjustsFontSizeToFit>Chapter {ch.n}: {ch.name} — {ch.theme}</Text>
      </View>
      <View style={[styles.bottom, { paddingBottom: bottomInset + 12 }]} pointerEvents="box-none">
        <GameButton size="sm" variant="light" label="‹ Home" onPress={onBack} />
        <GameButton label={`Play · Trial ${current}`} variant="primary" size="lg" style={{ flex: 1 }} onPress={() => play(current)} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hud: { position: "absolute", left: 0, right: 0, top: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14 },
  titleBox: { position: "absolute", left: 20, right: 20, alignItems: "center" },
  title: { fontFamily: fonts.display, fontSize: 32, color: palette.gold, textShadowColor: "#2A0E00", textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 1 },
  subtitle: { fontFamily: fonts.body, fontSize: 13, color: palette.ink },
  scrimTop: { position: "absolute", left: 0, right: 0, top: 0 },
  scrimBottom: { position: "absolute", left: 0, right: 0, bottom: 0 },
  bottom: { position: "absolute", left: 16, right: 16, bottom: 0, flexDirection: "row", alignItems: "center", gap: 12 },
});
