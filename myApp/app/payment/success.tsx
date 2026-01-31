import { View, Text, StyleSheet, Image, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { Colors } from "@/constants/Colors";

export default function PaymentSuccess() {
  const { qr, booking_id, amount } = useLocalSearchParams();
  const router = useRouter();
  const [qrUri, setQrUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("🎉 [FRONTEND] Payment success page loaded");
    console.log("🎉 [FRONTEND] Params:", { 
      has_qr: !!qr, 
      booking_id: booking_id || "not provided",
      amount: amount || "not provided"
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
    
    setLoading(false);
  }, [qr, booking_id, amount]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#22C55E" />
        <Text style={styles.loadingText}>Loading your booking...</Text>
      </View>
    );
  }

  const displayAmount = amount ? (Array.isArray(amount) ? amount[0] : amount) : "2,007.8";

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Large Green Checkmark Circle */}
          <View style={styles.successCircle}>
            <Text style={styles.checkmark}>✓</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>Payment successful</Text>

          {/* Amount Display */}
          <Text style={styles.amount}>₹ {displayAmount}</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            You paid total of Rs. {displayAmount}
          </Text>

          {/* Congratulations Message */}
          <Text style={styles.congratsMessage}>
            Congratulations 🎉{"\n"}Table Booked Successfully.
          </Text>

          {/* QR Code Section */}
          {qrUri && (
            <View style={styles.qrSection}>
              <View style={styles.qrContainer}>
                <Image
                  source={{ uri: qrUri }}
                  style={styles.qr}
                  resizeMode="contain"
                />
              </View>
              
              <Text style={styles.qrInstruction}>
                Show this QR code at the venue entry
              </Text>
            </View>
          )}

          {/* Booking ID */}
          {booking_id && (
            <View style={styles.bookingIdContainer}>
              <Text style={styles.bookingIdLabel}>Booking ID</Text>
              <Text style={styles.bookingIdValue}>
                {Array.isArray(booking_id) ? booking_id[0] : booking_id}
              </Text>
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
              <Text style={styles.secondaryButtonText}>? Having any issue?</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#16A34A", // Green background
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: Colors.dark.text,
    fontSize: 16,
    marginTop: 16,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  content: {
    alignItems: "center",
    width: "100%",
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#22C55E", // Lighter green for circle
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  checkmark: {
    fontSize: 60,
    color: Colors.dark.text,
    fontWeight: "700",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.dark.text,
    marginBottom: 24,
    textAlign: "center",
  },
  amount: {
    fontSize: 48,
    fontWeight: "800",
    color: Colors.dark.text,
    marginBottom: 16,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 24,
    textAlign: "center",
  },
  congratsMessage: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.dark.text,
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 40,
  },
  qrSection: {
    alignItems: "center",
    marginBottom: 32,
    width: "100%",
  },
  qrContainer: {
    backgroundColor: Colors.dark.text,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  qr: {
    width: 220,
    height: 220,
  },
  qrInstruction: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
  },
  bookingIdContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 32,
    width: "100%",
    alignItems: "center",
  },
  bookingIdLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "600",
  },
  bookingIdValue: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.dark.text,
    fontFamily: "monospace",
    letterSpacing: 1,
  },
  actions: {
    width: "100%",
    gap: 16,
  },
  primaryButton: {
    backgroundColor: Colors.dark.text,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#16A34A",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.dark.text,
  },
});