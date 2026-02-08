import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { fetchWithFallback } from "@/_services/api-config";
import { Colors } from "@/constants/Colors";

interface Transaction {
  id: string;
  payment_id: string | null;
  amount: number;
  status: string;
  type: string;
  description: string;
  is_credit: boolean;
  is_debit: boolean;
  club_name: string | null;
  event_name: string | null;
  booking_id: string | null;
  created_at: string;
}

export default function TransactionsScreen() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetchWithFallback(
        "/api/transactions",
        await withAuthHeaders({ method: "GET" })
      );

      if (!res.ok) {
        throw new Error("Failed to fetch transactions");
      }

      const data = await res.json();
      const all = data.transactions || [];
      const successful = all.filter(
        (tx: Transaction) => String(tx.status || "").toLowerCase() === "success"
      );
      setTransactions(successful);
      setError("");
    } catch (err: any) {
      setError(err.message || "Failed to load transactions");
      setTransactions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    const day = d.getDate();
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    const hour = d.getHours();
    const min = d.getMinutes();
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    const mm = min < 10 ? `0${min}` : min;
    return `${displayHour}:${mm} ${ampm}`;
  };

  const shortPaymentId = (tx: Transaction) => {
    const raw = tx.payment_id || tx.id.replace(/-/g, "").slice(0, 12).toUpperCase();
    return raw.length > 14 ? `${raw.slice(0, 14)}…` : raw;
  };

  const openTransactionDetail = (item: Transaction) => {
    router.push({ pathname: "/transaction/[id]", params: { id: item.id } });
  };

  const renderTransactionCard = ({ item }: { item: Transaction }) => {
    const isTopUp = item.is_credit;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
        ]}
        onPress={() => openTransactionDetail(item)}
      >
        <View style={styles.cardTopRow}>
          <View style={styles.cardLeft}>
            {isTopUp ? (
              <View style={styles.iconWrapIncoming}>
                <Ionicons name="arrow-down" size={18} color={Colors.dark.success} />
              </View>
            ) : (
              <View style={styles.iconWrapOutgoing}>
                <Ionicons name="arrow-up" size={18} color="#EF4444" />
              </View>
            )}
            <Text style={styles.paymentId} numberOfLines={1} ellipsizeMode="tail">
              Payment Id- {shortPaymentId(item)}
            </Text>
          </View>
          <Text style={styles.amount}>Rs. {item.amount.toFixed(0)}</Text>
        </View>
        <View style={styles.cardBottomRow}>
          <Text style={styles.date}>{formatDate(item.created_at)}</Text>
          <Text style={styles.time}>{formatTime(item.created_at)}</Text>
          <Text style={styles.viewDetails}>View Details</Text>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centerContainer}>
          <StatusBar barStyle="light-content" />
          <ActivityIndicator size="large" color={Colors.dark.primary} />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centerContainer}>
          <StatusBar barStyle="light-content" />
          <Ionicons name="warning-outline" size={64} color={Colors.dark.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={fetchTransactions}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "All transactions",
          headerTitleStyle: {
            color: "#D1D5DB",
            fontWeight: "700",
            fontSize: 16,
          },
          headerStyle: { backgroundColor: "#131315" },
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color="#D1D5DB" />
            </Pressable>
          ),
        }}
      />
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.sectionTitle}>All transactions</Text>

        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="wallet-outline" size={64} color={Colors.dark.textTertiary} />
            <Text style={styles.emptyTitle}>No transactions yet</Text>
            <Text style={styles.emptyText}>Your transaction history will appear here</Text>
          </View>
        ) : (
          <FlatList
            data={transactions}
            renderItem={renderTransactionCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={Colors.dark.primary}
              />
            }
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#131315",
  },
  centerContainer: {
    flex: 1,
    backgroundColor: "#131315",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#D1D5DB",
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: "#D1D5DB",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.dark.primary,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    padding: 8,
    marginLeft: 8,
  },
  sectionTitle: {
    fontFamily: "Geist",
    fontWeight: "700",
    fontSize: 18,
    lineHeight: 16,
    color: "#D1D5DB",
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 23,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 100,
  },
  card: {
    width: "100%",
    minHeight: 81,
    backgroundColor: "#1E1E20",
    borderWidth: 1,
    borderColor: "#343434",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 15,
    marginBottom: 23,
  },
  cardPressed: {
    opacity: 0.9,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  cardLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconWrapOutgoing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapIncoming: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentId: {
    flex: 1,
    minWidth: 0,
    fontFamily: "Geist",
    fontWeight: "700",
    fontSize: 16,
    lineHeight: 16,
    color: "#D1D5DB",
  },
  amount: {
    flexShrink: 0,
    fontFamily: "Geist",
    fontWeight: "500",
    fontSize: 14,
    lineHeight: 16,
    color: "#D1D5DB",
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  date: {
    fontFamily: "Geist",
    fontWeight: "500",
    fontSize: 14,
    lineHeight: 16,
    color: "#D1D5DB",
  },
  time: {
    fontFamily: "Geist",
    fontWeight: "500",
    fontSize: 14,
    lineHeight: 16,
    color: "#D1D5DB",
  },
  viewDetails: {
    marginLeft: "auto",
    fontFamily: "Geist",
    fontWeight: "700",
    fontSize: 14,
    lineHeight: 16,
    color: "#FFFFFF",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#D1D5DB",
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 8,
  },
});
