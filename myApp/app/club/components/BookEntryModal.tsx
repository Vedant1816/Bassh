import { useState } from "react";
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
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { fetchWithFallback } from "@/_services/api-config";
import supabase from "@/_services/supabase-public";
import { Ionicons } from "@expo/vector-icons";
import { ThemedButton } from "@/components/ui/ThemedButton";
import { DismissKeyboardView } from "@/components/DismissKeyboardView";
import type { Discount } from "./PayBillModal";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const PINK_PRIMARY = "#FF007E";

interface Participant {
  name: string;
  gender: string;
  age: number;
  email?: string;
}

interface ClubInfo {
  club_name?: string;
  address_text?: string;
  prices?: Record<string, { male: number; female: number; couple: number }>;
}

interface BookEntryModalProps {
  visible: boolean;
  onClose: () => void;
  clubId: string;
  club: ClubInfo | null;
  discounts: Discount[];
}

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function BookEntryModal({
  visible,
  onClose,
  clubId,
  club,
  discounts,
}: BookEntryModalProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [numberOfGuests, setNumberOfGuests] = useState<number>(1);
  const [showParticipantForm, setShowParticipantForm] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentParticipantIndex, setCurrentParticipantIndex] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [finalPrice, setFinalPrice] = useState(0);
  const [priceBreakdown, setPriceBreakdown] = useState<
    Array<{ label: string; amount: number; count?: number }>
  >([]);
  const [processing, setProcessing] = useState(false);
  const [pendingRazorpayOptions, setPendingRazorpayOptions] = useState<any>(null);
  const [bookingWalletBalance, setBookingWalletBalance] = useState<number>(0);
  const [bookingWalletLoading, setBookingWalletLoading] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState<Discount | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [subtotal, setSubtotal] = useState(0);

  // Payment method selection (matching PayBillModal)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"wallet" | "upi">("upi");
  const [selectedUpi, setSelectedUpi] = useState<string>("google");
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);

  // Check if wallet has sufficient balance
  const canPayWithWallet = bookingWalletBalance >= finalPrice && !bookingWalletLoading;

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

  // Handle Pay Now button
  const handlePayNow = () => {
    if (selectedPaymentMethod === "wallet") {
      handlePayBookingWithWallet();
    } else {
      handleCheckout();
    }
  };

  const getDayOfWeek = (date: Date): number => {
    const day = date.getDay();
    return day === 0 ? 7 : day;
  };

  const getPricesForDate = (date: Date) => {
    if (!club?.prices) {
      return { male: 2000, female: 1500, couple: 3000 };
    }
    const dayKey = getDayOfWeek(date).toString();
    return club.prices[dayKey] || { male: 2000, female: 1500, couple: 3000 };
  };

  const generateDateOptions = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const fetchBookingWalletBalance = async () => {
    try {
      setBookingWalletLoading(true);
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) return;

      const { data: customer } = await supabase
        .from("customers")
        .select("wallet_balance")
        .eq("id", user.id)
        .single();

      const val = Number(customer?.wallet_balance);
      setBookingWalletBalance(Number.isNaN(val) ? 0 : val);
    } catch {
      setBookingWalletBalance(0);
    } finally {
      setBookingWalletLoading(false);
    }
  };

  const handleContinueToParticipants = () => {
    if (numberOfGuests < 1) {
      Alert.alert("Error", "Please select at least 1 guest");
      return;
    }

    const initialParticipants: Participant[] = Array.from({ length: numberOfGuests }).map(() => ({
      name: "",
      gender: "",
      age: 0,
      email: "",
    }));

    setParticipants(initialParticipants);
    setCurrentParticipantIndex(0);
    setShowParticipantForm(true);
  };

  const updateParticipant = (field: keyof Participant, value: string | number) => {
    setParticipants((prev) => {
      const updated = [...prev];
      updated[currentParticipantIndex] = {
        ...updated[currentParticipantIndex],
        [field]: value,
      };
      return updated;
    });
  };

  const handleNextParticipant = () => {
    const current = participants[currentParticipantIndex];

    if (!current.name.trim()) {
      Alert.alert("Error", "Please enter name");
      return;
    }
    if (!current.gender) {
      Alert.alert("Error", "Please select gender");
      return;
    }
    if (!current.age || current.age < 18) {
      Alert.alert("Error", "Age must be at least 18");
      return;
    }

    if (currentParticipantIndex < participants.length - 1) {
      setCurrentParticipantIndex(currentParticipantIndex + 1);
    } else {
      calculateFinalPrice();
    }
  };

  const calculateFinalPrice = () => {
    const prices = getPricesForDate(selectedDate);
    let total = 0;
    const breakdown: Array<{ label: string; amount: number; count?: number }> = [];

    const males: Participant[] = [];
    const females: Participant[] = [];
    const others: Participant[] = [];

    participants.forEach((p) => {
      const gender = p.gender.toLowerCase();
      if (gender === "male") males.push(p);
      else if (gender === "female") females.push(p);
      else others.push(p);
    });

    const pairsCount = Math.min(females.length, males.length);

    if (pairsCount > 0) {
      const pairTotal = prices.couple * pairsCount;
      total += pairTotal;
      breakdown.push({
        label: `Couple Entry${pairsCount > 1 ? "s" : ""} (${pairsCount})`,
        amount: pairTotal,
        count: pairsCount,
      });
    }

    const remainingMales = males.length - pairsCount;
    if (remainingMales > 0) {
      const maleTotal = prices.male * remainingMales;
      total += maleTotal;
      breakdown.push({
        label: `Male Entry${remainingMales > 1 ? "s" : ""} (${remainingMales})`,
        amount: maleTotal,
        count: remainingMales,
      });
    }

    const remainingFemales = females.length - pairsCount;
    if (remainingFemales > 0) {
      const femaleTotal = prices.female * remainingFemales;
      total += femaleTotal;
      breakdown.push({
        label: `Female Entry${remainingFemales > 1 ? "s" : ""} (${remainingFemales})`,
        amount: femaleTotal,
        count: remainingFemales,
      });
    }

    if (others.length > 0) {
      const otherTotal = prices.male * others.length;
      total += otherTotal;
      breakdown.push({
        label: `Entry${others.length > 1 ? "s" : ""} (${others.length})`,
        amount: otherTotal,
        count: others.length,
      });
    }

    setPriceBreakdown(breakdown);
    setSubtotal(total);
    setAppliedDiscount(null);
    setDiscountAmount(0);

    const eligibleDiscounts = discounts.filter((d) => total >= d.min_purchase);
    if (eligibleDiscounts.length > 0) {
      const discountsWithValues = eligibleDiscounts.map((discount) => {
        let value = 0;
        if (discount.discount_type === "percentage") {
          value = total * (discount.discount_value / 100);
          if (discount.max_discount != null && value > discount.max_discount) {
            value = discount.max_discount;
          }
        } else {
          value = discount.discount_value;
        }
        return { ...discount, calculatedValue: value };
      });
      discountsWithValues.sort((a, b) => b.calculatedValue - a.calculatedValue);
      const best = discountsWithValues[0];
      setAppliedDiscount(best);
      setDiscountAmount(best.calculatedValue);
      setFinalPrice(total - best.calculatedValue);
    } else {
      setFinalPrice(total);
    }

    setShowParticipantForm(false);
    setShowSummary(true);
    fetchBookingWalletBalance();
  };

  const isDiscountApplicable = (discount: Discount, currentSubtotal: number): boolean =>
    currentSubtotal >= discount.min_purchase;

  const getDiscountDisplayValueBooking = (discount: Discount, currentSubtotal: number): string => {
    if (discount.discount_type === "percentage") {
      let value = currentSubtotal * (discount.discount_value / 100);
      if (discount.max_discount != null && value > discount.max_discount) {
        value = discount.max_discount;
      }
      return `Get upto ${value.toFixed(0)} rs off`;
    }
    return `Get ₹${discount.discount_value} off`;
  };

  const getDiscountValue = (discount: Discount, currentSubtotal: number): number => {
    if (discount.discount_type === "percentage") {
      let value = currentSubtotal * (discount.discount_value / 100);
      if (discount.max_discount != null && value > discount.max_discount) {
        value = discount.max_discount;
      }
      return value;
    }
    return discount.discount_value;
  };

  const toggleBookingDiscount = (discount: Discount) => {
    const isApplicable = isDiscountApplicable(discount, subtotal);
    if (!isApplicable) return;
    const isCurrentlyApplied = String(appliedDiscount?.id) === String(discount.id);
    if (isCurrentlyApplied) {
      setAppliedDiscount(null);
      setDiscountAmount(0);
      setFinalPrice(subtotal);
    } else {
      const value = getDiscountValue(discount, subtotal);
      setAppliedDiscount(discount);
      setDiscountAmount(value);
      setFinalPrice(subtotal - value);
    }
  };

  const handleCheckout = async () => {
    if (!clubId || finalPrice <= 0 || !participants || participants.length === 0) {
      Alert.alert("Error", "Invalid booking details");
      return;
    }

    const invalidParticipants = participants.filter((p) => !p.name || !p.gender || !p.age);
    if (invalidParticipants.length > 0) {
      Alert.alert("Error", "Please fill in all required participant details.");
      return;
    }

    try {
      setProcessing(true);

      const bookingRes = await fetchWithFallback(
        `/api/bookings/table/create`,
        await withAuthHeaders({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            club_id: clubId,
            booking_date: selectedDate.toISOString().split("T")[0],
            total_amount: finalPrice,
            discount_id: appliedDiscount?.id ?? null,
            discount_amount: discountAmount || 0,
            participants: participants.map((p) => ({
              name: p.name,
              gender: p.gender,
              age: p.age,
              email: p.email || "",
            })),
          }),
        })
      );

      const bookingData = await bookingRes.json();

      if (!bookingRes.ok) {
        setProcessing(false);
        const errorMsg = bookingData.error || "Unknown error";
        router.replace(
          `/payment/failure?error_message=${encodeURIComponent(errorMsg)}&amount=${finalPrice}&club_id=${clubId}`
        );
        return;
      }

      const orderRes = await fetchWithFallback(
        `/api/payments/checkout/create-order`,
        await withAuthHeaders({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            booking_id: bookingData.booking_id,
            amount: finalPrice,
          }),
        })
      );

      const order = await orderRes.json();

      if (!orderRes.ok) {
        setProcessing(false);
        const errorMsg = order.error || "Failed to create order";
        router.replace(
          `/payment/failure?error_message=${encodeURIComponent(errorMsg)}&amount=${finalPrice}&booking_id=${bookingData.booking_id}&club_id=${clubId}`
        );
        return;
      }

      const options = {
        key: order.key,
        order_id: order.order_id,
        amount: order.amount || finalPrice * 100,
        currency: "INR",
        name: club?.club_name || "Table Booking",
        description: "Table Booking Payment",
        prefill: {
          email: "test@example.com",
          contact: "9999999999",
        },
        theme: { color: PINK_PRIMARY },
      };

      setPendingRazorpayOptions({ ...options, bookingData });
      setShowSummary(false);
      setProcessing(false);
    } catch (err: any) {
      setProcessing(false);
      const errorMsg = err.message || "Something went wrong. Please try again.";
      router.replace(
        `/payment/failure?error_message=${encodeURIComponent(errorMsg)}&amount=${finalPrice}&club_id=${clubId}`
      );
    }
  };

  /* ---------------- NOTIFICATION LOGIC ---------------- */
  const sendBookingConfirmationNotification = async (bookingId: string) => {
    try {
      // Send confirmation notification to the current user
      await fetchWithFallback(
        "/api/notifications/send",
        await withAuthHeaders({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `Booking Confirmed! 🎉`,
            message: `Your booking at ${club?.club_name || "the club"} has been confirmed. See you there!`,
            type: "booking_confirmation",
            metadata: {
              booking_id: bookingId,
            },
          }),
        })
      );
    } catch (err) {
      console.error("❌ [NOTIFICATIONS] Failed to send booking confirmation notification:", err);
      // Don't block the booking flow if notification fails
    }
  };

  const sendNotificationToMatchingUsers = async (participantNames: string[], bookingId?: string) => {
    try {
      // Send notification to all matching participants
      await fetchWithFallback(
        "/api/notifications/send-bulk",
        await withAuthHeaders({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            usernames: participantNames,
            title: `You're on the guest list! 🎉`,
            message: `You've been added to the guest list for ${club?.club_name || "the club"}. See you there!`,
            type: "booking",
            metadata: {
              booking_id: bookingId,
            },
          }),
        })
      );
    } catch (err) {
      console.error("❌ [NOTIFICATIONS] Failed to send notifications:", err);
      // Don't block the booking flow if notifications fail
    }
  };

  const handlePayBookingWithWallet = async () => {
    if (!clubId || finalPrice <= 0) {
      Alert.alert("Error", "Invalid booking amount");
      return;
    }

    if (bookingWalletBalance < finalPrice) {
      Alert.alert(
        "Insufficient Balance",
        `Wallet has ₹${bookingWalletBalance.toFixed(0)}. Please use card payment or add money to wallet.`
      );
      return;
    }

    try {
      setProcessing(true);

      const res = await fetchWithFallback(
        "/api/payments/table/pay-with-wallet",
        await withAuthHeaders({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            club_id: clubId,
            booking_date: selectedDate.toISOString().split("T")[0],
            total_amount: finalPrice,
            discount_id: appliedDiscount?.id ?? null,
            discount_amount: discountAmount || 0,
            participants: participants.map((p) => ({
              name: p.name,
              gender: p.gender,
              age: p.age,
              email: p.email || "",
            })),
          }),
        })
      );

      const data = await res.json();

      if (!res.ok) {
        console.error("❌ [PAYMENT] Wallet payment failed:", data);
        setProcessing(false);
        Alert.alert("Payment Failed", data.error || "Failed to process wallet payment");
        return;
      }

      // Send notifications to matching participants with booking_id
      await sendNotificationToMatchingUsers(participants.map(p => p.name), data.booking_id);

      setProcessing(false);
      setShowSummary(false);

      setBookingWalletBalance(data.wallet_balance ?? bookingWalletBalance - finalPrice);

      const qrCode = data.qr_code || data.qr;
      const qrParam = qrCode ? encodeURIComponent(qrCode) : "";

      if (qrCode) {
        router.replace(`/payment/success?qr=${qrParam}&booking_id=${data.booking_id}&amount=${finalPrice}`);
      } else {
        router.replace(`/payment/success?booking_id=${data.booking_id}&amount=${finalPrice}`);
      }
    } catch (err: any) {
      console.error("❌ [PAYMENT] Error during wallet payment:", err);
      setProcessing(false);
      Alert.alert("Error", err.message || "Something went wrong");
    }
  };

  const dateOptions = generateDateOptions();

  return (
    <>
      {/* TABLE BOOKING MODAL */}
      <Modal
        visible={visible && !showParticipantForm && !showSummary}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <StatusBar barStyle="light-content" />
          <View style={styles.modalHeader}>
            <Pressable onPress={onClose}>
              <Text style={styles.modalClose}>Cancel</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Book a table</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.inputLabel}>Select number of guests</Text>
            <View style={styles.guestSelector}>
              <Pressable
                style={styles.guestBtn}
                onPress={() => setNumberOfGuests(Math.max(1, numberOfGuests - 1))}
              >
                <Text style={styles.guestBtnText}>−</Text>
              </Pressable>
              <Text style={styles.guestCount}>{numberOfGuests}</Text>
              <Pressable style={styles.guestBtn} onPress={() => setNumberOfGuests(numberOfGuests + 1)}>
                <Text style={styles.guestBtnText}>+</Text>
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Select day</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
              {dateOptions.map((date, idx) => {
                const isSelected = date.toDateString() === selectedDate.toDateString();
                return (
                  <Pressable
                    key={idx}
                    style={[styles.dateCard, isSelected && styles.dateCardActive]}
                    onPress={() => setSelectedDate(date)}
                  >
                    <Text style={[styles.dateDay, isSelected && styles.dateDayActive]}>
                      {date.getDate()}
                    </Text>
                    <Text style={[styles.dateDayName, isSelected && styles.dateDayNameActive]}>
                      {days[date.getDay()]}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.priceInfo}>
              <Text style={styles.priceInfoTitle}>Pricing for {days[selectedDate.getDay()]}</Text>
              {(() => {
                const prices = getPricesForDate(selectedDate);
                return (
                  <>
                    <Text style={styles.priceInfoText}>Male: ₹{prices.male}</Text>
                    <Text style={styles.priceInfoText}>Female: ₹{prices.female}</Text>
                    <Text style={styles.priceInfoText}>Couple: ₹{prices.couple}</Text>
                  </>
                );
              })()}
            </View>

            <ThemedButton
              style={styles.continueBtn}
              textStyle={styles.continueBtnText}
              onPress={handleContinueToParticipants}
            >
              Continue
            </ThemedButton>
          </ScrollView>
        </View>
      </Modal>

      {/* PARTICIPANT FORM MODAL */}
      <Modal
        visible={showParticipantForm}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <DismissKeyboardView style={styles.modalContainer}>
          <StatusBar barStyle="light-content" />
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowParticipantForm(false)}>
              <Text style={styles.modalClose}>Cancel</Text>
            </Pressable>
            <Text style={styles.modalTitle}>
              Participant {currentParticipantIndex + 1} of {participants.length}
            </Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.inputLabel}>Name *</Text>
            <TextInput
              style={styles.input}
              value={participants[currentParticipantIndex]?.name || ""}
              onChangeText={(text) => updateParticipant("name", text)}
              placeholder="Enter name"
              placeholderTextColor="#666"
            />

            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={participants[currentParticipantIndex]?.email || ""}
              onChangeText={(text) => updateParticipant("email", text)}
              placeholder="Enter email (optional)"
              placeholderTextColor="#666"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Gender *</Text>
            <View style={styles.genderRow}>
              {["Male", "Female", "Other"].map((gender) => (
                <Pressable
                  key={gender}
                  style={[
                    styles.genderBtn2,
                    participants[currentParticipantIndex]?.gender === gender && styles.genderBtnActive2,
                  ]}
                  onPress={() => updateParticipant("gender", gender)}
                >
                  <Text
                    style={[
                      styles.genderBtnText2,
                      participants[currentParticipantIndex]?.gender === gender &&
                      styles.genderBtnTextActive2,
                    ]}
                  >
                    {gender}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.inputLabel}>Age * (Minimum: 18)</Text>
            <TextInput
              style={styles.input}
              value={
                participants[currentParticipantIndex]?.age
                  ? participants[currentParticipantIndex].age.toString()
                  : ""
              }
              onChangeText={(text) => {
                const age = parseInt(text) || 0;
                updateParticipant("age", age);
              }}
              placeholder="Enter age"
              placeholderTextColor="#666"
              keyboardType="numeric"
            />

            <ThemedButton
              style={styles.nextBtn}
              textStyle={styles.nextBtnText}
              onPress={handleNextParticipant}
            >
              {currentParticipantIndex < participants.length - 1 ? "Next" : "Calculate Price"}
            </ThemedButton>
          </ScrollView>
        </DismissKeyboardView>
      </Modal>

      {/* SUMMARY MODAL */}
      <Modal
        visible={showSummary}
        animationType="slide"
        presentationStyle="pageSheet"
        onDismiss={() => {
          // This is the key - trigger Razorpay after modal dismisses (matching book.tsx flow)
          if (pendingRazorpayOptions) {
            const { bookingData: storedBookingData, ...options } = pendingRazorpayOptions;
            setPendingRazorpayOptions(null);

            InteractionManager.runAfterInteractions(() => {
              setTimeout(async () => {
                setProcessing(true);

                const currentBookingId = storedBookingData.booking_id;

                let RazorpayCheckout: any;
                try {
                  RazorpayCheckout = require("react-native-razorpay").default;
                } catch (importError: any) {
                  const errorMsg = "Payment gateway not available";
                  router.replace(
                    `/payment/failure?error_message=${encodeURIComponent(errorMsg)}&amount=${finalPrice}&booking_id=${currentBookingId}&club_id=${clubId}`
                  );
                  setProcessing(false);
                  return;
                }

                if (!RazorpayCheckout || typeof RazorpayCheckout.open !== "function") {
                  const errorMsg = "Payment gateway not available";
                  router.replace(
                    `/payment/failure?error_message=${encodeURIComponent(errorMsg)}&amount=${finalPrice}&booking_id=${currentBookingId}&club_id=${clubId}`
                  );
                  setProcessing(false);
                  return;
                }

                RazorpayCheckout.open(options)
                  .then(async (response: any) => {
                    if (!response || !response.razorpay_payment_id) {
                      setProcessing(false);
                      router.replace(
                        `/payment/failure?error_message=${encodeURIComponent("Invalid payment response")}&amount=${finalPrice}&booking_id=${currentBookingId}&club_id=${clubId}`
                      );
                      return;
                    }

                    setProcessing(true);

                    try {
                      const verifyRes = await fetchWithFallback(
                        `/api/payments/verify`,
                        await withAuthHeaders({
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            booking_id: currentBookingId,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_signature: response.razorpay_signature,
                          }),
                        })
                      );

                      const verified = await verifyRes.json();

                      if (!verifyRes.ok) {
                        setProcessing(false);
                        router.replace(
                          `/payment/failure?error_message=${encodeURIComponent(verified.error || "Unable to verify payment")}&amount=${finalPrice}&booking_id=${currentBookingId}&club_id=${clubId}`
                        );
                        return;
                      }
                      await sendNotificationToMatchingUsers(participants.map(p => p.name), currentBookingId);

                      const qrCode = verified.qr || verified.qr_code;
                      setProcessing(false);
                      const qrParam = qrCode ? encodeURIComponent(qrCode) : "";

                      if (qrCode) {
                        router.replace(
                          `/payment/success?qr=${qrParam}&booking_id=${currentBookingId}&amount=${finalPrice}`
                        );
                      } else {
                        router.replace(
                          `/payment/success?booking_id=${currentBookingId}&amount=${finalPrice}`
                        );
                      }
                    } catch (verifyError: any) {
                      setProcessing(false);
                      router.replace(
                        `/payment/failure?error_message=${encodeURIComponent(verifyError?.message || "Payment verification failed")}&amount=${finalPrice}&booking_id=${currentBookingId}&club_id=${clubId}`
                      );
                    }
                  })
                  .catch((error: any) => {
                    setProcessing(false);
                    const isCancelled =
                      error?.description === "User closed the checkout form by pressing back button" ||
                      error?.code === "BAD_REQUEST_ERROR" ||
                      (error?.description && error.description.toLowerCase().includes("cancelled"));

                    if (isCancelled) {
                      const errorMsg = "Payment was cancelled. Your booking is still pending.";
                      router.replace(
                        `/payment/failure?error_message=${encodeURIComponent(errorMsg)}&amount=${finalPrice}&booking_id=${currentBookingId}&club_id=${clubId}`
                      );
                    } else {
                      const errorMsg =
                        error?.description || error?.message || "Payment could not be completed";
                      router.replace(
                        `/payment/failure?error_message=${encodeURIComponent(errorMsg)}&amount=${finalPrice}&booking_id=${currentBookingId}&club_id=${clubId}`
                      );
                    }
                  });
              }, 500);
            });
          }
        }}
      >
        <View style={styles.modalContainer}>
          <StatusBar barStyle="light-content" />
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowSummary(false)}>
              <Text style={styles.modalClose}>Back</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Booking Summary</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.summarySectionTitle}>Participants</Text>
            {participants.map((p, idx) => (
              <View key={idx} style={styles.participantCard}>
                <Text style={styles.participantName}>{p.name}</Text>
                <Text style={styles.participantDetails}>
                  {p.gender} · Age {p.age}
                </Text>
              </View>
            ))}

            <View style={styles.priceSummary}>
              <Text style={styles.summarySectionTitle}>Price Breakdown</Text>

              {priceBreakdown.map((item, idx) => (
                <View key={idx} style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>{item.label}</Text>
                  <Text style={styles.breakdownAmount}>₹{item.amount}</Text>
                </View>
              ))}

              {appliedDiscount && (
                <>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Subtotal</Text>
                    <Text style={styles.breakdownAmount}>₹{subtotal}</Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <View>
                      <Text style={[styles.breakdownLabel, { color: "#4ade80" }]}>
                        Discount Applied
                      </Text>
                      <Text style={[styles.breakdownLabel, { fontSize: 11, marginTop: 2 }]}>
                        {appliedDiscount.name}
                      </Text>
                    </View>
                    <Text style={[styles.breakdownAmount, { color: "#4ade80" }]}>
                      -₹{discountAmount.toFixed(2)}
                    </Text>
                  </View>
                </>
              )}

              <View style={styles.breakdownDivider} />

              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownTotalLabel}>Total</Text>
                <Text style={styles.finalPriceText}>₹{finalPrice.toFixed(2)}</Text>
              </View>

              {appliedDiscount && (
                <Text style={styles.savingsText}>−₹{discountAmount.toFixed(0)} from discount</Text>
              )}
            </View>

            {/* Discounts Section - Matching PayBillModal Design */}
            {discounts.length > 0 && (
              <View style={styles.discountsSection}>
                <Text style={styles.discountsSectionTitle}>Saving corner</Text>
                {discounts.map((discount) => {
                  const isApplicable = isDiscountApplicable(discount, subtotal);
                  const isApplied = String(appliedDiscount?.id) === String(discount.id);

                  return (
                    <Pressable
                      key={discount.id}
                      style={[
                        styles.couponCard,
                        isApplied && styles.couponCardApplied,
                        !isApplicable && styles.couponCardDisabled,
                      ]}
                      onPress={() => isApplicable && toggleBookingDiscount(discount)}
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
                              {discount.name}
                            </Text>
                            <Text style={[styles.couponDescription, !isApplicable && styles.couponDescDisabled]}>
                              {isApplicable
                                ? getDiscountDisplayValueBooking(discount, subtotal)
                                : `Min ₹${discount.min_purchase} required`}
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
                          onPress={() => isApplicable && toggleBookingDiscount(discount)}
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
                })}
              </View>
            )}

            {finalPrice > 0 && (
              <View style={styles.walletBalanceRow}>
                <Ionicons name="wallet-outline" size={18} color="#9ca3af" />
                <Text style={styles.walletBalanceText}>
                  Wallet: ₹{bookingWalletLoading ? "..." : bookingWalletBalance.toFixed(0)}
                  {!canPayWithWallet && " (Insufficient)"}
                </Text>
              </View>
            )}

            <View style={{ height: 140 }} />
          </ScrollView>

          {/* Payment Method Selection Bottom Sheet (inline) */}
          {showPaymentMethodModal && (
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
                        Balance: ₹{bookingWalletLoading ? "..." : bookingWalletBalance.toFixed(0)}
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
          )}

          {/* Footer - Matching PayBillModal Design */}
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
                  <Text style={styles.totalAmountValue}>Rs.{finalPrice.toLocaleString("en-IN")}</Text>
                  <Text style={styles.totalLabel}>Total</Text>
                </View>
                <Pressable
                  style={[styles.payNowButton, processing && styles.payNowButtonDisabled]}
                  onPress={handlePayNow}
                  disabled={processing}
                >
                  <Text style={styles.payNowButtonText}>
                    {processing ? "Processing..." : "Pay now"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  modalClose: {
    color: PINK_PRIMARY,
    fontSize: 15,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputLabel: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 18,
    marginBottom: 6,
  },
  guestSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    marginTop: 10,
    marginBottom: 10,
  },
  guestBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(45, 45, 45, 0.8)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  guestBtnText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  guestCount: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  dateScroll: {
    marginTop: 10,
  },
  dateCard: {
    backgroundColor: "rgba(45, 45, 45, 0.8)",
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    alignItems: "center",
    minWidth: 70,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  dateCardActive: {
    borderColor: PINK_PRIMARY,
    backgroundColor: "rgba(255, 0, 126, 0.15)",
  },
  dateDay: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  dateDayActive: {
    color: PINK_PRIMARY,
  },
  dateDayName: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 4,
  },
  dateDayNameActive: {
    color: PINK_PRIMARY,
  },
  priceInfo: {
    backgroundColor: "rgba(45, 45, 45, 0.8)",
    borderRadius: 10,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  priceInfoTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  priceInfoText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 13,
    marginTop: 4,
  },
  continueBtn: {
    marginTop: 28,
  },
  continueBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "rgba(45, 45, 45, 0.8)",
    borderRadius: 8,
    padding: 14,
    color: "#FFFFFF",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  genderRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  genderBtn2: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(45, 45, 45, 0.8)",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  genderBtnActive2: {
    borderColor: PINK_PRIMARY,
    backgroundColor: "rgba(255, 0, 126, 0.15)",
  },
  genderBtnText2: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
    fontWeight: "500",
  },
  genderBtnTextActive2: {
    color: PINK_PRIMARY,
  },
  nextBtn: {
    marginTop: 28,
  },
  nextBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  summarySectionTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 10,
  },
  participantCard: {
    backgroundColor: "rgba(45, 45, 45, 0.8)",
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  participantName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  participantDetails: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
    marginTop: 4,
  },
  priceSummary: {
    backgroundColor: "rgba(45, 45, 45, 0.8)",
    borderRadius: 10,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  breakdownLabel: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 13,
  },
  breakdownAmount: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginVertical: 10,
  },
  breakdownTotalLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  finalPriceText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  savingsText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    marginTop: 10,
  },
  discountsSection: {
    marginTop: 24,
    marginBottom: 16,
  },
  discountsSectionTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },

  // Coupon Card Styles - Matching PayBillModal Design
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

  walletBalanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
    marginTop: 16,
    marginBottom: 8,
  },
  walletBalanceText: {
    color: "#9ca3af",
    fontSize: 14,
  },

  // Footer - Matching PayBillModal Design
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
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.6)",
  },
  payUsingMethod: {
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
    fontSize: 18,
    fontWeight: "700",
    color: "#000000",
  },
  totalLabel: {
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
    fontSize: 16,
    fontWeight: "700",
    color: "#000000",
  },

  // Payment Method Modal (inline overlay)
  paymentModalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
    zIndex: 1000,
  },
  paymentModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
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
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 20,
  },
  paymentModalSectionTitle: {
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
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  paymentMethodLabelDisabled: {
    color: "rgba(255, 255, 255, 0.5)",
  },
  paymentMethodBalance: {
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
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});