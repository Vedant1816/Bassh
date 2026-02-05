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
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { fetchWithFallback } from "@/_services/api-config";
import supabase from "@/_services/supabase-public";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { GradientButton } from "@/components/ui/GradientButton";
import { DismissKeyboardView } from "@/components/DismissKeyboardView";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const OTP_GRADIENT = ["#8B0045", "#2D0A1F", "#000000"] as const;
const OTP_GRADIENT_LOCATIONS = [0, 0.4, 1] as const;
const OTP_ACCENT = "#E91E8C";

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
  const [pricing, setPricing] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selections, setSelections] = useState<Map<string, TicketSelection>>(new Map());
  const [processing, setProcessing] = useState(false);
  const [availableTickets, setAvailableTickets] = useState<number>(0);
  const [showParticipantForm, setShowParticipantForm] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentParticipantIndex, setCurrentParticipantIndex] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [finalPrice, setFinalPrice] = useState(0);
  const [priceBreakdown, setPriceBreakdown] = useState<Array<{ label: string; amount: number; count?: number }>>([]);
  const [pendingRazorpayOptions, setPendingRazorpayOptions] = useState<any>(null);
  
  // Discount state
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [appliedDiscount, setAppliedDiscount] = useState<Discount | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [subtotal, setSubtotal] = useState(0);

  // Wallet state for event booking
  const [bookingWalletBalance, setBookingWalletBalance] = useState<number>(0);
  const [bookingWalletLoading, setBookingWalletLoading] = useState(false);

  /* ---------------- LOAD EVENT + PRICING + DISCOUNTS ---------------- */

  useEffect(() => {
    if (!id) return;

    (async () => {
      const res = await fetchWithFallback(
        `/api/bookings/event/${id}`,
        await withAuthHeaders({ method: "GET" })
      );

      const data = await res.json();

      if (res.ok) {
        setEvent(data.event);
        setPricing(data.pricing || []);
        setAvailableTickets(data.event?.available_tickets || 0);
      }

      // Fetch event discounts from dedicated discount API for checkout
      const discountRes = await fetchWithFallback(
        `/api/discounts/event?event_id=${id}`,
        await withAuthHeaders({ method: "GET" })
      );
      const discountData = await discountRes.json();
      if (discountRes.ok && discountData.discounts) {
        setDiscounts(discountData.discounts);
        console.log("🎟️ [BOOKING] Available discounts:", discountData.discounts);
      } else {
        setDiscounts([]);
      }

      setLoading(false);
    })();
  }, [id]);

  /* ---------------- DISCOUNT CALCULATION ---------------- */

  const calculateDiscount = (subtotalAmount: number) => {
    // Find eligible discounts (meet min_purchase requirement)
    const eligibleDiscounts = discounts.filter(
      (d) => subtotalAmount >= d.min_purchase
    );

    if (eligibleDiscounts.length === 0) {
      setAppliedDiscount(null);
      setDiscountAmount(0);
      return subtotalAmount;
    }

    // Calculate actual discount value for each eligible discount
    const discountsWithValues = eligibleDiscounts.map((discount) => {
      let discountValue = 0;
      
      if (discount.discount_type === "percentage") {
        discountValue = subtotalAmount * (discount.discount_value / 100);
        // Apply max_discount cap if set
        if (discount.max_discount && discountValue > discount.max_discount) {
          discountValue = discount.max_discount;
        }
      } else {
        // Fixed discount
        discountValue = discount.discount_value;
      }

      return { ...discount, calculatedValue: discountValue };
    });

    // Sort by calculated value (highest discount first)
    discountsWithValues.sort((a, b) => b.calculatedValue - a.calculatedValue);

    const bestDiscount = discountsWithValues[0];

    setAppliedDiscount(bestDiscount);
    setDiscountAmount(bestDiscount.calculatedValue);

    console.log("💰 [DISCOUNT] Applied:", bestDiscount.name, "-₹" + bestDiscount.calculatedValue);

    return subtotalAmount - bestDiscount.calculatedValue;
  };

  /* ---------------- CHECK IF DISCOUNT IS APPLICABLE ---------------- */

  const isDiscountApplicable = (discount: Discount, currentSubtotal: number): boolean => {
    return currentSubtotal >= discount.min_purchase;
  };

  const getDiscountDisplayValue = (discount: Discount, currentSubtotal: number): string => {
    if (discount.discount_type === "percentage") {
      let value = currentSubtotal * (discount.discount_value / 100);
      if (discount.max_discount && value > discount.max_discount) {
        value = discount.max_discount;
      }
      return `Save ₹${value.toFixed(0)} (${discount.discount_value}% off)`;
    } else {
      return `Save ₹${discount.discount_value}`;
    }
  };

  /* ---------------- TICKET LOGIC ---------------- */

  const updateQuantity = (
    pricingId: string,
    label: string,
    price: number,
    stagPrice: number | undefined,
    couplePrice: number | undefined,
    delta: number
  ) => {
    setSelections((prev) => {
      const next = new Map(prev);
      const current = next.get(pricingId) || {
        pricingId,
        label,
        price,
        stagPrice,
        couplePrice,
        quantity: 0,
      };

      const qty = Math.max(0, current.quantity + delta);

      if (qty === 0) next.delete(pricingId);
      else next.set(pricingId, { ...current, quantity: qty });

      return next;
    });
  };

  const getTotalTickets = () => {
    let t = 0;
    selections.forEach((s) => (t += s.quantity));
    return t;
  };

  const getTotalPrice = () => {
    let p = 0;
    selections.forEach((s) => (p += s.quantity * s.price));
    return p;
  };

  /* ---------------- PARTICIPANT FORM ---------------- */

  const handleProceedToPayment = () => {
    const totalTickets = getTotalTickets();
    if (totalTickets === 0) {
      Alert.alert("No tickets selected");
      return;
    }

    let participantCount = 0;
    selections.forEach((sel) => {
      const isCouple = sel.label.toLowerCase().includes("couple");
      if (isCouple) {
        participantCount += sel.quantity * 2;
      } else {
        participantCount += sel.quantity;
      }
    });

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
    let total = 0;
    let participantIdx = 0;
    const regularParticipants: Participant[] = [];
    const stagParticipants: Participant[] = [];
    const breakdown: Array<{ label: string; amount: number; count?: number }> = [];

    selections.forEach((sel) => {
      const labelLower = sel.label.toLowerCase();
      const isCoupleTicket = labelLower.includes("couple");
      const isStagTicket = labelLower.includes("stag");
      
      if (isCoupleTicket) {
        let coupleCount = 0;
        for (let i = 0; i < sel.quantity; i++) {
          if (participantIdx + 1 < participants.length) {
            const couplePrice = sel.couplePrice || sel.price;
            total += couplePrice;
            coupleCount++;
            participantIdx += 2;
          }
        }
        if (coupleCount > 0) {
          breakdown.push({
            label: `Couple Ticket${coupleCount > 1 ? "s" : ""} (${coupleCount})`,
            amount: (sel.couplePrice || sel.price) * coupleCount,
            count: coupleCount,
          });
        }
      } else if (isStagTicket) {
        for (let i = 0; i < sel.quantity; i++) {
          if (participantIdx < participants.length) {
            stagParticipants.push(participants[participantIdx]);
            participantIdx++;
          }
        }
      } else {
        for (let i = 0; i < sel.quantity; i++) {
          if (participantIdx < participants.length) {
            regularParticipants.push(participants[participantIdx]);
            participantIdx++;
          }
        }
      }
    });

    if (stagParticipants.length > 0) {
      const stagTicket = Array.from(selections.values()).find(
        (s) => s.label.toLowerCase().includes("stag")
      );

      if (stagTicket) {
        let stagMaleCount = 0;
        let stagOtherCount = 0;

        stagParticipants.forEach((p) => {
          const isMale = p.gender.toLowerCase() === "male";
          if (isMale && stagTicket.stagPrice) {
            total += stagTicket.stagPrice;
            stagMaleCount++;
          } else {
            total += stagTicket.price;
            stagOtherCount++;
          }
        });

        if (stagMaleCount > 0) {
          breakdown.push({
            label: `Stag Entry${stagMaleCount > 1 ? "s" : ""} (${stagMaleCount})`,
            amount: (stagTicket.stagPrice || stagTicket.price) * stagMaleCount,
            count: stagMaleCount,
          });
        }
        if (stagOtherCount > 0) {
          breakdown.push({
            label: `Regular Entry${stagOtherCount > 1 ? "s" : ""} (${stagOtherCount})`,
            amount: stagTicket.price * stagOtherCount,
            count: stagOtherCount,
          });
        }
      }
    }

    if (regularParticipants.length > 0) {
      const males: Participant[] = [];
      const females: Participant[] = [];
      const others: Participant[] = [];

      regularParticipants.forEach((p) => {
        const gender = p.gender.toLowerCase();
        if (gender === "male") {
          males.push(p);
        } else if (gender === "female") {
          females.push(p);
        } else {
          others.push(p);
        }
      });

      const regularTicket = Array.from(selections.values()).find(
        (s) => !s.label.toLowerCase().includes("couple") && !s.label.toLowerCase().includes("stag")
      );

      if (regularTicket) {
        const pairsCount = Math.min(females.length, males.length);
        
        if (pairsCount > 0) {
          const couplePrice = regularTicket.couplePrice || regularTicket.price;
          const pairTotal = couplePrice * pairsCount;
          total += pairTotal;
          breakdown.push({
            label: `Couple Pair${pairsCount > 1 ? "s" : ""} (${pairsCount})`,
            amount: pairTotal,
            count: pairsCount,
          });
        }

        const remainingMales = males.length - pairsCount;
        if (remainingMales > 0) {
          const stagPrice = regularTicket.stagPrice || regularTicket.price;
          const stagTotal = stagPrice * remainingMales;
          total += stagTotal;
          breakdown.push({
            label: `Stag Entry${remainingMales > 1 ? "s" : ""} (${remainingMales})`,
            amount: stagTotal,
            count: remainingMales,
          });
        }

        const remainingFemales = females.length - pairsCount;
        if (remainingFemales > 0) {
          const femaleTotal = regularTicket.price * remainingFemales;
          total += femaleTotal;
          breakdown.push({
            label: `Regular Entry${remainingFemales > 1 ? "s" : ""} (${remainingFemales})`,
            amount: femaleTotal,
            count: remainingFemales,
          });
        }

        if (others.length > 0) {
          const otherTotal = regularTicket.price * others.length;
          total += otherTotal;
          breakdown.push({
            label: `Regular Entry${others.length > 1 ? "s" : ""} (${others.length})`,
            amount: otherTotal,
            count: others.length,
          });
        }
      } else {
        const firstSelection = Array.from(selections.values())[0];
        if (firstSelection) {
          const fallbackTotal = firstSelection.price * regularParticipants.length;
          total += fallbackTotal;
          breakdown.push({
            label: `Regular Entry${regularParticipants.length > 1 ? "s" : ""} (${regularParticipants.length})`,
            amount: fallbackTotal,
            count: regularParticipants.length,
          });
        }
      }
    }

    setPriceBreakdown(breakdown);
    setSubtotal(total);
    setAppliedDiscount(null);
    setDiscountAmount(0);
    setFinalPrice(total);

    setShowParticipantForm(false);
    setShowSummary(true);
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

  const handlePayBookingWithWallet = async () => {
    if (!id || finalPrice <= 0) {
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
        theme: { color: OTP_ACCENT },
      };

      setPendingRazorpayOptions({ ...options, bookingData });
      setShowSummary(false);
      setProcessing(false);
    } catch (err: any) {
      setProcessing(false);
      const errorMsg = err.message || "Something went wrong. Please try again.";
      router.replace(`/payment/failure?error_message=${encodeURIComponent(errorMsg)}&amount=${finalPrice}&event_id=${id}`);
    }
  };

  const totalTickets = getTotalTickets();
  const totalPrice = getTotalPrice();

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={OTP_GRADIENT}
          locations={OTP_GRADIENT_LOCATIONS}
          style={styles.gradientBackground}
        />
        <ActivityIndicator color={OTP_ACCENT} size="large" style={styles.loadingSpinner} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={OTP_GRADIENT}
        locations={OTP_GRADIENT_LOCATIONS}
        style={styles.gradientBackground}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>

        <Text style={styles.title}>{event?.name}</Text>
        <Text style={styles.subtitle}>
          {event?.event_date} · {event?.start_time || "6 PM onwards"}
        </Text>

        {discounts.length > 0 && (
          <View style={styles.discountLine}>
            <Text style={styles.discountLineText}>
              {discounts.length} discount{discounts.length > 1 ? "s" : ""} available
            </Text>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tickets</Text>
          <Text style={styles.availabilityText}>{availableTickets} left</Text>
        </View>

        {pricing.map((p) => {
          const quantity = selections.get(p.id)?.quantity || 0;
          const soldOut = availableTickets <= 0;

          return (
            <View key={p.id} style={styles.ticketCard}>
              <View>
                <Text style={styles.ticketTitle}>{p.label}</Text>
                <Text style={styles.ticketPrice}>₹{p.price}</Text>
                {p.stag_price && (
                  <Text style={styles.ticketSubPrice}>Stag: ₹{p.stag_price}</Text>
                )}
                {p.couple_price && (
                  <Text style={styles.ticketSubPrice}>Couple: ₹{p.couple_price}</Text>
                )}
              </View>

              {soldOut ? (
                <Text style={{ color: "red" }}>Sold Out</Text>
              ) : (
                <View style={styles.quantityControls}>
                  <Pressable
                    style={styles.quantityBtn}
                    onPress={() => updateQuantity(p.id, p.label, p.price, p.stag_price, p.couple_price, -1)}
                    disabled={quantity === 0}
                  >
                    <Text style={styles.quantityBtnText}>−</Text>
                  </Pressable>
                  <Text style={styles.quantityText}>{quantity}</Text>
                  <Pressable
                    style={styles.quantityBtn}
                    onPress={() => updateQuantity(p.id, p.label, p.price, p.stag_price, p.couple_price, 1)}
                    disabled={totalTickets >= availableTickets}
                  >
                    <Text style={styles.quantityBtnText}>+</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}

        <View style={{ height: 120 }} />
      </ScrollView>

      {totalTickets > 0 && !showSummary && (
        <View style={styles.footer}>
          <View>
            <Text style={styles.footerTickets}>
              {totalTickets} ticket{totalTickets > 1 ? "s" : ""}
            </Text>
            <Text style={styles.footerPrice}>₹{totalPrice}</Text>
          </View>
          <GradientButton
            style={styles.proceedBtn}
            textStyle={styles.proceedBtnText}
            onPress={handleProceedToPayment}
            disabled={processing}
          >
            Continue
          </GradientButton>
        </View>
      )}

      {/* PARTICIPANT FORM MODAL */}
      <Modal
        visible={showParticipantForm}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <DismissKeyboardView style={styles.modalContainer}>
          <StatusBar barStyle="light-content" />
          <LinearGradient colors={OTP_GRADIENT} locations={OTP_GRADIENT_LOCATIONS} style={styles.modalGradient} />
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

            <GradientButton
              style={styles.nextBtn}
              textStyle={styles.nextBtnText}
              onPress={handleNextParticipant}
            >
              {currentParticipantIndex < participants.length - 1
                ? "Next"
                : "Calculate Price"}
            </GradientButton>
          </ScrollView>
        </DismissKeyboardView>
      </Modal>

      {/* SUMMARY MODAL */}
      <Modal
        visible={showSummary}
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
                      // For cancelled payments, still redirect to failure page but with a friendly message
                      const errorMsg = "Payment was cancelled. Your booking is still pending.";
                      router.replace(`/payment/failure?error_message=${encodeURIComponent(errorMsg)}&amount=${finalPrice}&booking_id=${currentBookingId}&event_id=${id}`);
                    } else {
                      // For actual payment errors, redirect to failure page
                      const errorMsg = error?.description || error?.message || "Payment could not be completed";
                      router.replace(`/payment/failure?error_message=${encodeURIComponent(errorMsg)}&amount=${finalPrice}&booking_id=${currentBookingId}&event_id=${id}`);
                    }
                  });
              }, 500);
            });
          }
        }}
      >
        <View style={styles.modalContainer}>
          <StatusBar barStyle="light-content" />
          <LinearGradient colors={OTP_GRADIENT} locations={OTP_GRADIENT_LOCATIONS} style={styles.modalGradient} />
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
              
              {/* Ticket breakdown */}
              {priceBreakdown.map((item, idx) => (
                <View key={idx} style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>{item.label}</Text>
                  <Text style={styles.breakdownAmount}>₹{item.amount}</Text>
                </View>
              ))}

              {/* Show subtotal and discount if discount applied */}
              {appliedDiscount && (
                <>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Subtotal</Text>
                    <Text style={styles.breakdownAmount}>₹{subtotal}</Text>
                  </View>

                  <View style={styles.breakdownRow}>
                    <View>
                      <Text style={[styles.breakdownLabel, { color: "#4ADE80" }]}>
                        Discount Applied
                      </Text>
                      <Text style={[styles.breakdownLabel, { fontSize: 11, marginTop: 2 }]}>
                        {appliedDiscount.name}
                      </Text>
                    </View>
                    <Text style={[styles.breakdownAmount, { color: "#4ADE80" }]}>
                      -₹{discountAmount.toFixed(2)}
                    </Text>
                  </View>
                </>
              )}

              <View style={styles.breakdownDivider} />
              
              {/* Final Total */}
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownTotalLabel}>Total</Text>
                <Text style={styles.finalPriceText}>₹{finalPrice.toFixed(2)}</Text>
              </View>

              {appliedDiscount && (
                <Text style={styles.savingsText}>
                  −₹{discountAmount.toFixed(0)} from discount
                </Text>
              )}
            </View>

            {discounts.length > 0 && (
              <View style={styles.discountsSection}>
                <Text style={styles.discountsSectionTitle}>Offers (tap to select/deselect)</Text>
                {discounts.map((discount) => {
                  const isApplicable = isDiscountApplicable(discount, subtotal);
                  const isApplied = String(appliedDiscount?.id) === String(discount.id);

                  return (
                    <Pressable
                      key={discount.id}
                      style={[
                        styles.offerCard,
                        isApplied && styles.offerCardApplied,
                        !isApplicable && styles.offerCardDisabled,
                      ]}
                      onPress={() => isApplicable && toggleEventDiscount(discount)}
                      disabled={!isApplicable}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      {/* Diagonal coupon corner - top right */}
                      <View style={styles.offerCardCorner} pointerEvents="none">
                        <LinearGradient
                          colors={["#DB4494", "#DB138D"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.offerCardCornerGradient}
                        />
                      </View>
                      {/* Discount icon */}
                      <View style={styles.offerCardIcon}>
                        <Ionicons
                          name="pricetag"
                          size={20}
                          color={isApplicable ? "#FF007E" : "#6B6B6B"}
                          style={{ transform: [{ rotate: "90deg" }] }}
                        />
                      </View>
                      {/* Title + description */}
                      <View style={styles.offerCardContent}>
                        <Text
                          style={[
                            styles.offerCardTitle,
                            !isApplicable && styles.offerCardTitleDisabled,
                          ]}
                          numberOfLines={1}
                        >
                          {discount.name}
                        </Text>
                        <Text
                          style={[
                            styles.offerCardDesc,
                            !isApplicable && styles.offerCardDescDisabled,
                          ]}
                          numberOfLines={1}
                        >
                          {isApplicable
                            ? getDiscountDisplayValue(discount, subtotal)
                            : `Min ₹${discount.min_purchase}`}
                        </Text>
                      </View>
                      {/* Applied / APPLY button */}
                      <View
                        style={[
                          styles.offerCardBtn,
                          isApplied && styles.offerCardBtnApplied,
                          !isApplicable && styles.offerCardBtnDisabled,
                        ]}
                      >
                        <Text style={styles.offerCardBtnText}>
                          {isApplied ? "Applied" : "APPLY"}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Wallet balance display */}
            {finalPrice > 0 && (
              <View style={styles.walletBalanceRow}>
                <Ionicons name="wallet-outline" size={18} color="#9ca3af" />
                <Text style={styles.walletBalanceText}>
                  Wallet: ₹{bookingWalletLoading ? "..." : bookingWalletBalance.toFixed(0)}
                </Text>
              </View>
            )}

            {/* Payment buttons */}
            <View style={styles.bookingPaymentButtons}>
              {bookingWalletBalance >= finalPrice ? (
                <View style={styles.paymentOptionsRow}>
                  <GradientButton
                    variant="green"
                    style={StyleSheet.flatten([styles.payOptionButton, processing && styles.paymentButtonDisabled])}
                    textStyle={styles.payOptionButtonText}
                    onPress={handlePayBookingWithWallet}
                    disabled={processing}
                    loading={processing}
                  >
                    <View style={styles.payOptionButtonContent}>
                      <Ionicons name="wallet-outline" size={20} color="#fff" />
                      <Text style={styles.payOptionButtonText}>Wallet</Text>
                    </View>
                  </GradientButton>
                  <GradientButton
                    style={StyleSheet.flatten([styles.payOptionButton, processing && styles.paymentButtonDisabled])}
                    textStyle={styles.payOptionButtonText}
                    onPress={handleCheckout}
                    disabled={processing}
                    loading={processing}
                  >
                    <View style={styles.payOptionButtonContent}>
                      <Ionicons name="card-outline" size={20} color="#fff" />
                      <Text style={styles.payOptionButtonText}>Card</Text>
                    </View>
                  </GradientButton>
                </View>
              ) : (
                <GradientButton
                  style={StyleSheet.flatten([styles.fullPayButton, processing && styles.paymentButtonDisabled])}
                  textStyle={styles.fullPayButtonText}
                  onPress={handleCheckout}
                  disabled={processing}
                  loading={processing}
                >
                  Checkout with Card
                </GradientButton>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

/* ---------------- STYLES (OTP theme) ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  gradientBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.5,
  },
  loadingSpinner: { flex: 1 },
  scrollView: { padding: 20, paddingTop: 60 },
  backBtn: { marginBottom: 12 },
  backText: { color: "#FFFFFF", fontSize: 32, fontWeight: "300", marginLeft: -4 },
  title: { color: "#FFFFFF", fontSize: 22, fontWeight: "700" },
  subtitle: { color: "rgba(255,255,255,0.6)", marginBottom: 16, fontSize: 15 },
  discountLine: {
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.15)",
  },
  discountLineText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
  },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  sectionTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  availabilityText: { color: "rgba(255,255,255,0.6)", fontSize: 13 },
  ticketCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  ticketTitle: { color: "#FFFFFF", fontSize: 15 },
  ticketPrice: { color: "#FFFFFF", marginTop: 4, fontSize: 15, fontWeight: "600" },
  ticketSubPrice: { color: "rgba(255,255,255,0.6)", marginTop: 2, fontSize: 12 },
  quantityControls: { flexDirection: "row", alignItems: "center", gap: 14 },
  quantityBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  quantityBtnText: { fontSize: 18, fontWeight: "600", color: "#FFFFFF" },
  quantityText: { color: "#FFFFFF", fontSize: 16 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.85)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
  },
  footerTickets: { color: "rgba(255,255,255,0.6)", fontSize: 13 },
  footerPrice: { color: "#FFFFFF", fontSize: 20, fontWeight: "600" },
  proceedBtn: { minWidth: 120 },
  proceedBtnText: { color: "#FFFFFF", fontWeight: "600", fontSize: 15 },
  modalContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  modalGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.15)",
  },
  modalClose: { color: OTP_ACCENT, fontSize: 15, fontWeight: "600" },
  modalTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  modalContent: { flex: 1, padding: 20 },
  inputLabel: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 18,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    padding: 14,
    color: "#FFFFFF",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  genderRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  genderBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  genderBtnActive: {
    borderColor: OTP_ACCENT,
    backgroundColor: "rgba(233,30,140,0.15)",
  },
  genderBtnText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    fontWeight: "500",
  },
  genderBtnTextActive: {
    color: OTP_ACCENT,
  },
  nextBtn: { marginTop: 28 },
  nextBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  summarySectionTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 10,
  },
  participantCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  participantName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  participantDetails: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    marginTop: 4,
  },
  priceSummary: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  breakdownLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
  },
  breakdownAmount: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
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
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 12,
  },
  /* Offer card - Frame 1948755892 style */
  offerCard: {
    width: "100%",
    minHeight: 82,
    borderRadius: 8,
    backgroundColor: "rgba(30,30,30,0.95)",
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 10,
    paddingRight: 12,
    paddingVertical: 12,
    marginBottom: 12,
    position: "relative",
    overflow: "visible",
  },
  offerCardApplied: {
    backgroundColor: "rgba(255, 0, 126, 0.32)",
  },
  offerCardDisabled: {
    backgroundColor: "rgba(55, 55, 55, 0.85)",
    opacity: 0.85,
  },
  offerCardCorner: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 38,
    height: 30,
    borderRadius: 4,
    overflow: "hidden",
    transform: [{ rotate: "75deg" }],
  },
  offerCardCornerGradient: {
    width: "100%",
    height: "100%",
    opacity: 0.9,
  },
  offerCardIcon: {
    width: 20,
    height: 20,
    marginRight: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  offerCardContent: {
    flex: 1,
    justifyContent: "center",
    minWidth: 0,
  },
  offerCardTitle: {
    fontFamily: "System",
    fontWeight: "500",
    fontSize: 20,
    lineHeight: 20,
    color: "#FFFFFF",
    marginBottom: 6,
  },
  offerCardTitleDisabled: {
    color: "#6B6B6B",
  },
  offerCardDesc: {
    fontFamily: "System",
    fontWeight: "500",
    fontSize: 16,
    lineHeight: 18,
    color: "#A2A2A2",
  },
  offerCardDescDisabled: {
    color: "#5A5A5A",
  },
  offerCardBtn: {
    paddingVertical: 3,
    paddingHorizontal: 7,
    minWidth: 97,
    height: 33,
    borderRadius: 4,
    backgroundColor: "rgba(80,80,80,0.9)",
    borderWidth: 1,
    borderColor: "rgba(215,215,215,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  offerCardBtnApplied: {
    backgroundColor: "#FF007E",
    borderColor: "rgba(215, 215, 215, 0.45)",
  },
  offerCardBtnDisabled: {
    backgroundColor: "rgba(40, 40, 40, 0.95)",
    borderColor: "rgba(100, 100, 100, 0.4)",
  },
  offerCardBtnText: {
    fontFamily: "System",
    fontWeight: "500",
    fontSize: 16,
    lineHeight: 18,
    color: "#FFFFFF",
  },
  checkoutBtn: { marginTop: 24, marginBottom: 16 },
  checkoutBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  walletBalanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  walletBalanceText: {
    color: "#9ca3af",
    fontSize: 14,
  },
  bookingPaymentButtons: {
    marginTop: 24,
    marginBottom: 16,
  },
  paymentOptionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  payOptionButton: {
    flex: 1,
    minHeight: 72,
    height: 72,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  payOptionButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  payOptionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  fullPayButton: {
    height: 72,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  fullPayButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  paymentButtonDisabled: {
    opacity: 0.6,
  },
});