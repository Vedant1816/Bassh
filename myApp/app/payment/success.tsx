import { View, Text, StyleSheet, Image, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";

export default function PaymentSuccess() {
  const { qr, booking_id } = useLocalSearchParams();
  const router = useRouter();
  const [qrUri, setQrUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("🎉 [FRONTEND] Payment success page loaded");
    console.log("🎉 [FRONTEND] Params:", { 
      has_qr: !!qr, 
      booking_id: booking_id || "not provided" 
    });

    // Handle QR code - decode if URL encoded
    if (qr) {
      try {
        const qrStr = Array.isArray(qr) ? qr[0] : qr;
        // Decode URL-encoded string
        const decoded = decodeURIComponent(qrStr);
        
        // Check if it's already a data URL
        if (decoded.startsWith("data:image")) {
          setQrUri(decoded);
        } else {
          // If it's just base64, add the data URL prefix
          setQrUri(`data:image/png;base64,${decoded}`);
        }
        
        console.log("✅ [FRONTEND] QR code processed");
      } catch (error) {
        console.error("❌ [FRONTEND] Error processing QR code:", error);
        // Try using it as-is
        const qrStr = Array.isArray(qr) ? qr[0] : qr;
        setQrUri(qrStr.startsWith("data:") ? qrStr : `data:image/png;base64,${qrStr}`);
      }
    }
    
    setLoading(false);
  }, [qr, booking_id]);

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#EC4899" />
        <Text style={styles.loadingText}>Loading your booking...</Text>
      </View>
    );
  }

  if (!qrUri) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <Text style={styles.title}>Payment Successful! 🎉</Text>
        <Text style={styles.sub}>Your booking has been confirmed</Text>
        {booking_id && (
          <Text style={styles.bookingId}>
            Booking ID: {Array.isArray(booking_id) ? booking_id[0] : booking_id}
          </Text>
        )}
        <Pressable style={styles.button} onPress={() => router.replace("/(tabs)")}>
          <Text style={styles.buttonText}>Go to Home</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.title}>🎉 Payment Successful</Text>
          <Text style={styles.subtitle}>Your booking has been confirmed</Text>

          <View style={styles.qrContainer}>
            <Image
              source={{ uri: qrUri }}
              style={styles.qr}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.instruction}>
            Show this QR code at the venue entry
          </Text>

          {booking_id && (
            <View style={styles.bookingInfo}>
              <Text style={styles.bookingLabel}>Booking ID</Text>
              <Text style={styles.bookingValue}>
                {Array.isArray(booking_id) ? booking_id[0] : booking_id}
              </Text>
            </View>
          )}

          <Pressable 
            style={styles.button} 
            onPress={() => router.replace("/(tabs)")}
          >
            <Text style={styles.buttonText}>Go to Home</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  content: {
    alignItems: "center",
    width: "100%",
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 16,
    marginBottom: 32,
    textAlign: "center",
  },
  qrContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  qr: {
    width: 250,
    height: 250,
  },
  instruction: {
    color: "#9ca3af",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  bookingInfo: {
    backgroundColor: "#1a1a1a",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    width: "100%",
    alignItems: "center",
  },
  bookingLabel: {
    color: "#9ca3af",
    fontSize: 12,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  bookingValue: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "monospace",
  },
  bookingId: {
    color: "#9ca3af",
    fontSize: 14,
    marginBottom: 24,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#EC4899",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  loadingText: {
    color: "#9ca3af",
    fontSize: 16,
    marginTop: 16,
  },
  sub: {
    color: "#9ca3af",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
  },
});