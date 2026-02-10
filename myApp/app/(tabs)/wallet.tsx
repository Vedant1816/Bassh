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
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { fetchWithFallback } from "@/_services/api-config";
import supabase from "@/_services/supabase-public";
import { GradientButton } from "@/components/ui/GradientButton";
import { DismissKeyboardView } from "@/components/DismissKeyboardView";

interface Transaction {
  id: string;
  amount: number;
  status: string;
  type: string;
  description: string;
  is_credit: boolean;
  is_debit: boolean;
  club_name: string | null;
  event_name: string | null;
  created_at: string;
}

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
  const [balance, setBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [addAmount, setAddAmount] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);

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

  const fetchTransactions = useCallback(async () => {
    try {
      setLoadingTransactions(true);
      const res = await fetchWithFallback(
        "/api/transactions",
        await withAuthHeaders({ method: "GET" })
      );
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      } else {
        setTransactions([]);
      }
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchBalance();
      fetchTransactions();
    }, [fetchBalance, fetchTransactions])
  );

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
          console.log("💳 [WALLET] Opening Razorpay...");
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
              console.log("✅ [WALLET] Payment successful:", response);
              if (!response?.razorpay_payment_id) {
                Alert.alert("Error", "Invalid payment response");
                return;
              }

              try {
                console.log("💳 [WALLET] Verifying payment...");
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

                console.log("✅ [WALLET] Wallet credited successfully");
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
              } else {
                console.log("ℹ️ [WALLET] Payment cancelled by user");
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

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Wallet</Text>
        <Text style={styles.headerSubtitle}>Manage your balance</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          {loadingBalance ? (
            <ActivityIndicator color="#fff" size="small" style={{ marginVertical: 16 }} />
          ) : (
            <Text style={styles.balanceAmount}>₹{balance.toFixed(0)}</Text>
          )}
          <Pressable style={styles.addMoneyButton} onPress={handleAddMoney}>
            <Ionicons name="add" size={22} color="#fff" />
            <Text style={styles.addMoneyText}>Add Money</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <Pressable style={styles.actionCard} onPress={() => router.push("/bookings")}>
              <View style={styles.actionIconWrap}>
                <Ionicons name="receipt-outline" size={24} color={Colors.dark.primary} />
              </View>
              <Text style={styles.actionLabel}>My Bookings</Text>
            </Pressable>
            <Pressable style={styles.actionCard} onPress={() => router.push("/transactions")}>
              <View style={styles.actionIconWrap}>
                <Ionicons name="swap-horizontal" size={24} color={Colors.dark.primary} />
              </View>
              <Text style={styles.actionLabel}>Transactions</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {loadingTransactions ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color={Colors.dark.primary} size="small" />
              <Text style={styles.emptyText}>Loading...</Text>
            </View>
          ) : transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={48} color={Colors.dark.textTertiary} />
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptyText}>Your transaction history will appear here</Text>
            </View>
          ) : (
            <View style={styles.transactionList}>
              {transactions.map((tx) => (
                <View key={tx.id} style={styles.transactionCard}>
                  <View style={styles.transactionLeft}>
                    <View
                      style={[
                        styles.transactionIconWrap,
                        tx.is_credit ? styles.transactionIconCredit : styles.transactionIconDebit,
                      ]}
                    >
                      <Ionicons
                        name={tx.is_credit ? "arrow-down" : "arrow-up"}
                        size={18}
                        color={tx.is_credit ? Colors.dark.success : "#EF4444"}
                      />
                    </View>
                    <View>
                      <Text style={styles.transactionDesc} numberOfLines={1}>
                        {tx.description}
                      </Text>
                      <Text style={styles.transactionDate}>
                        {new Date(tx.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.transactionAmount,
                      tx.is_credit ? styles.transactionAmountCredit : styles.transactionAmountDebit,
                    ]}
                  >
                    {tx.is_credit ? "+" : "-"}₹{tx.amount.toFixed(0)}
                  </Text>
                </View>
              ))}
            </View>
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
            <StatusBar barStyle="light-content" />
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setShowAddMoneyModal(false)} style={styles.backBtn}>
                <Text style={styles.backBtnText}>←</Text>
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
                  placeholderTextColor="#666"
                  keyboardType="decimal-pad"
                  autoFocus
                />
              </View>
            </View>

            <View style={styles.proceedWrap}>
              <GradientButton
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
              </GradientButton>
            </View>
          </DismissKeyboardView>
        </KeyboardAvoidingView>
      </Modal>
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
  content: { flex: 1 },
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
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.dark.text,
    marginBottom: 16,
  },
  actionsRow: { flexDirection: "row", gap: 12 },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  actionIconWrap: { marginBottom: 12 },
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
  modalContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  backBtnText: { color: "#fff", fontSize: 24 },
  modalHeaderContent: { flex: 1, marginLeft: 12 },
  modalTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalSubtitle: {
    color: "#999",
    fontSize: 12,
    marginTop: 2,
  },
  amountSection: {
    paddingHorizontal: 16,
    marginTop: 32,
  },
  amountLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  amountInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: Colors.dark.primary,
  },
  rupeeSymbol: {
    color: "#fff",
    fontSize: 48,
    fontWeight: "300",
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    color: "#fff",
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
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  transactionList: { gap: 12 },
  transactionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  transactionLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  transactionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  transactionIconCredit: { backgroundColor: Colors.dark.successBg },
  transactionIconDebit: { backgroundColor: "rgba(239, 68, 68, 0.2)" },
  transactionDesc: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.dark.text,
  },
  transactionDate: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  transactionAmount: { fontSize: 16, fontWeight: "700" },
  transactionAmountCredit: { color: Colors.dark.success },
  transactionAmountDebit: { color: "#EF4444" },
});
