import React from "react";
import { View, StyleSheet } from "react-native";

interface HyderabadIconProps {
  size?: number;
  color?: string;
}

const ICON_SCALE = 1.2;
const DEFAULT_COLOR = "#A087E8";

export default function HyderabadIconSimple({ size = 36, color = DEFAULT_COLOR }: HyderabadIconProps) {
  const scale = size / 36;
  const borderWidth = 1.5 * scale;
  const bottom = size * 0.1;

  return (
    <View style={[styles.container, { width: size, height: size }]} pointerEvents="none">
      <View style={[styles.iconWrap, { width: size, height: size, transform: [{ scale: ICON_SCALE }] }]}>
      {/* Base */}
      <View style={[styles.lineArt, {
          width: size * 0.7, height: borderWidth, backgroundColor: color, borderWidth: 0,
          bottom: bottom, left: size * 0.15
      }]} />

      {/* --- LEFT MINARET --- */}
      {/* Lower Shaft */}
      <View style={[styles.lineArt, {
          width: size * 0.08, height: size * 0.25, borderWidth, borderBottomWidth: 0,
          bottom: bottom, left: size * 0.2
      }]} />
      {/* Lower Ring (Bulge) */}
      <View style={[styles.lineArt, {
          width: size * 0.12, height: size * 0.04, borderWidth, borderRadius: size * 0.02,
          bottom: bottom + (size * 0.23), left: size * 0.18
      }]} />
       {/* Upper Shaft */}
       <View style={[styles.lineArt, {
          width: size * 0.07, height: size * 0.2, borderWidth, borderBottomWidth: 0, borderTopWidth: 0,
          bottom: bottom + (size * 0.27), left: size * 0.205
      }]} />
       {/* Upper Ring (Bulge) */}
       <View style={[styles.lineArt, {
          width: size * 0.1, height: size * 0.03, borderWidth, borderRadius: size * 0.02,
          bottom: bottom + (size * 0.45), left: size * 0.19
      }]} />
      {/* Top Shaft */}
      <View style={[styles.lineArt, {
          width: size * 0.06, height: size * 0.15, borderWidth, borderBottomWidth: 0, borderTopWidth: 0,
          bottom: bottom + (size * 0.48), left: size * 0.21
      }]} />
      {/* Minaret Dome */}
      <View style={[styles.lineArt, {
          width: size * 0.06, height: size * 0.06, borderWidth, borderBottomWidth: 0,
          bottom: bottom + (size * 0.63), left: size * 0.21,
          borderTopLeftRadius: size * 0.03, borderTopRightRadius: size * 0.03
      }]} />


      {/* --- RIGHT MINARET --- */}
      {/* Lower Shaft */}
      <View style={[styles.lineArt, {
          width: size * 0.08, height: size * 0.25, borderWidth, borderBottomWidth: 0,
          bottom: bottom, right: size * 0.2
      }]} />
      {/* Lower Ring */}
      <View style={[styles.lineArt, {
          width: size * 0.12, height: size * 0.04, borderWidth, borderRadius: size * 0.02,
          bottom: bottom + (size * 0.23), right: size * 0.18
      }]} />
       {/* Upper Shaft */}
       <View style={[styles.lineArt, {
          width: size * 0.07, height: size * 0.2, borderWidth, borderBottomWidth: 0, borderTopWidth: 0,
          bottom: bottom + (size * 0.27), right: size * 0.205
      }]} />
       {/* Upper Ring */}
       <View style={[styles.lineArt, {
          width: size * 0.1, height: size * 0.03, borderWidth, borderRadius: size * 0.02,
          bottom: bottom + (size * 0.45), right: size * 0.19
      }]} />
      {/* Top Shaft */}
      <View style={[styles.lineArt, {
          width: size * 0.06, height: size * 0.15, borderWidth, borderBottomWidth: 0, borderTopWidth: 0,
          bottom: bottom + (size * 0.48), right: size * 0.21
      }]} />
      {/* Minaret Dome */}
      <View style={[styles.lineArt, {
          width: size * 0.06, height: size * 0.06, borderWidth, borderBottomWidth: 0,
          bottom: bottom + (size * 0.63), right: size * 0.21,
          borderTopLeftRadius: size * 0.03, borderTopRightRadius: size * 0.03
      }]} />


      {/* --- CENTRAL BOX & ARCH --- */}
      {/* Main Arch Block */}
      <View style={[styles.lineArt, {
          width: size * 0.36, height: size * 0.25, borderWidth, borderBottomWidth: 0,
          bottom: bottom, left: size * 0.32
      }]} />
      {/* The Arch opening */}
      <View style={[styles.lineArt, {
          width: size * 0.2, height: size * 0.18, borderWidth, borderBottomWidth: 0,
          bottom: bottom, left: size * 0.4,
          borderTopLeftRadius: size * 0.1, borderTopRightRadius: size * 0.1
      }]} />

      {/* Balcony Box (Upper Center) */}
      <View style={[styles.lineArt, {
          width: size * 0.36, height: size * 0.08, borderWidth,
          bottom: bottom + (size * 0.25), left: size * 0.32
      }]} />
      {/* Balcony Vertical Grills */}
      <View style={[styles.lineArt, { width: borderWidth, height: size * 0.08, backgroundColor: color, borderWidth: 0, bottom: bottom + (size * 0.25), left: size * 0.38 }]} />
      <View style={[styles.lineArt, { width: borderWidth, height: size * 0.08, backgroundColor: color, borderWidth: 0, bottom: bottom + (size * 0.25), left: size * 0.44 }]} />
      <View style={[styles.lineArt, { width: borderWidth, height: size * 0.08, backgroundColor: color, borderWidth: 0, bottom: bottom + (size * 0.25), left: size * 0.50 }]} />
      <View style={[styles.lineArt, { width: borderWidth, height: size * 0.08, backgroundColor: color, borderWidth: 0, bottom: bottom + (size * 0.25), left: size * 0.56 }]} />
      <View style={[styles.lineArt, { width: borderWidth, height: size * 0.08, backgroundColor: color, borderWidth: 0, bottom: bottom + (size * 0.25), left: size * 0.62 }]} />

      {/* Small Central Domes */}
      <View style={[styles.lineArt, {
          width: size * 0.06, height: size * 0.04, borderWidth, borderBottomWidth: 0,
          bottom: bottom + (size * 0.33), left: size * 0.36,
          borderTopLeftRadius: size * 0.03, borderTopRightRadius: size * 0.03
      }]} />
      <View style={[styles.lineArt, {
          width: size * 0.06, height: size * 0.04, borderWidth, borderBottomWidth: 0,
          bottom: bottom + (size * 0.33), right: size * 0.36,
          borderTopLeftRadius: size * 0.03, borderTopRightRadius: size * 0.03
      }]} />

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "relative", justifyContent: "center", alignItems: "center" },
  iconWrap: { position: "absolute", justifyContent: "center", alignItems: "center" },
  lineArt: { position: "absolute", backgroundColor: "transparent", borderColor: DEFAULT_COLOR },
});