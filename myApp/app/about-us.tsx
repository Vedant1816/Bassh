import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";

const APP_NAME = "Bassh";
const APP_VERSION = "1.0.0";

export default function AboutUsScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "About us",
          headerTitleStyle: {
            color: Colors.dark.text,
            fontWeight: "700",
            fontSize: 16,
          },
          headerStyle: { backgroundColor: Colors.dark.background },
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
            </Pressable>
          ),
        }}
      />
      <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionHeader}>App</Text>
        <View style={styles.nameCard}>
          <View style={styles.nameCardContent}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>{APP_NAME.charAt(0)}</Text>
            </View>
            <View style={styles.nameTextContainer}>
              <Text style={styles.nameTitle}>{APP_NAME}</Text>
              <Text style={styles.nameSubtitle}>Version {APP_VERSION}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.intro}>
          Bassh is your go-to app for discovering events, booking tables, and enjoying nightlife. Find the best clubs and events near you, reserve your spot, and get exclusive offers.
        </Text>

        <Text style={styles.sectionHeader}>Our mission</Text>
        <View style={styles.card}>
          <Text style={styles.cardBody}>
            To connect people with great experiences and make going out seamless and fun.
          </Text>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  backButton: { padding: 8, marginLeft: 8 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: 16,
    marginBottom: 8,
    marginTop: 8,
  },
  nameCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0F0F0F",
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
  },
  nameCardContent: { flexDirection: "row", alignItems: "center", flex: 1 },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1A1A1A",
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: { fontSize: 24, fontWeight: "700", color: "#FFFFFF" },
  nameTextContainer: { marginLeft: 16, flex: 1 },
  nameTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  nameSubtitle: { fontSize: 14, color: "#666666" },
  intro: {
    fontSize: 14,
    color: "#CCCCCC",
    marginHorizontal: 16,
    marginBottom: 24,
    lineHeight: 21,
  },
  card: {
    backgroundColor: "#0F0F0F",
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
  },
  cardBody: {
    fontSize: 15,
    fontWeight: "400",
    color: "#CCCCCC",
    lineHeight: 22,
  },
  bottomSpace: { height: 40 },
});
