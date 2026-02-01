import React from "react";
import { View, StyleSheet } from "react-native";

interface BengaluruIconProps {
  size?: number;
  color?: string;
}

// Vidhana Soudha representation matching the specific line-art reference
const ICON_SCALE = 1.2;
const DEFAULT_COLOR = "#A087E8";

export default function BengaluruIconSimple({ size = 36, color = DEFAULT_COLOR }: BengaluruIconProps) {
  const scale = size / 36;
  const borderWidth = 1.5 * scale;

  // Vertical reference point
  const bottomBase = size * 0.1;

  return (
    <View style={[styles.container, { width: size, height: size }]} pointerEvents="none">
      <View style={[styles.iconWrap, { width: size, height: size, transform: [{ scale: ICON_SCALE }] }]}>
      {/* --- Base Line --- */}
      <View style={[styles.lineArt, {
          width: size * 0.9, height: borderWidth, backgroundColor: color, borderWidth: 0,
          bottom: bottomBase, left: size * 0.05
      }]} />

      {/* --- CENTER STRUCTURE --- */}
      
      {/* 1. Central Dome */}
      <View style={[styles.lineArt, {
          width: size * 0.3, height: size * 0.18, borderWidth, borderBottomWidth: 0,
          bottom: bottomBase + (size * 0.35), left: size * 0.35,
          borderTopLeftRadius: size * 0.15, borderTopRightRadius: size * 0.15
      }]} />
      {/* Dome Finial (Top stick) */}
      <View style={[styles.lineArt, {
          width: borderWidth, height: size * 0.05, backgroundColor: color, borderWidth: 0,
          bottom: bottomBase + (size * 0.53), left: size * 0.5 - (borderWidth/2)
      }]} />

      {/* 2. Central Roof Eave (Upper) */}
      <View style={[styles.lineArt, {
          width: size * 0.34, height: size * 0.04, borderWidth, 
          bottom: bottomBase + (size * 0.31), left: size * 0.33,
          backgroundColor: 'transparent' // acts as the cornice
      }]} />

      {/* 3. Central Pillar Block */}
      <View style={[styles.lineArt, {
          width: size * 0.26, height: size * 0.2, borderWidth, borderBottomWidth: 0, borderTopWidth: 0,
          bottom: bottomBase + (size * 0.11), left: size * 0.37
      }]} />
      {/* Center Vertical Lines (Pillars) */}
      <View style={[styles.lineArt, {
          width: borderWidth, height: size * 0.2, backgroundColor: color, borderWidth: 0,
          bottom: bottomBase + (size * 0.11), left: size * 0.43
      }]} />
      <View style={[styles.lineArt, {
          width: borderWidth, height: size * 0.2, backgroundColor: color, borderWidth: 0,
          bottom: bottomBase + (size * 0.11), right: size * 0.43
      }]} />

      {/* 4. Central Roof Eave (Lower / Porch) */}
      <View style={[styles.lineArt, {
          width: size * 0.34, height: size * 0.04, borderWidth,
          bottom: bottomBase + (size * 0.07), left: size * 0.33,
      }]} />


      {/* --- INNER FLANKING TOWERS (Small ones next to center) --- */}
      
      {/* Left Inner Tower */}
      <View style={[styles.lineArt, {
          width: size * 0.08, height: size * 0.25, borderWidth, borderBottomWidth: 0,
          bottom: bottomBase, left: size * 0.25
      }]} />
      {/* Left Inner Dome */}
      <View style={[styles.lineArt, {
          width: size * 0.08, height: size * 0.06, borderWidth, borderBottomWidth: 0,
          bottom: bottomBase + (size * 0.25), left: size * 0.25,
          borderTopLeftRadius: size * 0.04, borderTopRightRadius: size * 0.04
      }]} />

      {/* Right Inner Tower */}
      <View style={[styles.lineArt, {
          width: size * 0.08, height: size * 0.25, borderWidth, borderBottomWidth: 0,
          bottom: bottomBase, right: size * 0.25
      }]} />
      {/* Right Inner Dome */}
      <View style={[styles.lineArt, {
          width: size * 0.08, height: size * 0.06, borderWidth, borderBottomWidth: 0,
          bottom: bottomBase + (size * 0.25), right: size * 0.25,
          borderTopLeftRadius: size * 0.04, borderTopRightRadius: size * 0.04
      }]} />


      {/* --- OUTER TOWERS (Tall ones on far ends) --- */}

      {/* Left Outer Tower */}
      <View style={[styles.lineArt, {
          width: size * 0.1, height: size * 0.4, borderWidth, borderBottomWidth: 0,
          bottom: bottomBase, left: size * 0.08
      }]} />
      {/* Left Outer Dome */}
      <View style={[styles.lineArt, {
          width: size * 0.1, height: size * 0.08, borderWidth, borderBottomWidth: 0,
          bottom: bottomBase + (size * 0.4), left: size * 0.08,
          borderTopLeftRadius: size * 0.05, borderTopRightRadius: size * 0.05
      }]} />
       {/* Left Finial */}
       <View style={[styles.lineArt, {
          width: borderWidth, height: size * 0.03, backgroundColor: color, borderWidth: 0,
          bottom: bottomBase + (size * 0.48), left: size * 0.13 - (borderWidth/2)
      }]} />


      {/* Right Outer Tower */}
      <View style={[styles.lineArt, {
          width: size * 0.1, height: size * 0.4, borderWidth, borderBottomWidth: 0,
          bottom: bottomBase, right: size * 0.08
      }]} />
      {/* Right Outer Dome */}
      <View style={[styles.lineArt, {
          width: size * 0.1, height: size * 0.08, borderWidth, borderBottomWidth: 0,
          bottom: bottomBase + (size * 0.4), right: size * 0.08,
          borderTopLeftRadius: size * 0.05, borderTopRightRadius: size * 0.05
      }]} />
      {/* Right Finial */}
      <View style={[styles.lineArt, {
          width: borderWidth, height: size * 0.03, backgroundColor: color, borderWidth: 0,
          bottom: bottomBase + (size * 0.48), right: size * 0.13 - (borderWidth/2)
      }]} />


      {/* --- CONNECTING WINGS (Horizontal lines) --- */}
      
      {/* Left Wing */}
      <View style={[styles.lineArt, {
          width: size * 0.07, height: borderWidth, backgroundColor: color, borderWidth: 0,
          bottom: bottomBase + (size * 0.25), left: size * 0.18
      }]} />
      <View style={[styles.lineArt, {
          width: size * 0.07, height: borderWidth, backgroundColor: color, borderWidth: 0,
          bottom: bottomBase + (size * 0.15), left: size * 0.18
      }]} />

      {/* Right Wing */}
      <View style={[styles.lineArt, {
          width: size * 0.07, height: borderWidth, backgroundColor: color, borderWidth: 0,
          bottom: bottomBase + (size * 0.25), right: size * 0.18
      }]} />
      <View style={[styles.lineArt, {
          width: size * 0.07, height: borderWidth, backgroundColor: color, borderWidth: 0,
          bottom: bottomBase + (size * 0.15), right: size * 0.18
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