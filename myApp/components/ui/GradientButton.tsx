import { Pressable, StyleSheet, Text, ViewStyle, TextStyle, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/Colors";

const GRADIENT_COLORS = [Colors.dark.primaryLight, Colors.dark.primary, Colors.dark.primaryDark] as const;
const GREEN_GRADIENT = ["#22c55e", "#22c55e", "#1d9e3f"] as const;
const GRAY_GRADIENT = ["#5c5c5c", "#4a4a4a", "#353535"] as const;

type GradientButtonProps = {
  onPress: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  variant?: "solid" | "ghost" | "green" | "gray";
};

export function GradientButton({
  onPress,
  children,
  disabled = false,
  loading = false,
  style,
  textStyle,
  variant = "solid",
}: GradientButtonProps) {
  const handlePressIn = () => {
    if (disabled || loading) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.wrapper,
        isDisabled && styles.wrapperDisabled,
        pressed && !isDisabled && styles.wrapperPressed,
        style,
      ]}
    >
      {({ pressed }) => (
        <LinearGradient
          colors={variant === "green" ? GREEN_GRADIENT : variant === "gray" ? GRAY_GRADIENT : GRADIENT_COLORS}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.gradient,
            variant === "ghost" && styles.gradientGhost,
            pressed && !isDisabled && styles.gradientPressed,
          ]}
        >
          {pressed && !isDisabled && (
            <LinearGradient
              colors={["rgba(255,255,255,0.28)", "transparent"]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : typeof children === "string" ? (
            <Text style={[styles.text, textStyle]}>{children}</Text>
          ) : (
            children
          )}
        </LinearGradient>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 12,
    overflow: "hidden",
  },
  wrapperDisabled: {
    opacity: 0.55,
  },
  wrapperPressed: {
    opacity: 0.94,
  },
  gradient: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    minHeight: 48,
    overflow: "hidden",
  },
  gradientGhost: {
    backgroundColor: "transparent",
  },
  gradientPressed: {
    transform: [{ scale: 0.98 }],
  },
  text: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
