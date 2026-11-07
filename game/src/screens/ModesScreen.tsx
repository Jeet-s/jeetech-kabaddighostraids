import { useEffect, useRef, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Background, CurrencyPill, GameButton, Popup, Tappable, feedback, fonts, palette, useShake } from "../ui";
import { art, type ArtId } from "../art";
import { store } from "../modules/store";
import { analytics } from "../modules/analytics";
import { useBottomInset } from "../modules/layout";
import { multiplayer, type Match } from "../modules/multiplayer";
import { CUPS, DIFFS, gates, quickKey, today, type Ctx, type CupId, type Gate } from "../game/meta";
import { GHOSTS } from "../game/ghosts";

/**
 * Matches hub: every mode is playable or shows its unlock rule with a progress counter (never a dead lock).
 * Quick Match (Easy/Medium/Hard, Full 2x20 or Blitz 2x10), Tournament, Championship, the Daily Ghost and the
 * Online Raid Race (quick match or a friend room; an AI rival when nobody is found or the network is down).
 */
export function ModesScreen({ onPlay, onBack }: { onPlay: (ctx: Ctx, online?: Match | null, seed?: number) => void; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const [s, setS] = useState(store.get());
  useEffect(() => store.subscribe(setS), []);
  const gt = gates();
  const diff = s.quickDiff ?? 0;
  const blitz = s.blitz ?? true;
  const [lock, setLock] = useState<{ name: string; g: Gate } | null>(null);
  const [online, setOnline] = useState<null | "search" | "room" | "join">(null);
  const [shook, setShook] = useState<{ name: string; n: number } | null>(null);

  const tryOpen = (name: string, g: Gate, go: () => void) => {
    if (g.open) go();
    else { setShook({ name, n: Date.now() }); setTimeout(() => setLock({ name, g }), 260); feedback("error", "light"); analytics.track("mode_lock_viewed", { mode: name }); }
  };
  const cupCtx = (id: CupId): Ctx => ({ kind: "cup", cup: id, round: s.cup?.id === id ? s.cup.round : 0 });

  return (
    <View style={styles.root}>
      <Background image={art.bg_night_stadium_far} dim={0.55} />
      <View style={[styles.hud, { paddingTop: insets.top + 8 }]}>
        <GameButton size="sm" variant="light" label="‹ Home" onPress={onBack} />
        <Text style={styles.title}>Matches</Text>
        <CurrencyPill image={art.icon_coin} value={s.coins} />
      </View>
      <ScrollView contentContainerStyle={[styles.list, { paddingBottom: bottomInset + 20 }]} showsVerticalScrollIndicator={false}>
        <Card i={0} art="raider_saffron" title="Quick Match" sub={`vs CPU · ${blitz ? "Blitz 2x10" : "Full 2x20"} · ${DIFFS[diff]}`}>
          <View style={styles.seg}>
            {DIFFS.map((d, i) => (
              <Tappable key={d} containerStyle={styles.segCell} onPress={() => store.set({ quickDiff: i as 0 | 1 | 2 })} style={[styles.segBtn, diff === i ? styles.segOn : null]} accessibilityLabel={d}>
                <Text style={[styles.segText, diff === i ? styles.segTextOn : null]}>{d}</Text>
              </Tappable>
            ))}
          </View>
          <View style={styles.seg}>
            {[true, false].map((b) => (
              <Tappable key={String(b)} containerStyle={styles.segCell} onPress={() => store.set({ blitz: b })} style={[styles.segBtn, blitz === b ? styles.segOn : null]} accessibilityLabel={b ? "Blitz" : "Full match"}>
                <Text style={[styles.segText, blitz === b ? styles.segTextOn : null]}>{b ? "Blitz 2x10" : "Full 2x20"}</Text>
              </Tappable>
            ))}
          </View>
          <GameButton label="Play Quick Match" onPress={() => onPlay({ kind: "quick", key: quickKey(diff as 0 | 1 | 2, blitz) })} />
        </Card>

        {(["tournament", "championship"] as CupId[]).map((id) => {
          const c = CUPS[id], g = gt[id];
          const round = s.cup?.id === id ? s.cup.round : 0;
          return (
            <Card key={id} i={id === "tournament" ? 1 : 2} shake={shook?.name === c.name ? shook.n : 0} art={id === "tournament" ? "icon_coin" : "icon_token"} title={c.name} sub={g.open ? `Round ${round + 1}/3 · prize ${c.coins} coins + ${c.tokens} tokens` : `🔒 ${g.need} (${g.have}/${g.of})`} locked={!g.open}>
              <View style={styles.bracket}>
                {c.rounds.map((r, i) => (
                  <View key={r.name} style={[styles.round, i < round ? styles.roundDone : i === round && g.open ? styles.roundNow : null]}>
                    <Text style={styles.roundName} numberOfLines={1} adjustsFontSizeToFit>{r.name}</Text>
                    <Text style={styles.roundRival} numberOfLines={1} adjustsFontSizeToFit>{i < round ? "✓ Won" : r.rival}</Text>
                  </View>
                ))}
              </View>
              {!g.open ? <LockBar g={g} /> : null}
              <GameButton variant={g.open ? "primary" : "light"} label={g.open ? `Play ${c.rounds[round].name}` : `Locked · ${g.need}`} onPress={() => tryOpen(c.name, g, () => onPlay(cupCtx(id)))} />
            </Card>
          );
        })}

        <Card i={3} shake={shook?.name === "Daily Ghost" ? shook.n : 0} art="ghost_raider" title="Daily Ghost Challenge" sub={gt.daily.open ? (s.ghostDay === today() ? "✓ Beaten today — a new ghost tomorrow" : `Beat ${GHOSTS.friend.by.replace("Ghost of your friend ", "")}'s ${GHOSTS.friend.pts} points · 150 coins`) : `🔒 ${gt.daily.need} (${gt.daily.have}/${gt.daily.of})`} locked={!gt.daily.open}>
          {!gt.daily.open ? <LockBar g={gt.daily} /> : null}
          <GameButton variant={gt.daily.open ? "secondary" : "light"} label={gt.daily.open ? "Raid the Ghost" : `Locked · ${gt.daily.need}`} onPress={() => tryOpen("Daily Ghost", gt.daily, () => onPlay({ kind: "daily" }))} />
        </Card>

        <Card i={4} art="defender_teal" title="Online Raid Race" sub="Same seeded match, same CPU — beat your rival's margin. Live score + emotes.">
          <View style={styles.row2}>
            <GameButton style={{ flex: 1 }} label="Find Rival" onPress={() => setOnline("search")} />
            <GameButton style={{ flex: 1 }} variant="secondary" label="Friend Room" onPress={() => setOnline("room")} />
          </View>
          <GameButton style={{ marginTop: 8 }} size="sm" variant="light" label="Join with a code" onPress={() => setOnline("join")} />
        </Card>
      </ScrollView>

      <Popup visible={!!lock} title="Locked" onClose={() => setLock(null)}>
        {lock ? (
          <>
            <Text style={styles.lockName}>{lock.name}</Text>
            <Text style={styles.lockNeed}>{lock.g.need}</Text>
            <LockBar g={lock.g} />
            <Text style={styles.lockHint}>{lock.name.includes("Championship") ? "Win all three rounds of the District Tournament." : lock.name.includes("Ghost") ? "Play the campaign: Trial 5 opens the Daily Ghost." : "Finish any Quick Match — win or lose."}</Text>
            <GameButton label="OK" onPress={() => setLock(null)} />
          </>
        ) : null}
      </Popup>
      <OnlinePopup mode={online} onClose={() => setOnline(null)} onStart={(m, seed, rival) => { setOnline(null); onPlay({ kind: "online", bot: !m || m.bot, rival, seed }, m, seed); }} />
    </View>
  );
}

function LockBar({ g }: { g: Gate }) {
  return (
    <View style={styles.lockTrack}>
      <View style={[styles.lockFill, { width: `${Math.max(4, (g.have / g.of) * 100)}%` }]} />
      <Text style={styles.lockText}>{g.have}/{g.of}</Text>
    </View>
  );
}

/** A mode card: slides in staggered when the hub opens; a locked card shakes when tapped, then shows its rule. */
function Card({ art: a, title, sub, locked, children, i, shake = 0 }: { art: ArtId; title: string; sub: string; locked?: boolean; children: React.ReactNode; i: number; shake?: number }) {
  const { style: shakeStyle, shake: doShake } = useShake(7);
  useEffect(() => { if (shake && !store.get().reducedMotion) doShake(); }, [shake]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Animated.View entering={FadeInDown.delay(60 + i * 70).duration(380)}>
    <Animated.View style={shakeStyle}>
    <LinearGradient colors={locked ? ["rgba(40,44,90,0.92)", "rgba(14,16,48,0.95)"] : ["rgba(44,51,143,0.95)", "rgba(16,19,63,0.96)"]} style={[styles.card, locked ? styles.cardLocked : null]}>
      <View style={styles.cardHead}>
        <Image source={art[a]} style={[styles.cardArt, locked ? { opacity: 0.5 } : null]} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSub}>{sub}</Text>
        </View>
      </View>
      {children}
    </LinearGradient>
    </Animated.View>
    </Animated.View>
  );
}

