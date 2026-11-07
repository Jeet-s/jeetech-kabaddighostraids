import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { Burst, GameButton, Pop, Popup, Tappable, feedback, fonts, palette, springs, useShake } from "../ui";
import { art } from "../art";
import { store } from "../modules/store";
import { analytics } from "../modules/analytics";
import { KIT, KIT_SETS, buy, canAfford, equip, equipped, owns, type KitItem, type KitSlot } from "../game/kit";
import { ChantStudio } from "./ChantStudio";

export type AlbumTab = "kit" | "chants";

/**
 * Kit Album: three collection sets (crest shields, raid trails, raid banners), 4 fixed items each, bought with
 * coins or Chant Tokens and equipped at once — every item shows up in your next match. A full set pays a bonus.
 */
export function KitAlbumScreen({ visible, onClose, tab: startTab = "kit" }: { visible: boolean; onClose: () => void; tab?: AlbumTab }) {
  const [s, setS] = useState(store.get());
  useEffect(() => store.subscribe(setS), []);
  const [bonus, setBonus] = useState<{ text: string; n: number } | null>(null);
  const [tab, setTab] = useState<AlbumTab>(startTab);
  useEffect(() => { if (!visible) setBonus(null); else setTab(startTab); }, [visible, startTab]);
  const owned = KIT.filter((k) => owns(k.id)).length;
  return (
    <Popup visible={visible} title={tab === "kit" ? "Kit Album" : "Chant Studio"} onClose={onClose}>
      <View style={styles.tabs}>
        {([["kit", "📒 Kit"], ["chants", "🎵 Chant Studio"]] as [AlbumTab, string][]).map(([t, label]) => (
          <Tappable key={t} containerStyle={styles.tabCell} onPress={() => setTab(t)} style={[styles.tab, tab === t ? styles.tabOn : null]} accessibilityLabel={label}>
            <Text style={[styles.tabText, tab === t ? styles.tabTextOn : null]} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
          </Tappable>
        ))}
      </View>
      <View style={styles.balances}>
        <View style={styles.bal}><Image source={art.icon_coin} style={styles.balImg} resizeMode="contain" /><Text style={styles.balText}>{s.coins.toLocaleString()}</Text></View>
        <View style={styles.bal}><Image source={art.icon_token} style={styles.balImg} resizeMode="contain" /><Text style={styles.balText}>{s.tokens ?? 0}</Text></View>
        {tab === "kit" ? <View style={styles.bal}><Text style={styles.count}>📒 {owned}/{KIT.length}</Text></View> : null}
      </View>
      {tab === "chants" ? <ChantStudio /> : <>
      <View style={styles.bonusSlot}>
        {bonus ? <Pop key={bonus.n}><Text style={styles.bonus}>{bonus.text}</Text></Pop> : <Text style={styles.hint}>Tap an item to buy or wear it. Fill a set for a bonus.</Text>}
      </View>
      {KIT_SETS.map((set) => {
        const items = KIT.filter((k) => k.slot === set.slot);
        const have = items.filter((k) => owns(k.id)).length;
        const done = (s.kitSets ?? []).includes(set.slot);
        return (
          <View key={set.slot} style={styles.set}>
            <View style={styles.setHead}>
              <Text style={styles.setName}>{set.name}</Text>
              <Text style={[styles.setCount, done ? { color: palette.success } : null]}>{done ? "✓ Complete" : `${have}/4 · bonus ${set.bonus.coins}`}</Text>
            </View>
            <Text style={styles.setWhat}>{set.what}</Text>
            <View style={styles.row}>
              {items.map((it) => (
                <ItemCard key={it.id} it={it} on={equipped(set.slot).id === it.id} have={owns(it.id)}
                  onBonus={(b) => setBonus({ text: `${set.name} complete! +${b.coins} coins +${b.tokens} tokens`, n: Date.now() })} />
              ))}
            </View>
          </View>
        );
      })}
      </>}
      <GameButton style={{ marginTop: 6 }} label="Done" onPress={onClose} />
    </Popup>
  );
}

function ItemCard({ it, on, have, onBonus }: { it: KitItem; on: boolean; have: boolean; onBonus: (b: { coins: number; tokens: number }) => void }) {
  const [fx, setFx] = useState(0);
  const { style: shakeStyle, shake } = useShake(6);
  const pop = useSharedValue(0);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pop.value * 0.12 }] }));
  const tap = () => {
    if (on) { feedback("pop", "light"); return; }
    if (have) {
      equip(it);
      feedback("move", "medium");
      analytics.track("kit_equipped", { item: it.id });
    } else if (canAfford(it)) {
      const b = buy(it);
      feedback("unlock", "success");
      analytics.track("album_item_unlocked", { item: it.id });
      if (b) { onBonus(b); setTimeout(() => feedback("coin", "success"), 300); }
    } else {
      shake();
      feedback("error", "warning");
      return;
    }
    setFx((n) => n + 1);
    pop.value = withSequence(withTiming(1, { duration: 90 }), withSpring(0, springs.pop));
  };
  const afford = have || canAfford(it);
  return (
    <Tappable containerStyle={styles.cell} onPress={tap} scaleTo={0.9} sound={null} hapticKind={null} accessibilityLabel={`${it.name} ${it.slot}`}>
      <Animated.View style={shakeStyle}>
        <Animated.View style={[styles.card, on ? styles.cardOn : null, popStyle]}>
          <Preview slot={it.slot} colors={it.colors} dim={!have} />
          <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit>{it.name}</Text>
          {on ? (
            <Text style={styles.on}>✓ Worn</Text>
          ) : have ? (
            <Text style={styles.wear}>Wear</Text>
          ) : (
            <View style={[styles.cost, !afford ? { opacity: 0.55 } : null]}>
              <Image source={it.tokens ? art.icon_token : art.icon_coin} style={styles.costImg} />
              <Text style={styles.costText}>{it.tokens ?? it.coins}</Text>
            </View>
          )}
          {fx ? <Burst key={fx} x={34} y={30} color={it.colors[0]} count={8} size={64} /> : null}
        </Animated.View>
      </Animated.View>
    </Tappable>
  );
}

