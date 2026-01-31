import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";

export default function WalletScreen() {
  const router = useRouter();
  const [balance] = useState("0");

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Wallet</Text>
        <Text style={styles.headerSubtitle}>Manage your balance</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>₹{balance}</Text>
          <Pressable
            style={styles.addMoneyButton}
            onPress={() => {}}
          >
            <Ionicons name="add" size={22} color="#fff" />
            <Text style={styles.addMoneyText}>Add Money</Text>
          </Pressable>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <Pressable
              style={styles.actionCard}
              onPress={() => router.push("/bookings")}
            >
              <View style={styles.actionIconWrap}>
                <Ionicons name="receipt-outline" size={24} color={Colors.dark.primary} />
              </View>
              <Text style={styles.actionLabel}>My Bookings</Text>
            </Pressable>
            <Pressable style={styles.actionCard} onPress={() => {}}>
              <View style={styles.actionIconWrap}>
                <Ionicons name="swap-horizontal" size={24} color={Colors.dark.primary} />
              </View>
              <Text style={styles.actionLabel}>Transactions</Text>
            </Pressable>
          </View>
        </View>

        {/* Recent Transactions placeholder */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <View style={styles.emptyState}>
            <Ionicons name="wallet-outline" size={48} color={Colors.dark.textTertiary} />
            <Text style={styles.emptyTitle}>No transactions yet</Text>
            <Text style={styles.emptyText}>
              Your transaction history will appear here
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: Colors.dark.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  balanceCard: {
    backgroundColor: Colors.dark.primary,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 20,
  },
  addMoneyButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  addMoneyText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.dark.text,
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  actionIconWrap: {
    marginBottom: 12,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.dark.text,
  },
  emptyState: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.dark.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginTop: 8,
  },
});
