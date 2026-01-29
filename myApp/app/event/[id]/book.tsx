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
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { fetchWithFallback } from "@/_services/api-config";
import { Colors } from "@/constants/Colors";
import { GradientButton } from "@/components/ui/GradientButton";

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
        setDiscounts(data.discounts || []);
        console.log("🎟️ [BOOKING] Available discounts:", data.discounts);
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

    // Apply discount and calculate final price
    const finalTotal = calculateDiscount(total);
    setFinalPrice(finalTotal);

    setShowParticipantForm(false);
    setShowSummary(true);
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
        Alert.alert("Booking failed", bookingData.error || "Unknown error");
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
        Alert.alert("Payment error", order.error || "Failed to create order");
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
        theme: { color: Colors.dark.primary },
      };

      setPendingRazorpayOptions({ ...options, bookingData });
      setShowSummary(false);
      setProcessing(false);
    } catch (err: any) {
      setProcessing(false);
      Alert.alert("Error", err.message || "Something went wrong. Please try again.");
    }
  };

  const totalTickets = getTotalTickets();
  const totalPrice = getTotalPrice();

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator color={Colors.dark.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
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
        <View style={styles.modalContainer}>
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
              placeholderTextColor="#666"
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
        </View>
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

                let RazorpayCheckout: any;
                try {
                  RazorpayCheckout = require("react-native-razorpay").default;
                } catch (importError: any) {
                  Alert.alert(
                    "Payment Error", 
                    "Payment gateway not available.",
                    [{ text: "OK", onPress: () => setProcessing(false) }]
                  );
                  return;
                }

                if (!RazorpayCheckout || typeof RazorpayCheckout.open !== 'function') {
                  Alert.alert("Payment Error", "Payment gateway not available.");
                  setProcessing(false);
                  return;
                }

                const currentBookingId = storedBookingData.booking_id;

                RazorpayCheckout.open(options)
                  .then(async (response: any) => {
                    if (!response || !response.razorpay_payment_id) {
                      setProcessing(false);
                      Alert.alert("Payment Error", "Invalid payment response.");
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
                        Alert.alert(
                          "Payment verification failed", 
                          verified.error || "Unable to verify payment.",
                          [{ text: "OK", onPress: () => router.back() }]
                        );
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
                      Alert.alert(
                        "Verification Error",
                        "Payment successful but verification failed.",
                        [
                          { 
                            text: "OK", 
                            onPress: () => router.replace(`/payment/success?booking_id=${currentBookingId}&amount=${finalPrice}`)
                          }
                        ]
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
                      Alert.alert(
                        "Payment cancelled", 
                        "Your booking is still pending.",
                        [{ text: "OK", onPress: () => router.back() }]
                      );
                    } else {
                      Alert.alert(
                        "Payment error", 
                        error?.description || error?.message || "Payment could not be completed.",
                        [
                          { text: "Retry", onPress: () => handleCheckout() },
                          { text: "Cancel", style: "cancel", onPress: () => router.back() }
                        ]
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
                      <Text style={[styles.breakdownLabel, { color: Colors.dark.success }]}>
                        Discount Applied
                      </Text>
                      <Text style={[styles.breakdownLabel, { fontSize: 11, marginTop: 2 }]}>
                        {appliedDiscount.name}
                      </Text>
                    </View>
                    <Text style={[styles.breakdownAmount, { color: Colors.dark.success }]}>
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
                <Text style={styles.discountsSectionTitle}>Discounts</Text>
                {discounts.map((discount) => {
                  const isApplicable = isDiscountApplicable(discount, subtotal);
                  const isApplied = appliedDiscount?.id === discount.id;

                  return (
                    <View
                      key={discount.id}
                      style={[styles.discountRow, !isApplicable && styles.discountRowDisabled]}
                    >
                      <View style={styles.discountRowLeft}>
                        <Text style={[styles.discountName, !isApplicable && styles.discountNameDisabled]}>
                          {discount.name}
                          {isApplied && " · Applied"}
                        </Text>
                        {discount.description && (
                          <Text style={[styles.discountDesc, !isApplicable && styles.discountDescDisabled]}>
                            {discount.description}
                          </Text>
                        )}
                        {isApplicable ? (
                          <Text style={styles.discountSavings}>{getDiscountDisplayValue(discount, subtotal)}</Text>
                        ) : (
                          <Text style={styles.discountMin}>Min ₹{discount.min_purchase}</Text>
                        )}
                      </View>
                      <Text style={[styles.discountBadge, !isApplicable && styles.discountBadgeDisabled]}>
                        {discount.discount_type === "percentage"
                          ? `${discount.discount_value}%`
                          : `₹${discount.discount_value}`}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            <GradientButton
              style={styles.checkoutBtn}
              textStyle={styles.checkoutBtnText}
              onPress={handleCheckout}
              disabled={processing}
              loading={processing}
            >
              Checkout
            </GradientButton>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  scrollView: { padding: 20, paddingTop: 60 },
  backBtn: { marginBottom: 12 },
  backText: { color: Colors.dark.text, fontSize: 22 },
  title: { color: Colors.dark.text, fontSize: 22, fontWeight: "700" },
  subtitle: { color: Colors.dark.textSecondary, marginBottom: 16 },
  discountLine: {
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  discountLineText: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
  },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  sectionTitle: { color: Colors.dark.text, fontSize: 16, fontWeight: "600" },
  availabilityText: { color: Colors.dark.textSecondary, fontSize: 13 },
  ticketCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  ticketTitle: { color: Colors.dark.text, fontSize: 15 },
  ticketPrice: { color: Colors.dark.text, marginTop: 4, fontSize: 15, fontWeight: "600" },
  ticketSubPrice: { color: Colors.dark.textSecondary, marginTop: 2, fontSize: 12 },
  quantityControls: { flexDirection: "row", alignItems: "center", gap: 14 },
  quantityBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: Colors.dark.border,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityBtnText: { fontSize: 18, fontWeight: "600", color: Colors.dark.text },
  quantityText: { color: Colors.dark.text, fontSize: 16 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: Colors.dark.surface,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  footerTickets: { color: Colors.dark.textSecondary, fontSize: 13 },
  footerPrice: { color: Colors.dark.text, fontSize: 20, fontWeight: "600" },
  proceedBtn: { minWidth: 120 },
  proceedBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  modalClose: { color: Colors.dark.primary, fontSize: 15 },
  modalTitle: { color: Colors.dark.text, fontSize: 16, fontWeight: "600" },
  modalContent: { flex: 1, padding: 20 },
  inputLabel: {
    color: Colors.dark.text,
    fontSize: 13,
    fontWeight: "500",
    marginTop: 18,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 8,
    padding: 14,
    color: Colors.dark.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.dark.border,
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
    backgroundColor: Colors.dark.surface,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  genderBtnActive: {
    borderColor: Colors.dark.primary,
    backgroundColor: Colors.dark.card,
  },
  genderBtnText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
  genderBtnTextActive: {
    color: Colors.dark.primary,
  },
  nextBtn: { marginTop: 28 },
  nextBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  summarySectionTitle: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 10,
  },
  participantCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  participantName: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: "600",
  },
  participantDetails: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  priceSummary: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 10,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  breakdownLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
  },
  breakdownAmount: {
    color: Colors.dark.text,
    fontSize: 13,
    fontWeight: "600",
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginVertical: 10,
  },
  breakdownTotalLabel: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: "600",
  },
  finalPriceText: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: "700",
  },
  savingsText: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    marginTop: 10,
  },
  discountsSection: {
    marginTop: 24,
    marginBottom: 16,
  },
  discountsSectionTitle: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 12,
  },
  discountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  discountRowDisabled: {
    opacity: 0.5,
  },
  discountRowLeft: {
    flex: 1,
    marginRight: 12,
  },
  discountName: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: "600",
  },
  discountNameDisabled: {
    color: Colors.dark.textSecondary,
  },
  discountDesc: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  discountDescDisabled: {
    color: Colors.dark.textTertiary,
  },
  discountSavings: {
    color: Colors.dark.success,
    fontSize: 12,
    marginTop: 4,
    fontWeight: "500",
  },
  discountMin: {
    color: Colors.dark.textTertiary,
    fontSize: 12,
    marginTop: 4,
  },
  discountBadge: {
    color: Colors.dark.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  discountBadgeDisabled: {
    color: Colors.dark.textTertiary,
  },
  checkoutBtn: { marginTop: 24, marginBottom: 16 },
  checkoutBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});