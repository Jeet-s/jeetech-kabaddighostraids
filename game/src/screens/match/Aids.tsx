import { memo, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { Canvas, DashPathEffect, Group, Line, Oval, vec } from "@shopify/react-native-skia";
import { fonts } from "../../ui";

/**
 * Teaching aids drawn on the mat for units with `UnitDef.show` (display only — every number is the engine's):
 * cover radius rings (L6), the Anchor's range (L36), the Blockers' linked arms on the midline (L14).
 */
export type AidRing = { x: number; y: number; rx: number; ry: number; color: string; fill?: string; dash?: boolean; width?: number };
export type AidWall = { x1: number; x2: number; y: number; nodes: number[] };

type Props = { w: number; h: number; rings: AidRing[]; wall: AidWall | null };

const sig = (p: Props) => `${p.w}x${p.h}|${JSON.stringify(p.rings)}|${JSON.stringify(p.wall)}`;

/** Static per decision: memoised on the drawn shapes, so it redraws only when an aid actually changes. */
export const AidCanvas = memo(AidView, (a: Props, b: Props) => sig(a) === sig(b));

function AidView({ w, h, rings, wall }: Props) {
  return (
    <Canvas style={{ position: "absolute", left: 0, top: 0, width: w, height: h }} pointerEvents="none">
      {rings.map((r, i) => (
        <Group key={i}>
          {r.fill ? <Oval x={r.x - r.rx} y={r.y - r.ry} width={r.rx * 2} height={r.ry * 2} color={r.fill} /> : null}
          <Oval x={r.x - r.rx} y={r.y - r.ry} width={r.rx * 2} height={r.ry * 2} style="stroke" strokeWidth={r.width ?? 3} color={r.color}>
            {r.dash ? <DashPathEffect intervals={[8, 6]} /> : null}
          </Oval>
        </Group>
      ))}
      {wall ? (
        <Group>
          {/* the Blockers' linked arms: a thick blue bar on the midline, a fist at each Blocker */}
          <Line p1={vec(wall.x1, wall.y + 3)} p2={vec(wall.x2, wall.y + 3)} strokeWidth={13} color="rgba(0,0,0,0.3)" strokeCap="round" />
          <Line p1={vec(wall.x1, wall.y)} p2={vec(wall.x2, wall.y)} strokeWidth={10} color="#4B6BFF" strokeCap="round" />
          <Line p1={vec(wall.x1, wall.y)} p2={vec(wall.x2, wall.y)} strokeWidth={3} color="#C9D4FF" strokeCap="round">
            <DashPathEffect intervals={[10, 7]} />
          </Line>
          {wall.nodes.map((x, i) => (
            <Group key={i}>
              <Oval x={x - 8} y={wall.y - 8} width={16} height={16} color="#1B2A8F" />
              <Oval x={x - 8} y={wall.y - 8} width={16} height={16} style="stroke" strokeWidth={2.5} color="#C9D4FF" />
            </Group>
          ))}
        </Group>
      ) : null}
    </Canvas>
  );
}

/** A small % tag sitting on a ring's front edge. */
export function AidLabel({ x, y, text, color }: { x: number; y: number; text: string; color: string }) {
  return (
    <View pointerEvents="none" style={[styles.label, { left: x - 20, top: y, borderColor: color }]}>
      <Text style={[styles.labelText, { color }]} numberOfLines={1} adjustsFontSizeToFit>{text}</Text>
    </View>
  );
}

/** The aid's caption, in the mat's top-left corner (clear of the formation and the raider's lane). */
export function AidCaption({ title, body, maxW }: { title: string; body: string; maxW: number }) {
  return (
    <View pointerEvents="none" style={[styles.caption, { maxWidth: maxW }]}>
      <Text style={styles.captionTitle} numberOfLines={1} adjustsFontSizeToFit>{title}</Text>
      {body ? <Text style={styles.captionBody} numberOfLines={4}>{body}</Text> : null}
    </View>
  );
}

/** "FEINT?" over the CPU raider: a finite flicker (his hips turned before the shown move — the telegraph is a lie). */
export function FeintTag({ x, y, n }: { x: number; y: number; n: number }) {
  const o = useSharedValue(1);
  useEffect(() => {
    o.value = 1;
    o.value = withRepeat(withSequence(withTiming(0.2, { duration: 110 }), withTiming(1, { duration: 110 })), 8);
  }, [n, o]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View pointerEvents="none" style={[styles.feint, { left: x - 34, top: Math.max(2, y) }, st]}>
      <Text style={styles.feintText}>FEINT?</Text>
    </Animated.View>
  );
}

/** Midline label for the Blockers' wall. */
export function WallLabel({ x, y }: { x: number; y: number }) {
  return (
    <View pointerEvents="none" style={[styles.wallTag, { left: x, top: y }]}>
      <Text style={styles.wallText}>WALL · DASH SHUT</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { position: "absolute", width: 40, alignItems: "center", backgroundColor: "rgba(6,8,30,0.88)", borderRadius: 7, borderWidth: 1, paddingVertical: 0, zIndex: 400 },
  labelText: { fontFamily: fonts.display, fontSize: 10, lineHeight: 13 },
  caption: { position: "absolute", left: 4, top: 4, backgroundColor: "rgba(6,8,30,0.8)", borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,201,60,0.7)", paddingHorizontal: 6, paddingVertical: 3, zIndex: 40 },
  captionTitle: { fontFamily: fonts.display, fontSize: 10, letterSpacing: 0.5, color: "#FFC93C" },
  captionBody: { fontFamily: fonts.body, fontSize: 10, lineHeight: 12, color: "#fff" },
  feint: { position: "absolute", width: 68, alignItems: "center", backgroundColor: "#FF4D55", borderRadius: 8, borderWidth: 1.5, borderColor: "#FFE9A8", paddingVertical: 1, zIndex: 400 },
  feintText: { fontFamily: fonts.display, fontSize: 12, color: "#fff", letterSpacing: 1 },
  wallTag: { position: "absolute", backgroundColor: "rgba(27,42,143,0.9)", borderRadius: 6, borderWidth: 1, borderColor: "#C9D4FF", paddingHorizontal: 5, zIndex: 40 },
  wallText: { fontFamily: fonts.display, fontSize: 9, color: "#fff", letterSpacing: 0.5 },
});
