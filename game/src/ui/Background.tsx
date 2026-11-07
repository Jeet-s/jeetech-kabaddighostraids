import { memo } from "react";
import { Image, StyleSheet, View, useWindowDimensions, type ImageSourcePropType } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Canvas, Circle, BlurMask } from "@shopify/react-native-skia";
import { palette } from "./theme";

type BackgroundProps = { colors?: [string, string]; image?: ImageSourcePropType; dim?: number; children?: React.ReactNode };

/**
 * Full-screen arena backdrop: the chapter's illustrated background (explicit pixel size, cover-cropped), an indigo
 * depth-haze gradient and soft floodlight bloom. Memoised: it sits under the game screen, which re-renders on every
 * decision — an unmemoised blurred Skia canvas redrawn per tap is soak-ANR fuel. Static, drawn once.
 */
export const Background = memo(
  BackgroundCanvas,
  (a: BackgroundProps, b: BackgroundProps) =>
    a.colors?.[0] === b.colors?.[0] && a.colors?.[1] === b.colors?.[1] && a.children === b.children && a.image === b.image && a.dim === b.dim,
);

function BackgroundCanvas({ colors, image, dim = 0.35, children }: BackgroundProps) {
  const { width, height } = useWindowDimensions();
  const [top, bottom] = colors ?? [palette.bgTop, palette.bgBottom];
  // The art is 1080x1920 (9:16): cover the window without distortion.
  const scale = Math.max(width / 1080, height / 1920);
  const iw = Math.ceil(1080 * scale), ih = Math.ceil(1920 * scale);
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: "hidden" }]} pointerEvents="none">
      <LinearGradient colors={[top, bottom]} style={StyleSheet.absoluteFill} />
      {image ? (
        <Image source={image} style={{ position: "absolute", width: iw, height: ih, left: (width - iw) / 2, top: (height - ih) / 2 }} resizeMode="cover" />
      ) : null}
      <LinearGradient
        colors={[`rgba(11,13,43,${dim * 0.6})`, `rgba(27,31,94,${dim * 0.25})`, `rgba(11,13,43,${Math.min(0.95, dim + 0.35)})`]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Circle cx={width * 0.15} cy={height * 0.1} r={width * 0.3} color="rgba(255,214,140,0.10)">
          <BlurMask blur={40} style="normal" />
        </Circle>
        <Circle cx={width * 0.88} cy={height * 0.12} r={width * 0.3} color="rgba(255,214,140,0.10)">
          <BlurMask blur={40} style="normal" />
        </Circle>
        <Circle cx={width * 0.5} cy={height * 1.02} r={width * 0.6} color="rgba(18,181,229,0.10)">
          <BlurMask blur={60} style="normal" />
        </Circle>
      </Canvas>
      {children}
    </View>
  );
}
