import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StatusBar,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { fetchWithFallback } from "@/_services/api-config";
import { Colors } from "@/constants/Colors";

interface TransactionDetail {
  id: string;
  payment_id: string | null;
  razorpay_order_id: string | null;
  amount: number;
  status: string;
  type: string;
  description: string;
  is_credit: boolean;
  is_debit: boolean;
  is_wallet: boolean;
  club_name: string | null;
  club_address: string | null;
  event_name: string | null;
  event_date: string | null;
  event_time: string | null;
  booking_id: string | null;
  created_at: string;
  updated_at: string;
}

function formatDate(dateString: string | null) {
  if (!dateString) return "—";
  const d = new Date(dateString);
  const day = d.getDate();
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatTime(dateString: string | null) {
  if (!dateString) return "—";
  const d = new Date(dateString);
  const hour = d.getHours();
  const min = d.getMinutes();
  const ampm = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  const mm = min < 10 ? `0${min}` : min;
  return `${h}:${mm} ${ampm}`;
}

function formatTimeOnly(timeString: string | null) {
  if (!timeString) return "—";
  const parts = String(timeString).split(":");
  const hour = parseInt(parts[0] || "0", 10);
  const min = parts[1] || "00";
  const ampm = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h}:${min} ${ampm}`;
}

const STATUS_LABELS: Record<string, string> = {
  success: "Success",
  pending: "Pending",
  failed: "Failed",
};

const TYPE_LABELS: Record<string, string> = {
  wallet_topup: "Wallet top-up",
  wallet_payment: "Wallet payment",
  event_booking: "Event booking",
  table_booking: "Table booking",
  bill_payment: "Bill payment",
  other: "Other",
};

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [tx, setTx] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTransaction = useCallback(async () => {
    if (!id) {
      setError("Transaction ID missing");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError("");
      const res = await fetchWithFallback(
        `/api/transactions/${id}`,
        await withAuthHeaders({ method: "GET" })
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load transaction");
      }
      const data = await res.json();
      setTx(data.transaction || null);
    } catch (err: any) {
      setError(err.message || "Failed to load transaction");
      setTx(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTransaction();
  }, [fetchTransaction]);

  const openBooking = () => {
    if (tx?.booking_id) router.push(`/booking/${tx.booking_id}`);
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centerContainer}>
          <StatusBar barStyle="light-content" />
          <ActivityIndicator size="large" color={Colors.dark.primary} />
          <Text style={styles.loadingText}>Loading transaction...</Text>
        </View>
      </>
    );
  }

  if (error || !tx) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centerContainer}>
          <StatusBar barStyle="light-content" />
          <Ionicons name="warning-outline" size={64} color={Colors.dark.error} />
          <Text style={styles.errorText}>{error || "Transaction not found"}</Text>
          <Pressable style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryButtonText}>Go back</Text>
          </Pressable>
        </View>
      </>
    );
  }

  const statusLabel = STATUS_LABELS[tx.status?.toLowerCase()] || tx.status || "—";
  const typeLabel = TYPE_LABELS[tx.type] || tx.type || "—";
  const isTopUp = tx.is_credit;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Transaction details",
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
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Amount & type card */}
          <View style={styles.amountCard}>
            <View
              style={[
                styles.amountIconWrap,
                isTopUp ? styles.amountIconIncoming : styles.amountIconOutgoing,
              ]}
            >
              <Ionicons
                name={isTopUp ? "arrow-down" : "arrow-up"}
                size={28}
                color={isTopUp ? Colors.dark.success : "#EF4444"}
              />
            </View>
            <Text style={styles.amountValue}>
              {isTopUp ? "+" : "-"}₹{tx.amount.toFixed(0)}
            </Text>
            <Text style={styles.amountDescription}>{tx.description}</Text>
            <View style={[styles.statusBadge, tx.status === "success" && styles.statusSuccess]}>
              <Text style={styles.statusText}>{statusLabel}</Text>
            </View>
          </View>

          {/* Details list */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.detailCard}>
              <Row label="Payment ID" value={tx.payment_id || "—"} />
              <Row label="Order ID" value={tx.razorpay_order_id || "—"} />
              <Row label="Type" value={typeLabel} />
              <Row label="Date" value={formatDate(tx.created_at)} />
              <Row label="Time" value={formatTime(tx.created_at)} last />
            </View>
          </View>

          {(tx.club_name || tx.event_name) && (() => {
            const venueRows: { label: string; value: string }[] = [];
            if (tx.club_name) venueRows.push({ label: "Venue", value: tx.club_name });
            if (tx.club_address) venueRows.push({ label: "Address", value: tx.club_address });
            if (tx.event_name) venueRows.push({ label: "Event", value: tx.event_name });
            if (tx.event_date) venueRows.push({ label: "Event date", value: formatDate(tx.event_date) });
            if (tx.event_time) venueRows.push({ label: "Event time", value: formatTimeOnly(tx.event_time) });
            return (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Venue & event</Text>
                <View style={styles.detailCard}>
                  {venueRows.map((r, i) => (
                    <Row key={r.label} label={r.label} value={r.value} last={i === venueRows.length - 1} />
                  ))}
                </View>
              </View>
            );
          })()}

          {tx.booking_id && (
            <View style={styles.section}>
              <Pressable style={styles.bookingButton} onPress={openBooking}>
                <Ionicons name="receipt-outline" size={22} color="#fff" />
                <Text style={styles.bookingButtonText}>View booking</Text>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </Pressable>
            </View>
          )}

          <View style={styles.footer} />
        </ScrollView>
      </View>
    </>
  );
}

function Row({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2} selectable>
        {value}
      </Text>
    </View>
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
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 100,
  },
  amountCard: {
    backgroundColor: "#1E1E20",
    borderWidth: 1,
    borderColor: "#343434",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  amountIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  amountIconOutgoing: { backgroundColor: "rgba(239, 68, 68, 0.2)" },
  amountIconIncoming: { backgroundColor: "rgba(34, 197, 94, 0.2)" },
  amountValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#D1D5DB",
    marginBottom: 4,
  },
  amountDescription: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 12,
    textAlign: "center",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(251, 191, 36, 0.2)",
  },
  statusSuccess: {
    backgroundColor: "rgba(34, 197, 94, 0.2)",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#D1D5DB",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#D1D5DB",
    marginBottom: 12,
  },
  detailCard: {
    backgroundColor: "#1E1E20",
    borderWidth: 1,
    borderColor: "#343434",
    borderRadius: 12,
    padding: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
    gap: 16,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    fontSize: 14,
    color: "#9CA3AF",
    flexShrink: 0,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#D1D5DB",
    flex: 1,
    textAlign: "right",
  },
  bookingButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.dark.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  bookingButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: { height: 24 },
});
