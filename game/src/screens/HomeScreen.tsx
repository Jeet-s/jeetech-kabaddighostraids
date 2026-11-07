import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing, FadeInDown, FadeInUp, ZoomIn, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue,
} from "react-native-reanimated";
import { Background, CurrencyPill, GameButton, Popup, Tappable, feedback, fonts, palette } from "../ui";
import { art, type ArtId } from "../art";
import { store } from "../modules/store";
import { useBottomInset } from "../modules/layout";
import { notify } from "../modules/notify";
import { analytics } from "../modules/analytics";
import { CHAPTERS } from "../game/units";
import { TRIALS, chapterOf, dailyPay, dailyState, passReady, today, totalStars } from "../game/meta";

/**
 * HOME = the title screen: the arena at night, the logo, the raider bursting out of a defence with his ghost
 * afterimage (idle motion), currencies, chapter progress, ONE big "Play · Trial N", Trials / Matches / Album / Shop /
 * Settings as gem buttons, and a row of labelled chips for the meta features: Squad, Auction, Season Pass, Chant
 * Studio, Roadmap. Fits a 360x640 dp phone (the hero art shrinks first); centred with a max width on tablets.
 */
export function HomeScreen({ onPlay, onLevels, onModes, onShop, onSettings, onAlbum, onSquad, onAuction, onPass, onChants, onRoadmap }: {
  onPlay: (trial: number) => void; onLevels: () => void; onModes: () => void; onShop: () => void; onSettings: () => void; onAlbum: () => void;
  onSquad: () => void; onAuction: () => void; onPass: () => void; onChants: () => void; onRoadmap: () => void;
}) {
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { width, height } = useWindowDimensions();
  const [s, setS] = useState(store.get());
  useEffect(() => store.subscribe(setS), []);
  const current = Math.min(TRIALS, Math.max(1, s.level));
  const chapter = chapterOf(current);
  const done = Math.min(chapter.to - chapter.from + 1, Math.max(0, Math.min(s.level, chapter.to + 1) - chapter.from));
  const daily = dailyState();
  const [dailyOpen, setDailyOpen] = useState(false);

  // Idle life: the logo floats, the hero breathes and leans, the defenders sway, Play breathes.
  const float = useSharedValue(0);
  const breathe = useSharedValue(0);
  const sway = useSharedValue(0);
  useEffect(() => {
    float.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), -1, true);
    sway.value = withRepeat(withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.sin) }), -1, true);
    breathe.value = withDelay(900, withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0, { duration: 700 })), -1));
  }, [float, breathe, sway]);
  const logoStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -5 + float.value * 10 }, { rotate: `${-1 + float.value * 2}deg` }] }));
  const heroStyle = useAnimatedStyle(() => ({ transform: [{ translateY: 4 - float.value * 8 }, { scale: 1 + float.value * 0.025 }] }));
  const leftDef = useAnimatedStyle(() => ({ transform: [{ translateX: -sway.value * 6 }, { rotate: `${-2 + sway.value * 3}deg` }] }));
  const rightDef = useAnimatedStyle(() => ({ transform: [{ translateX: sway.value * 6 }, { rotate: `${2 - sway.value * 3}deg` }] }));
  const playStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + breathe.value * 0.035 }] }));
  const giftStyle = useAnimatedStyle(() => ({ transform: [{ scale: daily.canClaim ? 1 + breathe.value * 0.12 : 1 }] }));

  // Short phones (360x640 dp): smaller logo, tighter gaps, no chapter footnote — the hero art takes what's left.
  const compact = height < 720;
  const logoW = Math.min(width * 0.74, 340, height * (compact ? 0.24 : 0.28));
  const [heroBox, setHeroBox] = useState(0);
  const heroH = Math.max(0, Math.min(heroBox - 4, height * 0.36, width * 0.95));
  const passN = passReady();

  const claim = async () => {
    const d = dailyState();
    if (!d.canClaim) return;
    const pay = dailyPay(d.day);
    store.set({ coins: store.get().coins + pay.coins, tokens: (store.get().tokens ?? 0) + pay.tokens, streak: d.day, lastDaily: today() });
    feedback("coin", "success");
    analytics.track("streak_day", { day: d.day });
    // the player opted in by claiming: remind them tomorrow (permission asked here, never on first launch)
    if (await notify.ask("Daily reward reminders")) {
      store.set({ reminders: true });
      notify.daily("daily_reward", { hour: 18, minute: 30 }, { title: "Your daily reward is ready", body: "Your streak is waiting — claim today's coins and raid on." });
    }
  };

  return (
    <View style={styles.root}>
      <Background image={art.bg_night_stadium_far} dim={0.2} />
      <LinearGradient pointerEvents="none" colors={["rgba(255,160,40,0)", "rgba(255,160,40,0.22)", "rgba(255,160,40,0)"]} style={[StyleSheet.absoluteFill, { top: "34%", bottom: "26%" }]} />

      <View style={[styles.hud, { paddingTop: insets.top + 8 }]}>
        <View style={styles.hudLeft}>
          <CurrencyPill image={art.icon_coin} value={s.coins} />
          <CurrencyPill image={art.icon_token} value={s.tokens ?? 0} />
        </View>
        <Tappable onPress={() => setDailyOpen(true)} accessibilityLabel="Daily reward" scaleTo={0.86}>
          <Animated.View style={[styles.gift, daily.canClaim ? styles.giftOn : null, giftStyle]}>
            <Text style={styles.giftGlyph}>🎁</Text>
            <Text style={styles.giftText}>{daily.canClaim ? `Day ${daily.day}` : `Streak ${s.streak ?? 0}`}</Text>
          </Animated.View>
        </Tappable>
      </View>

      <Animated.View entering={FadeInDown.duration(500)} style={styles.logoWrap}>
        <Animated.View style={logoStyle}>
          <Image source={art.logo} style={{ width: logoW, height: logoW * (553 / 786) }} resizeMode="contain" />
          <Text style={styles.sub}>RAID LEAGUE</Text>
        </Animated.View>
      </Animated.View>

      <View style={styles.heroArea} pointerEvents="none" onLayout={(e) => setHeroBox(Math.floor(e.nativeEvent.layout.height))}>
        <Embers w={width} h={heroH} />
        <View style={[styles.glowRing, { width: width * 0.9, height: width * 0.22, bottom: 6 }]} />
        {heroH > 40 ? <>
        <Animated.View style={[styles.defL, leftDef]}>
          <Image source={art.defender_teal} style={{ width: heroH * 0.5 * 0.9, height: heroH * 0.5 }} resizeMode="contain" />
        </Animated.View>
        <Animated.View style={[styles.defR, rightDef]}>
          <Image source={art.defender_teal} style={{ width: heroH * 0.56 * 0.9, height: heroH * 0.56, transform: [{ scaleX: -1 }] }} resizeMode="contain" />
        </Animated.View>
        <Animated.View style={heroStyle}>
          <Image source={art.hero_raid_god} style={{ width: heroH * (493 / 512), height: heroH }} resizeMode="contain" />
        </Animated.View>
        </> : null}
      </View>

      <View style={[styles.bottom, { paddingBottom: bottomInset + (compact ? 6 : 10), gap: compact ? 8 : 12 }]}>
        <Animated.View entering={FadeInUp.delay(150).duration(450)} style={styles.chapterCard}>
          <View style={styles.chapterRow}>
            <Text style={styles.chapterLabel}>Ch {chapter.n} · {chapter.name}</Text>
            <Text style={styles.chapterCount}>★ {totalStars()}/{TRIALS * 3}</Text>
          </View>
          <View style={styles.progressTrack}>
            <LinearGradient colors={["#5BE3FF", "#1A6BFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressFill, { width: `${Math.max(5, (done / (chapter.to - chapter.from + 1)) * 100)}%` }]} />
          </View>
          {compact ? null : <Text style={styles.chapterSub}>{done}/{chapter.to - chapter.from + 1} trials · {CHAPTERS.length} chapters · {TRIALS} trials</Text>}
        </Animated.View>

        <Animated.View entering={ZoomIn.delay(250).duration(400)} style={styles.playWrap}>
          <Animated.View style={playStyle}>
            <GameButton label={s.level > TRIALS ? "Play · Trial 66" : `Play · Trial ${current}`} variant="primary" size="lg" sound="whoosh" onPress={() => onPlay(current)} />
          </Animated.View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(350).duration(450)} style={styles.iconRow}>
          <RoundButton gem="gem_navy" icon="🗺️" label="Trials" onPress={onLevels} />
          <RoundButton gem="gem_crimson" icon="🏆" label="Matches" onPress={onModes} />
          <RoundButton gem="gem_violet" icon="📒" label="Album" onPress={onAlbum} />
          <RoundButton gem="gem_navy" icon="🛒" label="Shop" onPress={onShop} />
          <RoundButton gem="gem_navy" icon="⚙️" label="Settings" onPress={onSettings} />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(450).duration(450)} style={styles.chipRow}>
          <Chip icon="👥" label="Squad" colors={["#4D5CF0", "#1E2A9E"]} onPress={onSquad} />
          <Chip icon="🔨" label="Auction" colors={["#FF8A3C", "#B3121C"]} onPress={onAuction} />
          <Chip icon="🎟️" label="Season Pass" colors={["#3DDC84", "#11734A"]} onPress={onPass} badge={passN} />
          <Chip icon="🎵" label="Chant Studio" colors={["#C792FF", "#5A2BA0"]} onPress={onChants} />
          <Chip icon="🗳️" label="Roadmap" colors={["#4FD3FF", "#0A6A8F"]} onPress={onRoadmap} />
        </Animated.View>
      </View>

      <Popup visible={dailyOpen} title="Daily Reward" onClose={() => setDailyOpen(false)}>
        <Text style={styles.dailyLine}>Come back every day: the reward grows to day 7.</Text>
        <View style={styles.days}>
          {[1, 2, 3, 4, 5, 6, 7].map((d) => {
            const got = daily.canClaim ? d < daily.day : d <= (s.streak ?? 0);
            const now = daily.canClaim && d === daily.day;
            return (
              <View key={d} style={[styles.day, got ? styles.dayGot : null, now ? styles.dayNow : null]}>
                <Text style={styles.dayN}>Day {d}</Text>
                <Image source={d === 7 ? art.icon_token : art.icon_coin} style={{ width: 26, height: 26 }} resizeMode="contain" />
                <Text style={styles.dayPay}>{d === 7 ? `${dailyPay(d).coins}+3` : dailyPay(d).coins}</Text>
              </View>
            );
          })}
        </View>
        {daily.canClaim ? (
          <GameButton label={`Claim ${dailyPay(daily.day).coins} coins`} size="lg" sound="coin" onPress={() => { void claim(); setDailyOpen(false); }} />
        ) : (
          <Text style={styles.dailyLine}>Claimed today — come back tomorrow for day {((s.streak ?? 0) % 7) + 1}.</Text>
        )}
        <GameButton style={{ marginTop: 10 }} size="sm" variant="light" label="Close" onPress={() => setDailyOpen(false)} />
      </Popup>
    </View>
  );
}

