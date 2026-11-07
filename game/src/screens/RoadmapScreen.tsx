import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Burst, GameButton, Pop, Popup, feedback, fonts, palette } from "../ui";
import { store } from "../modules/store";
import { analytics } from "../modules/analytics";
import { ROADMAP, vote, voted } from "../game/meta";

/** What this update added (the update-notes inbox). */
const WHATS_NEW = [
  "Squad: 12 players with 5 skills each — train them and pick your starting seven.",
  "Auction Hall: bid against 3 AI franchises to sign 12 auction stars.",
  "Chant Studio: 8 crowd chants to preview, unlock and equip.",
  "Season Pass: a free 10-tier reward track filled by stars and wins.",
];

/** Roadmap (from Home): vote for what we build next — one vote per idea, kept on this device. */
export function RoadmapScreen({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [s, setS] = useState(store.get());
  useEffect(() => store.subscribe(setS), []);
  const [last, setLast] = useState<{ id: string; n: number } | null>(null);
  useEffect(() => {
    if (visible) analytics.track("roadmap_viewed", { votes: (store.get().votes ?? []).length });
    else setLast(null);
  }, [visible]);
  const mine = (s.votes ?? []).length;
  const cast = (id: string) => {
    if (!vote(id)) { feedback("pop", "light"); return; }
    feedback("success", "success");
    setLast({ id, n: Date.now() });
    analytics.track("roadmap_vote", { item: id });
  };
  return (
    <Popup visible={visible} title="Roadmap" onClose={onClose}>
      <Text style={styles.lead}>Vote for what we build next</Text>
      <View style={styles.countCard}>
        <Text style={styles.count}>{mine}/{ROADMAP.length}</Text>
        <Text style={styles.countLabel}>ideas you voted for · one vote per idea</Text>
      </View>
      <View style={styles.thanksSlot}>
        {last ? <Pop key={last.n}><Text style={styles.thanks}>Thanks — your vote for {ROADMAP.find((r) => r.id === last.id)?.title} is in ✓</Text></Pop> : null}
      </View>
      {ROADMAP.map((r) => {
        const on = voted(r.id);
        return (
          <View key={r.id} style={[styles.row, on ? styles.rowOn : null]}>
            <Text style={styles.icon}>{r.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{r.title}</Text>
              <Text style={styles.what}>{r.what}</Text>
            </View>
            {on ? (
              <View style={styles.voted}><Text style={styles.votedText}>Voted ✓</Text></View>
            ) : (
              <GameButton size="sm" variant="secondary" label="Vote" onPress={() => cast(r.id)} />
            )}
            {last?.id === r.id ? <Burst key={last.n} x={24} y={28} color={palette.success} count={8} size={70} /> : null}
          </View>
        );
      })}
      <Text style={styles.section}>NEW IN THIS UPDATE</Text>
      {WHATS_NEW.map((t) => <Text key={t} style={styles.note}>• {t}</Text>)}
      <GameButton style={{ marginTop: 12 }} label="Done" onPress={onClose} />
    </Popup>
  );
}

const styles = StyleSheet.create({
  lead: { fontFamily: fonts.display, fontSize: 17, color: "#fff", textAlign: "center", marginTop: -6, marginBottom: 8 },
  countCard: { flexDirection: "row", alignItems: "center", gap: 8, padding: 8, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.35)", borderWidth: 1, borderColor: "rgba(255,201,60,0.4)" },
  count: { fontFamily: fonts.display, fontSize: 24, color: palette.gold },
  countLabel: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: palette.ink },
  thanksSlot: { minHeight: 36, justifyContent: "center" },
  thanks: { fontFamily: fonts.body, fontSize: 13, color: palette.success, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, marginBottom: 8, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.3)", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.12)" },
  rowOn: { borderColor: palette.success, backgroundColor: "rgba(61,220,132,0.12)" },
  icon: { fontSize: 26 },
  title: { fontFamily: fonts.display, fontSize: 15, color: "#fff" },
  what: { fontFamily: fonts.bodyRegular, fontSize: 12, color: palette.inkSoft },
  voted: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: "rgba(61,220,132,0.22)", borderWidth: 1.5, borderColor: palette.success },
  votedText: { fontFamily: fonts.display, fontSize: 13, color: palette.success },
  section: { fontFamily: fonts.body, fontSize: 11, letterSpacing: 1.5, color: palette.gold, marginTop: 8, marginBottom: 4 },
  note: { fontFamily: fonts.bodyRegular, fontSize: 13, color: palette.ink, marginBottom: 3 },
});
