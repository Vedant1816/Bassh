import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  InteractionManager,
  Dimensions,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { fetchWithFallback } from "@/_services/api-config";
import supabase from "@/_services/supabase-public";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { ThemedButton } from "@/components/ui/ThemedButton";
import { DismissKeyboardView } from "@/components/DismissKeyboardView";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Design colors matching the PNG
const PRIMARY_GRADIENT = ["#8B0045", "#5C0030", "#2D0A1F"] as const;
const ACCENT_PINK = "#E91E8C";
const DARK_CARD = "#2D2D2D";
const LIGHT_TEXT = "#B0B0B0";

interface TicketSelection {
  pricingId: string;
  label: string;
  price: number;
  stagPrice?: number;
  couplePrice?: number;
  quantity: number;
}

interface Participant {
  name: string;
  gender: string;
  age: number;
  email?: string;
}

interface Discount {
  id: string;
  discount_type: string;
  discount_value: number;
  min_purchase: number;
  max_discount: number | null;
  code: string | null;
  name: string;
  description: string | null;
}

export default function EventBookingScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const id = (Array.isArray(params.id) ? params.id[0] : params.id) as string;

  const [event, setEvent] = useState<any>(null);
  const [club, setClub] = useState<any>(null);
  const [pricing, setPricing] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selections, setSelections] = useState<Map<string, TicketSelection>>(new Map());
  const [processing, setProcessing] = useState(false);
  const [availableTickets, setAvailableTickets] = useState<number>(0);
  const [showParticipantForm, setShowParticipantForm] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentParticipantIndex, setCurrentParticipantIndex] = useState(0);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [finalPrice, setFinalPrice] = useState(0);
  const [bookingFee, setBookingFee] = useState(0);
  const [orderTotal, setOrderTotal] = useState(0);
  const [pendingRazorpayOptions, setPendingRazorpayOptions] = useState<any>(null);

  // Discount state
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [appliedDiscount, setAppliedDiscount] = useState<Discount | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  // Entry type selection
  const [selectedEntryType, setSelectedEntryType] = useState<string>("stag");

  // Wallet state
  const [bookingWalletBalance, setBookingWalletBalance] = useState<number>(0);
  const [bookingWalletLoading, setBookingWalletLoading] = useState(false);

  // Payment method
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"wallet" | "upi">("upi");

  // Coupon modal
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [showOffersExpanded, setShowOffersExpanded] = useState(false);

  const canPayWithWallet = bookingWalletBalance >= finalPrice && !bookingWalletLoading;

  /* ---------------- LOAD EVENT + PRICING + DISCOUNTS ---------------- */
  useEffect(() => {
    if (!id) return;

    (async () => {
      const res = await fetchWithFallback(
        `/api/events/${id}`,
        await withAuthHeaders({ method: "GET" })
      );

      const data = await res.json();

      if (res.ok) {
        setEvent(data.event);
        setClub(data.club);
        setPricing(data.pricing || []);

        // Use available_tickets from API (max_attendees - totalGuests)
        const tickets = data.event?.available_tickets ?? 100;
        console.log("🎟️ Available tickets:", tickets);
        console.log("🎟️ Max attendees:", data.event?.max_attendees);
        console.log("🎟️ Total guests:", data.totalGuests);
        console.log("🎫 Pricing options:", data.pricing?.length || 0);

        setAvailableTickets(tickets);
      }

      // Fetch discounts
      const discountRes = await fetchWithFallback(
        `/api/discounts/event?event_id=${id}`,
        await withAuthHeaders({ method: "GET" })
      );
      const discountData = await discountRes.json();
      if (discountRes.ok && discountData.discounts) {
        setDiscounts(discountData.discounts);
      } else {
        setDiscounts([]);
      }

      setLoading(false);
    })();
  }, [id]);

  /* ---------------- DISCOUNT HELPERS ---------------- */
  const isDiscountApplicable = (discount: Discount, currentSubtotal: number): boolean => {
    return currentSubtotal >= discount.min_purchase;
  };

  const getDiscountDesc = (d: Discount): string => {
    if (d.max_discount != null) return `Save Rs.${d.max_discount} on free shot at the party.`;
    if (d.discount_type === "percentage") return `Get ${d.discount_value}% off`;
    return `Get ₹${d.discount_value} off`;
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

  const toggleEventDiscount = (discount: Discount) => {
    const currentTotal = getTotalPrice();
    const isApplicable = isDiscountApplicable(discount, currentTotal);
    if (!isApplicable) return;

    const isCurrentlyApplied = String(appliedDiscount?.id) === String(discount.id);
    if (isCurrentlyApplied) {
      setAppliedDiscount(null);
      setDiscountAmount(0);
    } else {
      const value = getDiscountValue(discount, currentTotal);
      setAppliedDiscount(discount);
      setDiscountAmount(value);
    }
    setShowCouponModal(false);
  };

  /* ---------------- TICKET LOGIC ---------------- */
  const updateQuantity = (delta: number) => {
    const currentQty = getTotalTickets();
    const newQty = Math.max(0, Math.min(currentQty + delta, availableTickets));

    console.log("🎫 updateQuantity called:", { delta, currentQty, newQty, availableTickets, pricingCount: pricing.length });

    if (newQty === 0) {
      setSelections(new Map());
      return;
    }

    // Find the first pricing option or use the selected entry type
    let targetPricing = pricing.find(p =>
      p.label?.toLowerCase().includes(selectedEntryType.toLowerCase())
    ) || pricing[0];

    // If no pricing, create a default one
    if (!targetPricing && pricing.length === 0) {
      console.warn("⚠️ No pricing options available, using default");
      targetPricing = {
        id: "default",
        label: selectedEntryType === "couple" ? "Couple" : "Stag",
        price: 0,
        stag_price: 0,
        couple_price: 0,
      };
    }

    if (targetPricing) {
      console.log("🎫 Setting selection:", { pricingId: targetPricing.id, quantity: newQty });
      setSelections(new Map([[targetPricing.id, {
        pricingId: targetPricing.id,
        label: targetPricing.label,
        price: targetPricing.price,
        stagPrice: targetPricing.stag_price,
        couplePrice: targetPricing.couple_price,
        quantity: newQty,
      }]]));
    }
  };

  const getTotalTickets = () => {
    let t = 0;
    selections.forEach((s) => (t += s.quantity));
    return t;
  };

  const getTotalPrice = () => {
    let p = 0;
    selections.forEach((s) => {
      // Use entry type specific pricing
      if (selectedEntryType === "stag" && s.stagPrice) {
        p += s.quantity * s.stagPrice;
      } else if (selectedEntryType === "couple" && s.couplePrice) {
        p += s.quantity * s.couplePrice;
      } else {
        p += s.quantity * s.price;
      }
    });
    return p;
  };

  /* ---------------- PARTICIPANT FORM ---------------- */
  const handleProceedToPayment = () => {
    const totalTickets = getTotalTickets();
    if (totalTickets === 0) {
      Alert.alert("No tickets selected");
      return;
    }

    let participantCount = totalTickets;
    if (selectedEntryType === "couple") {
      participantCount = totalTickets * 2;
    }

    const initialParticipants: Participant[] = Array.from({ length: participantCount }).map(() => ({
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
    if (!current.age || current.age < (event?.age_limit || 18)) {
      Alert.alert("Error", `Age must be at least ${event?.age_limit || 18}`);
      return;
    }

    if (currentParticipantIndex < participants.length - 1) {
      setCurrentParticipantIndex(currentParticipantIndex + 1);
    } else {
      calculateFinalPrice();
    }
  };

  const calculateFinalPrice = async () => {
    const total = getTotalPrice();
    const fee = Math.round(total * 0.07); // 7% booking fee
    const discount = appliedDiscount ? getDiscountValue(appliedDiscount, total) : 0;

    setOrderTotal(total);
    setBookingFee(fee);
    setDiscountAmount(discount);
    setFinalPrice(total + fee - discount);

    setShowParticipantForm(false);
    setShowPaymentDetails(true);
    fetchBookingWalletBalance();
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
            message: `Your booking for ${event?.name} has been confirmed. See you at the event!`,
            type: "booking_confirmation",
            metadata: {
              booking_id: bookingId,
            },
          }),
        })
      );
      console.log("✅ Booking confirmation notification sent");
    } catch (err) {
      console.error("❌ Failed to send booking confirmation notification:", err);
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
            message: `You've been added to the guest list for ${event?.name}. See you at the event!`,
            type: "booking",
            metadata: {
              booking_id: bookingId,
            },
          }),
        })
      );
      console.log("✅ Notifications sent to matching participants");
    } catch (err) {
      console.error("❌ Failed to send notifications:", err);
      // Don't block the booking flow if notifications fail
    }
  };

  const handlePayBookingWithWallet = async () => {
    if (!id || finalPrice <= 0) {
      Alert.alert("Error", "Invalid booking amount");
      return;
    }

    if (bookingWalletBalance < finalPrice) {
      Alert.alert(
        "Insufficient Balance",
        `Wallet has ₹${bookingWalletBalance.toFixed(0)}. Please use UPI payment or add money to wallet.`
      );
      return;
    }

    try {
      setProcessing(true);

      const res = await fetchWithFallback(
        "/api/payments/event/pay-with-wallet",
        await withAuthHeaders({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_id: id,
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
        setProcessing(false);
        Alert.alert("Payment Failed", data.error || "Failed to process wallet payment");
        return;
      }


      // Send notifications to matching participants with booking_id
      await sendNotificationToMatchingUsers(participants.map(p => p.name), data.booking_id);

      setProcessing(false);
      setShowPaymentDetails(false);

      setBookingWalletBalance(data.wallet_balance ?? bookingWalletBalance - finalPrice);

      const qrCode = data.qr_code || data.qr;
      const qrParam = qrCode ? encodeURIComponent(qrCode) : "";

      if (qrCode) {
        router.replace(`/payment/success?qr=${qrParam}&booking_id=${data.booking_id}&amount=${finalPrice}`);
      } else {
        router.replace(`/payment/success?booking_id=${data.booking_id}&amount=${finalPrice}`);
      }
    } catch (err: any) {
      setProcessing(false);
      Alert.alert("Error", err.message || "Something went wrong");
    }
  };

  const handleCheckout = async () => {
    if (!id || finalPrice <= 0 || !participants || participants.length === 0) {
      Alert.alert("Error", "Invalid booking details");
      return;
    }

    const invalidParticipants = participants.filter(
      (p) => !p.name || !p.gender || !p.age
    );
    if (invalidParticipants.length > 0) {
      Alert.alert("Error", "Please fill in all required participant details.");
      return;
    }

    try {
      setProcessing(true);

      const bookingRes = await fetchWithFallback(
        `/api/bookings/create`,
        await withAuthHeaders({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_id: id,
            total_amount: finalPrice,
            discount_id: appliedDiscount?.id || null,
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
        router.replace(`/payment/failure?error_message=${encodeURIComponent(errorMsg)}&amount=${finalPrice}&event_id=${id}`);
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
        router.replace(`/payment/failure?error_message=${encodeURIComponent(errorMsg)}&amount=${finalPrice}&booking_id=${bookingData.booking_id}&event_id=${id}`);
        return;
      }

      const options = {
        key: order.key,
        order_id: order.order_id,
        amount: order.amount || finalPrice * 100,
        currency: "INR",
        name: event?.name || "Event Booking",
        description: "Event Ticket Payment",
        prefill: {
          email: "test@example.com",
          contact: "9999999999",
        },
        theme: { color: ACCENT_PINK },
      };

      setPendingRazorpayOptions({ ...options, bookingData });
      setShowPaymentDetails(false);
      setProcessing(false);
    } catch (err: any) {
      setProcessing(false);
      const errorMsg = err.message || "Something went wrong. Please try again.";
      router.replace(`/payment/failure?error_message=${encodeURIComponent(errorMsg)}&amount=${finalPrice}&event_id=${id}`);
    }
  };

  const handlePayNow = async () => {
    if (selectedPaymentMethod === "wallet") {
      await handlePayBookingWithWallet();
    } else {
      await handleCheckout();
    }
    // Notifications are sent within the respective payment handlers
  };

  const totalTickets = getTotalTickets();
  const totalPrice = getTotalPrice();

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={PRIMARY_GRADIENT}
          style={styles.gradientBackground}
        />
        <ActivityIndicator color={ACCENT_PINK} size="large" style={styles.loadingSpinner} />
      </View>
    );
  }

  /* ---------------- COUPON CARD COMPONENT ---------------- */
  const renderCouponCard = (d: Discount) => {
    const currentTotal = getTotalPrice();
    const isApplied = String(appliedDiscount?.id) === String(d.id);
    const isApplicable = isDiscountApplicable(d, currentTotal);

    return (
      <Pressable
        key={d.id}
        style={[
          styles.offerCard,
          isApplied && styles.offerCardApplied,
          !isApplicable && styles.offerCardDisabled
        ]}
        onPress={() => isApplicable && toggleEventDiscount(d)}
        disabled={!isApplicable}
      >
        <View style={styles.offerIconContainer}>
          <Ionicons name="pricetag" size={24} color={ACCENT_PINK} />
        </View>
        <View style={styles.offerTextContainer}>
          <Text style={styles.offerTitle}>{d.name}</Text>
          <Text style={styles.offerSubtitle}>
            {isApplicable ? getDiscountDesc(d) : `Min ₹${d.min_purchase} required`}
          </Text>
        </View>
        {isApplicable && (
          <Pressable
            style={styles.offerCloseBtn}
            onPress={() => isApplied && toggleEventDiscount(d)}
          >
            <Ionicons name={isApplied ? "close" : "add"} size={20} color="#FFFFFF" />
          </Pressable>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={PRIMARY_GRADIENT}
        style={styles.gradientBackground}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Payment details</Text>
        </View>

        {/* Event Card */}
        <View style={styles.eventCard}>
          <Image
            source={{ uri: event?.banner_image_url || "https://via.placeholder.com/150" }}
            style={styles.eventImage}
          />
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle}>{event?.name}</Text>
            <View style={styles.eventLocationRow}>
              <View style={styles.locationIconContainer}>
                <Ionicons name="location-outline" size={14} color={LIGHT_TEXT} />
              </View>
              <View style={styles.locationTextContainer}>
                <Text style={styles.eventLocation} numberOfLines={2}>
                  {club?.address_text || "Event Location"}
                </Text>
                <Text style={styles.eventDistance}>3.0 km</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Ticket Details Card */}
        <View style={styles.detailsCard}>
          <View style={styles.dateTimeRow}>
            <Text style={styles.dateText}>
              {event?.event_date || "Tuesday, 23 Dec"}
            </Text>
            <View style={styles.timeDivider} />
            <Text style={styles.timeText}>
              {event?.start_time || "7 PM"}
            </Text>
          </View>

          <View style={styles.ticketQuantityRow}>
            <Text style={styles.detailLabelPink}>Number of tickets</Text>
            <View style={styles.quantityControls}>
              <Pressable
                style={({ pressed }) => [
                  styles.quantityBtn,
                  totalTickets === 0 && styles.quantityBtnDisabled,
                  pressed && styles.quantityBtnPressed
                ]}
                onPress={() => updateQuantity(-1)}
                disabled={totalTickets === 0}
              >
                <Text style={styles.quantityBtnText}>−</Text>
              </Pressable>
              <Text style={styles.quantityText}>{totalTickets}</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.quantityBtn,
                  totalTickets >= availableTickets && styles.quantityBtnDisabled,
                  pressed && styles.quantityBtnPressed
                ]}
                onPress={() => updateQuantity(1)}
                disabled={totalTickets >= availableTickets}
              >
                <Text style={styles.quantityBtnText}>+</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.entryTypeRow}>
            <Text style={styles.detailLabel}>Entry Type</Text>
            <Pressable
              style={styles.entryTypeSelector}
              onPress={() => {
                Alert.alert(
                  "Select Entry Type",
                  "",
                  [
                    {
                      text: "Stag",
                      onPress: () => setSelectedEntryType("stag"),
                    },
                    {
                      text: "Couple",
                      onPress: () => setSelectedEntryType("couple"),
                    },
                    {
                      text: "Cancel",
                      style: "cancel",
                    },
                  ]
                );
              }}
            >
              <Text style={styles.entryTypeText}>
                {selectedEntryType.charAt(0).toUpperCase() + selectedEntryType.slice(1)}
              </Text>
              <Ionicons name="chevron-down" size={18} color={LIGHT_TEXT} />
            </Pressable>
          </View>

          <View style={styles.ticketNoteRow}>
            <View style={styles.ticketIconContainer}>
              <Ionicons name="qr-code-outline" size={20} color={LIGHT_TEXT} />
            </View>
            <Text style={styles.ticketNote}>
              Show your tickets on your mobile device at the venue during check-in
            </Text>
          </View>
        </View>

        {/* Offers Section */}
        {discounts.length > 0 && (
          <View style={styles.offersSection}>
            <Text style={styles.sectionTitle}>Offers</Text>

            {!showOffersExpanded && discounts.length > 0 && renderCouponCard(discounts[0])}

            {showOffersExpanded && discounts.map((d) => renderCouponCard(d))}

            <Pressable
              style={styles.viewAllCouponsBtn}
              onPress={() => setShowCouponModal(true)}
            >
              <View style={styles.couponBtnIconContainer}>
                <Ionicons name="ticket-outline" size={20} color={LIGHT_TEXT} />
              </View>
              <Text style={styles.viewAllCouponsText}>View all Coupons</Text>
              <Ionicons name="chevron-forward" size={20} color={LIGHT_TEXT} />
            </Pressable>
          </View>
        )}

        {/* Payment Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Order Total Price</Text>
              <Text style={styles.summaryValue}>Rs.{totalPrice}</Text>
            </View>

            {appliedDiscount && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Coupon</Text>
                <Text style={styles.summaryDiscount}>-{discountAmount.toFixed(0)}</Text>
              </View>
            )}

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Booking fee (inc. of GST)</Text>
              <Text style={styles.summaryValue}>Rs.{Math.round(totalPrice * 0.07)}</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryTotalRow}>
              <Text style={styles.summaryTotalLabel}>Grand Total</Text>
              <Text style={styles.summaryTotalValue}>
                Rs.{totalPrice + Math.round(totalPrice * 0.07) - (appliedDiscount ? discountAmount : 0)}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerPriceContainer}>
          <Text style={styles.footerLabel}>Total Price</Text>
          <Text style={styles.footerPrice}>
            Rs.{totalPrice + Math.round(totalPrice * 0.07) - (appliedDiscount ? discountAmount : 0)}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.proceedBtn,
            pressed && styles.proceedBtnPressed,
            (totalTickets === 0 || processing) && styles.proceedBtnDisabled
          ]}
          onPress={handleProceedToPayment}
          disabled={totalTickets === 0 || processing}
        >
          <Text style={styles.proceedBtnText}>Proceed</Text>
        </Pressable>
      </View>

      {/* PARTICIPANT FORM MODAL */}
      <Modal
        visible={showParticipantForm}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <DismissKeyboardView style={styles.modalContainer}>
          <StatusBar barStyle="light-content" />
          <LinearGradient colors={PRIMARY_GRADIENT} style={styles.modalGradient} />

          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowParticipantForm(false)}>
              <Text style={styles.modalClose}>Cancel</Text>
            </Pressable>
            <Text style={styles.modalTitle}>
              Participant {currentParticipantIndex + 1} of {participants.length}
            </Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.inputLabel}>Name *</Text>
            <TextInput
              style={styles.input}
              value={participants[currentParticipantIndex]?.name || ""}
              onChangeText={(text) => updateParticipant("name", text)}
              placeholder="Enter name"
              placeholderTextColor="rgba(255,255,255,0.5)"
            />

            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={participants[currentParticipantIndex]?.email || ""}
              onChangeText={(text) => updateParticipant("email", text)}
              placeholder="Enter email (optional)"
              placeholderTextColor="rgba(255,255,255,0.5)"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Gender *</Text>
            <View style={styles.genderRow}>
              {["Male", "Female", "Other"].map((gender) => (
                <Pressable
                  key={gender}
                  style={[
                    styles.genderBtn,
                    participants[currentParticipantIndex]?.gender === gender &&
                    styles.genderBtnActive,
                  ]}
                  onPress={() => updateParticipant("gender", gender)}
                >
                  <Text
                    style={[
                      styles.genderBtnText,
                      participants[currentParticipantIndex]?.gender === gender &&
                      styles.genderBtnTextActive,
                    ]}
                  >
                    {gender}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.inputLabel}>
              Age * (Minimum: {event?.age_limit || 18})
            </Text>
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
              placeholderTextColor="rgba(255,255,255,0.5)"
              keyboardType="numeric"
            />

            <ThemedButton
              style={styles.nextBtn}
              textStyle={styles.nextBtnText}
              onPress={handleNextParticipant}
            >
              {currentParticipantIndex < participants.length - 1
                ? "Next"
                : "Continue to Payment"}
            </ThemedButton>
          </ScrollView>
        </DismissKeyboardView>
      </Modal>

      {/* PAYMENT DETAILS MODAL */}
      <Modal
        visible={showPaymentDetails}
        animationType="slide"
        presentationStyle="pageSheet"
        onDismiss={() => {
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
                  router.replace(`/payment/failure?error_message=${encodeURIComponent(errorMsg)}&amount=${finalPrice}&booking_id=${currentBookingId}&event_id=${id}`);
                  setProcessing(false);
                  return;
                }

                if (!RazorpayCheckout || typeof RazorpayCheckout.open !== 'function') {
                  const errorMsg = "Payment gateway not available";
                  router.replace(`/payment/failure?error_message=${encodeURIComponent(errorMsg)}&amount=${finalPrice}&booking_id=${currentBookingId}&event_id=${id}`);
                  setProcessing(false);
                  return;
                }

                RazorpayCheckout.open(options)
                  .then(async (response: any) => {
                    if (!response || !response.razorpay_payment_id) {
                      setProcessing(false);
                      const errorMsg = "Invalid payment response";
                      router.replace(`/payment/failure?error_message=${encodeURIComponent(errorMsg)}&amount=${finalPrice}&booking_id=${currentBookingId}&event_id=${id}`);
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
                        const errorMsg = verified.error || "Unable to verify payment";
                        router.replace(`/payment/failure?error_message=${encodeURIComponent(errorMsg)}&amount=${finalPrice}&booking_id=${currentBookingId}&event_id=${id}`);
                        return;
                      }


                      // Send notifications to matching participants with booking_id
                      await sendNotificationToMatchingUsers(participants.map(p => p.name), currentBookingId);

                      const qrCode = verified.qr || verified.qr_code;
                      setProcessing(false);

                      const qrParam = qrCode ? encodeURIComponent(qrCode) : "";

                      if (qrCode) {
                        router.replace(`/payment/success?qr=${qrParam}&booking_id=${currentBookingId}&amount=${finalPrice}`);
                      } else {
                        router.replace(`/payment/success?booking_id=${currentBookingId}&amount=${finalPrice}`);
                      }
                    } catch (verifyError: any) {
                      setProcessing(false);
                      const errorMsg = verifyError?.message || "Payment verification failed";
                      router.replace(`/payment/failure?error_message=${encodeURIComponent(errorMsg)}&amount=${finalPrice}&booking_id=${currentBookingId}&event_id=${id}`);
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
                      router.replace(`/payment/failure?error_message=${encodeURIComponent(errorMsg)}&amount=${finalPrice}&booking_id=${currentBookingId}&event_id=${id}`);
                    } else {
                      const errorMsg = error?.description || error?.message || "Payment could not be completed";
                      router.replace(`/payment/failure?error_message=${encodeURIComponent(errorMsg)}&amount=${finalPrice}&booking_id=${currentBookingId}&event_id=${id}`);
                    }
                  });
              }, 500);
            });
          }
        }}
      >
        <View style={styles.paymentModalContainer}>
          <StatusBar barStyle="light-content" />
          <LinearGradient colors={PRIMARY_GRADIENT} style={styles.paymentModalGradient} />

          <View style={styles.paymentModalHeader}>
            <Pressable onPress={() => setShowPaymentDetails(false)}>
              <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.paymentModalTitle}>Payment Summary</Text>
            <View style={{ width: 32 }} />
          </View>

          <ScrollView style={styles.paymentModalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.paymentSummaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Order Total</Text>
                <Text style={styles.summaryValue}>Rs.{orderTotal}</Text>
              </View>

              {appliedDiscount && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Discount</Text>
                  <Text style={styles.summaryDiscount}>-Rs.{discountAmount.toFixed(0)}</Text>
                </View>
              )}

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Booking Fee</Text>
                <Text style={styles.summaryValue}>Rs.{bookingFee}</Text>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryTotalRow}>
                <Text style={styles.summaryTotalLabel}>Grand Total</Text>
                <Text style={styles.summaryTotalValue}>Rs.{finalPrice}</Text>
              </View>
            </View>

            {/* Participants List */}
            <Text style={styles.participantsTitle}>Participants ({participants.length})</Text>
            <View style={styles.participantsList}>
              {participants.map((p, idx) => (
                <View key={idx} style={styles.participantItem}>
                  <Text style={styles.participantName}>{p.name}</Text>
                  <Text style={styles.participantDetails}>
                    {p.gender} · {p.age} years
                  </Text>
                </View>
              ))}
            </View>

            {/* Wallet Balance */}
            <View style={styles.walletInfoRow}>
              <Ionicons name="wallet-outline" size={18} color={LIGHT_TEXT} />
              <Text style={styles.walletInfoText}>
                Wallet: ₹{bookingWalletLoading ? "..." : bookingWalletBalance.toFixed(0)}
                {!canPayWithWallet && " (Insufficient)"}
              </Text>
            </View>

            <View style={{ height: 120 }} />
          </ScrollView>

          {/* Payment Footer */}
          <View style={styles.paymentFooter}>
            <View style={styles.paymentMethodSection}>
              <Pressable
                style={styles.paymentMethodBtn}
                onPress={() => {
                  Alert.alert(
                    "Select Payment Method",
                    "",
                    [
                      {
                        text: "Wallet",
                        onPress: () => setSelectedPaymentMethod("wallet"),
                      },
                      {
                        text: "UPI",
                        onPress: () => setSelectedPaymentMethod("upi"),
                      },
                      {
                        text: "Cancel",
                        style: "cancel",
                      },
                    ]
                  );
                }}
              >
                <Ionicons
                  name={selectedPaymentMethod === "wallet" ? "wallet-outline" : "logo-google"}
                  size={16}
                  color="#FFFFFF"
                />
                <Text style={styles.paymentMethodText}>
                  {selectedPaymentMethod === "wallet" ? "Wallet" : "UPI"}
                </Text>
              </Pressable>
            </View>

            <View style={styles.payNowSection}>
              <View>
                <Text style={styles.payNowLabel}>Total Price</Text>
                <Text style={styles.payNowAmount}>Rs.{finalPrice}</Text>
              </View>
              <Pressable
                style={[styles.payNowBtn, processing && styles.payNowBtnDisabled]}
                onPress={handlePayNow}
                disabled={processing}
              >
                <Text style={styles.payNowBtnText}>
                  {processing ? "Processing..." : "Proceed"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* COUPON MODAL */}
      <Modal
        visible={showCouponModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.couponModalContainer}>
          <StatusBar barStyle="light-content" />
          <LinearGradient colors={PRIMARY_GRADIENT} style={styles.couponModalGradient} />

          <View style={styles.couponModalHeader}>
            <Pressable onPress={() => setShowCouponModal(false)}>
              <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.couponModalTitle}>All Coupons</Text>
            <View style={{ width: 32 }} />
          </View>

          <ScrollView style={styles.couponModalScroll} keyboardShouldPersistTaps="handled">
            {discounts.length > 0 ? (
              discounts.map((d) => renderCouponCard(d))
            ) : (
              <Text style={styles.noCouponsText}>No coupons available</Text>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000"
  },
  gradientBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.5,
  },
  loadingSpinner: {
    flex: 1
  },
  scrollView: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Event Card
  eventCard: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 20,
    gap: 14,
  },
  eventImage: {
    width: 140,
    height: 110,
    borderRadius: 12,
    backgroundColor: "#2D2D2D",
  },
  eventInfo: {
    flex: 1,
    justifyContent: "center",
  },
  eventTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 10,
    lineHeight: 22,
  },
  eventLocationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  locationIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  locationTextContainer: {
    flex: 1,
  },
  eventLocation: {
    fontSize: 13,
    color: LIGHT_TEXT,
    lineHeight: 18,
  },
  eventDistance: {
    fontSize: 13,
    color: LIGHT_TEXT,
    marginTop: 2,
  },

  // Details Card
  detailsCard: {
    backgroundColor: DARK_CARD,
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    padding: 18,
  },
  dateTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  dateText: {
    fontSize: 15,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  timeDivider: {
    width: 1,
    height: 16,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  timeText: {
    fontSize: 15,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  detailRow: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 15,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  detailLabelPink: {
    fontSize: 15,
    color: ACCENT_PINK,
    fontWeight: "500",
  },
  ticketQuantityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  quantityBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: ACCENT_PINK,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityBtnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  quantityBtnDisabled: {
    opacity: 0.4,
  },
  quantityBtnText: {
    fontSize: 22,
    fontWeight: "600",
    color: "#FFFFFF",
    lineHeight: 24,
  },
  quantityText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    minWidth: 24,
    textAlign: "center",
  },
  entryTypeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  entryTypeSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  entryTypeText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  ticketNoteRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 12,
    borderRadius: 10,
  },
  ticketIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  ticketNote: {
    flex: 1,
    fontSize: 13,
    color: LIGHT_TEXT,
    lineHeight: 18,
  },

  // Offers Section
  offersSection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 14,
  },
  offerCard: {
    flexDirection: "row",
    backgroundColor: DARK_CARD,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    alignItems: "center",
    gap: 12,
  },
  offerCardApplied: {
    borderWidth: 2,
    borderColor: ACCENT_PINK,
  },
  offerCardDisabled: {
    opacity: 0.5,
  },
  offerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "rgba(233, 30, 140, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  offerTextContainer: {
    flex: 1,
  },
  offerTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  offerSubtitle: {
    fontSize: 12,
    color: LIGHT_TEXT,
  },
  offerCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewAllCouponsBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DARK_CARD,
    borderRadius: 14,
    padding: 14,
  },
  couponBtnIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewAllCouponsText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
  },

  // Summary Section
  summarySection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: DARK_CARD,
    borderRadius: 14,
    padding: 18,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  summaryLabel: {
    fontSize: 14,
    color: LIGHT_TEXT,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  summaryDiscount: {
    fontSize: 14,
    fontWeight: "600",
    color: ACCENT_PINK,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 14,
  },
  summaryTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    backgroundColor: "#000000",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  footerPriceContainer: {
    flex: 1,
  },
  footerLabel: {
    fontSize: 12,
    color: LIGHT_TEXT,
    marginBottom: 4,
  },
  footerPrice: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  proceedBtn: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  proceedBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  proceedBtnDisabled: {
    opacity: 0.5,
  },
  proceedBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },

  // Participant Modal
  modalContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  modalGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.4,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  modalClose: {
    color: ACCENT_PINK,
    fontSize: 16,
    fontWeight: "600",
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
    fontSize: 14,
    fontWeight: "500",
    marginTop: 20,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 16,
    color: "#FFFFFF",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  genderRow: {
    flexDirection: "row",
    gap: 12,
  },
  genderBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  genderBtnActive: {
    borderColor: ACCENT_PINK,
    backgroundColor: "rgba(233,30,140,0.15)",
  },
  genderBtnText: {
    color: LIGHT_TEXT,
    fontSize: 15,
    fontWeight: "500",
  },
  genderBtnTextActive: {
    color: ACCENT_PINK,
  },
  nextBtn: {
    marginTop: 32,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 16,
  },
  nextBtnText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "600",
  },

  // Payment Modal
  paymentModalContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  paymentModalGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.4,
  },
  paymentModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  paymentModalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  paymentModalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  paymentSummaryCard: {
    backgroundColor: DARK_CARD,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  participantsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  participantsList: {
    backgroundColor: DARK_CARD,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  participantItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  participantName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  participantDetails: {
    fontSize: 13,
    color: LIGHT_TEXT,
  },
  walletInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
  },
  walletInfoText: {
    fontSize: 14,
    color: LIGHT_TEXT,
  },
  paymentFooter: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: "#000000",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  paymentMethodSection: {
    marginBottom: 16,
  },
  paymentMethodBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  payNowSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  payNowLabel: {
    fontSize: 12,
    color: LIGHT_TEXT,
    marginBottom: 4,
  },
  payNowAmount: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  payNowBtn: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  payNowBtnDisabled: {
    opacity: 0.6,
  },
  payNowBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
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
    height: SCREEN_HEIGHT * 0.4,
  },
  couponModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  couponModalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  couponModalScroll: {
    flex: 1,
    padding: 20,
  },
  noCouponsText: {
    fontSize: 15,
    color: LIGHT_TEXT,
    textAlign: "center",
    marginTop: 40,
  },
});