const seedNow = () => (Date.now() & 0x7fffffff);
const AI_RIVALS = ["Swift Tiger", "Brave Falcon", "Mighty Cobra", "Royal Lynx", "Golden Bison"];

/** Online: quick match (AI rival if nobody comes), a friend room by code, or joining one. Never waits forever. */
function OnlinePopup({ mode, onClose, onStart }: { mode: null | "search" | "room" | "join"; onClose: () => void; onStart: (m: Match | null, seed: number, rival: string) => void }) {
  const [status, setStatus] = useState("");
  const [code, setCode] = useState("");
  const [room, setRoom] = useState<Match | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    setStatus(""); setRoom(null); setCode("");
    if (mode === "search") {
      setStatus("Looking for a rival…");
      multiplayer.findMatch("raid_race", { timeoutMs: 6000 }).then((m) => {
        if (!alive.current) { m.leave().catch(() => {}); return; }
        if (m.bot) { onStart(m, seedNow(), AI_RIVALS[Math.floor(Math.random() * AI_RIVALS.length)]); return; }
        const rival = m.players().find((p) => p.seat !== m.seat)?.name ?? "Rival";
        hostOrJoin(m, (seed) => onStart(m, seed, rival));
      }).catch(() => onStart(null, seedNow(), AI_RIVALS[0]));
    }
    if (mode === "room") {
      setStatus("Opening a room…");
      multiplayer.createRoom("raid_race").then((m) => {
        if (!alive.current) { m?.leave().catch(() => {}); return; }
        if (!m) { setStatus("You're offline — race an AI rival instead."); return; }
        analytics.track("friend_room_created");
        setRoom(m);
        setStatus("Share this code. The race starts when your friend joins.");
        m.onPlayers((seats) => {
          if (seats.length >= 2 && alive.current) {
            const seed = seedNow();
            m.setState({ seed }).catch(() => {});
            onStart(m, seed, seats.find((p) => p.seat !== m.seat)?.name ?? "Friend");
          }
        });
      });
    }
    return () => { alive.current = false; };
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const hostOrJoin = (m: Match, go: (seed: number) => void) => {
    if (m.isHost) { const seed = seedNow(); m.setState({ seed }).catch(() => {}); go(seed); return; }
    let done = false;
    const t = setTimeout(() => { if (!done) { done = true; go(seedNow()); } }, 5000);
    m.onState((st) => {
      const seed = (st as { seed?: number } | null)?.seed;
      if (seed && !done) { done = true; clearTimeout(t); go(seed); }
    });
  };

  const join = async () => {
    setStatus("Joining…");
    const m = await multiplayer.joinRoom(code.trim().toUpperCase());
    if (!m) { setStatus("No room with that code (or you're offline)."); return; }
    analytics.track("friend_room_joined");
    hostOrJoin(m, (seed) => onStart(m, seed, m.players().find((p) => p.seat !== m.seat)?.name ?? "Friend"));
  };

  return (
    <Popup visible={!!mode} title={mode === "join" ? "Join a Room" : mode === "room" ? "Friend Room" : "Online Raid Race"} onClose={() => { room?.leave().catch(() => {}); onClose(); }}>
      {room?.code ? <Text style={styles.code}>{room.code}</Text> : null}
      {mode === "join" ? (
        <TextInput value={code} onChangeText={(t) => setCode(t.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase())} placeholder="CODE" placeholderTextColor="#6E6A9E"
          autoCapitalize="characters" autoCorrect={false} maxLength={6} style={styles.codeInput} />
      ) : null}
      {status ? <Text style={styles.status}>{status}</Text> : null}
      {mode === "join" ? <GameButton label="Join" disabled={code.length < 4} onPress={() => void join()} /> : null}
      <GameButton style={{ marginTop: 10 }} variant="secondary" label="Race an AI rival now" onPress={() => { room?.leave().catch(() => {}); onStart(null, seedNow(), AI_RIVALS[1]); }} />
      <GameButton style={{ marginTop: 10 }} size="sm" variant="light" label="Cancel" onPress={() => { room?.leave().catch(() => {}); onClose(); }} />
    </Popup>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hud: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingBottom: 6 },
  title: { fontFamily: fonts.display, fontSize: 28, color: palette.gold, textShadowColor: "#2A0E00", textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 1 },
  list: { paddingHorizontal: 14, gap: 12, paddingTop: 6 },
  card: { borderRadius: 22, borderWidth: 2, borderColor: palette.gold, padding: 12, gap: 8 },
  cardLocked: { borderColor: "rgba(255,201,60,0.4)" },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardArt: { width: 58, height: 58 },
  cardTitle: { fontFamily: fonts.display, fontSize: 21, color: "#fff" },
  cardSub: { fontFamily: fonts.bodyRegular, fontSize: 13, color: palette.ink },
  seg: { flexDirection: "row", gap: 6 },
  segCell: { flex: 1 },
  segBtn: { minHeight: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.35)", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  segOn: { backgroundColor: "#FFA800", borderColor: "#FFE27A" },
  segText: { fontFamily: fonts.display, fontSize: 14, color: palette.ink },
  segTextOn: { color: "#4A2600" },
  bracket: { flexDirection: "row", gap: 6 },
  round: { flex: 1, borderRadius: 12, padding: 6, backgroundColor: "rgba(0,0,0,0.35)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  roundDone: { borderColor: palette.success, backgroundColor: "rgba(61,220,132,0.18)" },
  roundNow: { borderColor: palette.gold, backgroundColor: "rgba(255,180,0,0.18)" },
  roundName: { fontFamily: fonts.display, fontSize: 12, color: palette.gold },
  roundRival: { fontFamily: fonts.bodyRegular, fontSize: 11, color: palette.ink },
  row2: { flexDirection: "row", gap: 10 },
  lockTrack: { height: 18, borderRadius: 9, backgroundColor: "rgba(0,0,0,0.5)", overflow: "hidden", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,201,60,0.4)" },
  lockFill: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: palette.accent },
  lockText: { fontFamily: fonts.display, fontSize: 12, color: "#fff", textAlign: "center" },
  lockName: { fontFamily: fonts.display, fontSize: 20, color: "#fff", textAlign: "center" },
  lockNeed: { fontFamily: fonts.body, fontSize: 16, color: palette.gold, textAlign: "center", marginVertical: 8 },
  lockHint: { fontFamily: fonts.bodyRegular, fontSize: 14, color: palette.ink, textAlign: "center", marginVertical: 12 },
  code: { fontFamily: fonts.display, fontSize: 44, color: palette.gold, textAlign: "center", letterSpacing: 6 },
  codeInput: { fontFamily: fonts.display, fontSize: 32, color: "#fff", textAlign: "center", letterSpacing: 6, borderWidth: 2, borderColor: palette.gold, borderRadius: 14, paddingVertical: 8, backgroundColor: "rgba(0,0,0,0.35)", marginBottom: 10 },
  status: { fontFamily: fonts.bodyRegular, fontSize: 15, color: palette.ink, textAlign: "center", marginVertical: 10 },
});
