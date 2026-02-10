import { Tabs } from "expo-router";
import React from "react";
import { View, StyleSheet, Dimensions, Image, ImageSourcePropType } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { HapticTab } from "@/components/haptic-tab";
import { PrimaryGradient, PrimaryGradientStart, PrimaryGradientEnd } from "@/constants/Colors";

const SCREEN_WIDTH = Dimensions.get("window").width;
const INACTIVE_COLOR = "#6B7280";
const TAB_BAR_HEIGHT = 65;
const TAB_ICON_SIZE = 26;

function TabIcon({ focused, source }: { focused: boolean; source: ImageSourcePropType }) {
  if (focused) {
    return (
      <View style={styles.iconContainer}>
        <LinearGradient
          colors={PrimaryGradient}
          start={PrimaryGradientStart}
          end={PrimaryGradientEnd}
          style={styles.activeIconBg}
        >
          <Image
            source={source}
            style={[styles.tabIcon, { tintColor: "#FFFFFF" }]}
            resizeMode="contain"
          />
        </LinearGradient>
      </View>
    );
  }
  return (
    <View style={styles.iconContainer}>
      <Image
        source={source}
        style={[styles.tabIcon, { tintColor: INACTIVE_COLOR }]}
        resizeMode="contain"
      />
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
            paddingBottom: 6,
            bottom: 2,
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
            <TabIcon focused={focused} source={require("@/assets/images/tab-home.png")} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Events",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} source={require("@/assets/images/tab-events.png")} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: "Wallet",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} source={require("@/assets/images/tab-wallet.png")} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} source={require("@/assets/images/tab-profile.png")} />
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
    left: 44,
    right: 44,
    height: TAB_BAR_HEIGHT,
    backgroundColor: "rgba(20, 20, 22, 0.95)",
    borderRadius: 20, // Rounded corners
    borderTopWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 10,
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

  tabIcon: {
    width: TAB_ICON_SIZE,
    height: TAB_ICON_SIZE,
  },
});