/** Floodlight embers drifting up behind the hero — the arena never sits still (a few plain views, one clock). */
function Embers({ w, h }: { w: number; h: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 6000, easing: Easing.linear }), -1, false);
  }, [t]);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}>
      {Array.from({ length: 9 }, (_, i) => <Ember key={i} t={t} i={i} w={w} h={h} />)}
    </View>
  );
}
function Ember({ t, i, w, h }: { t: SharedValue<number>; i: number; w: number; h: number }) {
  const x0 = ((i * 37) % 100) / 100 * w, phase = (i * 0.137) % 1, size = 3 + (i % 3) * 2;
  const st = useAnimatedStyle(() => {
    const p = (t.value + phase) % 1;
    return {
      opacity: p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85,
      transform: [{ translateX: x0 + Math.sin(p * 6.28 + i) * 14 }, { translateY: h - p * h * 0.95 }],
    };
  });
  return <Animated.View style={[styles.ember, { width: size, height: size, borderRadius: size }, st]} />;
}

/** Labelled feature chip (second row on Home): glyph + a 1-2 line label, gold rim, squash on touch-down. */
function Chip({ icon, label, colors, onPress, badge = 0 }: { icon: string; label: string; colors: [string, string]; onPress: () => void; badge?: number }) {
  return (
    <Tappable onPress={onPress} containerStyle={styles.chipCell} scaleTo={0.88} accessibilityLabel={label}>
      <LinearGradient colors={colors} style={styles.chip}>
        <View style={styles.chipShine} pointerEvents="none" />
        <Text style={styles.chipIcon}>{icon}</Text>
        <Text style={styles.chipLabel} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>{label}</Text>
      </LinearGradient>
      {badge > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View> : null}
    </Tappable>
  );
}

