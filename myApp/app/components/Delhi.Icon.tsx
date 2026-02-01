import React from "react";
import { View, StyleSheet } from "react-native";

interface DelhiIconProps {
  size?: number;
  color?: string;
}

// India Gate representation using Views only, matching the reference image
const ICON_SCALE = 1.2;
const DEFAULT_COLOR = "#A087E8";

export default function DelhiIconSimple({ size = 36, color = DEFAULT_COLOR }: DelhiIconProps) {
  const scale = size / 36;
  const borderWidth = 1.5 * scale;

  return (
    <View style={[styles.container, { width: size, height: size }]} pointerEvents="none">
      <View style={[styles.iconWrap, { width: size, height: size, transform: [{ scale: ICON_SCALE }] }]}>
      {/* Base platform */}
      <View style={[
        styles.base,
        {
          width: size * 0.95,
          height: borderWidth * 1.5,
          backgroundColor: color,
          bottom: size * 0.05,
        }
      ]} />
      
      {/* --- Main Body & Arch --- */}
      {/* Main Body Outline */}
      <View style={[
        styles.lineArt,
        {
          width: size * 0.7,
          height: size * 0.55,
          borderWidth,
          borderBottomWidth: 0,
          left: size * 0.15,
          bottom: size * 0.08,
        }
      ]} />

      {/* Central Arch */}
      <View style={[
        styles.arch,
        {
          width: size * 0.3,
          height: size * 0.35,
          borderWidth,
          borderTopLeftRadius: size * 0.15,
          borderTopRightRadius: size * 0.15,
          left: size * 0.35,
          bottom: size * 0.08,
        }
      ]} />

      {/* --- Front Pillars & Details --- */}
      {/* Left front pillar */}
      <View style={[
        styles.lineArt,
        {
          width: size * 0.08,
          height: size * 0.25,
          borderWidth,
          borderBottomWidth: 0,
          left: size * 0.25,
          bottom: size * 0.08,
        }
      ]} />
      {/* Right front pillar */}
      <View style={[
        styles.lineArt,
        {
          width: size * 0.08,
          height: size * 0.25,
          borderWidth,
          borderBottomWidth: 0,
          right: size * 0.25,
          bottom: size * 0.08,
        }
      ]} />

      {/* Left circle detail */}
      <View style={[
        styles.lineArt,
        {
          width: size * 0.08,
          height: size * 0.08,
          borderWidth,
          borderRadius: size * 0.04,
          left: size * 0.25,
          top: size * 0.45,
        }
      ]} />
      {/* Right circle detail */}
      <View style={[
        styles.lineArt,
        {
          width: size * 0.08,
          height: size * 0.08,
          borderWidth,
          borderRadius: size * 0.04,
          right: size * 0.25,
          top: size * 0.45,
        }
      ]} />

      {/* Rectangular plaque above arch */}
      <View style={[
        styles.lineArt,
        {
          width: size * 0.25,
          height: size * 0.05,
          borderWidth,
          left: size * 0.375,
          top: size * 0.38,
        }
      ]} />

      {/* --- Upper Stepped Section --- */}
      {/* Bottom Step */}
      <View style={[
        styles.lineArt,
        {
          width: size * 0.6,
          height: size * 0.08,
          borderWidth,
          borderBottomWidth: 0,
          left: size * 0.2,
          top: size * 0.24,
        }
      ]} />
      <View style={[styles.hline, { width: size * 0.6, height: borderWidth, left: size * 0.2, top: size * 0.32, backgroundColor: color }]} />
      
      {/* Middle Step */}
      <View style={[
        styles.lineArt,
        {
          width: size * 0.5,
          height: size * 0.08,
          borderWidth,
          borderBottomWidth: 0,
          left: size * 0.25,
          top: size * 0.16,
        }
      ]} />
      <View style={[styles.hline, { width: size * 0.5, height: borderWidth, left: size * 0.25, top: size * 0.24, backgroundColor: color }]} />
      
      {/* Top Dome-like Section */}
      <View style={[
        styles.lineArt,
        {
          width: size * 0.4,
          height: size * 0.08,
          borderWidth,
          borderBottomWidth: 0,
          left: size * 0.3,
          top: size * 0.08,
          borderTopLeftRadius: size * 0.05,
          borderTopRightRadius: size * 0.05,
        }
      ]} />
      <View style={[styles.hline, { width: size * 0.4, height: borderWidth, left: size * 0.3, top: size * 0.16, backgroundColor: color }]} />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  base: {
    position: "absolute",
  },
  iconWrap: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  lineArt: {
    position: "absolute",
    backgroundColor: "transparent",
    borderColor: DEFAULT_COLOR,
  },
  arch: {
    position: "absolute",
    backgroundColor: "transparent",
    borderColor: DEFAULT_COLOR,
    borderBottomWidth: 0,
  },
  hline: {
    position: "absolute",
  },
});
