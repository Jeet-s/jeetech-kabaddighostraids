/**
 * Design tokens. Every screen uses these — never raw colours, sizes or system
 * fonts. The builder re-skins a game by editing `palette` (from the art bible),
 * not by hard-coding styles in components.
 */
export const palette = {
  // Brand (docs/ART_DIRECTION.md UI kit tokens)
  primary: "#FFB400",
  primaryDark: "#C77700",
  secondary: "#2D3BCB",
  secondaryDark: "#1B1F5E",
  accent: "#12B5E5",
  accentDark: "#0A7FA6",
  danger: "#E8363D",
  dangerDark: "#A81E26",
  // Surfaces: deep indigo glass with gold trim
  bgTop: "#2A2F8F",
  bgBottom: "#0B0D2B",
  surface: "#1E2370",
  surfaceAlt: "#141857",
  surfaceDark: "#10133F",
  gold: "#FFC93C",
  goldDark: "#9A6A00",
  ink: "#F4EBD8",
  inkSoft: "#B9B6D9",
  onPrimary: "#3A2200",
  // Game feedback
  star: "#FFD24A",
  coin: "#FFC23D",
  success: "#3DDC84",
  ghost: "#4FE3FF",
  mine: "#FF8A1F",
  theirs: "#16B8C4",
};

export const fonts = {
  display: "Fredoka_700Bold",
  displayMedium: "Fredoka_600SemiBold",
  body: "Nunito_700Bold",
  bodyRegular: "Nunito_600SemiBold",
};

export const radius = { sm: 12, md: 18, lg: 26, xl: 36, pill: 999 };
export const space = { xs: 4, sm: 8, md: 14, lg: 20, xl: 28, xxl: 40 };

export const type = {
  hero: { fontFamily: fonts.display, fontSize: 44, letterSpacing: 0.5 },
  title: { fontFamily: fonts.display, fontSize: 30 },
  heading: { fontFamily: fonts.displayMedium, fontSize: 22 },
  body: { fontFamily: fonts.body, fontSize: 16 },
  caption: { fontFamily: fonts.bodyRegular, fontSize: 13 },
  button: { fontFamily: fonts.display, fontSize: 20, letterSpacing: 0.6 },
};

/** Soft drop shadow used on cards and buttons (iOS + Android). */
export const shadow = {
  shadowColor: "#0B0626",
  shadowOpacity: 0.35,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 8 },
  elevation: 10,
};

/** Spring presets — use these so every animation in the game feels consistent. */
export const springs = {
  press: { damping: 14, stiffness: 320, mass: 0.6 },
  pop: { damping: 9, stiffness: 220, mass: 0.7 },
  gentle: { damping: 18, stiffness: 140, mass: 1 },
};
