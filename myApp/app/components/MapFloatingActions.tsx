import { useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const ANIMATION_DURATION = 380;
const SMOOTH_EASING = Easing.bezier(0.33, 0.01, 0.2, 1);
const BUTTON_SIZE = 48;
const BUTTON_GAP = 10;
/** Height of secondary buttons column for up/down animation */
const SECONDARY_HEIGHT = 3 * BUTTON_SIZE + 2 * BUTTON_GAP;

export type MapFloatingActionId = "people" | "filter" | "location";

export type MapFloatingActionItem = {
  id: MapFloatingActionId;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

type MapFloatingActionsProps = {
  actions?: MapFloatingActionItem[];
  /** Distance from top (e.g. just below search bar). Takes precedence over bottom. */
  top?: number;
  /** Distance from bottom when top is not set. */
  bottom?: number;
  style?: object;
};

const DEFAULT_ACTIONS: MapFloatingActionItem[] = [
  { id: "people", icon: "people-outline", onPress: () => {} },
  { id: "filter", icon: "options-outline", onPress: () => {} },
  { id: "location", icon: "locate-outline", onPress: () => {} },
];

export default function MapFloatingActions({
  actions = DEFAULT_ACTIONS,
  top: topProp,
  bottom = 180,
  style,
}: MapFloatingActionsProps) {
  const [expanded, setExpanded] = useState(false);
  const progress = useSharedValue(0);

  const toggle = () => {
    setExpanded((prev) => {
      const next = !prev;
      progress.value = withTiming(next ? 1 : 0, {
        duration: ANIMATION_DURATION,
        easing: SMOOTH_EASING,
      });
      return next;
    });
  };

  const secondaryContainerStyle = useAnimatedStyle(() => {
    const translateY = (1 - progress.value) * SECONDARY_HEIGHT;
    return {
      opacity: progress.value,
      transform: [{ translateY }],
    };
  });

  const containerAnimatedStyle = useAnimatedStyle(() => {
    const height = interpolate(
      progress.value,
      [0, 1],
      [BUTTON_SIZE, BUTTON_SIZE + BUTTON_GAP + SECONDARY_HEIGHT]
    );
    return { height };
  });

  const positionStyle =
    topProp !== undefined ? { top: topProp } : { bottom };

  return (
    <Animated.View
      style={[styles.container, containerAnimatedStyle, positionStyle, style]}
      pointerEvents="box-none"
    >
      {/* Main toggle button - pink, chevron up/down; anchored just below search bar */}
      <Pressable style={styles.mainButton} onPress={toggle}>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={24}
          color="#fff"
        />
      </Pressable>

      {/* Secondary actions - stack below toggle; animate up/down */}
      <Animated.View
        style={[styles.secondaryContainer, secondaryContainerStyle]}
        pointerEvents={expanded ? "auto" : "none"}
      >
        {actions.map((action) => (
          <Pressable
            key={action.id}
            style={styles.secondaryButton}
            onPress={action.onPress}
          >
            <Ionicons name={action.icon} size={22} color="#fff" />
          </Pressable>
        ))}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 16,
    flexDirection: "column",
    alignItems: "flex-end",
    overflow: "hidden",
  },
  mainButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: "#EC4899",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  secondaryContainer: {
    marginTop: BUTTON_GAP,
    flexDirection: "column",
    alignItems: "center",
    gap: BUTTON_GAP,
  },
  secondaryButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: "#525252",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
});
