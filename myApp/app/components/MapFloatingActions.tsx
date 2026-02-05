import { useState } from "react";
import { View, Pressable, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/Colors";
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
/** Frame 1948755791: secondary FAB size */
const SECONDARY_BUTTON_SIZE = 42;
/** Height of secondary buttons column for up/down animation */
const SECONDARY_HEIGHT = 3 * SECONDARY_BUTTON_SIZE + 2 * BUTTON_GAP;

export type MapFloatingActionId = "people" | "filter" | "location";

export type MapFloatingActionItem = {
  id: MapFloatingActionId;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

type MapFloatingActionsProps = {
  actions?: MapFloatingActionItem[];
  /** When provided, the location action will recenter the map to user's current location (like LocationHeader "Use current location"). */
  onRecenterToUserLocation?: () => void;
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
  onRecenterToUserLocation,
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
      {/* Main toggle button - pink circle + chevron (PNG); rotate when expanded */}
      <Pressable style={styles.mainButton} onPress={toggle}>
        <Image
          source={require("@/assets/images/map-floating-chevron.png")}
          style={[styles.mainButtonImage, expanded && styles.mainButtonImageExpanded]}
          resizeMode="contain"
        />
      </Pressable>

      {/* Secondary actions - stack below toggle; animate up/down */}
      <Animated.View
        style={[styles.secondaryContainer, secondaryContainerStyle]}
        pointerEvents={expanded ? "auto" : "none"}
      >
        {actions.map((action) => {
          const isLocation = action.id === "location";
          const onPress = isLocation && onRecenterToUserLocation
            ? onRecenterToUserLocation
            : action.onPress;
          return (
            <Pressable
              key={action.id}
              style={styles.secondaryButton}
              onPress={onPress}
            >
              <Ionicons name={action.icon} size={20} color={Colors.dark.text} />
            </Pressable>
          );
        })}
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
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  mainButtonImage: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
  },
  mainButtonImageExpanded: {
    transform: [{ rotate: "180deg" }],
  },
  secondaryContainer: {
    marginTop: BUTTON_GAP,
    flexDirection: "column",
    alignItems: "center",
    gap: BUTTON_GAP,
  },
  /* Frame 1948755791: 42×42, #585858, 1px #7D7D7D border, border-radius 39px */
  secondaryButton: {
    width: SECONDARY_BUTTON_SIZE,
    height: SECONDARY_BUTTON_SIZE,
    borderRadius: 39,
    backgroundColor: "#585858",
    borderWidth: 1,
    borderColor: "#7D7D7D",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
});