/** What the item looks like in a match: a crest shield, a dashed raid trail, or a banner slash. */
function Preview({ slot, colors, dim }: { slot: KitSlot; colors: [string, string]; dim: boolean }) {
  const o = dim ? 0.7 : 1;
  if (slot === "crest") {
    return (
      <LinearGradient colors={colors} style={[styles.shield, { opacity: o }]}>
        <Text style={styles.shieldNum}>7</Text>
      </LinearGradient>
    );
  }
  if (slot === "trail") {
    return (
      <View style={[styles.trailBox, { opacity: o }]}>
        {[0, 1, 2, 3].map((i) => <View key={i} style={[styles.dash, { backgroundColor: i % 2 ? colors[1] : colors[0], transform: [{ translateY: -i * 5 }, { rotate: "-22deg" }] }]} />)}
        <View style={[styles.node, { backgroundColor: colors[0] }]} />
      </View>
    );
  }
  return (
    <View style={[styles.bannerBox, { opacity: o }]}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
        <Text style={styles.bannerText}>RAID!</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: 6, marginBottom: 10 },
  tabCell: { flex: 1 },
  tab: { minHeight: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 6, backgroundColor: "rgba(0,0,0,0.35)", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.15)" },
  tabOn: { backgroundColor: "#FFA800", borderColor: "#FFE27A" },
  tabText: { fontFamily: fonts.display, fontSize: 15, color: palette.ink },
  tabTextOn: { color: "#4A2600" },
  balances: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 4 },
  bal: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.35)", borderRadius: 17, paddingLeft: 3, paddingRight: 10, minHeight: 32, borderWidth: 1, borderColor: "rgba(255,201,60,0.35)" },
  balImg: { width: 28, height: 28 },
  balText: { fontFamily: fonts.display, fontSize: 16, color: palette.gold },
  count: { fontFamily: fonts.display, fontSize: 14, color: "#fff", paddingLeft: 10 },
  bonusSlot: { minHeight: 36, justifyContent: "center", marginBottom: 2 },
  bonus: { fontFamily: fonts.display, fontSize: 15, color: palette.success, textAlign: "center" },
  hint: { fontFamily: fonts.bodyRegular, fontSize: 13, color: palette.inkSoft, textAlign: "center" },
  set: { backgroundColor: "rgba(0,0,0,0.28)", borderRadius: 16, padding: 8, marginBottom: 10, borderWidth: 1, borderColor: "rgba(255,201,60,0.25)" },
  setHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  setName: { fontFamily: fonts.display, fontSize: 16, color: palette.gold },
  setCount: { fontFamily: fonts.body, fontSize: 12, color: palette.ink },
  setWhat: { fontFamily: fonts.bodyRegular, fontSize: 11, color: palette.inkSoft, marginBottom: 6 },
  row: { flexDirection: "row", gap: 6 },
  cell: { flex: 1 },
  card: { alignItems: "center", paddingVertical: 6, borderRadius: 12, backgroundColor: "rgba(20,24,80,0.9)", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.14)", minHeight: 98 },
  cardOn: { borderColor: palette.gold, backgroundColor: "rgba(255,180,0,0.18)" },
  name: { fontFamily: fonts.display, fontSize: 12, color: "#fff", marginTop: 4, paddingHorizontal: 2 },
  on: { fontFamily: fonts.display, fontSize: 11, color: palette.gold, marginTop: 2 },
  wear: { fontFamily: fonts.display, fontSize: 11, color: palette.accent, marginTop: 2 },
  cost: { flexDirection: "row", alignItems: "center", marginTop: 1 },
  costImg: { width: 20, height: 20 },
  costText: { fontFamily: fonts.display, fontSize: 12, color: palette.gold },
  shield: { width: 36, height: 42, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, borderWidth: 2.5, borderColor: "#FFC93C", alignItems: "center", justifyContent: "center" },
  shieldNum: { fontFamily: fonts.display, fontSize: 18, color: "#FFE9A8" },
  trailBox: { width: 52, height: 42, alignItems: "flex-start", justifyContent: "center", flexDirection: "row", paddingTop: 18, gap: 2 },
  dash: { width: 10, height: 5, borderRadius: 3 },
  node: { width: 10, height: 10, borderRadius: 5, marginTop: -18, borderWidth: 1.5, borderColor: "#fff" },
  bannerBox: { width: 60, height: 42, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  banner: { width: 66, paddingVertical: 5, alignItems: "center", transform: [{ rotate: "-8deg" }], borderTopWidth: 1.5, borderBottomWidth: 1.5, borderColor: "#FFE9A8" },
  bannerText: { fontFamily: fonts.display, fontSize: 13, color: "#fff", textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: 2 },
});
