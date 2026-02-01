import { View, Text, StyleSheet, Image, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { fetchWithFallback } from "@/_services/api-config";
import { withAuthHeaders } from "@/_services/auth-fetch";

export default function PaymentSuccess() {
  const { qr, booking_id, amount } = useLocalSearchParams();
  const router = useRouter();
  const [qrUri, setQrUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [moneySaved, setMoneySaved] = useState<number | null>(null);

  useEffect(() => {
    const rawBookingId = booking_id ? (Array.isArray(booking_id) ? booking_id[0] : booking_id) : null;

    (async () => {
      console.log("🎉 [FRONTEND] Payment success page loaded");
      console.log("🎉 [FRONTEND] Params:", {
        has_qr: !!qr,
        booking_id: rawBookingId || "not provided",
        amount: amount || "not provided",
      });

      if (qr) {
        try {
          const qrStr = Array.isArray(qr) ? qr[0] : qr;
          const decoded = decodeURIComponent(qrStr);

          if (decoded.startsWith("data:image")) {
            setQrUri(decoded);
          } else {
            setQrUri(`data:image/png;base64,${decoded}`);
          }

          console.log("✅ [FRONTEND] QR code processed");
        } catch (error) {
          console.error("❌ [FRONTEND] Error processing QR code:", error);
          const qrStr = Array.isArray(qr) ? qr[0] : qr;
          setQrUri(qrStr.startsWith("data:") ? qrStr : `data:image/png;base64,${qrStr}`);
        }
      }

      if (rawBookingId) {
        try {
          const res = await fetchWithFallback(
            `/api/bookings/${rawBookingId}`,
            await withAuthHeaders({ method: "GET" })
          );
          if (res.ok) {
            const data = await res.json();
            // Use only money_saved from booking (value stored in DB at booking creation)
            const raw = data?.booking?.money_saved;
            const parsed = raw != null && raw !== "" ? Number(raw) : 0;
            setMoneySaved(Number.isFinite(parsed) ? parsed : 0);
          } else {
            setMoneySaved(0);
          }
        } catch (_) {
          setMoneySaved(0);
        }
      }

      setLoading(false);
    })();
  }, [qr, booking_id, amount]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#00FF6F" />
        <Text style={styles.loadingText}>Loading your booking...</Text>
      </View>
    );
  }

  const displayAmount = amount ? (Array.isArray(amount) ? amount[0] : amount) : "2,007.8";

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Green gradient blur at top */}
      <LinearGradient
        colors={["#00FF6D", "#000000"]}
        locations={[0.36, 1]}
        style={styles.gradientBlur}
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Green Checkmark Circle */}
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={56} color="#2D5016" />
          </View>

          {/* Payment successful */}
          <Text style={styles.title}>Payment successful</Text>

          {/* Amount with Rupee Icon */}
          <View style={styles.amountContainer}>
            <Text style={styles.rupeeSymbol}>₹</Text>
            <Text style={styles.amount}>{displayAmount}</Text>
          </View>

          {/* Divider Line */}
          <View style={styles.divider} />

          {/* You paid total */}
          <Text style={styles.subtitle}>You paid total of Rs. {displayAmount}</Text>

          {/* Discount Card - show when money_saved > 0 */}
          {moneySaved != null && moneySaved > 0 && (
            <View style={styles.discountCard}>
              <View style={styles.discountContent}>
                <View style={styles.discountIcon}>
                  <Ionicons name="pricetag" size={24} color="#DB138D" />
                </View>
                <Text style={styles.discountText}>
                  You saved Rs. {Number(moneySaved).toLocaleString("en-IN", { maximumFractionDigits: 0 })} on this bill payment
                </Text>
              </View>
            </View>
          )}

          {/* QR Code Card */}
          {qrUri && (
            <View style={styles.qrCard}>
              {/* QR Code Image */}
              <View style={styles.qrImageContainer}>
                <Image
                  source={{ uri: qrUri }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            <Pressable 
              style={styles.primaryButton}
              onPress={() => router.replace("/bookings")}
            >
              <Text style={styles.primaryButtonText}>View Tickets</Text>
            </Pressable>

            <Pressable 
              style={styles.secondaryButton}
              onPress={() => router.replace("/(tabs)")}
            >
              <Text style={styles.secondaryButtonText}>Having any issue?</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Home Indicator */}
      <View style={styles.homeIndicator} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },

  gradientBlur: {
    position: "absolute",
    width: 418,
    height: 475,
    left: -21,
    top: -246,
    opacity: 0.6,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: "#FFFFFF",
    fontSize: 16,
    marginTop: 16,
    fontFamily: "System",
  },

  scrollContent: {
    flexGrow: 1,
    paddingTop: 115,
    paddingBottom: 50,
    paddingHorizontal: 16,
  },

  content: {
    alignItems: "center",
    width: "100%",
  },

  // Green checkmark circle (88x88)
  successCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#00FF6F",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 39,
  },

  // Payment successful
  title: {
    fontFamily: "System",
    fontWeight: "700",
    fontSize: 26,
    lineHeight: 26,
    color: "#FFFFFF",
    marginBottom: 26,
    textAlign: "center",
  },

  // Amount with rupee symbol
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 21,
  },

  rupeeSymbol: {
    fontFamily: "System",
    fontWeight: "700",
    fontSize: 26,
    color: "#FFFFFF",
  },

  amount: {
    fontFamily: "System",
    fontWeight: "700",
    fontSize: 26,
    lineHeight: 26,
    color: "#FFFFFF",
  },

  // Divider line
  divider: {
    width: 319,
    height: 1,
    backgroundColor: "#515151",
    marginBottom: 26,
  },

  // You paid total
  subtitle: {
    fontFamily: "System",
    fontWeight: "600",
    fontSize: 20,
    lineHeight: 20,
    color: "#FFFFFF",
    marginBottom: 46,
    textAlign: "center",
  },

  // Pink discount card
  discountCard: {
    width: "100%",
    backgroundColor: "rgba(255, 0, 126, 0.43)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.24)",
    borderRadius: 18,
    paddingVertical: 19,
    paddingHorizontal: 10,
    marginBottom: 19,
  },

  discountContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 21,
  },

  discountIcon: {
    width: 33,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "90deg" }],
  },

  discountText: {
    flex: 1,
    fontFamily: "System",
    fontWeight: "600",
    fontSize: 16,
    lineHeight: 18,
    color: "#FFFFFF",
  },

  // QR Card (replacing club card)
  qrCard: {
    width: "100%",
    backgroundColor: "rgba(31, 31, 31, 0.73)",
    borderWidth: 1,
    borderColor: "#515151",
    borderRadius: 18,
    padding: 16,
    marginBottom: 32,
  },

  qrImageContainer: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 20,
  },

  qrImage: {
    width: 200,
    height: 200,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
  },

  // Action buttons
  actions: {
    width: "100%",
    gap: 12,
  },

  primaryButton: {
    width: "100%",
    backgroundColor: "#00FF6F",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  primaryButtonText: {
    fontFamily: "System",
    fontSize: 16,
    fontWeight: "700",
    color: "#000000",
  },

  secondaryButton: {
    width: "100%",
    backgroundColor: "transparent",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#515151",
  },

  secondaryButtonText: {
    fontFamily: "System",
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Home indicator
  homeIndicator: {
    position: "absolute",
    width: 134,
    height: 5,
    left: "50%",
    bottom: 8,
    marginLeft: -67,
    backgroundColor: "#FFFFFF",
    borderRadius: 100,
  },
});