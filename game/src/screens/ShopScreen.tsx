import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { GameButton, Pop, Popup, feedback, fonts, palette } from "../ui";
import { art, type ArtId } from "../art";
import { iap, type ShopItem } from "../modules/iap";
import { ads } from "../modules/ads";
import { store } from "../modules/store";
import { analytics } from "../modules/analytics";
import { STORE_UNREACHABLE, restorePurchases } from "../game/purchases";
import { GOLD_PRICE, passGold } from "../game/meta";

const ICON: Record<string, ArtId> = { remove_ads: "gem_crimson", coins_small: "icon_coin", coins_large: "icon_coin" };
const HINT_PACK = { n: 5, coins: 150 };
/**
 * Shop: Remove Ads (always listed; the price is the store's own, shown only when the store returned it), coin packs
 * the store returned, Coach hints for coins, free coins via an opt-in ad, and Restore purchases. Every tap gives a
 * visible result, also when the store can't be reached.
 */
export function ShopScreen({ visible, onClose, onPass }: { visible: boolean; onClose: () => void; onPass: () => void }) {
  const [state, setState] = useState(store.get());
  const [items, setItems] = useState<ShopItem[]>(iap.items());
  const [msg, setMsg] = useState<{ text: string; ok: boolean; n: number } | null>(null);
  useEffect(() => store.subscribe(setState), []);
  useEffect(() => {
    if (!visible) { setMsg(null); return; }
    setItems(iap.items());
    analytics.track("iap_view");
  }, [visible]);
  const say = (text: string, ok: boolean) => setMsg({ text, ok, n: Date.now() });
  const removeAds = items.find((i) => i.sku === "remove_ads");
  // Coin packs: only products the store actually returned (with real prices).
  const packs = items.filter((i) => i.sku !== "remove_ads");

  const buyRemoveAds = async () => {
    const live = iap.items().find((i) => i.sku === "remove_ads");
    if (!live) { feedback("error", "warning"); say(STORE_UNREACHABLE, false); return; }
    analytics.track("remove_ads_purchase", { step: "tap" });
    say("Opening the store…", true);
    try {
      await iap.purchase("remove_ads");
    } catch {
      feedback("error", "warning");
      say("The purchase didn't go through — nothing was charged. Try again.", false);
    }
  };
  const buyPack = async (sku: string) => {
    say("Opening the store…", true);
    try { await iap.purchase(sku); } catch { feedback("error", "warning"); say("The purchase didn't go through — nothing was charged. Try again.", false); }
  };
  const restore = async () => {
    say("Checking your purchases…", true);
    const r = await restorePurchases();
    const ok = r !== STORE_UNREACHABLE;
    feedback(ok ? "success" : "error", ok ? "success" : "warning");
    say(r, ok);
  };
  const buyHints = () => {
    if (store.get().coins < HINT_PACK.coins) { feedback("error", "warning"); say(`You need ${HINT_PACK.coins} coins — win trials and matches to earn more.`, false); return; }
    store.set({ coins: store.get().coins - HINT_PACK.coins, hints: (store.get().hints ?? 0) + HINT_PACK.n });
    feedback("coin", "success");
    say(`+${HINT_PACK.n} Coach hints`, true);
    analytics.track("hint_pack_bought");
  };
  return (
    <Popup visible={visible} title="Shop" onClose={onClose}>
      <View style={styles.balances}>
        <View style={styles.bal}><Image source={art.icon_coin} style={styles.balImg} resizeMode="contain" /><Text style={styles.balText}>{state.coins.toLocaleString()}</Text></View>
        <View style={styles.bal}><Image source={art.icon_token} style={styles.balImg} resizeMode="contain" /><Text style={styles.balText}>{state.tokens ?? 0}</Text></View>
        <View style={styles.bal}><Text style={styles.bulb}>💡</Text><Text style={styles.balText}>{state.hints ?? 0}</Text></View>
      </View>

      {state.adsRemoved ? (
        <View style={[styles.row, styles.rowOwned]}>
          <View style={styles.iconBox}>
            <Image source={art.gem_green} style={styles.icon} resizeMode="contain" />
            <Text style={styles.check}>✓</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Ads removed ✓</Text>
            <Text style={styles.desc}>No interstitials or banners. Optional reward videos stay available.</Text>
          </View>
        </View>
      ) : (
        <View style={[styles.row, styles.rowHot]}>
          <View style={styles.iconBox}>
            <Image source={art.gem_crimson} style={styles.icon} resizeMode="contain" />
            <Text style={styles.noAds}>AD</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Remove Ads</Text>
            <Text style={styles.desc}>One-time purchase: no interstitials or banners. Optional reward videos stay.</Text>
          </View>
          <GameButton size="sm" variant="primary" label={removeAds?.price ?? "Buy"} onPress={() => void buyRemoveAds()} />
        </View>
      )}

      {packs.map((i) => (
        <View key={i.sku} style={styles.row}>
          <View style={styles.iconBox}><Image source={art[ICON[i.sku] ?? "icon_coin"]} style={styles.icon} resizeMode="contain" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={2}>{i.title}</Text>
            <Text style={styles.desc}>{i.sku === "coins_large" ? "3000 coins" : "500 coins"}</Text>
          </View>
          <GameButton size="sm" variant="secondary" label={i.price} onPress={() => void buyPack(i.sku)} />
        </View>
      ))}
      <View style={[styles.row, styles.rowHot]}>
        <View style={styles.iconBox}><Image source={art.icon_token} style={styles.icon} resizeMode="contain" /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Season Pass · Gold Track</Text>
          <Text style={styles.desc}>{passGold() ? "Owned ✓ — every tier pays its gold reward." : `${GOLD_PRICE} coins once: a gold reward on all 10 pass tiers.`}</Text>
        </View>
        <GameButton size="sm" variant="primary" label="Open" onPress={onPass} />
      </View>
      <View style={styles.row}>
        <View style={styles.iconBox}><Text style={styles.bulbBig}>💡</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{HINT_PACK.n} Coach hints</Text>
          <Text style={styles.desc}>The coach shows the best move — beyond the 3 free per trial.</Text>
        </View>
        <GameButton size="sm" variant="secondary" label={`${HINT_PACK.coins}`} icon={<Image source={art.icon_coin} style={{ width: 22, height: 22 }} resizeMode="contain" />} onPress={buyHints} />
      </View>
      <View style={styles.row}>
        <View style={styles.iconBox}><Text style={styles.bulbBig}>🎬</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Free 50 coins</Text>
          <Text style={styles.desc}>Watch a short video — always optional.</Text>
        </View>
        <GameButton size="sm" variant="secondary" label="Watch" onPress={() => {
          analytics.track("rewarded_ad_offered", { what: "coins" });
          const shown = ads.showRewarded(() => { store.set({ coins: store.get().coins + 50 }); say("+50 coins added — thanks for watching!", true); });
          say(shown ? "Video playing — your 50 coins land when it ends" : "No video is ready yet — try again in a moment", shown);
        }} />
      </View>
      <View style={styles.msgSlot}>
        {msg ? <Pop key={msg.n}><Text style={[styles.msg, { color: msg.ok ? palette.success : "#FF9A9E" }]}>{msg.text}</Text></Pop> : null}
      </View>
      <GameButton size="sm" variant="light" label="Restore purchases" onPress={() => void restore()} />
      <GameButton style={{ marginTop: 12 }} label="Close" onPress={onClose} />
    </Popup>
  );
}

