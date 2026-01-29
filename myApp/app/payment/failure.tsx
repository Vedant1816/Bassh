import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { Colors } from "@/constants/Colors";

// Red theme (mirrors success.tsx green)
const RED_BG = "#B91C1C";       // ~ same depth as success #16A34A
const RED_CIRCLE = "#DC2626";   // lighter red for circle ~ #22C55E

export default function PaymentFailure() {
  const { booking_id, amount, error_message, event_id, club_id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("❌ [FRONTEND] Payment failure page loaded");
    console.log("❌ [FRONTEND] Params:", {
      booking_id: booking_id || "not provided",
      amount: amount || "not provided",
      error_message: error_message || "not provided",
      event_id: event_id || "not provided",
      club_id: club_id || "not provided",
    });

    setLoading(false);
  }, [booking_id, amount, error_message, event_id, club_id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={RED_CIRCLE} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const displayAmount = amount ? (Array.isArray(amount) ? amount[0] : amount) : "0";
  const displayError = error_message
    ? (Array.isArray(error_message) ? error_message[0] : error_message)
    : "Payment could not be completed.";

  const handleRetry = () => {
    if (event_id) {
      const eventId = Array.isArray(event_id) ? event_id[0] : event_id;
      router.replace(`/event/${eventId}/book`);
    } else if (club_id) {
      const cId = Array.isArray(club_id) ? club_id[0] : club_id;
      router.replace(`/club/${cId}`);
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Large Red X Circle - same as success checkmark circle */}
          <View style={styles.failureCircle}>
            <Text style={styles.xMark}>✕</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>Payment failed</Text>

          {/* Amount Display - same as success */}
          <Text style={styles.amount}>₹ {displayAmount}</Text>

          {/* Subtitle - mirrors success "You paid total of..." */}
          <Text style={styles.subtitle}>
            Attempted amount Rs. {displayAmount}
          </Text>

          {/* Failure Message - mirrors success congrats block */}
          <Text style={styles.failMessage}>
            {displayError}
          </Text>

          {/* Booking ID - same structure as success */}
          {booking_id && (
            <View style={styles.bookingIdContainer}>
              <Text style={styles.bookingIdLabel}>Booking ID</Text>
              <Text style={styles.bookingIdValue}>
                {Array.isArray(booking_id) ? booking_id[0] : booking_id}
              </Text>
            </View>
          )}

          {/* Action Buttons - same two-button layout as success */}
          <View style={styles.actions}>
            <Pressable style={styles.primaryButton} onPress={handleRetry}>
              <Text style={styles.primaryButtonText}>Try Again</Text>
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
    backgroundColor: RED_BG,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: RED_BG,
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
  failureCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: RED_CIRCLE,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  xMark: {
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
  failMessage: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.dark.text,
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 40,
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
    color: RED_BG,
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
