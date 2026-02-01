import React from "react";
import { View, StyleSheet } from "react-native";

interface KolkataIconProps {
  size?: number;
  color?: string;
}

// Updated Victoria Memorial based on the specific line-art reference
const ICON_SCALE = 1.2;
const DEFAULT_COLOR = "#A087E8";

export default function KolkataIconSimple({ size = 36, color = DEFAULT_COLOR }: KolkataIconProps) {
  const scale = size / 36;
  const borderWidth = 1.5 * scale;
  
  // Dimensions relative to size
  const baseWidth = size * 0.9;
  const towerWidth = size * 0.1;
  const wingWidth = size * 0.18; // Sections between tower and center
  const centerWidth = size * 0.28;
  
  const towerHeight = size * 0.45;
  const wingHeight = size * 0.32;
  const centerBodyHeight = size * 0.35;
  const domeHeight = size * 0.18;

  const bottomOffset = size * 0.1; // Lift everything up slightly from absolute bottom

  return (
    <View style={[styles.container, { width: size, height: size }]} pointerEvents="none">
      <View style={[styles.iconWrap, { width: size, height: size, transform: [{ scale: ICON_SCALE }] }]}>
      {/* --- Base Line --- */}
      <View style={[styles.lineArt, {
          width: baseWidth, 
          height: borderWidth, 
          backgroundColor: color, 
          borderWidth: 0,
          bottom: bottomOffset,
          left: (size - baseWidth) / 2
      }]} />

      {/* --- FAR LEFT TOWER --- */}
      {/* Tower Body */}
      <View style={[styles.lineArt, {
          width: towerWidth, height: towerHeight, borderWidth, borderBottomWidth: 0,
          left: size * 0.08, bottom: bottomOffset
      }]} />
      {/* Tower Neck Line (small horizontal line near top) */}
      <View style={[styles.lineArt, {
          width: towerWidth, height: borderWidth, backgroundColor: color, borderWidth: 0,
          left: size * 0.08, bottom: bottomOffset + (towerHeight * 0.85)
      }]} />
      {/* Tower Dome */}
      <View style={[styles.lineArt, {
          width: towerWidth, height: towerWidth * 0.6, borderWidth, borderBottomWidth: 0,
          left: size * 0.08, bottom: bottomOffset + towerHeight,
          borderTopLeftRadius: towerWidth * 0.5, borderTopRightRadius: towerWidth * 0.5
      }]} />


      {/* --- LEFT WING (Grid Section) --- */}
      {/* Main Box */}
      <View style={[styles.lineArt, {
          width: wingWidth, height: wingHeight, borderWidth, borderBottomWidth: 0, borderRightWidth: 0, borderLeftWidth: 0, // Borders shared with neighbors
          left: size * 0.08 + towerWidth, bottom: bottomOffset
      }]} />
      {/* Horizontal Divider (Making the grid) */}
      <View style={[styles.lineArt, {
          width: wingWidth, height: borderWidth, backgroundColor: color, borderWidth: 0,
          left: size * 0.08 + towerWidth, bottom: bottomOffset + (wingHeight * 0.5)
      }]} />
       {/* Small Dome on Wing */}
       <View style={[styles.lineArt, {
          width: wingWidth * 0.5, height: wingWidth * 0.3, borderWidth, borderBottomWidth: 0,
          left: size * 0.08 + towerWidth + (wingWidth * 0.25), bottom: bottomOffset + wingHeight,
          borderTopLeftRadius: wingWidth * 0.25, borderTopRightRadius: wingWidth * 0.25
      }]} />


      {/* --- CENTER STRUCTURE --- */}
      {/* Center Body Box */}
      <View style={[styles.lineArt, {
          width: centerWidth, height: centerBodyHeight, borderWidth, borderBottomWidth: 0,
          left: (size - centerWidth) / 2, bottom: bottomOffset
      }]} />
      
      {/* Main Arch */}
      <View style={[styles.lineArt, {
          width: centerWidth * 0.5, height: centerBodyHeight * 0.7, borderWidth, borderBottomWidth: 0,
          left: (size - (centerWidth * 0.5)) / 2, bottom: bottomOffset,
          borderTopLeftRadius: centerWidth * 0.25, borderTopRightRadius: centerWidth * 0.25
      }]} />

      {/* Main Big Dome */}
      <View style={[styles.lineArt, {
          width: centerWidth, height: domeHeight, borderWidth, borderBottomWidth: 0,
          left: (size - centerWidth) / 2, bottom: bottomOffset + centerBodyHeight,
          borderTopLeftRadius: centerWidth * 0.5, borderTopRightRadius: centerWidth * 0.5
      }]} />
      
      {/* Dome Finial (Top Spike) */}
      <View style={[styles.lineArt, {
          width: borderWidth, height: size * 0.06, backgroundColor: color, borderWidth: 0,
          left: (size - borderWidth) / 2, bottom: bottomOffset + centerBodyHeight + domeHeight
      }]} />
       {/* Finial Cross-bar (small detail) */}
       <View style={[styles.lineArt, {
          width: size * 0.04, height: borderWidth, backgroundColor: color, borderWidth: 0,
          left: (size - size * 0.04) / 2, bottom: bottomOffset + centerBodyHeight + domeHeight + (size * 0.02)
      }]} />


      {/* --- RIGHT WING (Grid Section) --- */}
      {/* Main Box */}
      <View style={[styles.lineArt, {
          width: wingWidth, height: wingHeight, borderWidth, borderBottomWidth: 0, borderRightWidth: 0, borderLeftWidth: 0,
          right: size * 0.08 + towerWidth, bottom: bottomOffset
      }]} />
      {/* Horizontal Divider */}
      <View style={[styles.lineArt, {
          width: wingWidth, height: borderWidth, backgroundColor: color, borderWidth: 0,
          right: size * 0.08 + towerWidth, bottom: bottomOffset + (wingHeight * 0.5)
      }]} />
      {/* Small Dome on Wing */}
      <View style={[styles.lineArt, {
          width: wingWidth * 0.5, height: wingWidth * 0.3, borderWidth, borderBottomWidth: 0,
          right: size * 0.08 + towerWidth + (wingWidth * 0.25), bottom: bottomOffset + wingHeight,
          borderTopLeftRadius: wingWidth * 0.25, borderTopRightRadius: wingWidth * 0.25
      }]} />


      {/* --- FAR RIGHT TOWER --- */}
      {/* Tower Body */}
      <View style={[styles.lineArt, {
          width: towerWidth, height: towerHeight, borderWidth, borderBottomWidth: 0,
          right: size * 0.08, bottom: bottomOffset
      }]} />
      {/* Tower Neck Line */}
      <View style={[styles.lineArt, {
          width: towerWidth, height: borderWidth, backgroundColor: color, borderWidth: 0,
          right: size * 0.08, bottom: bottomOffset + (towerHeight * 0.85)
      }]} />
      {/* Tower Dome */}
      <View style={[styles.lineArt, {
          width: towerWidth, height: towerWidth * 0.6, borderWidth, borderBottomWidth: 0,
          right: size * 0.08, bottom: bottomOffset + towerHeight,
          borderTopLeftRadius: towerWidth * 0.5, borderTopRightRadius: towerWidth * 0.5
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