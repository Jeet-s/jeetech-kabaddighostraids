import { useEffect, useRef, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { AnimatedNumber, Background, Burst, Confetti, GameButton, Pop, Popup, feedback, fonts, palette, useShake } from "../ui";
import { art } from "../art";
import { store } from "../modules/store";
import { analytics } from "../modules/analytics";
import { useBottomInset } from "../modules/layout";
import { ART_RATIO, AUCTION_POOL, artFor, ovr, player, sign } from "../game/squad";
import { BIDDERS, LOTS_PER_SEASON, aiMax, aiRaise, basePrice, estimate, nextPrice, purseFor, season, seasonLots, settleWithoutMe } from "../game/auctionHall";
import { equippedChant, playChant } from "../game/kit";
import { ROLE_COLOR, SkillList } from "./SquadParts";

type Live = {
  lots: string[]; i: number; price: number; lead: number; going: number; purse: number; seasonNo: number;
  sold: null | { lead: number; price: number }; won: { id: string; price: number }[]; log: { text: string; color: string; n: number }[];
};
const OPEN_MS = 1700; // a fresh lot: time to open the bidding yourself
const TICK_MS = 1100; // each "going once / twice" beat and each AI answer

/**
 * Auction Hall (from Home, or from Squad): open ascending bidding for fixed, fully visible players against 3 AI
 * franchises with an in-game purse. Bids go up by 5; after the last bid the auctioneer calls "going once, going
 * twice" in real time and SOLD. Players you sign join your Squad's subs.
 */
export function AuctionHallScreen({ onBack, onSquad }: { onBack: () => void; onSquad: () => void }) {
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const [, setS] = useState(store.get());
  useEffect(() => store.subscribe(setS), []);
  const [phase, setPhase] = useState<"intro" | "live" | "done">("intro");
  const [live, setLive] = useState<Live | null>(null);
  const liveRef = useRef<Live | null>(null);
  liveRef.current = live;
  const [confetti, setConfetti] = useState(0);
  const [warn, setWarn] = useState<{ text: string; n: number } | null>(null);
  const { style: shakeStyle, shake } = useShake(7);
  const timer = useSharedValue(1);

  const log = (l: Live, text: string, color: string): Live["log"] => [{ text, color, n: Date.now() + Math.random() }, ...l.log].slice(0, 3);

  const start = () => {
    const lots = seasonLots();
    if (!lots.length) return;
    const seasonNo = season();
    const l: Live = { lots, i: 0, price: basePrice(lots[0]), lead: -1, going: 0, purse: purseFor(), seasonNo, sold: null, won: [], log: [] };
    l.log = log(l, `Lot 1: ${player(lots[0]).name} — opening at ${l.price}`, palette.ink);
    setLive(l);
    setPhase("live");
    feedback("whoosh", "medium");
    analytics.track("auction_start", { season: seasonNo, purse: l.purse, lots: lots.length });
  };

  const applySold = (l: Live, res: { lead: number; price: number }): Live => {
    const id = l.lots[l.i];
    const p = player(id);
    if (res.lead === 0) {
      sign(id);
      feedback("success", "success");
      setTimeout(() => playChant(equippedChant()), 350);
      setConfetti((c) => c + 1);
      analytics.track("auction_win", { player: id, price: res.price, season: l.seasonNo });
      return { ...l, sold: res, purse: l.purse - res.price, won: [...l.won, { id, price: res.price }], log: log(l, `SOLD to you: ${p.name} for ${res.price}!`, palette.success) };
    }
    feedback("pop", "medium");
    if (res.lead < 0) return { ...l, sold: res, log: log(l, `${p.name} goes unsold.`, palette.inkSoft) };
    return { ...l, sold: res, log: log(l, `SOLD to ${BIDDERS[res.lead].name}: ${p.name} for ${res.price}`, BIDDERS[res.lead].color) };
  };

  const nextLot = () => {
    const l = liveRef.current;
    if (!l) return;
    if (l.i + 1 >= l.lots.length) {
      store.set({ auctions: (store.get().auctions ?? 0) + 1 });
      analytics.track("auction_end", { season: l.seasonNo, won: l.won.length, purse_left: l.purse });
      setPhase("done");
      return;
    }
    const i = l.i + 1, id = l.lots[i];
    const n: Live = { ...l, i, price: basePrice(id), lead: -1, going: 0, sold: null };
    n.log = log(n, `Lot ${i + 1}: ${player(id).name} — opening at ${n.price}`, palette.ink);
    setLive(n);
  };

  // The auctioneer's clock: AI franchises answer, then "going once, going twice, SOLD".
  useEffect(() => {
    if (phase !== "live" || !live) return;
    if (live.sold) {
      const t = setTimeout(nextLot, 2000);
      return () => clearTimeout(t);
    }
    const ms = live.lead === -1 && live.going === 0 ? OPEN_MS : TICK_MS;
    timer.value = 1;
    timer.value = withTiming(0, { duration: ms, easing: Easing.linear });
    const t = setTimeout(() => {
      const l = liveRef.current;
      if (!l || l.sold) return;
      const id = l.lots[l.i];
      const r = aiRaise(id, l.price, l.lead, l.seasonNo);
      if (r >= 0) {
        const np = nextPrice(l.price, l.lead);
        feedback("tap", "light");
        setLive({ ...l, price: np, lead: r, going: 0, log: log(l, `${BIDDERS[r].name} bid ${np}`, BIDDERS[r].color) });
      } else if (l.going >= 2 || (l.lead === -1 && l.going >= 1)) {
        setLive(applySold(l, { lead: l.lead, price: l.price }));
      } else {
        feedback("tap", "select");
        setLive({ ...l, going: l.going + 1 });
      }
    }, ms);
    return () => clearTimeout(t);
  }, [live, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const bid = () => {
    const l = liveRef.current;
    if (!l || l.sold || l.lead === 0) return;
    const np = nextPrice(l.price, l.lead);
    if (l.purse < np) {
      shake();
      feedback("error", "warning");
      setWarn({ text: `Your purse has ${l.purse} — a bid of ${np} is too much.`, n: Date.now() });
      return;
    }
    setWarn(null);
    feedback("coin", "medium");
    analytics.track("auction_bid", { player: l.lots[l.i], price: np, season: l.seasonNo });
    setLive({ ...l, price: np, lead: 0, going: 0, log: log(l, `You bid ${np}`, palette.gold) });
  };
  const pass = () => {
    const l = liveRef.current;
    if (!l || l.sold || l.lead === 0) return;
    setWarn(null);
    analytics.track("auction_pass", { player: l.lots[l.i], season: l.seasonNo });
    setLive(applySold(l, settleWithoutMe(l.lots[l.i], l.price, l.lead, l.seasonNo)));
  };

  const timerStyle = useAnimatedStyle(() => ({ width: `${timer.value * 100}%` }));
  const lotId = live ? live.lots[live.i] : null;

  return (
    <View style={styles.root}>
      <Background image={art.bg_auction_hall} dim={0.5} />
      <View style={[styles.hud, { paddingTop: insets.top + 8 }]}>
        <GameButton size="sm" variant="light" label="‹ Home" onPress={onBack} />
        <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>Auction Hall</Text>
        <GameButton size="sm" variant="secondary" label="Squad" onPress={onSquad} />
      </View>

      {phase === "intro" || !live || !lotId ? (
        <Intro onStart={start} onSquad={onSquad} bottom={bottomInset} />
      ) : (
        <>
          <ScrollView contentContainerStyle={[styles.list, { paddingBottom: 16 }]} showsVerticalScrollIndicator={false}>
            <View style={styles.center}>
              <View style={styles.topRow}>
                <View style={styles.purse}>
                  <Text style={styles.purseLabel}>PURSE</Text>
                  <AnimatedNumber value={live.purse} style={styles.purseValue} />
                </View>
                <View style={styles.purse}>
                  <Text style={styles.purseLabel}>LOT</Text>
                  <Text style={styles.purseValue}>{live.i + 1}/{live.lots.length}</Text>
                </View>
                <View style={styles.purse}>
                  <Text style={styles.purseLabel}>SIGNED</Text>
                  <Text style={styles.purseValue}>{live.won.length}</Text>
                </View>
              </View>

              <LotCard key={lotId} id={lotId} sold={live.sold} />

              <Animated.View style={shakeStyle}>
                <LinearGradient colors={["rgba(44,51,143,0.95)", "rgba(16,19,63,0.96)"]} style={styles.bidPanel}>
                  <View style={styles.priceRow}>
                    <View>
                      <Text style={styles.priceLabel}>{live.lead === -1 ? "OPENING PRICE" : "CURRENT BID"}</Text>
                      <AnimatedNumber value={live.price} duration={250} style={styles.price} />
                    </View>
                    <View style={{ flex: 1, alignItems: "flex-end" }}>
                      <Text style={[styles.leader, { color: live.lead >= 0 ? BIDDERS[live.lead].color : palette.inkSoft }]}>
                        {live.sold ? (live.sold.lead === 0 ? "You won him!" : live.sold.lead > 0 ? `${BIDDERS[live.sold.lead].name} won` : "Unsold") : live.lead === 0 ? "You lead!" : live.lead > 0 ? `${BIDDERS[live.lead].name} lead` : "No bids yet"}
                      </Text>
                      <Text style={styles.going}>{live.sold ? "SOLD!" : live.going === 0 ? (live.lead === -1 ? "Bidding open" : "Any more bids?") : live.going === 1 ? "Going once…" : "Going twice…"}</Text>
                    </View>
                  </View>
                  <View style={styles.timerTrack}>
                    {live.sold ? null : <Animated.View style={[styles.timerFill, timerStyle]} />}
                  </View>
                  <View style={styles.bidders}>
                    {BIDDERS.slice(1).map((b, k) => {
                      const f = k + 1;
                      const out = !live.sold && live.lead !== f && aiMax(live.lots[live.i], f, live.seasonNo) < nextPrice(live.price, live.lead);
                      return (
                        <View key={b.name} style={[styles.bidder, { borderColor: b.color }, live.lead === f ? { backgroundColor: "rgba(255,255,255,0.14)" } : null, out ? { opacity: 0.45 } : null]}>
                          <Text style={[styles.bidderName, { color: b.color }]} numberOfLines={1} adjustsFontSizeToFit>{b.name}</Text>
                          <Text style={styles.bidderState}>{live.lead === f ? "Leading" : out ? "Out" : "In"}</Text>
                        </View>
                      );
                    })}
                  </View>
                  <View style={styles.logBox}>
                    {live.log.map((e) => <Text key={e.n} style={[styles.logLine, { color: e.color }]}>{e.text}</Text>)}
                  </View>
                </LinearGradient>
              </Animated.View>
            </View>
          </ScrollView>
          <View style={[styles.actions, { paddingBottom: bottomInset + 10 }]}>
            {warn ? <Pop key={warn.n}><Text style={styles.warn}>{warn.text}</Text></Pop> : null}
            <View style={styles.actionRow}>
              <GameButton style={{ flex: 1 }} variant="light" label="Pass" disabled={!!live.sold || live.lead === 0} onPress={pass} />
              <GameButton style={{ flex: 1.6 }} variant="primary" sound="coin"
                label={live.sold ? "SOLD" : live.lead === 0 ? "You lead" : `Bid ${nextPrice(live.price, live.lead)}`}
                disabled={!!live.sold || live.lead === 0} onPress={bid} />
            </View>
          </View>
        </>
      )}

      <Confetti trigger={confetti} />
      <Popup visible={phase === "done"} title={live ? `Season ${live.seasonNo} done` : "Season done"} onClose={() => setPhase("intro")}>
        {live ? (
          <>
            <Text style={styles.doneLine}>{live.won.length ? `You signed ${live.won.length} player${live.won.length > 1 ? "s" : ""} — they joined your Squad's subs.` : "No signings this season — bid earlier and keep your purse for the stars you want."}</Text>
            {live.won.map((w) => (
              <View key={w.id} style={styles.doneRow}>
                <Image source={art[artFor(player(w.id), true)]} style={{ width: 40 * (ART_RATIO[artFor(player(w.id), true)] ?? 0.9), height: 40 }} resizeMode="contain" />
                <Text style={styles.doneName}>{player(w.id).name}</Text>
                <Text style={styles.doneOvr}>{ovr(w.id)} OVR · {w.price}</Text>
              </View>
            ))}
            <Text style={styles.doneLine}>Purse left: {live.purse}</Text>
            {live.won.length ? <GameButton label="View Squad" onPress={() => { setPhase("intro"); onSquad(); }} /> : null}
            <GameButton style={{ marginTop: 10 }} variant={live.won.length ? "light" : "primary"} size={live.won.length ? "sm" : "md"} label="Back to the Hall" onPress={() => setPhase("intro")} />
          </>
        ) : <View />}
      </Popup>
    </View>
  );
}

/** Before a season: the purse, the rules and the 4 players for sale (all visible). */
function Intro({ onStart, onSquad, bottom }: { onStart: () => void; onSquad: () => void; bottom: number }) {
  const lots = seasonLots();
  const signed = AUCTION_POOL.length - AUCTION_POOL.filter((p) => !store.get().squad?.includes(p.id)).length;
  if (!lots.length) {
    return (
      <View style={[styles.list, styles.center]}>
        <Animated.View entering={FadeInDown.duration(380)}>
          <LinearGradient colors={["rgba(44,51,143,0.95)", "rgba(16,19,63,0.96)"]} style={styles.card}>
            <Text style={styles.cardTitle}>🏆 Every star signed</Text>
            <Text style={styles.cardText}>All {AUCTION_POOL.length} auction stars play for the Ghost Raiders now. Train them in your Squad.</Text>
            <GameButton label="View Squad" onPress={onSquad} />
          </LinearGradient>
        </Animated.View>
      </View>
    );
  }
  return (
    <ScrollView contentContainerStyle={[styles.list, { paddingBottom: bottom + 20 }]} showsVerticalScrollIndicator={false}>
      <View style={styles.center}>
        <Animated.View entering={FadeInDown.duration(380)}>
          <LinearGradient colors={["rgba(44,51,143,0.95)", "rgba(16,19,63,0.96)"]} style={styles.card}>
            <Text style={styles.cardTitle}>Season {season()} Auction</Text>
            <View style={styles.topRow}>
              <View style={styles.purse}><Text style={styles.purseLabel}>YOUR PURSE</Text><Text style={styles.purseValue}>{purseFor()}</Text></View>
              <View style={styles.purse}><Text style={styles.purseLabel}>SIGNED</Text><Text style={styles.purseValue}>{signed}/{AUCTION_POOL.length}</Text></View>
            </View>
            <Text style={styles.cardText}>Open bidding against 3 franchises. Each bid adds 5; when nobody answers, the auctioneer calls "going once, going twice" — then SOLD. The purse is in-game only and grows by 5 for every 9 stars you earn (up to 150).</Text>
            <View style={styles.bidders}>
              {BIDDERS.slice(1).map((b) => (
                <View key={b.name} style={[styles.bidder, { borderColor: b.color }]}>
                  <Text style={[styles.bidderName, { color: b.color }]} numberOfLines={1} adjustsFontSizeToFit>{b.name}</Text>
                  <Text style={styles.bidderState}>AI franchise</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </Animated.View>
        <Text style={styles.section}>ON SALE THIS SEASON · {Math.min(LOTS_PER_SEASON, lots.length)} LOTS</Text>
        {lots.map((id) => {
          const p = player(id), a = artFor(p, false), [lo, hi] = estimate(id);
          return (
            <View key={id} style={styles.preview}>
              <View style={styles.previewArt}><Image source={art[a]} style={{ width: 44 * (ART_RATIO[a] ?? 0.9), height: 44 }} resizeMode="contain" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.previewName}>{p.name}</Text>
                <Text style={styles.previewSub}>{p.role} · opens at {basePrice(id)} · worth {lo}-{hi}</Text>
              </View>
              <View style={styles.previewOvr}><Text style={styles.previewOvrText}>{ovr(id)}</Text></View>
            </View>
          );
        })}
        <GameButton size="lg" label="Start Auction" sound="whoosh" onPress={onStart} />
      </View>
    </ScrollView>
  );
}

/** The player on the block: portrait, role, OVR, all 5 skills, the market range — and the SOLD stamp. */
function LotCard({ id, sold }: { id: string; sold: Live["sold"] }) {
  const p = player(id), a = artFor(p, false), [lo, hi] = estimate(id);
  const s = useSharedValue(0);
  useEffect(() => { s.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.back(1.6)) }); }, [s]);
  const inStyle = useAnimatedStyle(() => ({ transform: [{ scale: 0.92 + 0.08 * s.value }] }));
  return (
    <Animated.View style={inStyle}>
      <LinearGradient colors={["rgba(255,201,60,0.22)", "rgba(16,19,63,0.96)"]} style={styles.lot}>
        <View style={styles.lotHead}>
          <View style={styles.lotArt}><Image source={art[a]} style={{ width: 88 * (ART_RATIO[a] ?? 0.9), height: 88 }} resizeMode="contain" /></View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={styles.lotName}>{p.name}</Text>
            <LinearGradient colors={ROLE_COLOR[p.role]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.lotRole}>
              <Text style={styles.lotRoleText}>{p.role} · #{p.no}</Text>
            </LinearGradient>
            <Text style={styles.lotEst}>Base {basePrice(id)} · worth {lo}-{hi}</Text>
          </View>
          <View style={styles.lotOvr}><Text style={styles.lotOvrText}>{ovr(id)}</Text><Text style={styles.lotOvrLabel}>OVR</Text></View>
        </View>
        <SkillList id={id} compact />
        {sold ? (
          <View style={styles.stampWrap} pointerEvents="none">
            <Pop>
              <View style={[styles.stamp, { borderColor: sold.lead === 0 ? palette.success : sold.lead > 0 ? BIDDERS[sold.lead].color : palette.inkSoft }]}>
                <Text style={[styles.stampText, { color: sold.lead === 0 ? palette.success : sold.lead > 0 ? BIDDERS[sold.lead].color : palette.inkSoft }]}>{sold.lead < 0 ? "UNSOLD" : "SOLD!"}</Text>
                <Text style={styles.stampSub}>{sold.lead === 0 ? `to you · ${sold.price}` : sold.lead > 0 ? `${BIDDERS[sold.lead].name} · ${sold.price}` : "no bids"}</Text>
              </View>
            </Pop>
            {sold.lead === 0 ? <View style={styles.burstAnchor}><Burst x={0} y={0} color="#FFE27A" count={10} size={150} /></View> : null}
          </View>
        ) : null}
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hud: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingBottom: 6, gap: 8 },
  title: { flex: 1, textAlign: "center", fontFamily: fonts.display, fontSize: 26, color: palette.gold, textShadowColor: "#2A0E00", textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 1 },
  list: { paddingHorizontal: 14, paddingTop: 6 },
  center: { width: "100%", maxWidth: 620, alignSelf: "center", gap: 10 },
  topRow: { flexDirection: "row", gap: 8 },
  purse: { flex: 1, alignItems: "center", paddingVertical: 5, borderRadius: 14, backgroundColor: "rgba(8,10,40,0.75)", borderWidth: 1.5, borderColor: "rgba(255,201,60,0.6)" },
  purseLabel: { fontFamily: fonts.body, fontSize: 10, letterSpacing: 1.5, color: palette.inkSoft },
  purseValue: { fontFamily: fonts.display, fontSize: 22, color: palette.gold },
  card: { borderRadius: 22, borderWidth: 2, borderColor: palette.gold, padding: 14, gap: 10 },
  cardTitle: { fontFamily: fonts.display, fontSize: 22, color: "#fff", textAlign: "center" },
  cardText: { fontFamily: fonts.bodyRegular, fontSize: 13, color: palette.ink, textAlign: "center" },
  section: { fontFamily: fonts.body, fontSize: 11, letterSpacing: 1.5, color: palette.gold, marginTop: 4 },
  preview: { flexDirection: "row", alignItems: "center", gap: 10, padding: 8, borderRadius: 16, backgroundColor: "rgba(10,12,44,0.82)", borderWidth: 1, borderColor: "rgba(255,201,60,0.3)" },
  previewArt: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "flex-end", overflow: "hidden", backgroundColor: "rgba(18,181,229,0.15)" },
  previewName: { fontFamily: fonts.display, fontSize: 16, color: "#fff" },
  previewSub: { fontFamily: fonts.bodyRegular, fontSize: 12, color: palette.inkSoft },
  previewOvr: { minWidth: 40, height: 32, borderRadius: 10, backgroundColor: palette.gold, alignItems: "center", justifyContent: "center" },
  previewOvrText: { fontFamily: fonts.display, fontSize: 17, color: "#4A2600" },
  lot: { borderRadius: 22, borderWidth: 2, borderColor: palette.gold, padding: 12, gap: 8, overflow: "hidden" },
  lotHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  lotArt: { width: 84, height: 90, borderRadius: 16, alignItems: "center", justifyContent: "flex-end", overflow: "hidden", backgroundColor: "rgba(18,181,229,0.16)", borderWidth: 1, borderColor: "rgba(79,211,255,0.5)" },
  lotName: { fontFamily: fonts.display, fontSize: 20, color: "#fff" },
  lotRole: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 },
  lotRoleText: { fontFamily: fonts.body, fontSize: 11, color: "#fff" },
  lotEst: { fontFamily: fonts.bodyRegular, fontSize: 12, color: palette.ink },
  lotOvr: { width: 56, height: 56, borderRadius: 16, backgroundColor: palette.gold, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#A65F00" },
  lotOvrText: { fontFamily: fonts.display, fontSize: 24, color: "#4A2600", lineHeight: 26 },
  lotOvrLabel: { fontFamily: fonts.body, fontSize: 9, color: "#4A2600" },
  stampWrap: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(6,8,32,0.45)" },
  burstAnchor: { position: "absolute", width: 0, height: 0 },
  stamp: { alignItems: "center", paddingHorizontal: 22, paddingVertical: 8, borderRadius: 18, borderWidth: 4, backgroundColor: "rgba(6,8,32,0.88)", transform: [{ rotate: "-8deg" }] },
  stampText: { fontFamily: fonts.display, fontSize: 44, letterSpacing: 2 },
  stampSub: { fontFamily: fonts.display, fontSize: 15, color: "#fff" },
  bidPanel: { borderRadius: 22, borderWidth: 2, borderColor: palette.gold, padding: 12, gap: 8 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  priceLabel: { fontFamily: fonts.body, fontSize: 10, letterSpacing: 1.5, color: palette.inkSoft },
  price: { fontFamily: fonts.display, fontSize: 38, color: palette.gold, lineHeight: 42 },
  leader: { fontFamily: fonts.display, fontSize: 17, textAlign: "right" },
  going: { fontFamily: fonts.display, fontSize: 15, color: "#fff", textAlign: "right" },
  timerTrack: { height: 6, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.5)", overflow: "hidden" },
  timerFill: { height: "100%", backgroundColor: palette.accent, borderRadius: 3 },
  bidders: { flexDirection: "row", gap: 6 },
  bidder: { flex: 1, alignItems: "center", paddingVertical: 5, paddingHorizontal: 4, borderRadius: 12, borderWidth: 1.5, backgroundColor: "rgba(0,0,0,0.35)" },
  bidderName: { fontFamily: fonts.display, fontSize: 13 },
  bidderState: { fontFamily: fonts.bodyRegular, fontSize: 11, color: palette.ink },
  logBox: { minHeight: 54, gap: 1 },
  logLine: { fontFamily: fonts.body, fontSize: 12 },
  actions: { paddingHorizontal: 14, paddingTop: 8, gap: 6, width: "100%", maxWidth: 648, alignSelf: "center" },
  actionRow: { flexDirection: "row", gap: 10 },
  warn: { fontFamily: fonts.body, fontSize: 13, color: "#FF9A9E", textAlign: "center" },
  doneLine: { fontFamily: fonts.bodyRegular, fontSize: 14, color: palette.ink, textAlign: "center", marginBottom: 10 },
  doneRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 6, marginBottom: 6, borderRadius: 12, backgroundColor: "rgba(61,220,132,0.16)", borderWidth: 1, borderColor: palette.success },
  doneName: { flex: 1, fontFamily: fonts.display, fontSize: 15, color: "#fff" },
  doneOvr: { fontFamily: fonts.body, fontSize: 12, color: palette.gold },
});
