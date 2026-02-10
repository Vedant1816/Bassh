import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  InteractionManager,
  Image,
  Dimensions,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Colors,
  PrimaryGradient,
  PrimaryGradientStart,
  PrimaryGradientEnd,
} from "@/constants/Colors";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { fetchWithFallback } from "@/_services/api-config";
import supabase from "@/_services/supabase-public";
import { ThemedButton } from "@/components/ui/ThemedButton";
import { DismissKeyboardView } from "@/components/DismissKeyboardView";
import { PayBillModal } from "@/app/club/components/PayBillModal";
import type { Discount } from "@/app/club/components/PayBillModal";

const WALLET_GRADIENT = ["#8B0045", "#2D0A1F", "#000000"] as const;
const WALLET_GRADIENT_LOCATIONS = [0, 0.4, 1] as const;

/** Booking from /api/bookings/my-bookings – event or club (table) entry */
interface MyBooking {
  id: string;
  event_id: string | null;
  club_id: string | null;
  booking_date: string | null;
  booking_time: string | null;
  entry_status?: string;
  events?: {
    name: string;
    event_date: string;
    start_time: string;
    banner_image_url: string | null;
    club_id?: string;
    clubs: { club_name: string; address_text: string } | null;
  } | null;
  clubs?: { id?: string; club_name: string; address_text: string; cover_photo: string | null } | null;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ONGOING_CARD_GAP = 12;
const ONGOING_CARD_WIDTH = SCREEN_WIDTH - 40;

const formatCurrency = (amount: string) => {
  const cleaned = amount.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length > 2) {
    return parts[0] + "." + parts.slice(1).join("");
  }
  return cleaned;
};

