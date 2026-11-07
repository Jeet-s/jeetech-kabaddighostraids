import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useShake } from "../fx/useShake";
import { Popup } from "./Popup";
import { Stars } from "./Stars";
import { GameButton } from "./GameButton";
import { AnimatedNumber } from "./AnimatedNumber";
import { Confetti } from "../fx/Confetti";
import { fonts, palette, springs } from "./theme";
import { play, haptic } from "../audio/sfx";
import { art } from "../art";
import { share } from "../modules/share";
import { qa } from "../modules/qa";

const REVEAL_MS = 2150; // after the third star lands (stars at 0.45 / 1.0 / 1.55 s)

/**
 * Level complete — a staged celebration, never a static card (QA game_feel 2026-10-21..28: "the win card is static,
 * no confetti, star pop or coin count-up", "+0 Lamps then jumps to +50"):
 *   0 ms confetti burst behind the card (inside the modal — outside it the dim hides it) → stars pop in with chimes →
 *   a second burst → the reward row springs in and COUNTS UP from 0 with a coin sound → "Next Level" keeps breathing.
 * The reward row keeps its height from the first frame (nothing jumps) and shows no number until it counts.
 * A small "Share" button (native share sheet + Play link, src/modules/share.ts) sits next to Replay/Map — pass
 * showShare={false} to hide it; it is always hidden in QA level replay.
 */
export function WinPopup({ visible, stars, coins, onNext, onReplay, onMap, title = "Level Complete!", showShare = true, nextLabel = "Next Level", children, footer }: {
  visible: boolean; stars: number; coins: number; onNext: () => void; onReplay?: () => void; onMap?: () => void; title?: string; showShare?: boolean;
  nextLabel?: string; children?: React.ReactNode;
  /** drawn under the buttons (e.g. a preview of what comes next) */
  footer?: React.ReactNode;
}) {
  const [burst, setBurst] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [shower, setShower] = useState(0);
  const row = useSharedValue(0);
  const breathe = useSharedValue(0);
  const punch = useSharedValue(0);
  const { style: shakeStyle, shake } = useShake(5);
  useEffect(() => {
    if (!visible) return;
    setReveal(false);
    row.value = 0;
    breathe.value = 0;
    play("success");
    haptic("success");
    const ids: ReturnType<typeof setTimeout>[] = [];
    ids.push(setTimeout(() => setBurst((b) => b + 1), 120));
    // every star that lands punches the card and shakes it (Stars plays the chime + sparkle at the same beat)
    for (let i = 0; i < Math.min(3, stars); i++) {
      ids.push(setTimeout(() => {
        punch.value = withSequence(withTiming(1, { duration: 60 }), withSpring(0, springs.pop));
        if (qa.level == null) shake();
        if (i === stars - 1) setBurst((n) => n + 1);
      }, 450 + i * 550 + 120));
    }
    ids.push(setTimeout(() => {
      setReveal(true);
      setShower((n) => n + 1);
      row.value = withSpring(1, springs.pop);
      breathe.value = withDelay(700, withRepeat(withSequence(withTiming(1, { duration: 650, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 650, easing: Easing.inOut(Easing.sin) })), 10));
      play("coin");
      haptic("medium");
    }, REVEAL_MS));
    // the celebration keeps moving for ~5 s (QA game_feel 2026-11-07: five win frames 1 s apart looked identical —
    // a static card): two more confetti waves and a second coin shower after the count-up
    ids.push(setTimeout(() => setBurst((b) => b + 1), REVEAL_MS + 1300));
    ids.push(setTimeout(() => { setShower((n) => n + 1); }, REVEAL_MS + 2100));
    ids.push(setTimeout(() => setBurst((b) => b + 1), REVEAL_MS + 2900));
    return () => ids.forEach(clearTimeout);
  }, [visible, coins, stars, row, breathe, punch]); // eslint-disable-line react-hooks/exhaustive-deps
  const rowStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, row.value * 1.4), transform: [{ scale: 0.6 + 0.4 * row.value }] }));
  // Next glows instead of breathing (QA render_defects 2026-11-07: the scale-breath read as the button's width
  // jittering between frames) — a gold halo pulses BEHIND it; the button itself never changes size
  const nextGlow = useAnimatedStyle(() => ({ opacity: 0.15 + 0.6 * breathe.value }));
  const punchStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + punch.value * 0.08 }] }));
  return (
    <Popup visible={visible} title={title} underlay={<><Backdrop /><Rays visible={visible} /><Confetti trigger={burst} count={60} /></>}>
      <Animated.View style={[punchStyle, shakeStyle]}>
        <Stars count={stars} animate={visible} size={52} />
      </Animated.View>
      <View style={styles.rewardSlot}>
        {shower ? <CoinShower key={shower} /> : null}
        {/* the pill hugs its content (centred, padded, nothing clipped): the coin sits in its own fixed slot */}
        <Animated.View style={[styles.reward, rowStyle]}>
          <View style={styles.coinSlot}>
            <Image source={art.icon_coin} style={styles.coinImg} resizeMode="contain" />
          </View>
          {reveal ? <Text style={styles.plus}>+</Text> : null}
          {reveal ? <AnimatedNumber from={0} value={coins} duration={1500} style={styles.coinText} /> : null}
        </Animated.View>
      </View>
      {children}
      <View>
        <Animated.View pointerEvents="none" style={[styles.nextHalo, nextGlow]} />
        <GameButton label={nextLabel} variant="primary" size="lg" onPress={onNext} />
      </View>
      <View style={styles.row}>
        {onReplay ? <GameButton style={{ flex: 1 }} size="sm" variant="light" label="↻ Replay" onPress={onReplay} /> : null}
        {onMap ? <GameButton style={{ flex: 1 }} size="sm" variant="light" label="Map" onPress={onMap} /> : null}
        {showShare && qa.level == null ? <GameButton style={{ flex: 1 }} size="sm" variant="light" label="📤 Share" onPress={() => void share.app("win")} /> : null}
      </View>
      {footer}
    </Popup>
  );
}