const styles = StyleSheet.create({
  balances: { flexDirection: "row", justifyContent: "center", gap: 10, marginBottom: 12 },
  bal: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.35)", borderRadius: 18, paddingLeft: 3, paddingRight: 10, minHeight: 34, borderWidth: 1, borderColor: "rgba(255,201,60,0.35)" },
  balImg: { width: 28, height: 28 },
  balText: { fontFamily: fonts.display, fontSize: 17, color: palette.gold },
  bulb: { fontSize: 18, marginLeft: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(0,0,0,0.32)", borderRadius: 18, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  rowHot: { borderColor: palette.gold, backgroundColor: "rgba(255,180,0,0.12)" },
  rowOwned: { borderColor: palette.success, backgroundColor: "rgba(61,220,132,0.14)" },
  iconBox: { width: 46, height: 46, alignItems: "center", justifyContent: "center" },
  icon: { width: 46, height: 46 },
  noAds: { position: "absolute", fontFamily: fonts.display, fontSize: 14, color: "#fff", textDecorationLine: "line-through" },
  check: { position: "absolute", fontFamily: fonts.display, fontSize: 20, color: "#fff" },
  bulbBig: { fontSize: 30 },
  title: { fontFamily: fonts.display, fontSize: 16, color: "#fff" },
  desc: { fontFamily: fonts.bodyRegular, fontSize: 12, color: palette.inkSoft },
  msgSlot: { minHeight: 34, justifyContent: "center", marginBottom: 6 },
  msg: { fontFamily: fonts.body, fontSize: 13, textAlign: "center" },
});
