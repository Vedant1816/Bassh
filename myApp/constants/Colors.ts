/**
 * Color theme for the Bassh app
 * Aligned with Figma "Home/Dark" design spec for uniform look across all components.
 */

import { Platform } from "react-native";

const tintColorLight = "#0a7ea4";
const tintColorDark = "#fff";

export const Colors = {
  dark: {
    // ─── Backgrounds (Figma: Home/Dark) ────────────────────────
    background: "#000000",
    surface: "#161616",
    card: "#161616",
    /** Carbon / Darkest – status bar BG */
    statusBarBg: "#24262B",
    /** Carbon Neutral/300 – status bar content area */
    neutral300: "#D6D9DD",

    // ─── Primary / Pink (Figma: linear-gradient 134.6deg #DB4494 → #DB138D) ───
    primary: "#DB4494",
    primaryDark: "#DB138D",
    /** Primary/primary-500 – input border (Figma) */
    primary500: "#F02DA4",
    primaryLight: "#F472B6",
    /** Primary/primary-400 – links, read more, see all */
    primary400: "#F357B6",
    /** Primary/primary-300 – icon borders (e.g. share) */
    primary300: "#F572C2",
    /** Open pill, accent pill */
    primaryAccent: "#DB2C90",
    /** Button border, CTA border */
    primaryBorder: "#FF007E",
    /** Purple badge (e.g. count) */
    primaryBadge: "#C7288A",
    primaryGlow: "rgba(255, 0, 126, 0.78)",
    /** Blur ellipse background */
    blurEllipse: "rgba(255, 0, 126, 0.78)",

    // ─── Text (Figma: White, Dark/dark-100, Dark/dark-200) ───────
    /** White – headings, body, input text */
    text: "#FFFFFF",
    /** Gray/gray-50 – primary text on dark */
    textPrimary: "#F0F1F3",
    /** Dark/dark-200 – secondary (address, description, labels) */
    textSecondary: "#929292",
    /** Dark/dark-100 – tertiary, muted (B6B6B6) */
    textTertiary: "#B6B6B6",
    /** Carbon Neutral/300 – footer text, joining label */
    textMuted: "#D6D9DD",
    /** A7AEC1, A2A2A2 – subtle text */
    textSubtle: "#A2A2A2",

    // ─── Borders (Figma) ───────────────────────────────────────
    border: "#353535",
    borderLight: "rgba(40, 38, 38, 0.4)",
    /** Line divider #565656 */
    divider: "#565656",
    /** Event card pink tint */
    borderPrimaryTint: "rgba(219, 39, 144, 0.41)",

    // ─── UI elements (Figma) ───────────────────────────────────
    /** Alerts/Warning – star, rating */
    rating: "#EDB900",
    /** Yellow/01 – review stars; Battery fill (F8CB2E) */
    ratingAlt: "#F8CB2E",
    /** SystemOrange / Light – recording indicator, etc. */
    systemOrange: "#FF9500",
    icon: "#9CA3AF",
    /** Bottom bar border */
    barBorder: "#222",

    // ─── Cards / overlays ───────────────────────────────────────
    /** Event card background */
    cardOverlay: "rgba(22, 22, 22, 0.36)",
    /** Club card dark overlay */
    cardDarkOverlay: "rgba(25, 25, 25, 0.8)",
    /** Offer card dark */
    offerCardBg: "rgba(30,30,30,0.95)",
    offerCardApplied: "rgba(255, 0, 126, 0.32)",
    offerCardDisabled: "rgba(55, 55, 55, 0.85)",

    // ─── Status ───────────────────────────────────────────────
    success: "#22C55E",
    successDim: "#4ADE80",
    successBg: "rgba(34, 197, 94, 0.1)",
    successBorder: "rgba(34, 197, 94, 0.3)",
    warning: "#FBBF24",
    warningBg: "rgba(251, 191, 36, 0.1)",
    warningBorder: "rgba(251, 191, 36, 0.3)",
    error: "#EF4444",
    errorBg: "rgba(239, 68, 68, 0.1)",
    errorBorder: "rgba(239, 68, 68, 0.3)",
    info: "#3B82F6",
    infoBg: "rgba(59, 130, 246, 0.1)",
    infoBorder: "rgba(59, 130, 246, 0.3)",

    // ─── Shadow (Figma 0px 1.35px 4.725px rgba(0,0,0,0.11)) ───
    shadow: "#000000",
    shadowOpacity: 0.11,

    tint: tintColorDark,
    tabIconDefault: "#9CA3AF",
    tabIconSelected: tintColorDark,
  },
  light: {
    text: "#11181C",
    background: "#fff",
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
  },
};

/** Primary gradient: linear-gradient(135.69deg, #DB4494 -18%, #DB138D 55.29%) – use everywhere for pink buttons/pills */
export const PrimaryGradient = [Colors.dark.primary, Colors.dark.primaryDark] as const;

/** LinearGradient direction for 135.69deg (top-left → bottom-right) */
export const PrimaryGradientStart = { x: 0, y: 0 } as const;
export const PrimaryGradientEnd = { x: 1, y: 1 } as const;

/** Header gradient: used for screen backgrounds (events.tsx pattern) */
export const HeaderGradient = ["#8B0045", "#2D0A1F", "#000000"] as const;
export const HeaderGradientLocations = [0, 0.4, 1] as const;

/** Header overlay gradient: used for floating headers over content (event/[id].tsx pattern) */
export const HeaderOverlayGradient = ["rgba(139, 0, 69, 0.95)", "rgba(80, 0, 40, 0.6)", "transparent"] as const;
export const HeaderOverlayGradientLocations = [0, 0.5, 1] as const;

/** Squircle border radius for 40x40 primary pill (Rectangle 1257) */
export const PrimaryPillBorderRadius = 10;

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
