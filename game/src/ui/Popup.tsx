import { useEffect } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { Panel } from "./Panel";
import { palette, springs, type } from "./theme";
import { play } from "../audio/sfx";
import { GESTURE_FLOOR } from "../modules/layout";

/**
 * Modal card that springs in over a dimmed backdrop.
 *
 * Small-phone safe (QA 2026-10-20..27, layout_small in 4 games): a <Modal> is its own native window that the app's
 * root SafeAreaProvider never measures, so insets read 0 there and tall cards put "Done" / "Close" under the Android
 * gesture pill. The modal gets its own provider, the card is padded by the real insets (with a floor) and its body
 * scrolls when it is taller than a 720x1280 phone — the card never runs off-screen.
 *
 * `underlay` draws over the dim but BEHIND the card (confetti, rays): anything rendered outside a Modal ends up
 * underneath its window (the win confetti was hidden behind the dim — "sparse, thin confetti"), and fx drawn on top
 * of the card covered its title and numbers (render_defects 2026-10-25..27).
 */
export function Popup({ visible, title, onClose, children, underlay, leaving }: {
  visible: boolean; title?: string; onClose?: () => void; children: React.ReactNode; underlay?: React.ReactNode;
  /** true while the card is sent off (it flies up and the dim lifts) just before the caller hides it. */
  leaving?: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <SafeAreaProvider>
        <PopupBody visible={visible} title={title} onClose={onClose} underlay={underlay} leaving={leaving}>
          {children}
        </PopupBody>
      </SafeAreaProvider>
    </Modal>
  );
}

function PopupBody({ visible, title, onClose, children, underlay, leaving }: {
  visible: boolean; title?: string; onClose?: () => void; children: React.ReactNode; underlay?: React.ReactNode; leaving?: boolean;
}) {
  // Inside the modal's own provider: these are this window's real insets.
  const insets = useSafeAreaInsets();
  const s = useSharedValue(0);
  useEffect(() => {
    if (visible) {
      play("whoosh", 0.6);
      s.value = 0;
      s.value = withSpring(1, springs.pop);
    }
  }, [visible, s]);
  // slides up from below and bounces in (spring overshoot on both the rise and the scale). The card is OPAQUE from
  // its first frame (QA render_defects 2026-11-07: a card fading in from 20 % let the board and the Next button
  // ghost through its text) — only its size and position animate.
  const out = useSharedValue(0);
  useEffect(() => {
    out.value = leaving ? withTiming(1, { duration: 220, easing: Easing.in(Easing.back(1.4)) }) : 0;
  }, [leaving, out]);
  const card = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - s.value) * 120 - out.value * 700 }, { scale: (0.7 + 0.3 * s.value) * (1 - 0.12 * out.value) }] }));
  const dim = useAnimatedStyle(() => ({ opacity: withTiming(visible && !leaving ? 1 : 0, { duration: leaving ? 220 : 160, easing: Easing.out(Easing.quad) }) }));
  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, styles.dim, dim]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      {underlay ? <View style={StyleSheet.absoluteFill} pointerEvents="none">{underlay}</View> : null}
      <View
        style={[styles.center, { paddingTop: Math.max(insets.top, GESTURE_FLOOR) + 12, paddingBottom: Math.max(insets.bottom, GESTURE_FLOOR) + 12 }]}
        pointerEvents="box-none"
      >
        <Animated.View style={[styles.cardWrap, card]}>
          <Panel style={styles.panel}>
            <ScrollView bounces={false} showsVerticalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.scrollBody}>
              {title ? (
                <View style={styles.ribbon}>
                  <Text style={[type.title, styles.titleShadow]} numberOfLines={2} adjustsFontSizeToFit>{title}</Text>
                  <Text style={[type.title, styles.title]} numberOfLines={2} adjustsFontSizeToFit>{title}</Text>
                </View>
              ) : null}
              {children}
            </ScrollView>
          </Panel>
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  dim: { backgroundColor: "rgba(6,8,32,0.82)" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 22 },
  cardWrap: { width: "100%", maxWidth: 420, maxHeight: "100%" },
  panel: { maxHeight: "100%" },
  // The scroll area spans the whole card face (the Panel's padding moves inside it): a ScrollView clips, and the 3D
  // button lips/shadows at its edges were cut flat.
  scroll: { flexGrow: 0, margin: -22 },
  scrollBody: { padding: 22 },
  ribbon: { marginBottom: 14, alignItems: "center" },
  title: { color: palette.gold, textAlign: "center", textShadowColor: "rgba(0,0,0,0.55)", textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 1 },
  titleShadow: { position: "absolute", left: 0, right: 0, top: 3, color: "#3A1E00", textAlign: "center" },
});
