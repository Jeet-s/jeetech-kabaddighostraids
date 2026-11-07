import { Image, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";
import { AnimatedNumber } from "./AnimatedNumber";
import { fonts, palette } from "./theme";

/** HUD pill: icon (art image or glyph) + animated count (coins, Chant Tokens, stars). */
export function CurrencyPill({ icon, image, value, color = palette.coin }: { icon?: string; image?: ImageSourcePropType; value: number; color?: string }) {
  return (
    <View style={styles.pill}>
      {image ? (
        <Image source={image} style={styles.img} resizeMode="contain" />
      ) : (
        <View style={[styles.icon, { backgroundColor: color }]}>
          <Text style={styles.iconText}>{icon}</Text>
        </View>
      )}
      <AnimatedNumber value={value} style={styles.value} />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(8,10,40,0.7)", borderRadius: 999, paddingRight: 14, height: 36, borderWidth: 1.5, borderColor: "rgba(255,201,60,0.55)" },
  // Fully inside the pill (QA: a negative marginLeft cut the coin's left rim off at the pill edge).
  img: { width: 30, height: 30, marginLeft: 3, marginRight: 6 },
  icon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginLeft: 1, marginRight: 8 },
  iconText: { fontSize: 17 },
  value: { fontFamily: fonts.display, fontSize: 18, color: "#fff", minWidth: 28 },
});
