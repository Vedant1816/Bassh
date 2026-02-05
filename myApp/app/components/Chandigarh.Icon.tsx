import React from "react";
import { View, StyleSheet } from "react-native";

interface ChandigarhIconProps {
  size?: number;
  color?: string;
}

// Open Hand Monument representation matching the specific line-art reference
export default function ChandigarhIconSimple({ size = 36, color = "#B8A9C9" }: ChandigarhIconProps) {
  const scale = size / 36;
  const borderWidth = 1.5 * scale;
  const bottom = size * 0.1;

  return (
    <View style={[styles.container, { width: size, height: size }]} pointerEvents="none">
      
      {/* --- Base Area --- */}
      {/* Main Base Line */}
      <View style={[styles.lineArt, {
          width: size * 0.9, height: borderWidth, backgroundColor: color, borderWidth: 0,
          bottom: bottom, left: size * 0.05
      }]} />

      {/* Left Base Detail (Rectangle) */}
      <View style={[styles.lineArt, {
          width: size * 0.1, height: size * 0.12, borderWidth, borderBottomWidth: 0,
          bottom: bottom, left: size * 0.15
      }]} />
      {/* Slanted top for left detail (approximate with a smaller line or just rect) */}
      <View style={[styles.lineArt, {
          width: size * 0.1, height: borderWidth, backgroundColor: color, borderWidth: 0,
          bottom: bottom + (size * 0.12), left: size * 0.15
      }]} />

      {/* Right Base Detail (Vertical Stick) */}
      <View style={[styles.lineArt, {
          width: borderWidth, height: size * 0.12, backgroundColor: color, borderWidth: 0,
          bottom: bottom, right: size * 0.18
      }]} />
      {/* Right tiny vertical detail */}
       <View style={[styles.lineArt, {
          width: borderWidth, height: size * 0.08, backgroundColor: color, borderWidth: 0,
          bottom: bottom, right: size * 0.12
      }]} />

      {/* Center Stand */}
      <View style={[styles.lineArt, {
          width: borderWidth, height: size * 0.25, backgroundColor: color, borderWidth: 0,
          bottom: bottom, left: size * 0.45
      }]} />
      {/* Parallel Stand Line (to make it a double line/thick stand) */}
      <View style={[styles.lineArt, {
          width: borderWidth, height: size * 0.25, backgroundColor: color, borderWidth: 0,
          bottom: bottom, left: size * 0.52
      }]} />


      {/* --- THE HAND SHAPE --- */}
      
      {/* 1. Bottom Curve (The Palm) */}
      <View style={[styles.lineArt, {
          width: size * 0.5, height: size * 0.25, borderWidth, borderTopWidth: 0,
          bottom: bottom + (size * 0.25), left: size * 0.25,
          borderBottomLeftRadius: size * 0.25, borderBottomRightRadius: size * 0.25
      }]} />

      {/* 2. Horizontal Crossbar (Top of Palm) */}
      <View style={[styles.lineArt, {
          width: size * 0.5, height: borderWidth, backgroundColor: color, borderWidth: 0,
          bottom: bottom + (size * 0.5), left: size * 0.25
      }]} />

      {/* 3. The Thumb (Right Side Loop) */}
      <View style={[styles.lineArt, {
          width: size * 0.2, height: size * 0.15, borderWidth, borderLeftWidth: 0,
          bottom: bottom + (size * 0.35), right: size * 0.08,
          borderTopRightRadius: size * 0.1, borderBottomRightRadius: size * 0.1
      }]} />

      {/* 4. The Fingers (Top Loops) */}
      
      {/* Left Finger */}
      <View style={[styles.lineArt, {
          width: size * 0.12, height: size * 0.15, borderWidth, borderBottomWidth: 0, borderRightWidth: 0,
          bottom: bottom + (size * 0.5), left: size * 0.25,
          borderTopLeftRadius: size * 0.06
      }]} />
      
      {/* Middle Finger (Tallest) */}
      <View style={[styles.lineArt, {
          width: size * 0.14, height: size * 0.18, borderWidth, borderBottomWidth: 0,
          bottom: bottom + (size * 0.5), left: size * 0.37,
          borderTopLeftRadius: size * 0.07, borderTopRightRadius: size * 0.07
      }]} />

      {/* Right Finger (Small bump before thumb) */}
       <View style={[styles.lineArt, {
          width: size * 0.1, height: size * 0.1, borderWidth, borderBottomWidth: 0, borderLeftWidth: 0, borderRightWidth: 0, // Just the top curve needed
          bottom: bottom + (size * 0.5), left: size * 0.51,
          borderTopLeftRadius: size * 0.05, borderTopRightRadius: size * 0.05
      }]} />

      {/* Internal Details (Grid/Windows inside the hand) */}
      {/* Vertical line inside hand */}
      <View style={[styles.lineArt, {
          width: borderWidth, height: size * 0.25, backgroundColor: color, borderWidth: 0,
          bottom: bottom + (size * 0.25), left: size * 0.4
      }]} />
      
      {/* Small floating dashes (Windows) in upper palm */}
      <View style={[styles.lineArt, {
          width: size * 0.05, height: borderWidth, backgroundColor: color, borderWidth: 0,
          bottom: bottom + (size * 0.6), left: size * 0.42
      }]} />
      <View style={[styles.lineArt, {
          width: size * 0.05, height: borderWidth, backgroundColor: color, borderWidth: 0,
          bottom: bottom + (size * 0.6), left: size * 0.55
      }]} />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "relative", justifyContent: "center", alignItems: "center" },
  lineArt: { position: "absolute", backgroundColor: "transparent", borderColor: "#B8A9C9" },
});