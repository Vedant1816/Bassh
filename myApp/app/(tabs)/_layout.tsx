import { Tabs } from "expo-router";
import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { HapticTab } from "@/components/haptic-tab";

const ACTIVE_GRADIENT = ["#DB4494", "#DB138D"] as const;
const INACTIVE_COLOR = "#E7E7E7";
const TAB_BAR_HEIGHT = 64;

type IconName = React.ComponentProps<typeof MaterialIcons>["name"];

function TabIcon({
  focused,
  name,
}: {
  focused: boolean;
  name: IconName;
}) {
  const size = 24;
  return (
    <View style={styles.iconWrapper}>
      {focused ? (
        <LinearGradient
          colors={ACTIVE_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.activeIcon}
        >
          <MaterialIcons name={name} size={size} color="#fff" />
        </LinearGradient>
      ) : (
        <MaterialIcons
          name={name}
          size={size}
          color={INACTIVE_COLOR}
          style={{ opacity: 0.45 }}
        />
      )}
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
            bottom: Platform.OS === "ios" ? insets.bottom + 8 : 12,
            alignSelf: "center",
            width: "92%",
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
            <TabIcon focused={focused} name="event" />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: "Wallet",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name="account-balance-wallet" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name="person" />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    height: TAB_BAR_HEIGHT,
    borderRadius: 20,
    backgroundColor: "rgba(25, 25, 28, 0.96)",
    borderWidth: 1,
    borderColor: "#353535",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },

  tabItem: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  iconWrapper: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateY: -4 }],
  },

  activeIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
