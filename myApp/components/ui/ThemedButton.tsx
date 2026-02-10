import {
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, PrimaryGradient, PrimaryGradientStart, PrimaryGradientEnd } from "@/constants/Colors";

type ThemedButtonProps = {
  onPress: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  variant?: "solid" | "ghost" | "green" | "gray";
};

export function ThemedButton({
  onPress,
  children,
  disabled = false,
  loading = false,
  style,
  textStyle,
  variant = "solid",
}: ThemedButtonProps) {
  const handlePressIn = () => {
    if (disabled || loading) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const isDisabled = disabled || loading;
  const useGradient = variant === "solid";

  const bgColor =
    variant === "green"
      ? Colors.dark.success
      : variant === "gray"
        ? Colors.dark.border
        : variant === "ghost"
          ? "transparent"
          : undefined;

  const content = loading ? (
    <ActivityIndicator color={Colors.dark.text} size="small" />
  ) : typeof children === "string" ? (
    <Text style={[styles.text, textStyle]}>{children}</Text>
  ) : (
    children
  );

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.wrapper,
        !useGradient && bgColor !== undefined && { backgroundColor: bgColor },
        variant === "ghost" && styles.wrapperGhost,
        isDisabled && styles.wrapperDisabled,
        pressed && !isDisabled && styles.wrapperPressed,
        style,
      ]}
    >
      {useGradient ? (
        <LinearGradient
          colors={PrimaryGradient}
          start={PrimaryGradientStart}
          end={PrimaryGradientEnd}
          style={[StyleSheet.absoluteFill, styles.gradientFill]}
        />
      ) : null}
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    overflow: "hidden",
  },
  gradientFill: {
    borderRadius: 12,
  },
  wrapperGhost: {
    borderWidth: 1,
    borderColor: Colors.dark.primary,
  },
  wrapperDisabled: {
    opacity: 0.55,
  },
  wrapperPressed: {
    opacity: 0.94,
  },
  text: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: "700",
  },
});
