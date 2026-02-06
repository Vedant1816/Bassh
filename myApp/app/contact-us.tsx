import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Linking,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";

const SUPPORT_EMAIL = "support@bassh.app";
const SUPPORT_PHONE = "+91 98765 43210";

export default function ContactUsScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Contact Us",
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
        <Text style={styles.sectionHeader}>Get in touch</Text>
        <Text style={styles.intro}>
          Have a question or need help? Get in touch with our team.
        </Text>

        <View style={styles.menuGroup}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="mail-outline" size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.menuItemText}>Email</Text>
                <Text style={styles.menuItemSubtext}>{SUPPORT_EMAIL}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666666" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`)}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="call-outline" size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.menuItemText}>Phone</Text>
                <Text style={styles.menuItemSubtext}>{SUPPORT_PHONE}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666666" />
          </TouchableOpacity>
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
  intro: {
    fontSize: 14,
    color: "#666666",
    marginHorizontal: 16,
    marginBottom: 16,
    lineHeight: 20,
  },
  menuGroup: { backgroundColor: "#0F0F0F", marginHorizontal: 16, borderRadius: 12, marginBottom: 24 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  menuItemText: { fontSize: 16, fontWeight: "400", color: "#FFFFFF" },
  menuItemSubtext: { fontSize: 14, color: "#666666", marginTop: 2 },
  divider: { height: 1, backgroundColor: "#1A1A1A", marginLeft: 56 },
  bottomSpace: { height: 40 },
});
