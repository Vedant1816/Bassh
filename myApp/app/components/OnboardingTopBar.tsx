import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type OnboardingTopBarProps = {
  stepIndex: number;
  totalSteps: number;
  onBack?: () => void;
};

export function OnboardingTopBar({ stepIndex, totalSteps, onBack }: OnboardingTopBarProps) {
  const percent = Math.min(1, Math.max(0, stepIndex / totalSteps)) * 100;

  return (
    <View style={styles.topBar}>
      <Pressable onPress={onBack} style={styles.dockButton} hitSlop={12}>
        <Ionicons
          name="chevron-up"
          size={16}
          color="#FFFFFF"
          style={{ transform: [{ rotate: "-90deg" }] }}
        />
      </Pressable>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${percent}%` }]} />
      </View>
      <View style={styles.stepLabel}>
        <Text style={styles.stepText}>
          {stepIndex}/{totalSteps}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 8,
    width: "100%",
    marginBottom: 12,
  },
  dockButton: {
    width: 32,
    height: 32,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  progressBar: {
    flex: 1,
    height: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 64,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#F02DA4",
    borderRadius: 64,
  },
  stepLabel: {
    width: 44,
    height: 37,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  stepText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
