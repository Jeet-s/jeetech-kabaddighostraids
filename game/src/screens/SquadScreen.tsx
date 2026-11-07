import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { AnimatedNumber, Background, Burst, CurrencyPill, GameButton, Pop, Popup, Tappable, feedback, fonts, palette, useShake } from "../ui";
import { art } from "../art";
import { store } from "../modules/store";
import { analytics } from "../modules/analytics";
import { useBottomInset } from "../modules/layout";
import {
  ART_RATIO, MAX_TRAIN, ON_MAT, SKILLS, TRAIN_STEP, artFor, ovr, player, skillsOf, squadIds, swap, teamRating, train, trainCost, trainLevels, trainPts,
} from "../game/squad";
import { PlayerCard, ROLE_COLOR, SkillBar } from "./SquadParts";

/**
 * Squad (from Home): the Ghost Raiders' 7 on the mat and the subs. Tap a player for Player Detail: 5 skill bars,
 * Train (a free training point first, else coins) and swapping a sub onto the mat. Auction signings join the subs.
 */
export function SquadScreen({ onBack, onAuction }: { onBack: () => void; onAuction: () => void }) {
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { width } = useWindowDimensions();
  const [s, setS] = useState(store.get());
  useEffect(() => store.subscribe(setS), []);
  const [open, setOpen] = useState<string | null>(null);
  const ids = s.squad ?? squadIds();
  const mat = ids.slice(0, ON_MAT), subs = ids.slice(ON_MAT);
  const inner = Math.min(width - 28, 640) - 24; // screen padding, then the section card's padding + border
  const cols = width >= 600 ? 5 : 4;
  const cardW = Math.floor((inner - (cols - 1) * 8) / cols);

  return (
    <View style={styles.root}>
      <Background image={art.bg_night_stadium_far} dim={0.6} />
      <View style={[styles.hud, { paddingTop: insets.top + 8 }]}>
        <GameButton size="sm" variant="light" label="‹ Home" onPress={onBack} />
        <Text style={styles.title}>Squad</Text>
        <CurrencyPill image={art.icon_coin} value={s.coins} />
      </View>
      <ScrollView contentContainerStyle={[styles.list, { paddingBottom: bottomInset + 20 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.center}>
          <Animated.View entering={FadeInDown.duration(380)} style={styles.stats}>
            <Stat label="Team rating" value={teamRating()} />
            <Stat label="Training points" value={trainPts()} />
            <Stat label="Players" value={ids.length} />
          </Animated.View>
          <Text style={styles.hint}>Tap a player to train his skills or swap him onto the mat.</Text>

          <Section title={`On the mat · ${mat.length}`} sub="Your starting seven">
            <View style={styles.grid}>
              {mat.map((id) => <PlayerCard key={id} id={id} width={cardW} onPress={() => setOpen(id)} />)}
            </View>
          </Section>
          <Section title={`Subs · ${subs.length}`} sub="Bench players — swap one in from his card">
            <View style={styles.grid}>
              {subs.map((id) => <PlayerCard key={id} id={id} width={cardW} onPress={() => setOpen(id)} />)}
            </View>
          </Section>
          <GameButton variant="secondary" label="🔨 Auction Hall · sign stars" onPress={onAuction} />
        </View>
      </ScrollView>
      <PlayerDetail id={open} onClose={() => setOpen(null)} />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <AnimatedNumber value={value} style={styles.statValue} />
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Section({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <LinearGradient colors={["rgba(44,51,143,0.9)", "rgba(16,19,63,0.94)"]} style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSub}>{sub}</Text>
      {children}
    </LinearGradient>
  );
}

/** Player Detail: skills, training and swaps. */
export function PlayerDetail({ id, onClose }: { id: string | null; onClose: () => void }) {
  const [, setS] = useState(store.get());
  useEffect(() => store.subscribe(setS), []);
  const [msg, setMsg] = useState<{ text: string; ok: boolean; n: number } | null>(null);
  const [fx, setFx] = useState<{ k: number; n: number } | null>(null);
  const { style: shakeStyle, shake } = useShake(6);
  useEffect(() => { setMsg(null); setFx(null); }, [id]);
  if (!id) return <Popup visible={false} onClose={onClose}><View /></Popup>;
  const p = player(id);
  const ids = squadIds();
  const onMat = ids.indexOf(id) < ON_MAT;
  const others = onMat ? ids.slice(ON_MAT) : ids.slice(0, ON_MAT);
  const lv = trainLevels(id);
  const sk = skillsOf(id);
  const pts = trainPts();
  const a = artFor(p, true);

  const doTrain = (k: number) => {
    const cost = trainCost(id, k);
    const r = train(id, k);
    if (r === "max") { feedback("pop", "light"); setMsg({ text: `${SKILLS[k]} is maxed out (${MAX_TRAIN}/${MAX_TRAIN}).`, ok: true, n: Date.now() }); return; }
    if (r === "poor") {
      shake();
      feedback("error", "warning");
      setMsg({ text: `Training costs ${cost} coins — win trials and matches, or claim points in the Season Pass.`, ok: false, n: Date.now() });
      return;
    }
    feedback("unlock", "success");
    setFx({ k, n: Date.now() });
    setMsg({ text: `${p.name.split(" ")[0]}'s ${SKILLS[k]} +${TRAIN_STEP} (${r === "pt" ? "1 training point" : `${cost} coins`})`, ok: true, n: Date.now() });
    analytics.track("player_trained", { player: id, skill: SKILLS[k], level: (lv[k] ?? 0) + 1, paid: r === "pt" ? "point" : "coins" });
  };
  const doSwap = (other: string) => {
    swap(id, other);
    feedback("move", "medium");
    const o = player(other).name.split(" ")[0], me = p.name.split(" ")[0];
    setMsg({ text: onMat ? `${o} is on the mat — ${me} to the subs.` : `${me} is on the mat — ${o} to the subs.`, ok: true, n: Date.now() });
    analytics.track("squad_swap", { in: onMat ? other : id, out: onMat ? id : other });
  };

  return (
    <Popup visible={!!id} title={p.name} onClose={onClose}>
      <View style={styles.dHead}>
        <View style={styles.dPortrait}>
          <Image source={art[a]} style={{ width: 92 * (ART_RATIO[a] ?? 0.9), height: 92 }} resizeMode="contain" />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <LinearGradient colors={ROLE_COLOR[p.role]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.dRole}>
            <Text style={styles.dRoleText}>{p.role} · #{p.no}</Text>
          </LinearGradient>
          <View style={styles.dOvrRow}>
            <AnimatedNumber value={ovr(id)} style={styles.dOvr} />
            <Text style={styles.dOvrLabel}>OVR</Text>
          </View>
          <Text style={styles.dWhere}>{onMat ? "On the mat" : "Sub"} · 🎯 {pts} training point{pts === 1 ? "" : "s"}</Text>
        </View>
      </View>

      <Animated.View style={shakeStyle}>
        {SKILLS.map((name, k) => {
          const cost = trainCost(id, k);
          return (
            <View key={name} style={styles.dSkill}>
              <View style={{ flex: 1 }}>
                <SkillBar label={name} value={sk[k]} color={["#FF8A3C", "#4FE3FF", "#FFD24A", "#3DDC84", "#C792FF"][k]} />
                <Text style={styles.dLv}>Level {lv[k] ?? 0}/{MAX_TRAIN}</Text>
                {fx?.k === k ? <Burst key={fx.n} x={150} y={8} color="#FFE27A" count={8} size={60} /> : null}
              </View>
              <GameButton
                size="sm"
                variant={cost === null ? "light" : "secondary"}
                disabled={cost === null}
                style={styles.trainBtn}
                label={cost === null ? "Max" : pts > 0 ? "Train · 1 pt" : `Train ${cost}`}
                icon={cost !== null && pts <= 0 ? <Image source={art.icon_coin} style={{ width: 18, height: 18 }} resizeMode="contain" /> : undefined}
                onPress={() => doTrain(k)}
              />
            </View>
          );
        })}
      </Animated.View>
      <View style={styles.msgSlot}>
        {msg ? <Pop key={msg.n}><Text style={[styles.msg, { color: msg.ok ? palette.success : "#FF9A9E" }]}>{msg.text}</Text></Pop> : null}
      </View>

      <Text style={styles.swapTitle}>{onMat ? "Swap with a sub" : "Put him on the mat — swap with"}</Text>
      <View style={styles.swapRow}>
        {others.map((o) => (
          <Tappable key={o} onPress={() => doSwap(o)} scaleTo={0.88} style={styles.swapChip} accessibilityLabel={`Swap with ${player(o).name}`}>
            <Text style={styles.swapName}>{player(o).name.split(" ")[0]}</Text>
            <Text style={styles.swapOvr}>{player(o).role} · {ovr(o)}</Text>
          </Tappable>
        ))}
      </View>
      <GameButton style={{ marginTop: 12 }} label="Done" onPress={onClose} />
    </Popup>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hud: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingBottom: 6 },
  title: { fontFamily: fonts.display, fontSize: 28, color: palette.gold, textShadowColor: "#2A0E00", textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 1 },
  list: { paddingHorizontal: 14, paddingTop: 6 },
  center: { width: "100%", maxWidth: 640, alignSelf: "center", gap: 12 },
  stats: { flexDirection: "row", gap: 8 },
  stat: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 16, backgroundColor: "rgba(8,10,40,0.7)", borderWidth: 1.5, borderColor: "rgba(255,201,60,0.55)" },
  statValue: { fontFamily: fonts.display, fontSize: 24, color: palette.gold },
  statLabel: { fontFamily: fonts.body, fontSize: 11, color: palette.ink, textAlign: "center" },
  hint: { fontFamily: fonts.bodyRegular, fontSize: 13, color: palette.inkSoft, textAlign: "center" },
  section: { borderRadius: 20, borderWidth: 2, borderColor: palette.gold, padding: 10, gap: 6 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 19, color: "#fff" },
  sectionSub: { fontFamily: fonts.bodyRegular, fontSize: 12, color: palette.inkSoft, marginTop: -4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dHead: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  dPortrait: { width: 96, height: 96, borderRadius: 18, alignItems: "center", justifyContent: "flex-end", overflow: "hidden", backgroundColor: "rgba(255,180,0,0.14)", borderWidth: 1.5, borderColor: palette.gold },
  dRole: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 },
  dRoleText: { fontFamily: fonts.body, fontSize: 12, color: "#fff" },
  dOvrRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  dOvr: { fontFamily: fonts.display, fontSize: 34, color: palette.gold },
  dOvrLabel: { fontFamily: fonts.display, fontSize: 14, color: palette.ink },
  dWhere: { fontFamily: fonts.bodyRegular, fontSize: 12, color: palette.ink },
  dSkill: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  dLv: { fontFamily: fonts.bodyRegular, fontSize: 10, color: palette.inkSoft, marginLeft: 90 },
  trainBtn: { width: 112 },
  msgSlot: { minHeight: 38, justifyContent: "center" },
  msg: { fontFamily: fonts.body, fontSize: 13, textAlign: "center" },
  swapTitle: { fontFamily: fonts.body, fontSize: 11, letterSpacing: 1.5, color: palette.gold, marginBottom: 6 },
  swapRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  swapChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.4)", borderWidth: 1, borderColor: "rgba(255,201,60,0.45)" },
  swapName: { fontFamily: fonts.display, fontSize: 13, color: "#fff" },
  swapOvr: { fontFamily: fonts.bodyRegular, fontSize: 10, color: palette.inkSoft },
});