/** Gold light rays behind the win card: they flare in, then keep turning slowly for ~30 s (finite — no endless anim),
 *  so the result scene is never a frozen picture (QA game_feel 2026-11-07: "the five win frames are identical"). */
function Rays({ visible }: { visible: boolean }) {
  const { width, height } = useWindowDimensions();
  const t = useSharedValue(0);
  useEffect(() => {
    if (!visible) return;
    t.value = 0;
    t.value = withTiming(1, { duration: 30000, easing: Easing.linear });
  }, [visible, t]);
  const size = Math.min(width * 1.5, 640);
  const st = useAnimatedStyle(() => ({ opacity: 0.75 * Math.min(1, t.value * 40), transform: [{ rotate: `${t.value * 360}deg` }, { scale: 0.6 + 0.4 * Math.min(1, t.value * 15) }] }));
  return (
    <Animated.Image source={art.fx_impact_burst} resizeMode="contain"
      style={[{ position: "absolute", width: size, height: size, left: width / 2 - size / 2, top: height * 0.36 - size / 2 }, st]} />
  );
}

/**
 * An OPAQUE stadium backdrop behind result cards (QA render_defects 2026-11-07: through the 82 % dim the game HUD
 * ghosted behind the win card — "Points 0/1 · Caught 0/2", "Last raid +1 : +0", a cut-off team name). The result
 * card now sits on its own clean scene, never on a faint copy of the screen underneath.
 */
function Backdrop() {
  const { width, height } = useWindowDimensions();
  const sc = Math.max(width / 1080, height / 1920), iw = Math.ceil(1080 * sc), ih = Math.ceil(1920 * sc);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "#0B0D2B", overflow: "hidden" }]}>
      <Image source={art.bg_night_stadium_far} resizeMode="cover" style={{ position: "absolute", width: iw, height: ih, left: (width - iw) / 2, top: (height - ih) / 2, opacity: 0.55 }} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(11,13,43,0.45)" }]} />
    </View>
  );
}

/** Coins rain into the reward pill as it counts up (each lands, then fades — the count is the real reward). */
function CoinShower() {
  const coins = [-70, -40, -12, 18, 46, 74, -55, 30];
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {coins.map((dx, i) => <ShowerCoin key={i} dx={dx} delay={i * 55} />)}
    </View>
  );
}
function ShowerCoin({ dx, delay }: { dx: number; delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: 560, easing: Easing.in(Easing.quad) }));
  }, [t, delay]);
  const st = useAnimatedStyle(() => ({
    opacity: t.value <= 0 ? 0 : t.value < 0.85 ? 1 : (1 - t.value) / 0.15,
    transform: [{ translateX: dx * (1 - t.value) }, { translateY: -90 + 100 * t.value }, { rotate: `${(1 - t.value) * 180}deg` }],
  }));
  return <Animated.Image source={art.icon_coin} resizeMode="contain" style={[styles.showerCoin, st]} />;
}

/** Level failed: encouraging copy, retry first, optional continue via rewarded ad. */
export function FailPopup({ visible, message = "So close! Try again?", onRetry, onContinue, onMap, title = "Out of moves", continueLabel = "▶ Continue (watch ad)", mapLabel = "Back to map", children }: {
  visible: boolean; message?: string; onRetry: () => void; onContinue?: () => void; onMap?: () => void; title?: string; continueLabel?: string; mapLabel?: string;
  children?: React.ReactNode;
}) {
  useEffect(() => {
    if (visible) { play("fail"); haptic("warning"); }
  }, [visible]);
  return (
    <Popup visible={visible} title={title} underlay={<Backdrop />}>
      <Text style={styles.msg}>{message}</Text>
      {children}
      <GameButton label="Try Again" variant="primary" size="lg" onPress={onRetry} />
      {onContinue ? <GameButton style={{ marginTop: 12 }} label={continueLabel} variant="secondary" onPress={onContinue} /> : null}
      {onMap ? <GameButton style={{ marginTop: 12 }} size="sm" variant="light" label={mapLabel} onPress={onMap} /> : null}
    </Popup>
  );
}

const styles = StyleSheet.create({
  rewardSlot: { height: 58, marginVertical: 16, alignItems: "center" },
  showerCoin: { position: "absolute", left: "50%", top: 12, width: 30, height: 30, marginLeft: -15 },
  reward: {
    height: 58, minWidth: 170, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingLeft: 10, paddingRight: 22,
    backgroundColor: "rgba(4,6,28,0.75)", borderRadius: 29, borderWidth: 1, borderColor: "rgba(255,201,60,0.35)",
  },
  coinSlot: { width: 48, height: 48, alignItems: "center", justifyContent: "center", marginRight: 6 },
  coinImg: { width: 44, height: 44 },
  plus: { fontFamily: fonts.display, fontSize: 26, color: palette.gold },
  coinText: { fontFamily: fonts.display, fontSize: 30, color: palette.gold },
  row: { flexDirection: "row", gap: 12, marginTop: 12 },
  nextHalo: { position: "absolute", left: -6, right: -6, top: -6, bottom: -2, borderRadius: 26, backgroundColor: "#FFC93C" },
  msg: { fontFamily: fonts.body, fontSize: 18, color: palette.inkSoft, textAlign: "center", marginBottom: 18 },
});