/** Gold-rimmed gem icon button with a label (Tappable: squash + dim on touch-down). */
function RoundButton({ gem, icon, label, onPress }: { gem: ArtId; icon: string; label: string; onPress: () => void }) {
  return (
    <Tappable onPress={onPress} hitSlop={8} scaleTo={0.86} style={styles.round} accessibilityLabel={label}>
      <View style={styles.roundFace}>
        <Image source={art[gem]} style={styles.roundImg} resizeMode="contain" />
        <Text style={styles.roundIcon}>{icon}</Text>
      </View>
      <Text style={styles.roundLabel} numberOfLines={1}>{label}</Text>
    </Tappable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hud: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14 },
  hudLeft: { flexDirection: "row", gap: 8 },
  gift: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, height: 38, borderRadius: 19, backgroundColor: "rgba(8,10,40,0.7)", borderWidth: 1.5, borderColor: "rgba(255,201,60,0.55)" },
  giftOn: { backgroundColor: "#C0262E", borderColor: "#FFE27A" },
  giftGlyph: { fontSize: 18 },
  giftText: { fontFamily: fonts.display, fontSize: 14, color: "#fff" },
  logoWrap: { alignItems: "center", marginTop: 4 },
  sub: { fontFamily: fonts.display, fontSize: 22, color: "#FFF4DC", textAlign: "center", marginTop: -14, letterSpacing: 3, textShadowColor: "#2A0E00", textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 1 },
  heroArea: { flex: 1, alignItems: "center", justifyContent: "flex-end", overflow: "visible" },
  glowRing: { position: "absolute", borderRadius: 999, borderWidth: 3, borderColor: "rgba(255,180,0,0.85)", backgroundColor: "rgba(255,140,0,0.18)" },
  defL: { position: "absolute", left: "3%", bottom: 26, opacity: 0.9 },
  defR: { position: "absolute", right: "2%", bottom: 18, opacity: 0.95 },
  bottom: { paddingHorizontal: 18, width: "100%", maxWidth: 620, alignSelf: "center" },
  chapterCard: { alignSelf: "stretch", gap: 4, backgroundColor: "rgba(8,10,40,0.6)", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: "rgba(255,201,60,0.35)" },
  chapterRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  chapterLabel: { fontFamily: fonts.display, fontSize: 16, color: palette.gold },
  chapterCount: { fontFamily: fonts.display, fontSize: 14, color: palette.star },
  progressTrack: { width: "100%", height: 12, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.5)", overflow: "hidden", borderWidth: 1, borderColor: "rgba(120,160,255,0.5)" },
  progressFill: { height: "100%", borderRadius: 999 },
  chapterSub: { fontFamily: fonts.bodyRegular, fontSize: 12, color: palette.ink },
  playWrap: { alignSelf: "stretch" },
  iconRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 2 },
  round: { alignItems: "center", gap: 2, minWidth: 58 },
  roundFace: { width: 58, height: 58, alignItems: "center", justifyContent: "center" },
  roundImg: { position: "absolute", width: 58, height: 60 },
  roundIcon: { fontSize: 24 },
  roundLabel: { fontFamily: fonts.display, fontSize: 13, color: "#fff", textShadowColor: "#000", textShadowRadius: 3 },
  chipRow: { flexDirection: "row", gap: 6 },
  chipCell: { flex: 1 },
  chip: { height: 54, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 2, borderWidth: 1.5, borderColor: "#FFD65A", overflow: "hidden" },
  chipShine: { position: "absolute", top: 2, left: 6, right: 6, height: "40%", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)" },
  chipIcon: { fontSize: 17, lineHeight: 21 },
  chipLabel: { fontFamily: fonts.display, fontSize: 11.5, lineHeight: 13, color: "#fff", textAlign: "center", textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: 2 },
  badge: { position: "absolute", top: -6, right: -2, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 4, backgroundColor: palette.danger, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#fff" },
  badgeText: { fontFamily: fonts.display, fontSize: 11, color: "#fff" },
  ember: { position: "absolute", left: 0, top: 0, backgroundColor: "#FFC94A" },
  dailyLine: { fontFamily: fonts.bodyRegular, fontSize: 14, color: palette.ink, textAlign: "center", marginBottom: 10 },
  days: { flexDirection: "row", flexWrap: "nowrap", gap: 4, marginBottom: 14 },
  day: { flex: 1, alignItems: "center", paddingVertical: 6, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.35)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  dayGot: { backgroundColor: "rgba(61,220,132,0.25)", borderColor: palette.success },
  dayNow: { borderColor: palette.gold, borderWidth: 2, backgroundColor: "rgba(255,180,0,0.2)" },
  dayN: { fontFamily: fonts.body, fontSize: 9, color: palette.ink },
  dayPay: { fontFamily: fonts.display, fontSize: 11, color: palette.gold },
});
