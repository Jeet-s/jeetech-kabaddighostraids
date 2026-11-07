import { useEffect, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { Popup } from "./Popup";
import { Toggle } from "./Toggle";
import { GameButton } from "./GameButton";
import { store } from "../modules/store";
import { restorePurchases } from "../game/purchases";
import { share } from "../modules/share";
import { notify } from "../modules/notify";
import { analytics } from "../modules/analytics";
import { fonts, palette } from "./theme";

/** Settings: sound, music, vibration, reminders, left-hand layout, reduced motion, share, restore purchases, privacy. */
export function SettingsPopup({ visible, onClose, privacyUrl }: { visible: boolean; onClose: () => void; privacyUrl?: string }) {
  const [s, setS] = useState(store.get());
  useEffect(() => store.subscribe(setS), []);
  const [restoreMsg, setRestoreMsg] = useState("");
  useEffect(() => { if (!visible) setRestoreMsg(""); }, [visible]);
  const restore = async () => {
    setRestoreMsg("Checking your purchases…");
    setRestoreMsg(await restorePurchases());
  };
  const set = (patch: Parameters<typeof store.set>[0], name: string) => {
    store.set(patch);
    analytics.track("settings_changed", { setting: name });
    if (name === "vibration") analytics.track("vibration_toggled", { on: !!patch.haptics });
  };
  const reminders = async (on: boolean) => {
    if (!on) { store.set({ reminders: false }); notify.cancel("daily_reward"); return; }
    const ok = await notify.ask("Daily reward reminders");
    store.set({ reminders: ok });
    if (ok) notify.daily("daily_reward", { hour: 18, minute: 30 }, { title: "Your daily reward is ready", body: "Your streak is waiting — claim today's coins and raid on." });
  };
  return (
    <Popup visible={visible} title="Settings" onClose={onClose}>
      <Text style={styles.section}>AUDIO & FEEL</Text>
      <Toggle label="Sound effects" value={s.sound !== false} onChange={(v) => set({ sound: v }, "sound")} />
      <Toggle label="Music" value={s.music !== false} onChange={(v) => set({ music: v }, "music")} />
      <Toggle label="Vibration" value={s.haptics !== false} onChange={(v) => set({ haptics: v }, "vibration")} />
      <Text style={styles.section}>PLAY</Text>
      <Toggle label="Left-handed layout" value={!!s.leftHand} onChange={(v) => set({ leftHand: v }, "left_hand")} />
      <Toggle label="Reduced motion" value={!!s.reducedMotion} onChange={(v) => set({ reducedMotion: v }, "reduced_motion")} />
      <Toggle label="Daily reminders" value={!!s.reminders} onChange={(v) => void reminders(v)} />
      <View style={styles.buttons}>
        {/* Share the game (src/modules/share.ts) — factory-owned, keep it (owner, 2026-10-25). */}
        <GameButton size="sm" variant="light" label="📤 Share with friends" onPress={() => void share.app("settings")} />
        <GameButton style={{ marginTop: 10 }} size="sm" variant="light" label="Restore purchases" onPress={() => void restore()} />
        {restoreMsg ? <Text style={styles.restore}>{restoreMsg}</Text> : null}
      </View>
      {privacyUrl ? (
        <Text style={styles.link} onPress={() => Linking.openURL(privacyUrl)}>Privacy policy</Text>
      ) : null}
      <GameButton style={{ marginTop: 14 }} label="Done" onPress={onClose} />
    </Popup>
  );
}

const styles = StyleSheet.create({
  section: { fontFamily: fonts.body, fontSize: 11, letterSpacing: 2, color: palette.gold, marginTop: 6 },
  buttons: { marginTop: 12 },
  restore: { fontFamily: fonts.body, fontSize: 13, color: palette.ink, textAlign: "center", marginTop: 8 },
  link: { fontFamily: fonts.bodyRegular, color: palette.inkSoft, textAlign: "center", marginTop: 12, textDecorationLine: "underline" },
});
