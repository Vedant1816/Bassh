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
import { withAuthHeaders, authFetch } from "@/_services/auth-fetch";
import { API_BASE_URL, fetchWithFallback } from "@/_services/api-config";

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
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [priceBreakdown, setPriceBreakdown] = useState<Array<{ label: string; amount: number; count?: number }>>([]);
  const [pendingRazorpayOptions, setPendingRazorpayOptions] = useState<any>(null);

  /* ---------------- LOAD EVENT + PRICING ---------------- */

  useEffect(() => {
    if (!id) return;

    (async () => {
      const res = await fetch(
        `${API_BASE_URL}/api/bookings/event/${id}`,
        await withAuthHeaders({ method: "GET" })
      );

      const data = await res.json();

      if (res.ok) {
        setEvent(data.event);
        setPricing(data.pricing || []);
        setAvailableTickets(data.event?.available_tickets || 0);
      }

      setLoading(false);
    })();
  }, [id]);

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

    // Determine participant count based on ticket types
    let participantCount = 0;
    selections.forEach((sel) => {
      const isCouple = sel.label.toLowerCase().includes("couple");
      if (isCouple) {
        participantCount += sel.quantity * 2; // Each couple ticket = 2 participants
      } else {
        participantCount += sel.quantity; // Each regular ticket = 1 participant
      }
    });

    // Initialize participants array
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
    
    // Validation
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
      // All participants filled, calculate final price and show summary
      calculateFinalPrice();
    }
  };

  const calculateFinalPrice = async () => {
    let total = 0;
    let participantIdx = 0;
    const regularParticipants: Participant[] = [];
    const stagParticipants: Participant[] = [];
    const breakdown: Array<{ label: string; amount: number; count?: number }> = [];

    // First pass: Handle explicit couple tickets and stag tickets
    selections.forEach((sel) => {
      const labelLower = sel.label.toLowerCase();
      const isCoupleTicket = labelLower.includes("couple");
      const isStagTicket = labelLower.includes("stag");
      
      if (isCoupleTicket) {
        // Couple ticket: 2 participants = 1 couple_price
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
        // Explicit stag tickets: collect participants for stag pricing
        for (let i = 0; i < sel.quantity; i++) {
          if (participantIdx < participants.length) {
            stagParticipants.push(participants[participantIdx]);
            participantIdx++;
          }
        }
      } else {
        // Regular tickets: collect participants for pairing logic
        for (let i = 0; i < sel.quantity; i++) {
          if (participantIdx < participants.length) {
            regularParticipants.push(participants[participantIdx]);
            participantIdx++;
          }
        }
      }
    });

    // Handle explicit stag ticket participants
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

    // Handle regular ticket participants with pairing logic
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

      // Get pricing info from first regular ticket selection
      const regularTicket = Array.from(selections.values()).find(
        (s) => !s.label.toLowerCase().includes("couple") && !s.label.toLowerCase().includes("stag")
      );

      if (regularTicket) {
        // Pair up females with males
        const pairsCount = Math.min(females.length, males.length);
        
        // Each pair uses couple_price (if available, else regular price)
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

        // Remaining males use stag_price (if available, else regular price)
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

        // Remaining females use regular price
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

        // Others use regular price
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
        // Fallback: use first selection pricing
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
    setFinalPrice(total);
    setShowParticipantForm(false);
    setShowSummary(true);
  };

  const handleCheckout = async () => {
    console.log("🔄 [FRONTEND] handleCheckout called");
    console.log("🔄 [FRONTEND] Event ID:", id);
    console.log("🔄 [FRONTEND] Final price:", finalPrice);
    console.log("🔄 [FRONTEND] Participants:", participants.length);
    
    // Validation
    if (!id) {
      console.error("❌ [FRONTEND] Missing event ID");
      Alert.alert("Error", "Event ID is missing");
      return;
    }
    
    if (finalPrice <= 0) {
      console.error("❌ [FRONTEND] Invalid price:", finalPrice);
      Alert.alert("Error", "Invalid price. Please check your selections.");
      return;
    }
    
    if (!participants || participants.length === 0) {
      console.error("❌ [FRONTEND] No participants");
      Alert.alert("Error", "Please add at least one participant.");
      return;
    }
    
    // Validate all participants have required fields
    const invalidParticipants = participants.filter(
      (p) => !p.name || !p.gender || !p.age
    );
    if (invalidParticipants.length > 0) {
      console.error("❌ [FRONTEND] Invalid participants:", invalidParticipants);
      Alert.alert("Error", "Please fill in all required participant details.");
      return;
    }
    
    try {
      setProcessing(true);
      console.log("✅ [FRONTEND] Validation passed, starting checkout...");
  
      // 1️⃣ CREATE BOOKING
      console.log("📝 [FRONTEND] Creating booking...");
      const bookingRes = await fetchWithFallback(
        `/api/bookings/create`,
        await withAuthHeaders({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_id: id,
            total_amount: finalPrice,
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
      console.log("📝 [FRONTEND] Booking response:", bookingData);
  
      if (!bookingRes.ok) {
        console.error("❌ [FRONTEND] Booking creation failed:", bookingData);
        setProcessing(false);
        Alert.alert("Booking failed", bookingData.error || "Unknown error");
        return;
      }
  
      // 2️⃣ CREATE RAZORPAY ORDER
      console.log("💳 [FRONTEND] Creating Razorpay order...");
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
      console.log("💳 [FRONTEND] Order response:", order);
  
      if (!orderRes.ok) {
        console.error("❌ [FRONTEND] Order creation failed:", order);
        setProcessing(false);
        Alert.alert("Payment error", order.error || "Failed to create order");
        return;
      }
  
      // 3️⃣ OPEN RAZORPAY (NATIVE)
      const options = {
        key: order.key,
        order_id: order.order_id,
        amount: order.amount || finalPrice * 100, // Use order amount (in paise)
        currency: "INR",
        name: event?.name || "Event Booking",
        description: "Event Ticket Payment",
        prefill: {
          email: "test@example.com",
          contact: "9999999999",
        },
        theme: { color: "#EC4899" },
      };

      console.log("💳 [FRONTEND] Opening Razorpay with options:", {
        order_id: options.order_id,
        amount: options.amount,
      });

      // Store options and booking data, then close modal
      // Razorpay will open in the Modal's onDismiss callback
      console.log("💳 [FRONTEND] Storing Razorpay options, closing modal...");
      setPendingRazorpayOptions({ ...options, bookingData }); // Store both options and booking data
      setShowSummary(false);
      setProcessing(false); // Reset processing to allow UI to update
      // Don't open Razorpay here - wait for modal onDismiss callback
    } catch (err: any) {
      console.error("❌ [FRONTEND] handleCheckout error:", err);
      console.error("❌ [FRONTEND] Error stack:", err.stack);
      setProcessing(false);
      Alert.alert("Error", err.message || "Something went wrong. Please try again.");
    }
  };

  const totalTickets = getTotalTickets();
  const totalPrice = getTotalPrice();

  /* ---------------- UI ---------------- */

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>

        <Text style={styles.title}>{event?.name}</Text>
        <Text style={styles.subtitle}>
          {event?.event_date} · {event?.start_time || "6 PM onwards"}
        </Text>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Choose tickets</Text>
          <Text style={styles.availabilityText}>
            {availableTickets} available
          </Text>
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
          <Pressable
            style={styles.proceedBtn}
            onPress={handleProceedToPayment}
            disabled={processing}
          >
            <Text style={styles.proceedBtnText}>Proceed to payment</Text>
          </Pressable>
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

            <Pressable style={styles.nextBtn} onPress={handleNextParticipant}>
              <Text style={styles.nextBtnText}>
                {currentParticipantIndex < participants.length - 1
                  ? "Next"
                  : "Calculate Price"}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* SUMMARY MODAL */}
      <Modal
        visible={showSummary}
        animationType="slide"
        presentationStyle="pageSheet"
        onDismiss={() => {
          console.log("✅ [FRONTEND] Summary modal fully dismissed");
          // Open Razorpay after modal is fully dismissed
          if (pendingRazorpayOptions) {
            console.log("💳 [FRONTEND] Opening Razorpay checkout after modal dismissal...");
            const { bookingData: storedBookingData, ...options } = pendingRazorpayOptions;
            setPendingRazorpayOptions(null); // Clear pending options
            
            // Wait for all interactions and animations to complete
            InteractionManager.runAfterInteractions(() => {
                        // Additional delay to ensure view hierarchy is fully ready
                        setTimeout(async () => {
                          setProcessing(true); // Show loading during payment

                          // Dynamically import Razorpay to avoid crash on app load
                          let RazorpayCheckout: any;
                          try {
                            // @ts-ignore - react-native-razorpay doesn't have types
                            RazorpayCheckout = require("react-native-razorpay").default;
                          } catch (importError: any) {
                            console.error("❌ [FRONTEND] Failed to load Razorpay module:", importError);
                            Alert.alert(
                              "Payment Error", 
                              "Payment gateway not available. Please rebuild the app or contact support.",
                              [{ text: "OK", onPress: () => setProcessing(false) }]
                            );
                            return;
                          }

                          // Validate Razorpay SDK is available
                          if (!RazorpayCheckout || typeof RazorpayCheckout.open !== 'function') {
                            console.error("❌ [FRONTEND] RazorpayCheckout is not available");
                            Alert.alert("Payment Error", "Payment gateway not available. Please try again.");
                            setProcessing(false);
                            return;
                          }

                          console.log("💳 [FRONTEND] Calling RazorpayCheckout.open()...");
                          console.log("💳 [FRONTEND] View hierarchy should be ready now");

                          // Get booking data from stored options
                          const currentBookingId = storedBookingData.booking_id;

                          RazorpayCheckout.open(options)
                  .then(async (response: any) => {
                    console.log("✅ [FRONTEND] Payment successful callback triggered!");
                    console.log("✅ [FRONTEND] Response:", response);
                    
                    if (!response || !response.razorpay_payment_id) {
                      console.error("❌ [FRONTEND] Invalid payment response");
                      setProcessing(false);
                      Alert.alert("Payment Error", "Invalid payment response. Please contact support.");
                      return;
                    }
                    
                    // 4️⃣ VERIFY PAYMENT
                    console.log("🔐 [FRONTEND] Verifying payment...");
                    setProcessing(true); // Keep loading during verification
                    
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
                      console.log("🔐 [FRONTEND] Verification response:", verified);

                      if (!verifyRes.ok) {
                        console.error("❌ [FRONTEND] Verification failed:", verified);
                        setProcessing(false);
                        Alert.alert(
                          "Payment verification failed", 
                          verified.error || "Unable to verify payment. Please contact support.",
                          [
                            { text: "OK", onPress: () => router.back() }
                          ]
                        );
                        return;
                      }

                      // Check for QR code (could be 'qr' or 'qr_code')
                      const qrCode = verified.qr || verified.qr_code;
                      
                      // If QR code is missing but payment was verified, still proceed
                      // (QR can be regenerated later)
                      if (!qrCode) {
                        console.warn("⚠️ [FRONTEND] QR code missing from response, but payment verified");
                        // Still proceed to success page - QR can be shown later
                      }

                      console.log("✅ [FRONTEND] Payment verified successfully!");
                      console.log("🎉 [FRONTEND] Navigating to success page...");
                      
                      // ✅ SUCCESS → GO TO SUCCESS SCREEN
                      setProcessing(false);
                      
                      // URL encode the QR code if it exists (it's a data URL, so encode it properly)
                      const qrParam = qrCode ? encodeURIComponent(qrCode) : "";
                      const bookingIdParam = currentBookingId;
                      
                      // Use replace to prevent going back to payment screen
                      if (qrCode) {
                        router.replace(`/payment/success?qr=${qrParam}&booking_id=${bookingIdParam}`);
                      } else {
                        // Navigate without QR - it can be fetched from booking later
                        router.replace(`/payment/success?booking_id=${bookingIdParam}`);
                      }
                    } catch (verifyError: any) {
                      console.error("❌ [FRONTEND] Verification error:", verifyError);
                      setProcessing(false);
                      Alert.alert(
                        "Verification Error",
                        "Payment was successful but verification failed. Please contact support with your booking ID.",
                        [
                          { 
                            text: "OK", 
                            onPress: () => router.replace(`/payment/success?booking_id=${currentBookingId}`)
                          }
                        ]
                      );
                    }
                  })
                  .catch((error: any) => {
                    console.error("❌ [FRONTEND] Razorpay error:", error);
                    console.error("❌ [FRONTEND] Error details:", JSON.stringify(error, null, 2));
                    
                    setProcessing(false);
                    
                    // Check if cancelled
                    const isCancelled = 
                      error?.description === "User closed the checkout form by pressing back button" ||
                      error?.code === "BAD_REQUEST_ERROR" ||
                      (error?.description && error.description.toLowerCase().includes("cancelled"));

                    if (isCancelled) {
                      Alert.alert(
                        "Payment cancelled", 
                        "Your booking is still pending. You can complete the payment later.",
                        [
                          { text: "OK", onPress: () => router.back() }
                        ]
                      );
                    } else {
                      Alert.alert(
                        "Payment error", 
                        error?.description || error?.message || "Payment could not be completed. Please try again.",
                        [
                          { text: "Retry", onPress: () => handleCheckout() },
                          { text: "Cancel", style: "cancel", onPress: () => router.back() }
                        ]
                      );
                    }
                  });
              }, 500); // Additional delay after interactions complete
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
              <View style={styles.breakdownDivider} />
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownTotalLabel}>Total</Text>
                <Text style={styles.finalPrice}>₹{finalPrice}</Text>
              </View>
            </View>

            <Pressable
              style={[styles.checkoutBtn, processing && styles.checkoutBtnDisabled]}
              onPress={() => {
                console.log("🔘 [FRONTEND] Checkout button pressed");
                console.log("🔘 [FRONTEND] Processing state:", processing);
                console.log("🔘 [FRONTEND] Final price:", finalPrice);
                console.log("🔘 [FRONTEND] Participants:", participants);
                if (!processing) {
                  handleCheckout();
                } else {
                  console.log("⚠️ [FRONTEND] Checkout already in progress, ignoring press");
                }
              }}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.checkoutBtnText}>Checkout</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  scrollView: { padding: 20, paddingTop: 60 },
  backBtn: { marginBottom: 12 },
  backText: { color: "#fff", fontSize: 22 },
  title: { color: "#fff", fontSize: 22, fontWeight: "700" },
  subtitle: { color: "#9ca3af", marginBottom: 32 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  availabilityText: { color: "#9ca3af" },
  ticketCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ticketTitle: { color: "#fff", fontSize: 16 },
  ticketPrice: { color: "#fff", marginTop: 6, fontSize: 16, fontWeight: "600" },
  ticketSubPrice: { color: "#9ca3af", marginTop: 4, fontSize: 12 },
  quantityControls: { flexDirection: "row", alignItems: "center", gap: 16 },
  quantityBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  quantityBtnText: { fontSize: 20, fontWeight: "700", color: "#000" },
  quantityText: { color: "#fff", fontSize: 18 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: "#0f0f0f",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerTickets: { color: "#9ca3af" },
  footerPrice: { color: "#fff", fontSize: 24, fontWeight: "700" },
  proceedBtn: {
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  proceedBtnText: { color: "#000", fontWeight: "700" },
  modalContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  modalClose: { color: "#a855f7", fontSize: 16 },
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  modalContent: { flex: 1, padding: 20 },
  inputLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    color: "#fff",
    fontSize: 16,
  },
  genderRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  genderBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  genderBtnActive: {
    borderColor: "#a855f7",
    backgroundColor: "#2a1a3a",
  },
  genderBtnText: {
    color: "#9ca3af",
    fontSize: 14,
    fontWeight: "600",
  },
  genderBtnTextActive: {
    color: "#a855f7",
  },
  nextBtn: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 32,
  },
  nextBtnText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },
  summarySectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 12,
  },
  participantCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  participantName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  participantDetails: {
    color: "#9ca3af",
    fontSize: 14,
    marginTop: 4,
  },
  priceSummary: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 20,
    marginTop: 24,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  breakdownLabel: {
    color: "#9ca3af",
    fontSize: 14,
  },
  breakdownAmount: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: "#333",
    marginVertical: 12,
  },
  breakdownTotalLabel: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  finalPrice: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
  },
  checkoutBtn: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 32,
  },
  checkoutBtnDisabled: {
    opacity: 0.6,
  },
  checkoutBtnText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },
});
