import React from "react";
import { View, StyleSheet } from "react-native";

interface MumbaiIconProps {
  size?: number;
  color?: string;
}

// Gateway of India representation using Views only, matching the reference image
const ICON_SCALE = 1.2;
const DEFAULT_COLOR = "#A087E8";

export default function MumbaiIconSimple({ size = 36, color = DEFAULT_COLOR }: MumbaiIconProps) {
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
      
      {/* --- Main Towers --- */}
      {/* Left main pillar shaft */}
      <View style={[
        styles.lineArt,
        {
          width: size * 0.12,
          height: size * 0.5,
          borderWidth,
          borderRadius: size * 0.02,
          left: size * 0.25,
          bottom: size * 0.08,
        }
      ]} />
      {/* Right main pillar shaft */}
      <View style={[
        styles.lineArt,
        {
          width: size * 0.12,
          height: size * 0.5,
          borderWidth,
          borderRadius: size * 0.02,
          right: size * 0.25,
          bottom: size * 0.08,
        }
      ]} />
      
      {/* Left pillar dome/top */}
      <View style={[
        styles.arch,
        {
          width: size * 0.12,
          height: size * 0.15,
          borderWidth,
          borderBottomWidth: borderWidth, // Full border for the dome
          borderTopLeftRadius: size * 0.06,
          borderTopRightRadius: size * 0.06,
          left: size * 0.25,
          top: size * 0.2,
        }
      ]} />
      {/* Right pillar dome/top */}
      <View style={[
        styles.arch,
        {
          width: size * 0.12,
          height: size * 0.15,
          borderWidth,
          borderBottomWidth: borderWidth, // Full border for the dome
          borderTopLeftRadius: size * 0.06,
          borderTopRightRadius: size * 0.06,
          right: size * 0.25,
          top: size * 0.2,
        }
      ]} />

      {/* --- Tower Segmentation Lines --- */}
      {/* Top lines on towers */}
      <View style={[styles.hline, { width: size * 0.12, height: borderWidth, left: size * 0.25, top: size * 0.35, backgroundColor: color }]} />
      <View style={[styles.hline, { width: size * 0.12, height: borderWidth, right: size * 0.25, top: size * 0.35, backgroundColor: color }]} />
      {/* Middle lines on towers */}
      <View style={[styles.hline, { width: size * 0.12, height: borderWidth, left: size * 0.25, top: size * 0.48, backgroundColor: color }]} />
      <View style={[styles.hline, { width: size * 0.12, height: borderWidth, right: size * 0.25, top: size * 0.48, backgroundColor: color }]} />
      {/* Bottom lines on towers (just above the arches) */}
      <View style={[styles.hline, { width: size * 0.12, height: borderWidth, left: size * 0.25, top: size * 0.6, backgroundColor: color }]} />
      <View style={[styles.hline, { width: size * 0.12, height: borderWidth, right: size * 0.25, top: size * 0.6, backgroundColor: color }]} />

      {/* --- Top Structure --- */}
      {/* Top horizontal structure container */}
      <View style={[
        styles.lineArt,
        {
          width: size * 0.38,
          height: size * 0.12,
          borderWidth,
          borderRadius: size * 0.02,
          top: size * 0.35,
        }
      ]} />
      {/* Lines inside top structure */}
      <View style={[styles.hline, { width: size * 0.38, height: borderWidth, top: size * 0.39, backgroundColor: color }]} />
      <View style={[styles.hline, { width: size * 0.38, height: borderWidth, top: size * 0.43, backgroundColor: color }]} />
      
      {/* --- Central Section --- */}
      {/* Line above central arch */}
      <View style={[styles.hline, { width: size * 0.38, height: borderWidth, top: size * 0.52, backgroundColor: color }]} />
      
      {/* Central arch */}
      <View style={[
        styles.arch,
        {
          width: size * 0.28,
          height: size * 0.35,
          borderWidth,
          borderTopLeftRadius: size * 0.14,
          borderTopRightRadius: size * 0.14,
          bottom: size * 0.08,
        }
      ]} />
      
      {/* --- Side Sections (Wings) --- */}
      {/* Left side wing outer frame */}
      <View style={[
        styles.lineArt,
        {
          width: size * 0.18,
          height: size * 0.3,
          borderWidth,
          left: size * 0.05,
          bottom: size * 0.08,
          borderTopLeftRadius: size * 0.02,
        }
      ]} />
      {/* Right side wing outer frame */}
      <View style={[
        styles.lineArt,
        {
          width: size * 0.18,
          height: size * 0.3,
          borderWidth,
          right: size * 0.05,
          bottom: size * 0.08,
          borderTopRightRadius: size * 0.02,
        }
      ]} />
      
      {/* Left side arch */}
      <View style={[
        styles.arch,
        {
          width: size * 0.1,
          height: size * 0.2,
          borderWidth,
          borderTopLeftRadius: size * 0.05,
          borderTopRightRadius: size * 0.05,
          left: size * 0.09,
          bottom: size * 0.08,
        }
      ]} />
      {/* Right side arch */}
      <View style={[
        styles.arch,
        {
          width: size * 0.1,
          height: size * 0.2,
          borderWidth,
          borderTopLeftRadius: size * 0.05,
          borderTopRightRadius: size * 0.05,
          right: size * 0.09,
          bottom: size * 0.08,
        }
      ]} />
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