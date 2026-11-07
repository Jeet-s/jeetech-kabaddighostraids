import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { Burst, GameButton, Pop, Tappable, feedback, fonts, palette, springs, useShake } from "../ui";
import { art } from "../art";
import { store } from "../modules/store";
import { analytics } from "../modules/analytics";
import { CHANTS, buyChant, canAffordChant, equipChant, equippedChant, ownsChant, playChant, type Chant } from "../game/kit";

/**
 * Chant Studio (a tab of the Kit Album, also opened straight from Home): 8 fixed crowd chants. Preview any of them,
 * buy with coins or Chant Tokens, two come from the free Season Pass. The equipped chant plays when you sign a player
 * at the Auction Hall and when you claim a Season Pass tier.
 */
export function ChantStudio() {
  const [, setS] = useState(store.get());
  useEffect(() => store.subscribe(setS), []);
  const [msg, setMsg] = useState<{ text: string; ok: boolean; n: number } | null>(null);
  const on = equippedChant();
  const owned = CHANTS.filter((c) => ownsChant(c.id)).length;
  return (
    <View>
      <LinearGradient colors={on.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.now}>
        <Text style={styles.nowLabel}>EQUIPPED CHANT · {owned}/{CHANTS.length} OWNED</Text>
        <Text style={styles.nowName}>🎵 {on.name}</Text>
        <Text style={styles.nowLine}>Plays when you sign a player at the Auction Hall and when you claim a Season Pass tier.</Text>
      </LinearGradient>
      <View style={styles.msgSlot}>
        {msg ? <Pop key={msg.n}><Text style={[styles.msg, { color: msg.ok ? palette.success : "#FF9A9E" }]}>{msg.text}</Text></Pop> : <Text style={styles.hint}>Tap ▶ to hear a chant. Tap a chant you own to equip it.</Text>}
      </View>
      {CHANTS.map((c) => <ChantRow key={c.id} c={c} on={on.id === c.id} onMsg={(text, ok) => setMsg({ text, ok, n: Date.now() })} />)}
    </View>
  );
}

function ChantRow({ c, on, onMsg }: { c: Chant; on: boolean; onMsg: (text: string, ok: boolean) => void }) {
  const have = ownsChant(c.id);
  const [fx, setFx] = useState(0);
  const { style: shakeStyle, shake } = useShake(6);
  const pop = useSharedValue(0);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pop.value * 0.05 }] }));
  const bump = () => { setFx((n) => n + 1); pop.value = withSequence(withTiming(1, { duration: 90 }), withSpring(0, springs.pop)); };
  const tap = () => {
    if (on) { playChant(c); onMsg(`${c.name} is equipped.`, true); return; }
    if (have) {
      equipChant(c);
      playChant(c);
      bump();
      analytics.track("chant_equipped", { chant: c.id });
      onMsg(`Equipped: ${c.name}`, true);
      return;
    }
    if (c.passTier) { shake(); feedback("error", "light"); onMsg(`${c.name} is a free Season Pass reward (tier ${c.passTier}).`, false); return; }
    if (!canAffordChant(c)) {
      shake();
      feedback("error", "warning");
      onMsg(c.tokens ? `Needs ${c.tokens} Chant Tokens — earn them with 3-star trials, cups and the daily reward.` : `Needs ${c.coins} coins — win trials and matches to earn more.`, false);
      return;
    }
    if (buyChant(c)) {
      feedback("unlock", "success");
      setTimeout(() => playChant(c), 250);
      bump();
      analytics.track("album_item_unlocked", { item: c.id });
      analytics.track("chant_equipped", { chant: c.id });
      onMsg(`Unlocked and equipped: ${c.name}`, true);
    }
  };
  const preview = () => { playChant(c); analytics.track("chant_preview", { chant: c.id }); };
  return (
    <Animated.View style={shakeStyle}>
      <Animated.View style={[styles.row, on ? styles.rowOn : null, popStyle]}>
        <Tappable onPress={preview} scaleTo={0.85} sound={null} style={styles.play} accessibilityLabel={`Preview ${c.name}`}>
          <LinearGradient colors={c.colors} style={styles.playFace}><Text style={styles.playGlyph}>▶</Text></LinearGradient>
        </Tappable>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{c.name}</Text>
          <Text style={styles.line}>{c.line}</Text>
        </View>
        {on ? (
          <View style={styles.badgeOn}><Text style={styles.badgeOnText}>Equipped ✓</Text></View>
        ) : have ? (
          <GameButton size="sm" variant="secondary" label="Equip" onPress={tap} style={styles.btn} />
        ) : c.passTier ? (
          <Tappable onPress={tap} scaleTo={0.9} style={styles.passTag} accessibilityLabel={`${c.name}: Season Pass tier ${c.passTier}`}>
            <Text style={styles.passText}>Pass tier {c.passTier}</Text>
          </Tappable>
        ) : (
          <GameButton size="sm" variant={canAffordChant(c) ? "primary" : "light"} style={styles.btn} label={`${c.tokens ?? c.coins}`}
            icon={<Image source={c.tokens ? art.icon_token : art.icon_coin} style={{ width: 20, height: 20 }} resizeMode="contain" />} onPress={tap} />
        )}
        {fx ? <Burst key={fx} x={40} y={30} color={c.colors[0]} count={8} size={70} /> : null}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  now: { borderRadius: 16, padding: 12, borderWidth: 2, borderColor: "#FFE9A8", gap: 2 },
  nowLabel: { fontFamily: fonts.body, fontSize: 10, letterSpacing: 1.2, color: "rgba(255,255,255,0.85)" },
  nowName: { fontFamily: fonts.display, fontSize: 20, color: "#fff", textShadowColor: "rgba(0,0,0,0.45)", textShadowRadius: 3 },
  nowLine: { fontFamily: fonts.bodyRegular, fontSize: 12, color: "#fff" },
  msgSlot: { minHeight: 40, justifyContent: "center", marginVertical: 2 },
  msg: { fontFamily: fonts.body, fontSize: 13, textAlign: "center" },
  hint: { fontFamily: fonts.bodyRegular, fontSize: 13, color: palette.inkSoft, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 10, padding: 8, marginBottom: 8, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.3)", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.12)" },
  rowOn: { borderColor: palette.gold, backgroundColor: "rgba(255,180,0,0.16)" },
  play: { width: 42, height: 42 },
  playFace: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#FFE9A8" },
  playGlyph: { fontFamily: fonts.display, fontSize: 16, color: "#fff", marginLeft: 3 },
  name: { fontFamily: fonts.display, fontSize: 15, color: "#fff" },
  line: { fontFamily: fonts.bodyRegular, fontSize: 11.5, color: palette.inkSoft },
  btn: { minWidth: 84 },
  badgeOn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: "rgba(61,220,132,0.22)", borderWidth: 1.5, borderColor: palette.success },
  badgeOnText: { fontFamily: fonts.display, fontSize: 13, color: palette.success },
  passTag: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: "rgba(199,146,255,0.2)", borderWidth: 1.5, borderColor: "#C792FF" },
  passText: { fontFamily: fonts.display, fontSize: 12, color: "#E3CCFF" },
});