export default function WalletScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [balance, setBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(true);

  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [addAmount, setAddAmount] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);

  const [ongoingBookings, setOngoingBookings] = useState<MyBooking[]>([]);
  const [loadingOngoing, setLoadingOngoing] = useState(false);

  const [payBillVisible, setPayBillVisible] = useState(false);
  const [payBillClubId, setPayBillClubId] = useState<string | null>(null);
  const [payBillClub, setPayBillClub] = useState<{ club_name?: string; address_text?: string; banner_image_url?: string } | null>(null);
  const [payBillDiscounts, setPayBillDiscounts] = useState<Discount[]>([]);

  const fetchOngoingBookings = useCallback(async () => {
    setLoadingOngoing(true);
    try {
      const res = await fetchWithFallback(
        "/api/bookings/my-bookings",
        await withAuthHeaders({ method: "GET" })
      );
      if (!res.ok) {
        setOngoingBookings([]);
        return;
      }
      const data = await res.json();
      const rawBookings = data.bookings || [];
      // Normalize: Supabase may return relations as object or array; ensure clubs/events are objects
      const bookings = rawBookings.map((b: any) => ({
        ...b,
        events: Array.isArray(b.events) ? b.events[0] ?? null : b.events,
        clubs: Array.isArray(b.clubs) ? b.clubs[0] ?? null : b.clubs,
      })) as MyBooking[];
      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const currentMins = now.getHours() * 60 + now.getMinutes();
      const ongoing = bookings.filter((b) => {
        if ((b.entry_status ?? "").toLowerCase() !== "entered") return false;
        if (b.event_id && b.events) {
          const ev = b.events;
          if (!ev.event_date || !ev.start_time) return false;
          const eventDate = new Date(ev.event_date);
          eventDate.setHours(0, 0, 0, 0);
          if (eventDate.getTime() !== today.getTime()) return false;
          const [sh, sm] = ev.start_time.split(":").map(Number);
          const startMins = (sh ?? 0) * 60 + (sm ?? 0);
          const endMins = startMins + 12 * 60;
          return currentMins >= startMins && currentMins <= endMins;
        }
        // Club entry: no event_id; ongoing = booking_date 6 PM → 6 PM + 12h (overnight to 6 AM next day)
        if (!b.event_id && b.club_id && b.booking_date) {
          const bookingDate = new Date(b.booking_date);
          bookingDate.setHours(0, 0, 0, 0);
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          const isBookingToday = bookingDate.getTime() === today.getTime();
          const isBookingYesterday = bookingDate.getTime() === yesterday.getTime();
          const startMins = 18 * 60; // 6 PM
          const endMinsNextDay = 6 * 60; // 6 AM
          if (isBookingToday) {
            return currentMins >= startMins; // 6 PM–midnight today
          }
          if (isBookingYesterday) {
            return currentMins < endMinsNextDay; // midnight–6 AM today (after booking_date)
          }
          return false;
        }
        return false;
      });
      setOngoingBookings(ongoing);
    } catch {
      setOngoingBookings([]);
    } finally {
      setLoadingOngoing(false);
    }
  }, []);

  const fetchBalance = useCallback(async () => {
    try {
      setLoadingBalance(true);
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) return;

      const { data: customer, error } = await supabase
        .from("customers")
        .select("wallet_balance")
        .eq("id", user.id)
        .single();

      if (!error && customer) {
        const val = Number(customer.wallet_balance);
        setBalance(Number.isNaN(val) ? 0 : val);
      } else {
        setBalance(0);
      }
    } catch (err) {
      console.error("Error fetching wallet balance:", err);
      setBalance(0);
    } finally {
      setLoadingBalance(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchBalance();
      fetchOngoingBookings();
    }, [fetchBalance, fetchOngoingBookings])
  );

  const formatEventDateShort = (dateString: string) => {
    const d = new Date(dateString);
    const day = d.getDate();
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const formatTimeRange = (timeString: string) => {
    if (!timeString) return "16:00 - 20:00";
    const [h, m] = timeString.split(":");
    const hour = parseInt(h, 10);
    const endHour = (hour + 4) % 24;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(hour)}:${m || "00"} - ${pad(endHour)}:00`;
  };

  const openPayBill = async (clubId: string) => {
    try {
      const res = await fetchWithFallback(
        `/api/clubs/${clubId}`,
        await withAuthHeaders({ method: "GET" })
      );
      if (!res.ok) return;
      const data = await res.json();
      setPayBillClubId(clubId);
      setPayBillClub({
        club_name: data.club?.club_name,
        address_text: data.club?.address_text,
        banner_image_url: data.club?.banner_image_url,
      });
      setPayBillDiscounts(data.discounts ?? []);
      setPayBillVisible(true);
    } catch {
      setPayBillVisible(false);
    }
  };

  const handleAddMoney = () => {
    setAddAmount("");
    setShowAddMoneyModal(true);
  };

  const handleAmountChange = (text: string) => {
    setAddAmount(formatCurrency(text));
  };

  const handleProceedAddMoney = async () => {
    const amount = parseFloat(addAmount);

    if (!amount || amount <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    if (amount < 1) {
      Alert.alert("Error", "Minimum amount is ₹1");
      return;
    }

    try {
      setProcessingPayment(true);

      const addRes = await fetchWithFallback(
        "/api/payments/wallet/add",
        await withAuthHeaders({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount }),
        })
      );

      const addData = await addRes.json();

      if (!addRes.ok) {
        setProcessingPayment(false);
        Alert.alert("Error", addData.error || "Failed to create wallet transaction");
        return;
      }

      const orderRes = await fetchWithFallback(
        "/api/payments/checkout/create-order",
        await withAuthHeaders({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transaction_id: addData.transaction_id,
            amount,
          }),
        })
      );

      const order = await orderRes.json();

      if (!orderRes.ok) {
        setProcessingPayment(false);
        Alert.alert("Error", order.error || "Failed to create order");
        return;
      }

      const options = {
        key: order.key,
        order_id: order.order_id,
        amount: order.amount || amount * 100,
        currency: "INR",
        name: "Bassh Wallet",
        description: "Add money to wallet",
        prefill: {
          email: "user@example.com",
          contact: "9999999999",
        },
        theme: { color: Colors.dark.primary },
      };

      setProcessingPayment(false);
      setShowAddMoneyModal(false);

      InteractionManager.runAfterInteractions(() => {
        setTimeout(() => {
          let RazorpayCheckout: any;
          try {
            RazorpayCheckout = require("react-native-razorpay").default;
          } catch (importErr: any) {
            console.error("❌ [WALLET] Razorpay import failed:", importErr);
            Alert.alert("Error", "Payment gateway not available");
            return;
          }

          if (!RazorpayCheckout || typeof RazorpayCheckout.open !== "function") {
            console.error("❌ [WALLET] Razorpay.open not available");
            Alert.alert("Error", "Payment gateway not available");
            return;
          }

          RazorpayCheckout.open(options)
            .then(async (response: any) => {
              if (!response?.razorpay_payment_id) {
                Alert.alert("Error", "Invalid payment response");
                return;
              }

              try {
                const verifyRes = await fetchWithFallback(
                  "/api/payments/wallet/verify",
                  await withAuthHeaders({
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      transaction_id: addData.transaction_id,
                      razorpay_payment_id: response.razorpay_payment_id,
                      razorpay_order_id: response.razorpay_order_id,
                      razorpay_signature: response.razorpay_signature,
                    }),
                  })
                );

                const verified = await verifyRes.json();

                if (!verifyRes.ok) {
                  console.error("❌ [WALLET] Verification failed:", verified.error);
                  Alert.alert("Error", verified.error || "Payment verification failed");
                  return;
                }
                setBalance(verified.wallet_balance ?? balance + amount);
                Alert.alert(
                  "Success",
                  `₹${amount.toFixed(2)} added to wallet successfully!`,
                  [{ text: "OK" }]
                );
                fetchBalance();
              } catch (verifyErr: any) {
                Alert.alert("Error", verifyErr?.message || "Verification failed");
              }
            })
            .catch((error: any) => {
              console.error("❌ [WALLET] Razorpay error:", error);
              const isCancelled =
                error?.description === "User closed the checkout form by pressing back button" ||
                error?.code === "BAD_REQUEST_ERROR" ||
                (error?.description?.toLowerCase?.() || "").includes("cancelled");

              if (!isCancelled) {
                Alert.alert(
                  "Payment Failed",
                  error?.description || error?.message || "Payment could not be completed"
                );
              }
            });
        }, 600);
      });
    } catch (err: any) {
      setProcessingPayment(false);
      Alert.alert("Error", err.message || "Something went wrong");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={WALLET_GRADIENT}
        locations={WALLET_GRADIENT_LOCATIONS}
        style={styles.gradientBg}
      />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Wallet</Text>
        <Text style={styles.headerSubtitle}>Manage your balance</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Simple, non-card balance header */}
        <View style={styles.balanceRow}>
          <View style={styles.balanceInfo}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            {loadingBalance ? (
              <ActivityIndicator
                color={Colors.dark.text}
                size="small"
                style={{ marginTop: 8 }}
              />
            ) : (
              <Text style={styles.balanceAmount}>₹{balance.toFixed(0)}</Text>
            )}
          </View>
          <Pressable style={styles.addMoneyPill} onPress={handleAddMoney}>
            <Ionicons name="add" size={20} color={Colors.dark.text} />
            <Text style={styles.addMoneyPillText}>Add Money</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ongoing events</Text>
          {loadingOngoing ? (
            <View style={styles.ongoingLoading}>
              <ActivityIndicator color={Colors.dark.primary} size="small" />
              <Text style={styles.ongoingLoadingText}>Loading...</Text>
            </View>
          ) : ongoingBookings.length === 0 ? (
            <View style={styles.ongoingEmpty}>
              <Ionicons name="calendar-outline" size={40} color={Colors.dark.textTertiary} />
              <Text style={styles.ongoingEmptyText}>No ongoing events</Text>
              <Text style={styles.ongoingEmptySubtext}>Events happening today will appear here</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.ongoingScrollContent}
              style={styles.ongoingScroll}
            >
              {ongoingBookings.map((b) => {
                if (b.event_id && b.events) {
                  const ev = b.events;
                  const clubId = ev.club_id ?? null;
                  return (
                    <View key={b.id} style={[styles.ongoingCard, { marginRight: ONGOING_CARD_GAP }]}>
                      <Pressable onPress={() => router.push(`/event/${b.event_id}`)}>
                        <View style={styles.ongoingCardImageWrap}>
                          {ev.banner_image_url ? (
                            <Image
                              source={{ uri: ev.banner_image_url }}
                              style={styles.ongoingCardImage}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.ongoingCardPlaceholder}>
                              <Ionicons name="musical-notes-outline" size={32} color={Colors.dark.textTertiary} />
                            </View>
                          )}
                        </View>
                        <View style={styles.ongoingCardBody}>
                          <Text style={styles.ongoingCardTitle} numberOfLines={1}>
                            {ev.name || "Event"}
                          </Text>
                          <Text style={styles.ongoingCardDateTime}>
                            {formatEventDateShort(ev.event_date)} · {formatTimeRange(ev.start_time)}
                          </Text>
                        </View>
                      </Pressable>
                      {clubId ? (
                        <Pressable
                          style={styles.ongoingPayBillBtn}
                          onPress={() => openPayBill(clubId)}
                        >
                          <Text style={styles.ongoingPayBillBtnText}>Pay Bill</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                }
                if (!b.event_id && b.club_id) {
                  const club = b.clubs;
                  return (
                    <View key={b.id} style={[styles.ongoingCard, { marginRight: ONGOING_CARD_GAP }]}>
                      <Pressable onPress={() => router.push(`/club/${b.club_id}`)}>
                        <View style={styles.ongoingCardImageWrap}>
                          {club?.cover_photo ? (
                            <Image
                              source={{ uri: club.cover_photo }}
                              style={styles.ongoingCardImage}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.ongoingCardPlaceholder}>
                              <Ionicons name="business-outline" size={32} color={Colors.dark.textTertiary} />
                            </View>
                          )}
                        </View>
                        <View style={styles.ongoingCardBody}>
                          <Text style={styles.ongoingCardTitle} numberOfLines={1}>
                            {club?.club_name || "Club"}
                          </Text>
                          <Text style={styles.ongoingCardDateTime}>
                            Club entry · {b.booking_date ? formatEventDateShort(b.booking_date) : ""}
                          </Text>
                        </View>
                      </Pressable>
                      <Pressable
                        style={styles.ongoingPayBillBtn}
                        onPress={() => openPayBill(b.club_id!)}
                      >
                        <Text style={styles.ongoingPayBillBtnText}>Pay Bill</Text>
                      </Pressable>
                    </View>
                  );
                }
                return null;
              })}
            </ScrollView>
          )}
        </View>
      </ScrollView>

      {/* Add Money Modal - same logic as Pay Bill */}
      <Modal
        visible={showAddMoneyModal}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <DismissKeyboardView style={styles.modalContainer}>
            <LinearGradient
              colors={WALLET_GRADIENT}
              locations={WALLET_GRADIENT_LOCATIONS}
              style={StyleSheet.absoluteFill}
            />
            <StatusBar barStyle="light-content" />
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setShowAddMoneyModal(false)} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={28} color={Colors.dark.text} />
              </Pressable>
              <View style={styles.modalHeaderContent}>
                <Text style={styles.modalTitle}>Add Money to Wallet</Text>
                <Text style={styles.modalSubtitle}>Fund your wallet for quick payments</Text>
              </View>
              <View style={{ width: 40 }} />
            </View>

            <View style={styles.amountSection}>
              <Text style={styles.amountLabel}>Enter amount</Text>
              <View style={styles.amountInputWrap}>
                <Text style={styles.rupeeSymbol}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  value={addAmount}
                  onChangeText={handleAmountChange}
                  placeholder="0.00"
                  placeholderTextColor={Colors.dark.textSecondary}
                  keyboardType="decimal-pad"
                  autoFocus
                />
              </View>
            </View>

            <View style={styles.proceedWrap}>
              <ThemedButton
                style={{
                  ...styles.proceedBtn,
                  ...((!addAmount || parseFloat(addAmount) <= 0) ? styles.proceedBtnDisabled : {}),
                }}
                textStyle={styles.proceedBtnText}
                onPress={handleProceedAddMoney}
                disabled={!addAmount || parseFloat(addAmount) <= 0 || processingPayment}
                loading={processingPayment}
              >
                Proceed to Pay
              </ThemedButton>
            </View>
          </DismissKeyboardView>
        </KeyboardAvoidingView>
      </Modal>

      <PayBillModal
        visible={payBillVisible}
        onClose={() => {
          setPayBillVisible(false);
          setPayBillClubId(null);
          setPayBillClub(null);
          setPayBillDiscounts([]);
        }}
        clubId={payBillClubId ?? ""}
        club={payBillClub}
        discounts={payBillDiscounts}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  gradientBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "50%",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.dark.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  content: { flex: 1 },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  balanceInfo: {
    flexShrink: 1,
  },
  balanceLabel: {
    fontSize: 14,
    color: Colors.dark.textPrimary,
    opacity: 0.9,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: "800",
    color: Colors.dark.text,
    marginBottom: 20,
  },
  addMoneyPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.card,
    gap: 8,
  },
  addMoneyPillText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: "600",
  },
  section: { marginBottom: 24 },
  ongoingScroll: { marginHorizontal: -20 },
  ongoingScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 4,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  ongoingLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 24,
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  ongoingLoadingText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
  },
  ongoingEmpty: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  ongoingEmptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.dark.text,
    marginTop: 12,
  },
  ongoingEmptySubtext: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginTop: 4,
  },
  ongoingCard: {
    width: ONGOING_CARD_WIDTH,
    backgroundColor: Colors.dark.card,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  ongoingCardImageWrap: {
    width: ONGOING_CARD_WIDTH,
    height: 100,
    overflow: "hidden",
  },
  ongoingCardImage: { width: "100%", height: "100%" },
  ongoingCardPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: Colors.dark.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  ongoingCardBody: { padding: 10 },
  ongoingCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.dark.text,
    marginBottom: 4,
  },
  ongoingCardDateTime: {
    fontSize: 11,
    color: Colors.dark.textSecondary,
  },
  ongoingPayBillBtn: {
    marginHorizontal: 10,
    marginBottom: 10,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.dark.primary,
    alignItems: "center",
  },
  ongoingPayBillBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.dark.text,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.dark.text,
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: Colors.dark.card,
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
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  backBtnText: { color: Colors.dark.text, fontSize: 24 },
  modalHeaderContent: { flex: 1, marginLeft: 12 },
  modalTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: "700",
  },
  modalSubtitle: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  amountSection: {
    paddingHorizontal: 16,
    marginTop: 32,
  },
  amountLabel: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  amountInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.dark.primary500,
  },
  rupeeSymbol: {
    color: Colors.dark.text,
    fontSize: 48,
    fontWeight: "300",
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 48,
    fontWeight: "300",
  },
  proceedWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  proceedBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  proceedBtnDisabled: { opacity: 0.5 },
  proceedBtnText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: "600",
  },
});
