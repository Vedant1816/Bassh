import { Tabs } from "expo-router";
import React from "react";
import { View, StyleSheet, Platform, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { HapticTab } from "@/components/haptic-tab";

const SCREEN_WIDTH = Dimensions.get("window").width;
const ACTIVE_GRADIENT = ["#DB4494", "#DB138D"] as const;
const INACTIVE_COLOR = "#6B7280"; // Gray color from image
const TAB_BAR_HEIGHT = 70;

type IconName = React.ComponentProps<typeof Ionicons>["name"];

function TabIcon({
  focused,
  name,
}: {
  focused: boolean;
  name: IconName;
}) {
  const size = 26;
  
  if (focused) {
    return (
      <View style={styles.iconContainer}>
        <LinearGradient
          colors={ACTIVE_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.activeIconBg}
        >
          <Ionicons name={name} size={size} color="#FFFFFF" />
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.iconContainer}>
      <Ionicons name={name} size={size} color={INACTIVE_COLOR} />
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarButton: HapticTab,
        tabBarStyle: [
          styles.tabBar,
          {
            paddingBottom: 10,
            bottom:2,
          },
        ],
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name="home" />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Events",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name="calendar-outline" />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: "Wallet",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name="wallet-outline" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name="person-outline" />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    bottom: 0,
    left: 16,
    right: 16,
    height: TAB_BAR_HEIGHT,
    backgroundColor: "rgba(20, 20, 22, 0.95)",
    borderRadius: 20, // Rounded corners
    borderTopWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 20,
    paddingTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 15,
  },

  tabItem: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  iconContainer: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },

  activeIconBg: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});