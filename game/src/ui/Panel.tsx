import { StyleSheet, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { palette, radius, shadow } from "./theme";

/** Frosted deep-indigo glass card with a gold bevelled border and a soft lip — popups, menus and HUD groups. */
export function Panel({ children, style, dark }: { children: React.ReactNode; style?: ViewStyle; dark?: boolean }) {
  return (
    <View style={[styles.wrap, shadow, style]}>
      <View style={[styles.lip, { backgroundColor: dark ? "#05061A" : palette.goldDark }]} />
      <LinearGradient
        colors={dark ? ["rgba(30,35,112,0.92)", "rgba(11,13,43,0.94)"] : ["#283090", "#141857", "#0E1140"]}
        style={[styles.face, { borderColor: dark ? "rgba(255,201,60,0.45)" : palette.gold }]}
      >
        <View pointerEvents="none" style={styles.glow} />
        {children}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.xl },
  lip: { position: "absolute", left: 0, right: 0, top: 6, bottom: -6, borderRadius: radius.xl },
  // flexShrink: a Popup caps the panel at the screen height and its body scrolls inside.
  face: { borderRadius: radius.xl, padding: 22, flexShrink: 1, borderWidth: 2.5, overflow: "hidden" },
  glow: { position: "absolute", left: 10, right: 10, top: 2, height: 40, borderRadius: 30, backgroundColor: "rgba(120,140,255,0.10)" },
});
