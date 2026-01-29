import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  Linking,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  InteractionManager,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { fetchWithFallback } from "@/_services/api-config";
import { Colors } from "@/constants/Colors";
import { GradientButton } from "@/components/ui/GradientButton";

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

export default function ClubProfile() {
  const params = useLocalSearchParams<{ clubId?: string; clubid?: string }>();
  const clubId = params.clubId ?? params.clubid;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [club, setClub] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [activeTab, setActiveTab] = useState<"offers" | "menu" | "ask" | "gallery">("offers");
  const [loading, setLoading] = useState(true);

  // Table booking states
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [numberOfGuests, setNumberOfGuests] = useState<number>(1);
  const [showParticipantForm, setShowParticipantForm] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentParticipantIndex, setCurrentParticipantIndex] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [finalPrice, setFinalPrice] = useState(0);
  const [priceBreakdown, setPriceBreakdown] = useState<Array<{ label: string; amount: number; count?: number }>>([]);
  const [processing, setProcessing] = useState(false);
  const [pendingRazorpayOptions, setPendingRazorpayOptions] = useState<any>(null);

  // Pay Bill states
  const [showPayBillModal, setShowPayBillModal] = useState(false);
  const [billAmount, setBillAmount] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [applicableDiscounts, setApplicableDiscounts] = useState<Discount[]>([]);
  const [billDiscounts, setBillDiscounts] = useState<Discount[]>([]);
  const [appliedBillDiscount, setAppliedBillDiscount] = useState<Discount | null>(null);
  // Table booking summary: one selected offer (select/deselect)
  const [appliedTableDiscount, setAppliedTableDiscount] = useState<Discount | null>(null);

  useEffect(() => {
    if (!clubId) return;
    (async () => {
      const res = await fetchWithFallback(
        `/api/clubs/${clubId}`,
        await withAuthHeaders({ method: "GET" })
      );
      const data = await res.json();
      setClub(data.club);
      setEvents(data.events || []);

      // Use discounts from clubs API (single request); fallback to dedicated API if missing
      const fromClub = Array.isArray(data.discounts) ? data.discounts : [];
      if (fromClub.length > 0) {
        setDiscounts(fromClub);
      } else {
        const discountRes = await fetchWithFallback(
          `/api/discounts/club?club_id=${encodeURIComponent(clubId)}`,
          await withAuthHeaders({ method: "GET" })
        );
        const discountData = await discountRes.json().catch(() => ({}));
        const rawDiscounts = discountRes.ok
          ? (discountData.discounts ?? discountData.data ?? [])
          : [];
        setDiscounts(Array.isArray(rawDiscounts) ? rawDiscounts : []);
      }

      setLoading(false);
    })();
  }, [clubId]);

  const formatEventDate = (d: string | undefined) => {
    if (!d) return "Date TBA";
    try {
      const date = new Date(d);
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
    } catch {
      return d;
    }
  };

  const openDirections = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${club.latitude},${club.longitude}`;
    Linking.openURL(url);
  };

  /* ================= PAY BILL LOGIC ================= */

  const handlePayBill = async () => {
    setBillAmount("");
    setApplicableDiscounts([]);
    setAppliedBillDiscount(null);
    setShowPayBillModal(true);
    if (!clubId) return;
    try {
      const res = await fetchWithFallback(
        `/api/discounts/on_bill?club_id=${encodeURIComponent(clubId)}`,
        await withAuthHeaders({ method: "GET" })
      );
      const data = await res.json().catch(() => ({}));
      const raw = res.ok ? (data.discounts ?? data.data ?? []) : [];
      setBillDiscounts(Array.isArray(raw) ? raw : []);
      if (!res.ok) {
        console.warn("[CLUB] Bill discounts fetch failed:", res.status, data?.error ?? data);
      }
    } catch (e) {
      console.warn("[CLUB] Bill discounts fetch error:", e);
      setBillDiscounts([]);
    }
  };

  const formatCurrency = (amount: string) => {
    const cleaned = amount.replace(/[^\d.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    return cleaned;
  };

  const handleBillAmountChange = (text: string) => {
    const formatted = formatCurrency(text);
    setBillAmount(formatted);

    const amount = parseFloat(formatted) || 0;
    if (amount > 0) {
      const minPurchase = (d: Discount) => Number(d.min_purchase ?? 0);
      const applicable = billDiscounts.filter(d => amount >= minPurchase(d));
      setApplicableDiscounts(applicable);
      // Clear applied discount if it no longer meets min_purchase
      setAppliedBillDiscount(prev => {
        if (!prev) return null;
        return amount >= minPurchase(prev) ? prev : null;
      });
    } else {
      setApplicableDiscounts([]);
      setAppliedBillDiscount(null);
    }
  };

  /** Discount value in rupees for a given subtotal (for calculation). */
  const getBillDiscountAmount = (discount: Discount | null, subtotal: number): number => {
    if (!discount || subtotal <= 0) return 0;
    const val = Number(discount.discount_value);
    const max = discount.max_discount != null ? Number(discount.max_discount) : null;
    if (discount.discount_type === "percentage") {
      let value = subtotal * (val / 100);
      if (max != null && value > max) value = max;
      return Math.round(value * 100) / 100;
    }
    return val;
  };

  const getDiscountDisplayValue = (discount: Discount, amount: number): string => {
    const value = getBillDiscountAmount(discount, amount);
    return `Save ₹${value.toFixed(value >= 1 ? 0 : 2)}`;
  };

  const handleProceedBillPayment = async () => {
    const subtotal = parseFloat(billAmount);
    
    if (!subtotal || subtotal <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    if (subtotal < 1) {
      Alert.alert("Error", "Amount must be at least ₹1");
      return;
    }

    const discountAmount = getBillDiscountAmount(appliedBillDiscount, subtotal);
    const finalAmount = Math.max(0.01, subtotal - discountAmount);

    try {
      setProcessingPayment(true);

      console.log("💳 [FRONTEND] Creating bill payment...", {
        subtotal,
        discountAmount,
        finalAmount,
        appliedDiscount: appliedBillDiscount?.name,
      });

      // Create bill payment transaction record (amount = final amount after discount)
      const billRes = await fetchWithFallback(
        `/api/payments/bill/create`,
        await withAuthHeaders({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            club_id: clubId,
            amount: finalAmount,
          }),
        })
      );

      const billData = await billRes.json();
      console.log("💳 [FRONTEND] Bill payment response:", billData);

      if (!billRes.ok) {
        setProcessingPayment(false);
        const errorMsg = billData.error || "Failed to create bill payment";
        console.error("❌ [FRONTEND] Bill payment creation failed:", errorMsg);
        Alert.alert("Error", errorMsg);
        return;
      }

      console.log("💳 [FRONTEND] Creating Razorpay order...");

      // Create Razorpay order with final amount (after discount)
      const orderRes = await fetchWithFallback(
        `/api/payments/checkout/create-order`,
        await withAuthHeaders({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transaction_id: billData.transaction_id,
            amount: finalAmount,
          }),
        })
      );

      const order = await orderRes.json();
      console.log("💳 [FRONTEND] Razorpay order response:", order);

      if (!orderRes.ok) {
        setProcessingPayment(false);
        const errorMsg = order.error || "Failed to create order";
        console.error("❌ [FRONTEND] Order creation failed:", errorMsg);
        Alert.alert("Error", errorMsg);
        return;
      }

      const options = {
        key: order.key,
        order_id: order.order_id,
        amount: order.amount || finalAmount * 100,
        currency: "INR",
        name: club?.club_name || "Bill Payment",
        description: "Restaurant Bill Payment",
        prefill: {
          email: "test@example.com",
          contact: "9999999999",
        },
        theme: { color: Colors.dark.primary },
      };

      console.log("✅ [FRONTEND] Ready to open Razorpay");
      setProcessingPayment(false);

      // No checkout page: close modal then open Razorpay for discounted amount directly
      setShowPayBillModal(false);

      InteractionManager.runAfterInteractions(() => {
        setTimeout(() => {
          console.log("💳 [FRONTEND] Opening Razorpay...");
          let RazorpayCheckout: any;
          try {
            RazorpayCheckout = require("react-native-razorpay").default;
          } catch (importError: any) {
            console.error("❌ [FRONTEND] Razorpay import failed");
            Alert.alert("Error", "Payment gateway not available");
            return;
          }

          if (!RazorpayCheckout || typeof RazorpayCheckout.open !== 'function') {
            console.error("❌ [FRONTEND] Razorpay.open not available");
            Alert.alert("Error", "Payment gateway not available");
            return;
          }

          RazorpayCheckout.open(options)
            .then(async (response: any) => {
              console.log("✅ [FRONTEND] Payment successful:", response);
              if (!response || !response.razorpay_payment_id) {
                Alert.alert("Error", "Invalid payment response");
                return;
              }

              try {
                console.log("💳 [FRONTEND] Verifying payment...");
                const verifyRes = await fetchWithFallback(
                  `/api/payments/bill/verify`,
                  await withAuthHeaders({
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      transaction_id: billData.transaction_id,
                      razorpay_payment_id: response.razorpay_payment_id,
                      razorpay_order_id: response.razorpay_order_id,
                      razorpay_signature: response.razorpay_signature,
                    }),
                  })
                );

                const verified = await verifyRes.json();
                console.log("✅ [FRONTEND] Verification response:", verified);

                if (!verifyRes.ok) {
                  console.error("❌ [FRONTEND] Verification failed:", verified.error);
                  Alert.alert("Error", verified.error || "Payment verification failed");
                  return;
                }

                console.log("✅ [FRONTEND] Payment verified successfully");
                Alert.alert(
                  "Success",
                  `Payment of ₹${finalAmount.toFixed(2)} completed successfully!`,
                  [
                    {
                      text: "OK",
                      onPress: () => {
                        // Could redirect to payment history or stay on page
                      }
                    }
                  ]
                );
              } catch (verifyError: any) {
                console.error("❌ [FRONTEND] Verification error:", verifyError);
                Alert.alert("Error", verifyError?.message || "Payment verification failed");
              }
            })
            .catch((error: any) => {
              console.error("❌ [FRONTEND] Razorpay error:", error);
              const isCancelled = 
                error?.description === "User closed the checkout form by pressing back button" ||
                error?.code === "BAD_REQUEST_ERROR" ||
                (error?.description && error.description.toLowerCase().includes("cancelled"));

              if (!isCancelled) {
                Alert.alert("Payment Failed", error?.description || error?.message || "Payment could not be completed");
              } else {
                console.log("ℹ️ [FRONTEND] Payment cancelled by user");
              }
            });
        }, 600); // Increased delay to ensure modal is fully closed
      });
    } catch (err: any) {
      setProcessingPayment(false);
      console.error("❌ [FRONTEND] Bill payment error:", err);
      Alert.alert("Error", err.message || "Something went wrong");
    }
  };

  /* ================= TABLE BOOKING LOGIC ================= */

  const handleBookTable = () => {
    setSelectedDate(new Date());
    setNumberOfGuests(1);
    setShowBookingModal(true);
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
    setShowBookingModal(false);
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
      if (gender === "male") {
        males.push(p);
      } else if (gender === "female") {
        females.push(p);
      } else {
        others.push(p);
      }
    });

    const pairsCount = Math.min(females.length, males.length);
    
    if (pairsCount > 0) {
      const couplePrice = prices.couple;
      const pairTotal = couplePrice * pairsCount;
      total += pairTotal;
      breakdown.push({
        label: `Couple Entry${pairsCount > 1 ? "s" : ""} (${pairsCount})`,
        amount: pairTotal,
        count: pairsCount,
      });
    }

    const remainingMales = males.length - pairsCount;
    if (remainingMales > 0) {
      const malePrice = prices.male;
      const maleTotal = malePrice * remainingMales;
      total += maleTotal;
      breakdown.push({
        label: `Male Entry${remainingMales > 1 ? "s" : ""} (${remainingMales})`,
        amount: maleTotal,
        count: remainingMales,
      });
    }

    const remainingFemales = females.length - pairsCount;
    if (remainingFemales > 0) {
      const femalePrice = prices.female;
      const femaleTotal = femalePrice * remainingFemales;
      total += femaleTotal;
      breakdown.push({
        label: `Female Entry${remainingFemales > 1 ? "s" : ""} (${remainingFemales})`,
        amount: femaleTotal,
        count: remainingFemales,
      });
    }

    if (others.length > 0) {
      const otherPrice = prices.male;
      const otherTotal = otherPrice * others.length;
      total += otherTotal;
      breakdown.push({
        label: `Entry${others.length > 1 ? "s" : ""} (${others.length})`,
        amount: otherTotal,
        count: others.length,
      });
    }

    setPriceBreakdown(breakdown);
    setFinalPrice(total);
    setAppliedTableDiscount(null);
    setShowParticipantForm(false);
    setShowSummary(true);
  };

  const getTableDiscountAmount = (discount: Discount | null, subtotal: number): number =>
    getBillDiscountAmount(discount, subtotal);
  const tableAmountToPay = finalPrice - getTableDiscountAmount(appliedTableDiscount, finalPrice);

  const handleCheckout = async () => {
    const amountToPay = Math.max(0.01, tableAmountToPay);
    if (!clubId || amountToPay <= 0 || !participants || participants.length === 0) {
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
        `/api/bookings/table/create`,
        await withAuthHeaders({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            club_id: clubId,
            booking_date: selectedDate.toISOString().split('T')[0],
            total_amount: amountToPay,
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
        router.replace(`/payment/failure?error_message=${encodeURIComponent(errorMsg)}&amount=${amountToPay}&club_id=${clubId}`);
        return;
      }
  
      const orderRes = await fetchWithFallback(
        `/api/payments/checkout/create-order`,
        await withAuthHeaders({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            booking_id: bookingData.booking_id,
            amount: amountToPay,
          }),
        })
      );
  
      const order = await orderRes.json();
  
      if (!orderRes.ok) {
        setProcessing(false);
        const errorMsg = order.error || "Failed to create order";
        router.replace(`/payment/failure?error_message=${encodeURIComponent(errorMsg)}&amount=${amountToPay}&booking_id=${bookingData.booking_id}&club_id=${clubId}`);
        return;
      }
  
      const options = {
        key: order.key,
        order_id: order.order_id,
        amount: order.amount || amountToPay * 100,
        currency: "INR",
        name: club?.club_name || "Table Booking",
        description: "Table Booking Payment",
        prefill: {
          email: "test@example.com",
          contact: "9999999999",
        },
        theme: { color: Colors.dark.primary },
      };

      setPendingRazorpayOptions({ ...options, bookingData, amountPaid: amountToPay });
      setShowSummary(false);
      setProcessing(false);
    } catch (err: any) {
      setProcessing(false);
      const errorMsg = err.message || "Something went wrong. Please try again.";
      router.replace(`/payment/failure?error_message=${encodeURIComponent(errorMsg)}&amount=${tableAmountToPay}&club_id=${clubId}`);
    }
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

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator color={Colors.dark.primary} size="large" />
      </View>
    );
  }

  if (!club) return null;

  const dateOptions = generateDateOptions();
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <>
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="never"
        >
          {/* IMAGE / GALLERY */}
          <View>
            <Image
              source={{
                uri:
                  club.banner_image_url ||
                  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4",
              }}
              style={styles.banner}
            />
          </View>

          {/* CLUB INFO */}
          <View style={styles.infoBox}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{club.club_name}</Text>

              <View style={styles.ratingBox}>
                <Text style={styles.ratingText}>{club.rating?.toFixed(1) || "4.5"} ★</Text>
                <Text style={styles.reviewCount}>615</Text>
              </View>
            </View>

            <Text style={styles.subText}>
              {club.address_text}
            </Text>

            <Text style={styles.metaText}>
              {club.distance_km?.toFixed(1) || "4.6"} km · ₹1800 for two
            </Text>

            <Text style={styles.openText}>Open · 12:00 PM to 1:00 AM</Text>

            {/* ACTION BUTTONS */}
            <View style={styles.actionsRow}>
              <Pressable style={styles.actionBtn}>
                <Text style={styles.actionText}>✨ What's good here?</Text>
              </Pressable>

              <Pressable style={styles.actionBtn} onPress={openDirections}>
                <Text style={styles.actionText}>🧭 Directions</Text>
              </Pressable>
            </View>
          </View>

          {/* TABS */}
          <View style={styles.tabsRow}>
            {[
              { key: "offers", label: "Offers" },
              { key: "menu", label: "Menu" },
              { key: "ask", label: "Ask anything" },
              { key: "gallery", label: "Gallery" },
            ].map((t) => (
              <Pressable
                key={t.key}
                onPress={() => setActiveTab(t.key as any)}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === t.key && styles.activeTab,
                  ]}
                >
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* OFFERS + EVENTS */}
          {activeTab === "offers" && (
            <View style={styles.offersEventsWrapper}>
              {/* REAL DISCOUNTS FROM DATABASE */}
              {discounts.length > 0 && (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Available Offers</Text>
                    <Text style={styles.chevron}>▾</Text>
                  </View>

                  {discounts.map((discount) => (
                    <View key={discount.id} style={styles.discountCard}>
                      <View style={styles.discountLeft}>
                        <Text style={styles.discountValue}>
                          {discount.discount_type === "percentage"
                            ? `${discount.discount_value}%`
                            : `₹${discount.discount_value}`}
                        </Text>
                        <Text style={styles.discountOffText}>OFF</Text>
                      </View>
                      <View style={styles.discountDashed} />
                      <View style={styles.discountRight}>
                        <Text style={styles.discountName}>{discount.name}</Text>
                        {discount.description && (
                          <Text style={styles.discountDesc}>{discount.description}</Text>
                        )}
                        <Text style={styles.discountMin}>
                          Min purchase: ₹{discount.min_purchase}
                        </Text>
                        {discount.max_discount && (
                          <Text style={styles.discountMax}>
                            Max discount: ₹{discount.max_discount}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </>
              )}

              {/* EVENTS */}
              <View style={[styles.sectionHeader, { marginTop: 28 }]}>
                <Text style={styles.sectionTitle}>Upcoming Events</Text>
                <Text style={styles.chevron}>▾</Text>
              </View>

              {events.map((event) => (
                <Pressable
                  key={event.id}
                  style={styles.eventCard}
                  onPress={() => router.push(`/event/${event.id}`)}
                >
                  <View style={styles.eventImageWrap}>
                    <Image
                      source={{
                        uri:
                          event.banner_image_url ||
                          event.image_url ||
                          event.poster_url ||
                          club.banner_image_url ||
                          "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400",
                      }}
                      style={styles.eventImage}
                    />
                    <View style={styles.bookmark}>
                      <Text style={styles.bookmarkIcon}>🔖</Text>
                    </View>
                  </View>
                  <View style={styles.eventContent}>
                    <Text style={styles.eventTitle} numberOfLines={2}>
                      {event.name || event.event_name || "Event"}
                    </Text>
                    <Text style={styles.eventDateTime}>
                      {formatEventDate(event.event_date)} · {event.start_time || "7:00 PM"}
                    </Text>
                    <Text style={styles.eventVenue} numberOfLines={1}>
                      {club.address_text || "Venue to be announced"}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {/* Bottom spacing */}
          <View style={{ height: 120 }} />
        </ScrollView>

        {/* BOTTOM BUTTONS – equal rectangles, floating */}
        <View style={[styles.bottomButtonsContainer, { paddingBottom: Math.max(16, insets.bottom), paddingLeft: Math.max(16, insets.left), paddingRight: Math.max(16, insets.right) }]}>
          <View style={styles.bottomButtonWrapper}>
            <View style={styles.bookEntryBlur} />
            <Pressable style={styles.bookTableBtnTouchable} onPress={handleBookTable}>
              <Text style={styles.bookTableText} numberOfLines={1}>Book entry</Text>
            </Pressable>
          </View>
          <View style={styles.bottomButtonWrapper}>
            <View style={styles.payBillBtnInner}>
              <GradientButton
                style={styles.payBillBtn}
                textStyle={styles.payBillText}
                onPress={handlePayBill}
              >
                Pay bill
              </GradientButton>
            </View>
          </View>
        </View>
      </View>

      {/* PAY BILL MODAL */}
      <Modal
        visible={showPayBillModal}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <KeyboardAvoidingView 
            style={styles.payBillContainer}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={0}
          >
            <StatusBar barStyle="light-content" />
            {/* Header – safe area */}
            <View style={[styles.payBillHeader, { paddingTop: Math.max(16, insets.top) + 8 }]}>
              <Pressable onPress={() => setShowPayBillModal(false)} style={styles.backButton}>
                <Text style={styles.backButtonText}>←</Text>
              </Pressable>
              <View style={styles.payBillHeaderContent}>
                <Text style={styles.payBillTitle}>{club?.club_name || "Club"}</Text>
                <Text style={styles.payBillSubtitle}>{club?.address_text || "Location"}</Text>
              </View>
              <Pressable>
                <Text style={styles.chatIcon}>💬</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.payBillScroll}
              contentContainerStyle={styles.payBillScrollContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              {/* Distance Warning */}
              <View style={styles.warningBanner}>
                <Text style={styles.warningText}>
                  You're {club?.distance_km?.toFixed(1) || "10.3"} km away from this restaurant
                </Text>
                <Text style={styles.warningSubtext}>
                  Please ensure you're paying at the correct outlet
                </Text>
              </View>

              {/* Amount Input */}
              <View style={styles.amountSection}>
                <Text style={styles.amountLabel}>Enter your bill amount</Text>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.rupeeSymbol}>₹</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={billAmount}
                    onChangeText={handleBillAmountChange}
                    placeholder="0.00"
                    placeholderTextColor="#333"
                    keyboardType="decimal-pad"
                    autoFocus
                  />
                </View>
                {applicableDiscounts.length > 0 && (
                  <View style={styles.cashbackBanner}>
                    <Text style={styles.cashbackText}>
                      {applicableDiscounts.length} offer{applicableDiscounts.length > 1 ? "s" : ""} available
                    </Text>
                    <Text style={styles.cashbackArrow}>›</Text>
                  </View>
                )}
              </View>

              {/* Available Offers */}
              {applicableDiscounts.length > 0 && (
                <View style={styles.offersSection}>
                  <Text style={styles.offersSectionTitle}>Available Offers (tap to select/deselect)</Text>
                  {applicableDiscounts.map((discount) => {
                    const isApplied = String(appliedBillDiscount?.id) === String(discount.id);
                    return (
                      <Pressable
                        key={discount.id}
                        style={[styles.offerBox, isApplied && styles.offerBoxApplied]}
                        onPress={() => setAppliedBillDiscount(isApplied ? null : discount)}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      >
                        <View style={styles.offerBoxContent}>
                          <Text style={styles.offerBoxTitle}>{discount.name}</Text>
                          {discount.description ? (
                            <Text style={styles.offerBoxDesc}>{discount.description}</Text>
                          ) : null}
                          <Text style={styles.offerBoxSave}>
                            {getDiscountDisplayValue(discount, parseFloat(billAmount) || 0)}
                          </Text>
                        </View>
                        <Text style={[styles.offerBoxActionBadge, isApplied && styles.offerBoxAppliedBadge]}>
                          {isApplied ? "Deselect" : "Select"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {/* Amount to pay summary */}
              {billAmount && parseFloat(billAmount) > 0 && (
                <View style={styles.billSummaryBox}>
                  {appliedBillDiscount ? (
                    <>
                      <View style={styles.billSummaryRow}>
                        <Text style={styles.billSummaryLabel}>Bill amount</Text>
                        <Text style={styles.billSummaryValue}>₹{parseFloat(billAmount).toFixed(2)}</Text>
                      </View>
                      <View style={styles.billSummaryRow}>
                        <Text style={[styles.billSummaryLabel, styles.billSummaryDiscount]}>
                          Discount ({appliedBillDiscount.name})
                        </Text>
                        <Text style={[styles.billSummaryValue, styles.billSummaryDiscount]}>
                          -₹{getBillDiscountAmount(appliedBillDiscount, parseFloat(billAmount)).toFixed(2)}
                        </Text>
                      </View>
                    </>
                  ) : null}
                  <View style={[styles.billSummaryRow, styles.billSummaryTotal]}>
                    <Text style={styles.billSummaryTotalLabel}>Amount to pay</Text>
                    <Text style={styles.billSummaryTotalValue}>
                      ₹{(
                        appliedBillDiscount
                          ? Math.max(0.01, parseFloat(billAmount) - getBillDiscountAmount(appliedBillDiscount, parseFloat(billAmount)))
                          : parseFloat(billAmount)
                      ).toFixed(2)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Final amount banner above CTA */}
              {billAmount && parseFloat(billAmount) > 0 && (
                <View style={styles.finalAmountBanner}>
                  <Text style={styles.finalAmountLabel}>Amount to pay</Text>
                  <Text style={styles.finalAmountValue}>
                    ₹{(
                      appliedBillDiscount
                        ? Math.max(0.01, parseFloat(billAmount) - getBillDiscountAmount(appliedBillDiscount, parseFloat(billAmount)))
                        : parseFloat(billAmount)
                    ).toFixed(2)}
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Proceed – fixed at bottom with safe area */}
            <View style={[styles.proceedButtonContainer, { paddingBottom: Math.max(16, insets.bottom) }]}>
              <GradientButton
                style={StyleSheet.flatten([
                  styles.proceedButton,
                  ...((!billAmount || parseFloat(billAmount) <= 0) ? [styles.proceedButtonDisabled] : [])
                ])}
                textStyle={styles.proceedButtonText}
                onPress={handleProceedBillPayment}
                disabled={!billAmount || parseFloat(billAmount) <= 0 || processingPayment}
                loading={processingPayment}
              >
                {billAmount && parseFloat(billAmount) > 0
                  ? `Pay ₹${(
                      appliedBillDiscount
                        ? Math.max(0.01, parseFloat(billAmount) - getBillDiscountAmount(appliedBillDiscount, parseFloat(billAmount)))
                        : parseFloat(billAmount)
                    ).toFixed(2)} ›`
                  : "Proceed ›"}
              </GradientButton>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* TABLE BOOKING MODAL */}
      <Modal
        visible={showBookingModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.modalContainer}>
            <StatusBar barStyle="light-content" />
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setShowBookingModal(false)}>
                <Text style={styles.modalClose}>Cancel</Text>
              </Pressable>
              <Text style={styles.modalTitle}>Book entry</Text>
              <View style={{ width: 60 }} />
            </View>

            <ScrollView
              style={styles.modalContent}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
            >
            <Text style={styles.inputLabel}>Select number of guests</Text>
            <View style={styles.guestSelector}>
              <Pressable
                style={styles.guestBtn}
                onPress={() => setNumberOfGuests(Math.max(1, numberOfGuests - 1))}
              >
                <Text style={styles.guestBtnText}>−</Text>
              </Pressable>
              <Text style={styles.guestCount}>{numberOfGuests}</Text>
              <Pressable
                style={styles.guestBtn}
                onPress={() => setNumberOfGuests(numberOfGuests + 1)}
              >
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

            <GradientButton
              style={styles.continueBtn}
              textStyle={styles.continueBtnText}
              onPress={handleContinueToParticipants}
            >
              Continue
            </GradientButton>
          </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* PARTICIPANT FORM MODAL */}
      <Modal
        visible={showParticipantForm}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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

            <ScrollView
              style={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
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
                    participants[currentParticipantIndex]?.gender === gender &&
                      styles.genderBtnActive2,
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

            <Text style={styles.inputLabel}>
              Age * (Minimum: 18)
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
        </TouchableWithoutFeedback>
      </Modal>

      {/* SUMMARY MODAL */}
      <Modal
        visible={showSummary}
        animationType="slide"
        presentationStyle="pageSheet"
        onDismiss={() => {
          if (pendingRazorpayOptions) {
            const { bookingData: storedBookingData, amountPaid: storedAmountPaid, ...options } = pendingRazorpayOptions;
            const amountForRedirect = storedAmountPaid ?? finalPrice;
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
                  router.replace(`/payment/failure?error_message=${encodeURIComponent(errorMsg)}&amount=${amountForRedirect}&booking_id=${currentBookingId}&club_id=${clubId}`);
                  setProcessing(false);
                  return;
                }

                if (!RazorpayCheckout || typeof RazorpayCheckout.open !== 'function') {
                  const errorMsg = "Payment gateway not available";
                  router.replace(`/payment/failure?error_message=${encodeURIComponent(errorMsg)}&amount=${amountForRedirect}&booking_id=${currentBookingId}&club_id=${clubId}`);
                  setProcessing(false);
                  return;
                }

                RazorpayCheckout.open(options)
                  .then(async (response: any) => {
                    if (!response || !response.razorpay_payment_id) {
                      setProcessing(false);
                      const errorMsg = "Invalid payment response";
                      router.replace(`/payment/failure?error_message=${encodeURIComponent(errorMsg)}&amount=${amountForRedirect}&booking_id=${currentBookingId}&club_id=${clubId}`);
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
                        router.replace(`/payment/failure?error_message=${encodeURIComponent(errorMsg)}&amount=${amountForRedirect}&booking_id=${currentBookingId}&club_id=${clubId}`);
                        return;
                      }

                      const qrCode = verified.qr || verified.qr_code;
                      setProcessing(false);
                      
                      const qrParam = qrCode ? encodeURIComponent(qrCode) : "";
                      
                      if (qrCode) {
                        router.replace(`/payment/success?qr=${qrParam}&booking_id=${currentBookingId}&amount=${amountForRedirect}`);
                      } else {
                        router.replace(`/payment/success?booking_id=${currentBookingId}&amount=${amountForRedirect}`);
                      }
                    } catch (verifyError: any) {
                      setProcessing(false);
                      const errorMsg = verifyError?.message || "Payment verification failed";
                      router.replace(`/payment/failure?error_message=${encodeURIComponent(errorMsg)}&amount=${amountForRedirect}&booking_id=${currentBookingId}&club_id=${clubId}`);
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
                      router.replace(`/payment/failure?error_message=${encodeURIComponent(errorMsg)}&amount=${amountForRedirect}&booking_id=${currentBookingId}&club_id=${clubId}`);
                    } else {
                      const errorMsg = error?.description || error?.message || "Payment could not be completed";
                      router.replace(`/payment/failure?error_message=${encodeURIComponent(errorMsg)}&amount=${amountForRedirect}&booking_id=${currentBookingId}&club_id=${clubId}`);
                    }
                  });
              }, 500);
            });
          }
        }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.modalContainer}>
            <StatusBar barStyle="light-content" />
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setShowSummary(false)}>
                <Text style={styles.modalClose}>Back</Text>
              </Pressable>
              <Text style={styles.modalTitle}>Booking Summary</Text>
              <View style={{ width: 60 }} />
            </View>

            <ScrollView
              style={styles.modalContent}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
            >
            <Text style={styles.summarySectionTitle}>Participants</Text>
            {participants.map((p, idx) => (
              <View key={idx} style={styles.participantCard}>
                <Text style={styles.participantName}>{p.name}</Text>
                <Text style={styles.participantDetails}>
                  {p.gender} · Age {p.age}
                </Text>
              </View>
            ))}

            {/* Offers for table booking – tap to select/deselect */}
            {(() => {
              const applicableTableOffers = (discounts || []).filter(
                (d) => finalPrice >= Number(d.min_purchase ?? 0)
              );
              if (applicableTableOffers.length === 0) return null;
              return (
                <View style={styles.offersSection}>
                  <Text style={styles.offersSectionTitle}>Offers (tap to select/deselect)</Text>
                  {applicableTableOffers.map((discount) => {
                    const isApplied = String(appliedTableDiscount?.id) === String(discount.id);
                    return (
                      <Pressable
                        key={discount.id}
                        style={[styles.offerBox, isApplied && styles.offerBoxApplied]}
                        onPress={() => setAppliedTableDiscount(isApplied ? null : discount)}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      >
                        <View style={styles.offerBoxContent}>
                          <Text style={styles.offerBoxTitle}>{discount.name}</Text>
                          {discount.description ? (
                            <Text style={styles.offerBoxDesc}>{discount.description}</Text>
                          ) : null}
                          <Text style={styles.offerBoxSave}>
                            {getDiscountDisplayValue(discount, finalPrice)}
                          </Text>
                        </View>
                        <Text style={[styles.offerBoxActionBadge, isApplied && styles.offerBoxAppliedBadge]}>
                          {isApplied ? "Deselect" : "Select"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              );
            })()}

            <View style={styles.priceSummary}>
              <Text style={styles.summarySectionTitle}>Price Breakdown</Text>
              
              {priceBreakdown.map((item, idx) => (
                <View key={idx} style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>{item.label}</Text>
                  <Text style={styles.breakdownAmount}>₹{item.amount}</Text>
                </View>
              ))}

              {appliedTableDiscount ? (
                <>
                  <View style={styles.breakdownRow}>
                    <Text style={[styles.breakdownLabel, styles.billSummaryDiscount]}>
                      Discount ({appliedTableDiscount.name})
                    </Text>
                    <Text style={[styles.breakdownAmount, styles.billSummaryDiscount]}>
                      -₹{getTableDiscountAmount(appliedTableDiscount, finalPrice).toFixed(2)}
                    </Text>
                  </View>
                </>
              ) : null}

              <View style={styles.breakdownDivider} />
              
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownTotalLabel}>Amount to pay</Text>
                <Text style={styles.finalPriceText}>₹{Math.max(0.01, tableAmountToPay).toFixed(2)}</Text>
              </View>
            </View>

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
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  scrollView: {
    flex: 1,
  },

  banner: {
    height: 240,
    width: "100%",
  },

  infoBox: {
    padding: 16,
  },

  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    flex: 1,
  },

  ratingBox: {
    backgroundColor: "#1DB954",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
  },

  ratingText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  reviewCount: {
    color: "#e5e5e5",
    fontSize: 11,
  },

  subText: {
    color: "#aaa",
    marginTop: 6,
  },

  metaText: {
    color: "#aaa",
    marginTop: 4,
  },

  openText: {
    color: "#4ade80",
    marginTop: 6,
  },

  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },

  actionBtn: {
    backgroundColor: "#1f1f1f",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  actionText: {
    color: "#fff",
    fontSize: 13,
  },

  bottomButtonsContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 12,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 0,
    alignItems: "stretch",
  },

  bottomButtonWrapper: {
    flex: 1,
    minWidth: 0,
    height: 56,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },

  bookEntryBlur: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  bookTableBtnTouchable: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },

  payBillBtnInner: {
    flex: 1,
    width: "100%",
    minWidth: 0,
  },

  bookTableText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },

  payBillBtn: {
    flex: 1,
    width: "100%",
    minWidth: 0,
    alignSelf: "stretch",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  payBillText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },

  tabsRow: {
    flexDirection: "row",
    gap: 18,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
    paddingBottom: 10,
  },

  tabText: {
    color: "#777",
    fontSize: 14,
  },

  activeTab: {
    color: "#a855f7",
    fontWeight: "700",
  },

  offersEventsWrapper: {
    paddingBottom: 24,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
    marginTop: 20,
  },

  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },

  chevron: {
    color: "#9ca3af",
    fontSize: 14,
  },

  // Discount Card Styles
  discountCard: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: Colors.dark.primary,
    alignItems: "stretch",
  },

  discountLeft: {
    width: 110,
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
  },

  discountValue: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 28,
  },

  discountOffText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
    marginTop: 4,
  },

  discountDashed: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginVertical: 8,
  },

  discountRight: {
    flex: 1,
    padding: 14,
    justifyContent: "center",
  },

  discountName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },

  discountDesc: {
    color: "#fff",
    fontSize: 12,
    opacity: 0.9,
    marginBottom: 6,
  },

  discountMin: {
    color: "#fff",
    fontSize: 11,
    opacity: 0.8,
  },

  discountMax: {
    color: "#fff",
    fontSize: 11,
    opacity: 0.8,
    marginTop: 2,
  },

  eventCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
  },

  eventImageWrap: {
    position: "relative",
    width: "100%",
    aspectRatio: 16 / 10,
  },

  eventImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  bookmark: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  bookmarkIcon: {
    fontSize: 14,
  },

  eventContent: {
    padding: 14,
  },

  eventTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
  },

  eventDateTime: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 4,
  },

  eventVenue: {
    color: "#9ca3af",
    fontSize: 13,
  },

  // Pay Bill Modal Styles
  payBillContainer: {
    flex: 1,
    backgroundColor: "#000",
  },

  payBillHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "#000",
  },

  payBillScroll: {
    flex: 1,
  },

  payBillScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 160,
  },

  backButton: {
    padding: 4,
  },

  backButtonText: {
    color: "#fff",
    fontSize: 24,
  },

  payBillHeaderContent: {
    flex: 1,
    marginLeft: 12,
  },

  payBillTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  payBillSubtitle: {
    color: "#999",
    fontSize: 12,
    marginTop: 2,
  },

  chatIcon: {
    fontSize: 24,
  },

  warningBanner: {
    backgroundColor: "#8B4513",
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
  },

  warningText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },

  warningSubtext: {
    color: "#FFE4B5",
    fontSize: 13,
  },

  amountSection: {
    marginTop: 28,
  },

  amountLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },

  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 18,
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

  cashbackBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(236, 72, 153, 0.25)",
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.borderLight,
  },

  cashbackText: {
    color: "#fff",
    fontSize: 14,
    flex: 1,
  },

  cashbackArrow: {
    color: "#fff",
    fontSize: 20,
    marginLeft: 8,
  },

  offersSection: {
    marginTop: 28,
  },

  offersSectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 14,
  },

  offerBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1a1a1a",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.borderLight,
    marginBottom: 12,
  },

  offerBoxApplied: {
    borderColor: Colors.dark.primary,
    borderWidth: 2,
  },

  offerBoxContent: {
    flex: 1,
  },

  offerBoxActionBadge: {
    color: "#888",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 12,
  },
  offerBoxAppliedBadge: {
    color: Colors.dark.primary,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 12,
  },

  offerBoxTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },

  offerBoxDesc: {
    color: "#ccc",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },

  offerBoxSave: {
    color: Colors.dark.success,
    fontSize: 14,
    fontWeight: "600",
  },

  billSummaryBox: {
    marginTop: 24,
    padding: 18,
    backgroundColor: "#1a1a1a",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.borderLight,
  },

  billSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  billSummaryTotal: {
    marginTop: 8,
    marginBottom: 0,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },

  billSummaryLabel: {
    color: "#999",
    fontSize: 14,
  },

  billSummaryValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  billSummaryDiscount: {
    color: Colors.dark.success,
  },

  billSummaryTotalLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  billSummaryTotalValue: {
    color: Colors.dark.primary,
    fontSize: 18,
    fontWeight: "700",
  },

  finalAmountBanner: {
    marginTop: 24,
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: "rgba(236, 72, 153, 0.15)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.borderLight,
    alignItems: "center",
  },
  finalAmountLabel: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginBottom: 4,
  },
  finalAmountValue: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.dark.primary,
  },
  proceedButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 16,
    paddingHorizontal: 20,
    backgroundColor: "#000",
    borderTopWidth: 1,
    borderTopColor: "#222",
  },

  proceedButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  proceedButtonDisabled: {
    opacity: 0.5,
  },

  proceedButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  // Modal styles
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

  modalClose: {
    color: Colors.dark.primary,
    fontSize: 15,
  },

  modalTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: "600",
  },

  modalContent: {
    flex: 1,
    padding: 20,
  },

  inputLabel: {
    color: Colors.dark.text,
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
    backgroundColor: Colors.dark.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },

  guestBtnText: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.dark.text,
  },

  guestCount: {
    fontSize: 32,
    fontWeight: "700",
    color: Colors.dark.text,
  },

  dateScroll: {
    marginTop: 10,
  },

  dateCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    alignItems: "center",
    minWidth: 70,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },

  dateCardActive: {
    borderColor: Colors.dark.primary,
    backgroundColor: Colors.dark.card,
  },

  dateDay: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.dark.text,
  },

  dateDayActive: {
    color: Colors.dark.primary,
  },

  dateDayName: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginTop: 4,
  },

  dateDayNameActive: {
    color: Colors.dark.primary,
  },

  priceInfo: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 10,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },

  priceInfoTitle: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },

  priceInfoText: {
    color: Colors.dark.textSecondary,
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

  genderBtn2: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.dark.surface,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },

  genderBtnActive2: {
    borderColor: Colors.dark.primary,
    backgroundColor: Colors.dark.card,
  },

  genderBtnText2: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },

  genderBtnTextActive2: {
    color: Colors.dark.primary,
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

  checkoutBtn: {
    marginTop: 24,
    marginBottom: 16,
  },

  checkoutBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});   