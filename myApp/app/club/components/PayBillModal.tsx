import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
  StatusBar,
  StyleSheet,
  InteractionManager,
  Image,
  Dimensions,
} from "react-native";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { fetchWithFallback } from "@/_services/api-config";
import supabase from "@/_services/supabase-public";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const BOOKING_CHARGE = 50;
const DEFAULT_TERM =
  "Moderate noise: Keep it enjoyable without disturbing neighbors";
const PINK_PRIMARY = "#FF007E";
const OTP_GRADIENT = ["#8B0045", "#2D0A1F", "#000000"] as const;
const OTP_GRADIENT_LOCATIONS = [0, 0.4, 1] as const;

export interface Discount {
  id: string;
  discount_type: string;
  discount_value: number;
  min_purchase: number;
  max_discount: number | null;
  code: string | null;
  name: string;
  description: string | null;
}

interface ClubInfo {
  club_name?: string;
  address_text?: string;
  distance_km?: number;
  banner_image_url?: string;
}

interface PayBillModalProps {
  visible: boolean;
  onClose: () => void;
  clubId: string;
  club: ClubInfo | null;
  discounts: Discount[];
}

type Step = 1 | 2 | 4 | "failure";

export function PayBillModal({
  visible,
  onClose,
  clubId,
  club,
  discounts,
}: PayBillModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [billAmount, setBillAmount] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [applicableDiscounts, setApplicableDiscounts] = useState<Discount[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [walletBalanceLoading, setWalletBalanceLoading] = useState(false);
  const [appliedBillDiscount, setAppliedBillDiscount] = useState<Discount | null>(null);
  const [billDiscountAmount, setBillDiscountAmount] = useState(0);
  const [successData, setSuccessData] = useState<{
    transactionId: string;
    amountPaid: number;
    savings: number;
    date: string;
  } | null>(null);
  const [failureData, setFailureData] = useState<{
    errorMessage: string;
    amount: number;
  } | null>(null);

  // Payment method selection
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"wallet" | "upi">("upi");
  const [selectedUpi, setSelectedUpi] = useState<string>("google");
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);

  const [pendingRazorpayOptions, setPendingRazorpayOptions] = useState<any>(null);
  const [showCouponModal, setShowCouponModal] = useState(false);

  const subtotal = parseFloat(billAmount) || 0;
  const billAfterDiscount = Math.max(0, subtotal - billDiscountAmount);
  const toBePaidAmount = billAfterDiscount + BOOKING_CHARGE;

  // Check if wallet has sufficient balance
  const canPayWithWallet = walletBalance >= toBePaidAmount && !walletBalanceLoading;

  // Get display name for selected payment method
  const getPaymentMethodDisplayName = () => {
    if (selectedPaymentMethod === "wallet") return "Wallet";
    switch (selectedUpi) {
      case "google": return "Google Pay UPI";
      case "paytm": return "Paytm UPI";
      case "phonepe": return "PhonePe UPI";
      default: return "UPI";
    }
  };

  // Reset on open
  useEffect(() => {
    if (visible) {
      setStep(1);
      setBillAmount("");
      setApplicableDiscounts([]);
      setAppliedBillDiscount(null);
      setBillDiscountAmount(0);
      setSuccessData(null);
      setFailureData(null);
      setSelectedPaymentMethod("upi");
      setSelectedUpi("google");
      setShowCouponModal(false);
      setShowPaymentMethodModal(false);
      fetchWalletBalance();
    }
  }, [visible]);

  const fetchWalletBalance = async () => {
    try {
      setWalletBalanceLoading(true);
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) return;
      const { data: customer } = await supabase
        .from("customers")
        .select("wallet_balance")
        .eq("id", user.id)
        .single();
      const val = Number(customer?.wallet_balance);
      setWalletBalance(Number.isNaN(val) ? 0 : val);
    } catch {
      setWalletBalance(0);
    } finally {
      setWalletBalanceLoading(false);
    }
  };

  // Helpers
  const formatCurrency = (amount: string) => {
    const cleaned = amount.replace(/[^\d.]/g, "");
    const parts = cleaned.split(".");
    return parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : cleaned;
  };

  const getBillDiscountValue = (discount: Discount, amount: number): number => {
    if (discount.discount_type === "percentage") {
      let v = amount * (discount.discount_value / 100);
      if (discount.max_discount != null && v > discount.max_discount) v = discount.max_discount;
      return v;
    }
    return discount.discount_value;
  };

  const handleBillAmountChange = (text: string) => {
    const formatted = formatCurrency(text);
    setBillAmount(formatted);
    const amount = parseFloat(formatted) || 0;
    if (amount > 0) {
      setApplicableDiscounts(discounts.filter((d) => amount >= d.min_purchase));
      if (appliedBillDiscount && amount < appliedBillDiscount.min_purchase) {
        setAppliedBillDiscount(null);
        setBillDiscountAmount(0);
      } else if (appliedBillDiscount) {
        setBillDiscountAmount(getBillDiscountValue(appliedBillDiscount, amount));
      }
    } else {
      setApplicableDiscounts([]);
      setAppliedBillDiscount(null);
      setBillDiscountAmount(0);
    }
  };

  const toggleBillDiscount = (discount: Discount) => {
    const amount = parseFloat(billAmount) || 0;
    if (amount < discount.min_purchase) return;
    if (String(appliedBillDiscount?.id) === String(discount.id)) {
      setAppliedBillDiscount(null);
      setBillDiscountAmount(0);
    } else {
      setAppliedBillDiscount(discount);
      setBillDiscountAmount(getBillDiscountValue(discount, amount));
    }
    setShowCouponModal(false);
  };

  const getDiscountDesc = (d: Discount): string => {
    if (d.max_discount != null) return `Get upto ${d.max_discount} rs off`;
    if (d.discount_type === "percentage") return `Get ${d.discount_value}% off`;
    return `Get ₹${d.discount_value} off`;
  };

  const handleProceedToSummary = () => {
    if (!subtotal || subtotal <= 0) { Alert.alert("Error", "Please enter a valid amount"); return; }
    if (toBePaidAmount < 1) { Alert.alert("Error", "Amount to pay must be at least ₹1"); return; }
    setStep(2);
  };

  // Pay with Wallet
  const handlePayWithWallet = async () => {
    const amountToPay = toBePaidAmount;
    if (amountToPay < 1) { Alert.alert("Error", "Invalid amount to pay"); return; }

    if (walletBalance < amountToPay) {
      Alert.alert(
        "Insufficient Balance",
        `Wallet has ₹${walletBalance.toFixed(0)}. Please use UPI payment or add money to wallet.`
      );
      return;
    }

    try {
      setProcessingPayment(true);
      const res = await fetchWithFallback("/api/payments/bill/pay-with-wallet",
        await withAuthHeaders({
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            club_id: clubId,
            amount: amountToPay,
            discount_id: appliedBillDiscount?.id ?? null,
            discount_amount: billDiscountAmount || 0,
          })
        })
      );

      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        throw new Error("Invalid response from server");
      }

      if (!res.ok) {
        setFailureData({
          errorMessage: data.error || data.message || `Server error (${res.status})`,
          amount: amountToPay
        });
        setStep("failure");
        return;
      }

      setSuccessData({
        transactionId: data.transaction_id || String(Date.now()),
        amountPaid: amountToPay,
        savings: billDiscountAmount,
        date: new Date().toLocaleString("en-IN", {
          day: "numeric", month: "short", year: "numeric",
          hour: "2-digit", minute: "2-digit", hour12: true
        }),
      });
      setStep(4);

      setWalletBalance(data.wallet_balance ?? walletBalance - amountToPay);
    } catch (err: any) {
      setFailureData({
        errorMessage: err.message || "Something went wrong",
        amount: amountToPay
      });
      setStep("failure");
    } finally {
      setProcessingPayment(false);
    }
  };

  // Pay with UPI (Razorpay)
  const handlePayWithUPI = async () => {
    const amountToPay = toBePaidAmount;
    if (amountToPay < 1) { Alert.alert("Error", "Invalid amount to pay"); return; }

    try {
      setProcessingPayment(true);

      // Create bill transaction
      let billRes;
      try {
        billRes = await fetchWithFallback("/api/payments/bill/create",
          await withAuthHeaders({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              club_id: clubId,
              amount: amountToPay,
              discount_id: appliedBillDiscount?.id ?? null,
              discount_amount: billDiscountAmount || 0,
            })
          })
        );
      } catch (networkError: any) {
        setProcessingPayment(false);
        setFailureData({
          errorMessage: `Network error: ${networkError.message || 'Unable to connect to server'}`,
          amount: amountToPay
        });
        setStep("failure");
        return;
      }

      let billData;
      try {
        billData = await billRes.json();
      } catch (parseError) {
        setProcessingPayment(false);
        setFailureData({
          errorMessage: "Invalid response from server",
          amount: amountToPay
        });
        setStep("failure");
        return;
      }

      if (!billRes.ok) {
        setProcessingPayment(false);
        setFailureData({
          errorMessage: billData.error || "Failed to create bill",
          amount: amountToPay
        });
        setStep("failure");
        return;
      }

      // Create Razorpay order
      const orderRes = await fetchWithFallback("/api/payments/checkout/create-order",
        await withAuthHeaders({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transaction_id: billData.transaction_id,
            amount: amountToPay
          })
        })
      );

      const order = await orderRes.json();

      if (!orderRes.ok) {
        setProcessingPayment(false);
        setFailureData({
          errorMessage: order.error || "Failed to create order",
          amount: amountToPay
        });
        setStep("failure");
        return;
      }

      const options = {
        key: order.key,
        order_id: order.order_id,
        amount: order.amount || amountToPay * 100,
        currency: "INR",
        name: club?.club_name || "Bill Payment",
        description: "Restaurant Bill Payment",
        prefill: { email: "test@example.com", contact: "9999999999" },
        theme: { color: PINK_PRIMARY },
      };

      setPendingRazorpayOptions({ ...options, billData });
      setProcessingPayment(false);

      openRazorpay({ ...options, billData });
    } catch (err: any) {
      setProcessingPayment(false);
      setFailureData({
        errorMessage: err.message || "Something went wrong. Please try again.",
        amount: toBePaidAmount
      });
      setStep("failure");
    }
  };

  // Open Razorpay checkout
  const openRazorpay = (razorpayData: any) => {
    const { billData, ...options } = razorpayData;

    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        let RazorpayCheckout: any;
        try {
          RazorpayCheckout = require("react-native-razorpay").default;
        } catch {
          setFailureData({
            errorMessage: "Payment gateway not available",
            amount: toBePaidAmount,
          });
          setStep("failure");
          setPendingRazorpayOptions(null);
          return;
        }

        if (!RazorpayCheckout || typeof RazorpayCheckout.open !== "function") {
          setFailureData({
            errorMessage: "Payment gateway not available",
            amount: toBePaidAmount,
          });
          setStep("failure");
          setPendingRazorpayOptions(null);
          return;
        }

        RazorpayCheckout.open(options)
          .then(async (response: any) => {
            if (!response?.razorpay_payment_id) {
              setFailureData({
                errorMessage: "Invalid payment response",
                amount: toBePaidAmount,
              });
              setStep("failure");
              setPendingRazorpayOptions(null);
              return;
            }

            try {
              setProcessingPayment(true);
              const vRes = await fetchWithFallback("/api/payments/bill/verify",
                await withAuthHeaders({
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    transaction_id: billData.transaction_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_signature: response.razorpay_signature
                  })
                })
              );

              const verified = await vRes.json();
              setProcessingPayment(false);

              if (!vRes.ok) {
                setFailureData({
                  errorMessage: verified.error || "Verification failed",
                  amount: toBePaidAmount,
                });
                setStep("failure");
                setPendingRazorpayOptions(null);
                return;
              }

              setSuccessData({
                transactionId: billData.transaction_id,
                amountPaid: toBePaidAmount,
                savings: billDiscountAmount,
                date: new Date().toLocaleString("en-IN", {
                  day: "numeric", month: "short", year: "numeric",
                  hour: "2-digit", minute: "2-digit", hour12: true
                }),
              });
              setStep(4);
              setPendingRazorpayOptions(null);
            } catch (e: any) {
              setProcessingPayment(false);
              setFailureData({
                errorMessage: e?.message || "Verification failed",
                amount: toBePaidAmount,
              });
              setStep("failure");
              setPendingRazorpayOptions(null);
            }
          })
          .catch((error: any) => {
            const cancelled = error?.description?.toLowerCase().includes("cancelled") ||
              error?.code === "BAD_REQUEST_ERROR" ||
              error?.description === "User closed the checkout form by pressing back button";

            if (cancelled) {
              setFailureData({
                errorMessage: "Payment was cancelled.",
                amount: toBePaidAmount,
              });
            } else {
              setFailureData({
                errorMessage: error?.description || error?.message || "Payment could not be completed",
                amount: toBePaidAmount,
              });
            }
            setStep("failure");
            setPendingRazorpayOptions(null);
          });
      }, 300);
    });
  };

  // Handle Pay Now button
  const handlePayNow = () => {
    if (processingPayment) return;

    if (selectedPaymentMethod === "wallet") {
      handlePayWithWallet();
    } else {
      handlePayWithUPI();
    }
  };

  const handleClose = () => {
    if (step === 4 || step === "failure") {
      setBillAmount("");
      setAppliedBillDiscount(null);
      setBillDiscountAmount(0);
      setSuccessData(null);
      setFailureData(null);
      setPendingRazorpayOptions(null);
    }
    onClose();
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER COMPONENTS
  // ═══════════════════════════════════════════════════════════

  const renderBlurEllipse = () => (
    <LinearGradient
      colors={["rgba(139, 0, 69, 0.9)", "rgba(80, 0, 40, 0.6)", "transparent"]}
      locations={[0, 0.5, 1]}
      style={styles.blurEllipse}
      pointerEvents="none"
    />
  );

  const renderHeader = () => (
    <View style={styles.headerBar}>
      <Pressable
        onPress={step === 2 ? () => setStep(1) : handleClose}
        style={styles.backButton}
      >
        <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
      </Pressable>
      <View style={styles.headerTextContainer}>
        <Text style={styles.headerTitle}>
          {(club?.club_name || "CLUB").toUpperCase()}
        </Text>
        <Text style={styles.headerSubtitle}>
          {club?.address_text || "Location"}
        </Text>
      </View>
    </View>
  );

  const renderCouponCard = (d: Discount) => {
    const isApplied = String(appliedBillDiscount?.id) === String(d.id);
    const amount = parseFloat(billAmount) || 0;
    const isApplicable = amount >= d.min_purchase;

    return (
      <Pressable
        key={d.id}
        style={[
          styles.couponCard,
          isApplied && styles.couponCardApplied,
          !isApplicable && styles.couponCardDisabled
        ]}
        onPress={() => isApplicable && toggleBillDiscount(d)}
        disabled={!isApplicable}
      >
        {/* Watermark icon on right side */}
        <View style={styles.couponWatermark}>
          <Ionicons
            name="pricetag"
            size={60}
            color={isApplied ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.08)"}
            style={styles.couponWatermarkIcon}
          />
        </View>

        <View style={styles.couponContent}>
          <View style={styles.couponLeft}>
            <Ionicons
              name="pricetag"
              size={24}
              color={isApplied ? PINK_PRIMARY : (isApplicable ? PINK_PRIMARY : "#6B6B6B")}
              style={styles.couponIcon}
            />
            <View style={styles.couponTextContainer}>
              <Text style={[styles.couponName, !isApplicable && styles.couponNameDisabled]}>
                {d.name}
              </Text>
              <Text style={[styles.couponDescription, !isApplicable && styles.couponDescDisabled]}>
                {isApplicable ? getDiscountDesc(d) : `Min ₹${d.min_purchase} required`}
              </Text>
            </View>
          </View>

          {/* APPLY / Applied Button */}
          <Pressable
            style={[
              styles.couponApplyButton,
              isApplied && styles.couponApplyButtonApplied,
              !isApplicable && styles.couponApplyButtonDisabled
            ]}
            onPress={() => isApplicable && toggleBillDiscount(d)}
            disabled={!isApplicable}
          >
            <Text style={[
              styles.couponApplyButtonText,
              isApplied && styles.couponApplyButtonTextApplied
            ]}>
              {isApplied ? "Applied" : "APPLY"}
            </Text>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // PAYMENT METHOD SELECTION MODAL
  // ═══════════════════════════════════════════════════════════
  const renderPaymentMethodModal = () => (
    <Modal
      visible={showPaymentMethodModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowPaymentMethodModal(false)}
    >
      <View style={styles.paymentModalOverlay}>
        <Pressable
          style={styles.paymentModalBackdrop}
          onPress={() => setShowPaymentMethodModal(false)}
        />
        <View style={styles.paymentModalContainer}>
          <View style={styles.paymentModalHandle} />

          <Text style={styles.paymentModalTitle}>Select Payment Method</Text>

          {/* Wallet Option */}
          <Pressable
            style={[
              styles.paymentMethodRow,
              selectedPaymentMethod === "wallet" && styles.paymentMethodRowSelected,
              !canPayWithWallet && styles.paymentMethodRowDisabled
            ]}
            onPress={() => {
              if (canPayWithWallet) {
                setSelectedPaymentMethod("wallet");
              }
            }}
            disabled={!canPayWithWallet}
          >
            <View style={styles.paymentMethodLeft}>
              <View style={styles.paymentMethodIconCircle}>
                <Ionicons name="wallet-outline" size={22} color="#FFFFFF" />
              </View>
              <View>
                <Text style={[styles.paymentMethodLabel, !canPayWithWallet && styles.paymentMethodLabelDisabled]}>
                  Wallet
                </Text>
                <Text style={styles.paymentMethodBalance}>
                  Balance: ₹{walletBalanceLoading ? "..." : walletBalance.toFixed(0)}
                  {!canPayWithWallet && " (Insufficient)"}
                </Text>
              </View>
            </View>
            <View style={[styles.radioOuter, selectedPaymentMethod === "wallet" && styles.radioOuterSelected]}>
              {selectedPaymentMethod === "wallet" && <View style={styles.radioInner} />}
            </View>
          </Pressable>

          {/* UPI Section */}
          <Text style={styles.paymentModalSectionTitle}>UPI</Text>

          {[
            { id: "google", label: "Google Pay", icon: "logo-google" },
            { id: "paytm", label: "Paytm", icon: "wallet-outline" },
            { id: "phonepe", label: "PhonePe", icon: "wallet-outline" },
          ].map((item) => (
            <Pressable
              key={item.id}
              style={[
                styles.paymentMethodRow,
                selectedPaymentMethod === "upi" && selectedUpi === item.id && styles.paymentMethodRowSelected
              ]}
              onPress={() => {
                setSelectedPaymentMethod("upi");
                setSelectedUpi(item.id);
              }}
            >
              <View style={styles.paymentMethodLeft}>
                <View style={styles.paymentMethodIconCircle}>
                  <Ionicons name={item.icon as any} size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.paymentMethodLabel}>{item.label}</Text>
              </View>
              <View style={[
                styles.radioOuter,
                selectedPaymentMethod === "upi" && selectedUpi === item.id && styles.radioOuterSelected
              ]}>
                {selectedPaymentMethod === "upi" && selectedUpi === item.id && <View style={styles.radioInner} />}
              </View>
            </Pressable>
          ))}

          {/* Confirm Button */}
          <Pressable
            style={styles.confirmPaymentMethodButton}
            onPress={() => setShowPaymentMethodModal(false)}
          >
            <Text style={styles.confirmPaymentMethodButtonText}>Confirm</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  // ═══════════════════════════════════════════════════════════
  // STEP 1 - ENTER BILL AMOUNT
  // ═══════════════════════════════════════════════════════════
  const renderStep1 = () => (
    <>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.sectionTitle}>Enter your bill amount</Text>

        <View style={styles.amountInputContainer}>
          <Text style={styles.rupeeSymbol}>₹</Text>
          <TextInput
            style={styles.amountInput}
            value={billAmount}
            onChangeText={handleBillAmountChange}
            placeholder="0.00"
            placeholderTextColor="rgba(243, 87, 182, 0.5)"
            keyboardType="decimal-pad"
          />
        </View>

        {applicableDiscounts.length > 0 && (
          <View style={styles.couponsContainer}>
            {applicableDiscounts.slice(0, 3).map((d) => renderCouponCard(d))}
            {applicableDiscounts.length > 3 && (
              <Pressable style={styles.viewMoreButton} onPress={() => setShowCouponModal(true)}>
                <Text style={styles.viewMoreText}>View more</Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.footerContainer}>
        <Pressable
          style={[
            styles.proceedButton,
            (!billAmount || subtotal <= 0) && styles.proceedButtonDisabled
          ]}
          onPress={handleProceedToSummary}
          disabled={!billAmount || subtotal <= 0}
        >
          <Text style={styles.proceedButtonText}>Proceed</Text>
        </Pressable>
      </View>

      {/* All Coupons Modal */}
      <Modal
        visible={showCouponModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCouponModal(false)}
      >
        <View style={styles.couponModalContainer}>
          <StatusBar barStyle="light-content" />
          <LinearGradient
            colors={OTP_GRADIENT}
            locations={OTP_GRADIENT_LOCATIONS}
            style={styles.couponModalGradient}
          />

          <View style={styles.couponModalHeader}>
            <Pressable onPress={() => setShowCouponModal(false)} style={styles.backButton}>
              <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.couponModalTitle}>All Coupons</Text>
            <View style={{ width: 32 }} />
          </View>

          <ScrollView style={styles.couponModalScroll} contentContainerStyle={styles.couponModalContent}>
            {applicableDiscounts.length > 0 ? (
              applicableDiscounts.map((d) => renderCouponCard(d))
            ) : (
              <Text style={styles.noCouponsText}>No coupons available for this amount</Text>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );

  // ═══════════════════════════════════════════════════════════
  // STEP 2 - BILL SUMMARY (MATCHING FIGMA DESIGN)
  // ═══════════════════════════════════════════════════════════
  const renderStep2 = () => (
    <>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.step2ScrollContent}
      >
        {/* Section: Your bill amount */}
        <Text style={styles.yourBillAmountTitle}>Your bill amount</Text>

        {/* Savings Banner */}
        {billDiscountAmount > 0 && (
          <View style={styles.savingsBanner}>
            <Text style={styles.savingsBannerText}>
              You're saving ₹{billDiscountAmount.toFixed(0)} on the bill
            </Text>
          </View>
        )}

        {/* Large Amount Display */}
        <View style={styles.largeAmountCard}>
          <Text style={styles.largeAmountText}>
            ₹ {subtotal.toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </Text>
        </View>

        {/* Saving corner Section */}
        <Text style={styles.savingCornerTitle}>Saving corner</Text>

        {/* Applied Coupon Card */}
        {appliedBillDiscount && (
          <View style={styles.appliedCouponCard}>
            <Ionicons name="pricetag" size={20} color={PINK_PRIMARY} style={styles.couponIcon} />
            <View style={styles.appliedCouponTextContainer}>
              <Text style={styles.appliedCouponName}>{appliedBillDiscount.name}</Text>
              <Text style={styles.appliedCouponDesc}>{getDiscountDesc(appliedBillDiscount)}</Text>
            </View>
          </View>
        )}

        {/* View all Coupons Link */}
        <Pressable
          style={styles.viewAllCouponsRow}
          onPress={() => setShowCouponModal(true)}
        >
          <View style={styles.viewAllCouponsLeft}>
            <View style={styles.viewAllIconCircle}>
              <Ionicons name="gift-outline" size={18} color="#000000" />
            </View>
            <Text style={styles.viewAllCouponsText}>View all Coupons</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
        </Pressable>

        {/* Bill Summary Card */}
        <View style={styles.billSummaryCard}>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Bill amount</Text>
            <Text style={styles.billValue}>₹ {subtotal.toLocaleString("en-IN")}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Booking charges</Text>
            <Text style={styles.billValue}>₹ {BOOKING_CHARGE}</Text>
          </View>
          {billDiscountAmount > 0 && (
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Coupon code</Text>
              <Text style={styles.billDiscountValue}>-{billDiscountAmount.toFixed(0)}</Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.billTotalRow}>
            <Text style={styles.billTotalLabel}>To be paid</Text>
            <View style={styles.billTotalRight}>
              <Text style={styles.billTotalValue}>₹ {toBePaidAmount.toLocaleString("en-IN")}</Text>
              {billDiscountAmount > 0 && (
                <View style={styles.youSavedBadge}>
                  <Text style={styles.youSavedBadgeText}>You saved Rs.{billDiscountAmount.toFixed(0)}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Terms & Conditions Section */}
        <Text style={styles.termsSectionTitle}>Terms & Conditions</Text>

        <View style={styles.termsCard}>
          {[0, 1, 2].map((i) => (
            <View key={i}>
              <Text style={styles.termsText}>{DEFAULT_TERM}</Text>
              {i < 2 && <View style={styles.termsDivider} />}
            </View>
          ))}
        </View>

        <Pressable style={styles.readAllTCRow}>
          <Text style={styles.readAllTCText}>Read all T&Cs</Text>
          <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
        </Pressable>

        <View style={styles.bottomSpacerLarge} />
      </ScrollView>

      {/* Footer - Matching Design */}
      <View style={styles.payFooter}>
        <Pressable
          style={styles.payUsingSection}
          onPress={() => setShowPaymentMethodModal(true)}
        >
          <View style={styles.paymentMethodIcon}>
            <Ionicons
              name={selectedPaymentMethod === "wallet" ? "wallet-outline" : "logo-google"}
              size={16}
              color="#FFFFFF"
            />
          </View>
          <View>
            <Text style={styles.payUsingLabel}>Pay using</Text>
            <Text style={styles.payUsingMethod}>{getPaymentMethodDisplayName()}</Text>
          </View>
        </Pressable>

        <View style={styles.payNowCard}>
          <View style={styles.payNowCardContent}>
            <View style={styles.totalAmountSection}>
              <Text style={styles.totalAmountValue}>Rs.{toBePaidAmount.toLocaleString("en-IN")}</Text>
              <Text style={styles.totalLabel}>Total</Text>
            </View>
            <Pressable
              style={[styles.payNowButton, processingPayment && styles.payNowButtonDisabled]}
              onPress={handlePayNow}
              disabled={processingPayment}
            >
              <Text style={styles.payNowButtonText}>
                {processingPayment ? "Processing..." : "Pay now"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Coupon Modal for Step 2 */}
      <Modal
        visible={showCouponModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCouponModal(false)}
      >
        <View style={styles.couponModalContainer}>
          <StatusBar barStyle="light-content" />
          <LinearGradient
            colors={OTP_GRADIENT}
            locations={OTP_GRADIENT_LOCATIONS}
            style={styles.couponModalGradient}
          />

          <View style={styles.couponModalHeader}>
            <Pressable onPress={() => setShowCouponModal(false)} style={styles.backButton}>
              <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.couponModalTitle}>All Coupons</Text>
            <View style={{ width: 32 }} />
          </View>

          <ScrollView style={styles.couponModalScroll} contentContainerStyle={styles.couponModalContent}>
            {discounts.length > 0 ? (
              discounts.map((d) => renderCouponCard(d))
            ) : (
              <Text style={styles.noCouponsText}>No coupons available</Text>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Payment Method Selection Modal */}
      {renderPaymentMethodModal()}
    </>
  );

  // ═══════════════════════════════════════════════════════════
  // STEP 4 — SUCCESS
  // ═══════════════════════════════════════════════════════════
  const renderStep4Success = () => (
    <View style={styles.successContainer}>
      <LinearGradient
        colors={["#1a5c2a", "#0d3318", "#000000"]}
        locations={[0, 0.5, 1]}
        style={styles.successGradient}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.successScrollContent}
      >
        <View style={styles.successCheckCircle}>
          <Ionicons name="checkmark" size={52} color="#FFFFFF" />
        </View>

        <Text style={styles.successTitle}>Payment successful</Text>
        <Text style={styles.successAmount}>
          ₹ {successData?.amountPaid.toLocaleString("en-IN", { minimumFractionDigits: 0 }) ?? "0"}
        </Text>

        <View style={styles.successDivider} />

        <Text style={styles.successSubtext}>
          You paid total of ₹{successData?.amountPaid.toLocaleString("en-IN")}
        </Text>

        {successData && successData.savings > 0 && (
          <View style={styles.successSavingsCard}>
            <Ionicons name="pricetag" size={24} color="#FFFFFF" style={styles.couponIcon} />
            <Text style={styles.successSavingsText}>
              You saved ₹{successData.savings.toFixed(0)} on this bill payment
            </Text>
          </View>
        )}

        <View style={styles.successInfoCard}>
          <View style={styles.successClubRow}>
            <Image
              source={{ uri: club?.banner_image_url || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4" }}
              style={styles.successClubImage}
            />
            <View>
              <Text style={styles.successClubName}>
                {(club?.club_name || "Club").toUpperCase()}
              </Text>
              <Text style={styles.successClubAddress}>{club?.address_text || "Location"}</Text>
            </View>
          </View>

          <View style={styles.divider} />
          <Text style={styles.successMetaLabel}>Date and time</Text>
          <Text style={styles.successMetaValue}>{successData?.date}</Text>

          <View style={styles.divider} />
          <Text style={styles.successMetaLabel}>Transaction ID</Text>
          <Text style={styles.successMetaValue}>{successData?.transactionId}</Text>
        </View>

        <Pressable style={styles.doneButton} onPress={handleClose}>
          <Text style={styles.doneButtonText}>Done</Text>
        </Pressable>

        <View style={styles.bottomSpacerLarge} />
      </ScrollView>
    </View>
  );

  // ═══════════════════════════════════════════════════════════
  // PAYMENT FAILURE
  // ═══════════════════════════════════════════════════════════
  const renderFailure = () => (
    <View style={styles.failureContainer}>
      <LinearGradient
        colors={["#7F1D1D", "#450a0a", "#000000"]}
        locations={[0, 0.4, 1]}
        style={styles.failureGradient}
      />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.failureScrollContent}
      >
        <View style={styles.failureCircle}>
          <Ionicons name="close" size={52} color="#FFFFFF" />
        </View>
        <Text style={styles.failureTitle}>Payment failed</Text>
        <Text style={styles.failureAmount}>
          ₹ {failureData?.amount.toLocaleString("en-IN", { minimumFractionDigits: 0 }) ?? "0"}
        </Text>
        <View style={styles.successDivider} />
        <Text style={styles.failureSubtext}>Attempted amount ₹{failureData?.amount.toLocaleString("en-IN") ?? "0"}</Text>
        <View style={styles.failureErrorCard}>
          <Ionicons name="alert-circle" size={24} color="#FFFFFF" />
          <Text style={styles.failureErrorText} numberOfLines={4}>
            {failureData?.errorMessage ?? "Payment could not be completed."}
          </Text>
        </View>
        <Pressable style={styles.tryAgainButton} onPress={() => { setFailureData(null); setPendingRazorpayOptions(null); setStep(2); }}>
          <Text style={styles.tryAgainButtonText}>Try Again</Text>
        </Pressable>
        <Pressable style={styles.failureCloseButton} onPress={handleClose}>
          <Text style={styles.failureCloseButtonText}>Close</Text>
        </Pressable>
        <View style={styles.bottomSpacerLarge} />
      </ScrollView>
    </View>
  );

  // ═══════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════
  const isSuccessOrFailure = step === 4 || step === "failure";

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />

        {!isSuccessOrFailure && renderBlurEllipse()}
        {!isSuccessOrFailure && renderHeader()}

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 4 && renderStep4Success()}
        {step === "failure" && renderFailure()}
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLESHEET
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },

  blurEllipse: {
    position: "absolute",
    width: SCREEN_WIDTH + 100,
    height: 400,
    left: -50,
    top: 0,
    borderBottomLeftRadius: 200,
    borderBottomRightRadius: 200,
  },

  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 59,
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
  },

  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerTextContainer: {
    flex: 1,
    gap: 4,
  },

  headerTitle: {
    fontFamily: "Poppins",
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 24,
    color: "#FFFFFF",
  },

  headerSubtitle: {
    fontFamily: "Poppins",
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 18,
    color: "#929292",
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },

  step2ScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  sectionTitle: {
    fontFamily: "Poppins",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 20,
    color: "#FFFFFF",
    marginBottom: 16,
  },

  amountInputContainer: {
    width: "100%",
    height: 79,
    borderRadius: 14,
    backgroundColor: "#6B0048",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(219, 68, 148, 0.3)",
  },

  rupeeSymbol: {
    fontFamily: "Poppins",
    fontSize: 32,
    fontWeight: "400",
    color: "#F357B6",
  },

  amountInput: {
    flex: 1,
    fontFamily: "Poppins",
    fontSize: 32,
    fontWeight: "400",
    color: "#F357B6",
    padding: 0,
  },

  couponsContainer: {
    marginTop: 24,
    gap: 8,
  },

  // Coupon Card Styles - Matching Design
  couponCard: {
    width: "100%",
    height: 82,
    borderRadius: 12,
    backgroundColor: "rgba(45, 45, 45, 0.95)",
    overflow: "hidden",
    position: "relative",
    marginBottom: 8,
  },

  couponCardApplied: {
    backgroundColor: "#5C0030",
  },

  couponCardDisabled: {
    opacity: 0.6,
  },

  couponWatermark: {
    position: "absolute",
    right: 60,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },

  couponWatermarkIcon: {
    transform: [{ rotate: "-15deg" }],
  },

  couponContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 16,
    paddingRight: 12,
  },

  couponLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },

  couponIcon: {
    transform: [{ rotate: "90deg" }],
  },

  couponTextContainer: {
    gap: 4,
  },

  couponName: {
    fontFamily: "Poppins",
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  couponNameDisabled: {
    color: "#6B6B6B",
  },

  couponDescription: {
    fontFamily: "Poppins",
    fontSize: 14,
    color: "#9A9A9A",
  },

  couponDescDisabled: {
    color: "#5A5A5A",
  },

  couponApplyButton: {
    minWidth: 90,
    height: 40,
    borderRadius: 8,
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "rgba(180, 180, 180, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  couponApplyButtonApplied: {
    backgroundColor: PINK_PRIMARY,
    borderColor: PINK_PRIMARY,
  },

  couponApplyButtonDisabled: {
    borderColor: "rgba(100, 100, 100, 0.4)",
  },

  couponApplyButtonText: {
    fontFamily: "Poppins",
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },

  couponApplyButtonTextApplied: {
    color: "#FFFFFF",
  },

  viewMoreButton: {
    alignItems: "center",
    marginTop: 12,
    paddingVertical: 4,
  },

  viewMoreText: {
    fontFamily: "Poppins",
    fontSize: 14,
    fontWeight: "500",
    color: "#F357B6",
  },

  bottomSpacer: {
    height: 120,
  },

  bottomSpacerLarge: {
    height: 160,
  },

  footerContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 34,
    backgroundColor: "#000000",
  },

  proceedButton: {
    width: "100%",
    height: 52,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  proceedButtonDisabled: {
    opacity: 0.5,
  },

  proceedButtonText: {
    fontFamily: "Poppins",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.24,
    color: "#000000",
  },

  // Step 2 - Your Bill Amount Section
  yourBillAmountTitle: {
    fontFamily: "Poppins",
    fontSize: 16,
    fontWeight: "500",
    color: PINK_PRIMARY,
    marginBottom: 12,
  },

  savingsBanner: {
    backgroundColor: PINK_PRIMARY,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },

  savingsBannerText: {
    fontFamily: "Poppins",
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
  },

  largeAmountCard: {
    backgroundColor: "rgba(45, 45, 45, 0.8)",
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 24,
  },

  largeAmountText: {
    fontFamily: "Poppins",
    fontSize: 36,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Saving Corner Section
  savingCornerTitle: {
    fontFamily: "Poppins",
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 12,
  },

  appliedCouponCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(78, 78, 78, 0.32)",
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 12,
    marginBottom: 12,
  },

  appliedCouponTextContainer: {
    flex: 1,
  },

  appliedCouponName: {
    fontFamily: "Poppins",
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  appliedCouponDesc: {
    fontFamily: "Poppins",
    fontSize: 13,
    color: "#A2A2A2",
  },

  // View All Coupons Row
  viewAllCouponsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    marginBottom: 16,
  },

  viewAllCouponsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  viewAllIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  viewAllCouponsText: {
    fontFamily: "Poppins",
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
  },

  // Bill Summary Card
  billSummaryCard: {
    backgroundColor: "rgba(45, 45, 45, 0.8)",
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 24,
  },

  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  billLabel: {
    fontFamily: "Poppins",
    fontSize: 15,
    fontWeight: "500",
    color: "#FFFFFF",
  },

  billValue: {
    fontFamily: "Poppins",
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  billDiscountValue: {
    fontFamily: "Poppins",
    fontSize: 15,
    fontWeight: "600",
    color: PINK_PRIMARY,
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    marginVertical: 16,
  },

  billTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  billTotalLabel: {
    fontFamily: "Poppins",
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  billTotalRight: {
    alignItems: "flex-end",
  },

  billTotalValue: {
    fontFamily: "Poppins",
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  youSavedBadge: {
    backgroundColor: "#FACC15",
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 6,
  },

  youSavedBadgeText: {
    fontFamily: "Poppins",
    fontSize: 11,
    fontWeight: "600",
    color: "#000000",
  },

  // Terms & Conditions
  termsSectionTitle: {
    fontFamily: "Poppins",
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 12,
  },

  termsCard: {
    backgroundColor: "rgba(45, 45, 45, 0.8)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },

  termsText: {
    fontFamily: "Poppins",
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 22,
    color: "rgba(255, 255, 255, 0.7)",
    paddingVertical: 12,
  },

  termsDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },

  readAllTCRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 4,
  },

  readAllTCText: {
    fontFamily: "Poppins",
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Footer - Matching Design
  payFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 34,
    backgroundColor: "#000000",
  },

  payUsingSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },

  paymentMethodIcon: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  payUsingLabel: {
    fontFamily: "Poppins",
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.6)",
  },

  payUsingMethod: {
    fontFamily: "Poppins",
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  payNowCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginLeft: 12,
  },

  payNowCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },

  totalAmountSection: {
    alignItems: "center",
  },

  totalAmountValue: {
    fontFamily: "Poppins",
    fontSize: 18,
    fontWeight: "700",
    color: "#000000",
  },

  totalLabel: {
    fontFamily: "Poppins",
    fontSize: 11,
    color: "rgba(0, 0, 0, 0.6)",
  },

  payNowButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },

  payNowButtonDisabled: {
    opacity: 0.6,
  },

  payNowButtonText: {
    fontFamily: "Poppins",
    fontSize: 16,
    fontWeight: "700",
    color: "#000000",
  },

  // Payment Method Modal
  paymentModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },

  paymentModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },

  paymentModalContainer: {
    backgroundColor: "#1A1A1A",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 34,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },

  paymentModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 20,
  },

  paymentModalTitle: {
    fontFamily: "Poppins",
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 20,
  },

  paymentModalSectionTitle: {
    fontFamily: "Poppins",
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginTop: 16,
    marginBottom: 12,
  },

  paymentMethodRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(45, 45, 45, 0.8)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },

  paymentMethodRowSelected: {
    borderWidth: 1,
    borderColor: PINK_PRIMARY,
    backgroundColor: "rgba(255, 0, 126, 0.1)",
  },

  paymentMethodRowDisabled: {
    opacity: 0.5,
  },

  paymentMethodLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  paymentMethodIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  paymentMethodLabel: {
    fontFamily: "Poppins",
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
  },

  paymentMethodLabelDisabled: {
    color: "rgba(255, 255, 255, 0.5)",
  },

  paymentMethodBalance: {
    fontFamily: "Poppins",
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    marginTop: 2,
  },

  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },

  radioOuterSelected: {
    borderColor: PINK_PRIMARY,
  },

  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: PINK_PRIMARY,
  },

  confirmPaymentMethodButton: {
    backgroundColor: PINK_PRIMARY,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
  },

  confirmPaymentMethodButtonText: {
    fontFamily: "Poppins",
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Coupon Modal
  couponModalContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },

  couponModalGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.5,
  },

  couponModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 59,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.15)",
  },

  couponModalTitle: {
    flex: 1,
    fontFamily: "Poppins",
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
  },

  couponModalScroll: {
    flex: 1,
  },

  couponModalContent: {
    padding: 16,
  },

  noCouponsText: {
    fontFamily: "Poppins",
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
    marginTop: 40,
  },

  // Success Screen
  successContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },

  successGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "45%",
  },

  successScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 100,
    alignItems: "center",
  },

  successCheckCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#4ade80",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },

  successTitle: {
    fontFamily: "Poppins",
    fontSize: 26,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12,
  },

  successAmount: {
    fontFamily: "Poppins",
    fontSize: 38,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 20,
  },

  successDivider: {
    width: "75%",
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    marginBottom: 20,
  },

  successSubtext: {
    fontFamily: "Poppins",
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 24,
    textAlign: "center",
  },

  successSavingsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 0, 126, 0.45)",
    padding: 18,
    borderRadius: 12,
    width: "100%",
    marginBottom: 20,
    gap: 12,
  },

  successSavingsText: {
    fontFamily: "Poppins",
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    flex: 1,
  },

  successInfoCard: {
    backgroundColor: "rgba(45, 45, 45, 0.8)",
    borderRadius: 12,
    padding: 18,
    width: "100%",
  },

  successClubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },

  successClubImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },

  successClubName: {
    fontFamily: "Poppins",
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  successClubAddress: {
    fontFamily: "Poppins",
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 4,
  },

  successMetaLabel: {
    fontFamily: "Poppins",
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.5)",
    marginBottom: 4,
  },

  successMetaValue: {
    fontFamily: "Poppins",
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  doneButton: {
    width: "100%",
    height: 49,
    backgroundColor: "#4ade80",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },

  doneButtonText: {
    fontFamily: "Poppins",
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },

  // Failure Screen
  failureContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },

  failureGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "45%",
  },

  failureScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 100,
    alignItems: "center",
  },

  failureCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },

  failureTitle: {
    fontFamily: "Poppins",
    fontSize: 26,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12,
  },

  failureAmount: {
    fontFamily: "Poppins",
    fontSize: 38,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 20,
  },

  failureSubtext: {
    fontFamily: "Poppins",
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 24,
    textAlign: "center",
  },

  failureErrorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.25)",
    padding: 18,
    borderRadius: 12,
    width: "100%",
    marginBottom: 24,
    gap: 12,
  },

  failureErrorText: {
    fontFamily: "Poppins",
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
    flex: 1,
  },

  tryAgainButton: {
    width: "100%",
    backgroundColor: "#EF4444",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },

  tryAgainButtonText: {
    fontFamily: "Poppins",
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  failureCloseButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#565656",
  },

  failureCloseButtonText: {
    fontFamily: "Poppins",
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});