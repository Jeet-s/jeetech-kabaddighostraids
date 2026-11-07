import { memo, useEffect, useMemo } from "react";
import { useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { Canvas, Circle, DashPathEffect, Group, LinearGradient, Path, Skia, vec } from "@shopify/react-native-skia";
import { makeGeom } from "./geom";
import { matStyle } from "../../game/meta";

type Props = { w: number; h: number; ch: number; defend: boolean; path: { x1: number; y1: number; x2: number; y2: number; color: string } | null;
  /** non-zero (a new id per telegraph): the path flickers a few times — the CPU raider's feint tell (finite). */
  flick?: number };

/**
 * The kabaddi mat (static per raid): gold-trimmed frame, the chapter's surface, lobbies, end line, the midline,
 * baulk and bonus lines, and the planned raid / telegraphed path as a glowing dashed line with an end node.
 * Memoised on plain props — it redraws only when the side or the path changes, never on unrelated renders.
 */
export const MatCanvas = memo(MatView, (a: Props, b: Props) =>
  a.w === b.w && a.h === b.h && a.ch === b.ch && a.defend === b.defend &&
  a.path?.x1 === b.path?.x1 && a.path?.y1 === b.path?.y1 && a.path?.x2 === b.path?.x2 && a.path?.y2 === b.path?.y2 && a.path?.color === b.path?.color && (a.flick ?? 0) === (b.flick ?? 0));

function quad(P: ReturnType<typeof makeGeom>["P"], u0: number, u1: number, d0: number, d1: number) {
  const b = Skia.PathBuilder.Make();
  const a = P(u0, d0), c = P(u1, d0), e = P(u1, d1), f = P(u0, d1);
  b.moveTo(a.x, a.y); b.lineTo(c.x, c.y); b.lineTo(e.x, e.y); b.lineTo(f.x, f.y); b.close();
  return b.detach();
}
function line(P: ReturnType<typeof makeGeom>["P"], u0: number, u1: number, d: number) {
  const b = Skia.PathBuilder.Make();
  const a = P(u0, d), c = P(u1, d);
  b.moveTo(a.x, a.y); b.lineTo(c.x, c.y);
  return b.detach();
}
function side(P: ReturnType<typeof makeGeom>["P"], u: number, d0: number, d1: number) {
  const b = Skia.PathBuilder.Make();
  const a = P(u, d0), c = P(u, d1);
  b.moveTo(a.x, a.y); b.lineTo(c.x, c.y);
  return b.detach();
}

function MatView({ w, h, ch, defend, path, flick = 0 }: Props) {
  const op = useSharedValue(1);
  useEffect(() => {
    op.value = 1;
    if (flick) op.value = withRepeat(withSequence(withTiming(0.15, { duration: 110 }), withTiming(1, { duration: 110 })), 8);
  }, [flick, op]);
  const g = useMemo(() => makeGeom(w, h), [w, h]);
  const st = matStyle(ch);
  const paths = useMemo(() => {
    const { P } = g;
    const mid = defend ? 1 : 0, end = defend ? 0 : 1;
    const dl = (x: number) => (defend ? 1 - x : x);
    const grain = Array.from({ length: 9 }, (_, i) => line(P, -0.86, 0.86, 0.06 + i * 0.11));
    return {
      frame: quad(P, -1.05, 1.05, -0.02, 1.03),
      surface: quad(P, -0.86, 0.86, 0, 1),
      lobbyL: quad(P, -1, -0.86, 0, 1),
      lobbyR: quad(P, 0.86, 1, 0, 1),
      end: line(P, -1, 1, end),
      mid: line(P, -1, 1, mid),
      baulk: line(P, -0.86, 0.86, dl(g.baulk)),
      bonus: line(P, -0.86, 0.86, dl(g.bonus)),
      sideL: side(P, -0.86, 0, 1),
      sideR: side(P, 0.86, 0, 1),
      grain,
      sheen: quad(P, -0.86, 0.86, 0.45, 0.62),
      top: P(0, 1).y, bottom: P(0, 0).y,
    };
  }, [g, defend]);
  const linePath = useMemo(() => {
    if (!path) return null;
    const b = Skia.PathBuilder.Make();
    const mx = (path.x1 + path.x2) / 2 + (path.x2 - path.x1) * 0.1, my = Math.min(path.y1, path.y2) + Math.abs(path.y2 - path.y1) * 0.35;
    b.moveTo(path.x1, path.y1);
    b.quadTo(mx, my, path.x2, path.y2);
    return b.detach();
  }, [path]);
  return (
    <Canvas style={{ width: w, height: h }} pointerEvents="none">
      {/* frame: gold bevel with a dark inner edge */}
      <Path path={paths.frame} color="rgba(4,5,22,0.55)" transform={[{ translateY: 7 }]} />
      <Path path={paths.frame} color={st.frame} />
      <Path path={paths.frame} style="stroke" strokeWidth={2} color="rgba(255,255,255,0.55)" />
      <Path path={paths.lobbyL} color={st.lobby} />
      <Path path={paths.lobbyR} color={st.lobby} />
      <Path path={paths.surface}>
        <LinearGradient start={vec(0, paths.top)} end={vec(0, paths.bottom)} colors={[st.bottom, st.top]} />
      </Path>
      {paths.grain.map((p, i) => (
        <Path key={i} path={p} style="stroke" strokeWidth={1} color={i % 2 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)"} />
      ))}
      <Path path={paths.sheen} color="rgba(255,255,255,0.07)" />
      <Group>
        <Path path={paths.sideL} style="stroke" strokeWidth={3} color={st.line} />
        <Path path={paths.sideR} style="stroke" strokeWidth={3} color={st.line} />
        <Path path={paths.end} style="stroke" strokeWidth={4} color={st.line} />
        <Path path={paths.baulk} style="stroke" strokeWidth={3} color={st.line} />
        <Path path={paths.bonus} style="stroke" strokeWidth={3} color="#FFD23F">
          <DashPathEffect intervals={[14, 8]} />
        </Path>
        {/* the midline glows: crossing it back is what scores */}
        <Path path={paths.mid} style="stroke" strokeWidth={12} color="rgba(255,90,60,0.35)" />
        <Path path={paths.mid} style="stroke" strokeWidth={5} color="#FF5A3C" />
      </Group>
      {linePath && path ? (
        <Group opacity={op}>
          <Path path={linePath} style="stroke" strokeWidth={9} color="rgba(0,0,0,0.25)" strokeCap="round" />
          <Path path={linePath} style="stroke" strokeWidth={5} color={path.color} strokeCap="round">
            <DashPathEffect intervals={[12, 9]} />
          </Path>
          <Circle cx={path.x2} cy={path.y2} r={12} color="rgba(255,255,255,0.25)" />
          <Circle cx={path.x2} cy={path.y2} r={7} color={path.color} />
        </Group>
      ) : null}
    </Canvas>
  );
}
