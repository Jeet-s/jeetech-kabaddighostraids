import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Burst, Confetti, GameButton, Pop, Popup, feedback, fonts, palette } from "../ui";
import { art } from "../art";
import { store } from "../modules/store";
import { analytics } from "../modules/analytics";
import { GOLD_PRICE, GOLD_TIERS, PASS_TIERS, buyGold, claimTier, passClaimed, passPoints, totalStars, type PassReward } from "../game/meta";
import { iap } from "../modules/iap";
import { STORE_UNREACHABLE } from "../game/purchases";
import { chantOf, equippedChant, playChant } from "../game/kit";

export const rewardText = (r: PassReward) =>
  [r.coins ? `${r.coins} coins` : "", r.tokens ? `${r.tokens} Chant Tokens` : "", r.pts ? `${r.pts} training points` : "", r.chant ? `chant "${chantOf(r.chant).name}"` : ""].filter(Boolean).join(" + ");

/**
 * Season Pass (from Home or the Shop): a FREE reward track plus the Gold Track, bought once for GOLD_PRICE coins (a
 * fixed, known price; coins from play or the store's coin packs — "Get coins" opens the store's purchase sheet).
 * Pass points = campaign stars + wins; 10 tiers, each claimed by hand.
 */
export function SeasonPassScreen({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [s, setS] = useState(store.get());
  useEffect(() => store.subscribe(setS), []);
  const [got, setGot] = useState<{ text: string; tier: number; n: number; bad?: boolean } | null>(null);
  const [confetti, setConfetti] = useState(0);
  useEffect(() => {
    if (visible) analytics.track("season_pass_viewed", { points: passPoints() });
    else setGot(null);
  }, [visible]);
  const pts = passPoints();
  const next = PASS_TIERS.find((t) => pts < t.need);
  const prevNeed = next ? (PASS_TIERS[PASS_TIERS.indexOf(next) - 1]?.need ?? 0) : 0;
  const claimedN = (s.passClaimed ?? []).length;
  const gold = !!s.passGold;

  const unlockGold = () => {
    const back = buyGold();
    if (!back) {
      feedback("error", "warning");
      setGot({ text: `Gold Track costs ${GOLD_PRICE} coins — you have ${store.get().coins}. Tap Get coins.`, tier: 0, n: Date.now(), bad: true });
      return;
    }
    feedback("unlock", "success");
    setConfetti((c) => c + 1);
    const paid = rewardText(back);
    setGot({ text: `Gold Track unlocked!${paid ? ` Back-pay: +${paid}` : ""}`, tier: 0, n: Date.now() });
    analytics.track("season_pass_gold", { tiers: claimedN });
  };
  const getCoins = async () => {
    const pack = iap.items().find((i) => i.sku === "coins_large") ?? iap.items().find((i) => i.sku === "coins_small");
    if (!pack) { feedback("error", "warning"); setGot({ text: STORE_UNREACHABLE, tier: 0, n: Date.now(), bad: true }); return; }
    setGot({ text: `Opening the store for ${pack.title}…`, tier: 0, n: Date.now() });
    analytics.track("season_pass_get_coins", { sku: pack.sku });
    try { await iap.purchase(pack.sku); } catch { feedback("error", "warning"); setGot({ text: "The purchase didn't go through — nothing was charged.", tier: 0, n: Date.now(), bad: true }); }
  };

  const claim = (tier: number) => {
    const r = claimTier(tier);
    if (!r) { feedback("error", "light"); return; }
    feedback("coin", "success");
    setTimeout(() => playChant(equippedChant()), 300);
    setConfetti((c) => c + 1);
    setGot({ text: `Tier ${tier}: +${rewardText(r)}`, tier, n: Date.now() });
    analytics.track("season_pass_claim", { tier });
  };

  return (
    <Popup visible={visible} title="Season Pass" onClose={onClose} underlay={<Confetti trigger={confetti} />}>
      <Text style={styles.how}>Earn pass points by playing: every campaign star and every win (trials, matches, cups) is 1 point. Claim each tier you reach.</Text>
      <LinearGradient colors={gold ? ["#FFE27A", "#E08A00"] : ["#3A2A6E", "#1C1548"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.goldCard}>
        <Image source={art.icon_token} style={{ width: 40, height: 40 }} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text style={[styles.goldTitle, gold ? { color: "#4A2600" } : null]}>{gold ? "Gold Track ✓" : "Gold Track"}</Text>
          <Text style={[styles.goldDesc, gold ? { color: "#5A3300" } : null]}>
            {gold ? "Every tier pays its gold reward too." : `One-time ${GOLD_PRICE} coins: +23 Chant Tokens and +1550 coins across the 10 tiers, each shown below.`}
          </Text>
        </View>
        {gold ? null : (
          <View style={{ gap: 6 }}>
            <GameButton size="sm" label={`${GOLD_PRICE}`} icon={<Image source={art.icon_coin} style={{ width: 20, height: 20 }} resizeMode="contain" />} onPress={unlockGold} />
            <GameButton size="sm" variant="secondary" label="Get coins" onPress={() => void getCoins()} />
          </View>
        )}
      </LinearGradient>
      <View style={styles.pointsCard}>
        <View style={styles.pointsRow}>
          <Text style={styles.points}>{pts}</Text>
          <Text style={styles.pointsLabel}>pass points · ★ {totalStars()} stars + {s.wins ?? 0} wins</Text>
        </View>
        <View style={styles.track}>
          <LinearGradient colors={["#5BE3FF", "#1A6BFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.fill, { width: `${next ? Math.max(4, ((pts - prevNeed) / (next.need - prevNeed)) * 100) : 100}%` }]} />
        </View>
        <Text style={styles.nextText}>{next ? `Tier ${next.tier} at ${next.need} points (${next.need - pts} to go)` : "Every tier reached!"} · {claimedN}/{PASS_TIERS.length} claimed</Text>
      </View>
      <View style={styles.gotSlot}>
        {got ? <Pop key={got.n}><Text style={[styles.got, got.bad ? { color: "#FF9A9E" } : null]}>{got.text}</Text></Pop> : null}
      </View>
      {PASS_TIERS.map((t) => {
        const reached = pts >= t.need, done = passClaimed(t.tier);
        const r = t.reward;
        return (
          <View key={t.tier} style={[styles.row, reached && !done ? styles.rowReady : null, done ? styles.rowDone : null]}>
            <View style={[styles.tierBadge, reached ? styles.tierOn : null]}><Text style={[styles.tierN, reached ? { color: "#4A2600" } : null]}>{t.tier}</Text></View>
            <View style={styles.rewardIcon}>
              {r.chant ? <Text style={styles.glyph}>🎵</Text>
                : r.pts ? <Text style={styles.glyph}>🎯</Text>
                : <Image source={r.tokens ? art.icon_token : art.icon_coin} style={{ width: 34, height: 34 }} resizeMode="contain" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.reward}>{rewardText(r)}</Text>
              <Text style={[styles.goldLine, gold ? null : styles.goldLocked]}>{gold ? "Gold" : "🔒 Gold"}: +{rewardText(GOLD_TIERS[t.tier] ?? {})}</Text>
              <Text style={styles.need}>{reached ? (done ? "Claimed" : "Reached — claim it!") : `Needs ${t.need} points`}</Text>
            </View>
            {done ? (
              <View style={styles.claimed}><Text style={styles.claimedText}>✓</Text></View>
            ) : reached ? (
              <GameButton size="sm" label="Claim" sound="coin" onPress={() => claim(t.tier)} />
            ) : (
              <Text style={styles.lock}>🔒 {pts}/{t.need}</Text>
            )}
            {got?.tier === t.tier ? <Burst key={got.n} x={64} y={28} color="#FFE27A" count={10} size={80} /> : null}
          </View>
        );
      })}
      <GameButton style={{ marginTop: 8 }} label="Done" onPress={onClose} />
    </Popup>
  );
}

const styles = StyleSheet.create({
  goldCard: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 16, padding: 10, marginBottom: 10, borderWidth: 2, borderColor: palette.gold },
  goldTitle: { fontFamily: fonts.display, fontSize: 17, color: palette.gold },
  goldDesc: { fontFamily: fonts.bodyRegular, fontSize: 12, color: palette.ink },
  goldLine: { fontFamily: fonts.body, fontSize: 11, color: palette.gold },
  goldLocked: { color: "rgba(255,226,122,0.55)" },
  how: { fontFamily: fonts.bodyRegular, fontSize: 13, color: palette.ink, textAlign: "center", marginBottom: 10 },
  pointsCard: { borderRadius: 16, padding: 10, gap: 6, backgroundColor: "rgba(0,0,0,0.35)", borderWidth: 1, borderColor: "rgba(255,201,60,0.4)" },
  pointsRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  points: { fontFamily: fonts.display, fontSize: 30, color: palette.gold },
  pointsLabel: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: palette.ink },
  track: { height: 12, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.5)", overflow: "hidden", borderWidth: 1, borderColor: "rgba(120,160,255,0.5)" },
  fill: { height: "100%", borderRadius: 999 },
  nextText: { fontFamily: fonts.bodyRegular, fontSize: 12, color: palette.inkSoft },
  gotSlot: { minHeight: 36, justifyContent: "center" },
  got: { fontFamily: fonts.display, fontSize: 15, color: palette.success, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 8, padding: 8, marginBottom: 8, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.3)", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.1)" },
  rowReady: { borderColor: palette.gold, backgroundColor: "rgba(255,180,0,0.16)" },
  rowDone: { borderColor: "rgba(61,220,132,0.6)", backgroundColor: "rgba(61,220,132,0.1)" },
  tierBadge: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1.5, borderColor: "rgba(255,201,60,0.5)" },
  tierOn: { backgroundColor: palette.gold, borderColor: "#FFE27A" },
  tierN: { fontFamily: fonts.display, fontSize: 14, color: palette.ink },
  rewardIcon: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  glyph: { fontSize: 26 },
  reward: { fontFamily: fonts.display, fontSize: 14, color: "#fff" },
  need: { fontFamily: fonts.bodyRegular, fontSize: 11, color: palette.inkSoft },
  claimed: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(61,220,132,0.25)", borderWidth: 1.5, borderColor: palette.success },
  claimedText: { fontFamily: fonts.display, fontSize: 20, color: palette.success },
  lock: { fontFamily: fonts.body, fontSize: 12, color: palette.inkSoft },
});
