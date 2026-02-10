import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

export default function PaymentFailure() {
  const { booking_id, amount, error_message, event_id, club_id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, [booking_id, amount, error_message, event_id, club_id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#EF4444" />
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

      {/* Red gradient blur at top - mirrors success green */}
      <LinearGradient
        colors={["#DC2626", "#000000"]}
        locations={[0.36, 1]}
        style={styles.gradientBlur}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Red X Circle - same size as success checkmark circle */}
          <View style={styles.failureCircle}>
            <Ionicons name="close" size={56} color="#7F1D1D" />
          </View>

          {/* Payment failed */}
          <Text style={styles.title}>Payment failed</Text>

          {/* Amount with Rupee Icon - same layout as success */}
          <View style={styles.amountContainer}>
            <Text style={styles.rupeeSymbol}>₹</Text>
            <Text style={styles.amount}>{displayAmount}</Text>
          </View>

          {/* Divider Line */}
          <View style={styles.divider} />

          {/* Attempted amount */}
          <Text style={styles.subtitle}>Attempted amount Rs. {displayAmount}</Text>

          {/* Error message card - mirrors success discount card but red */}
          <View style={styles.errorCard}>
            <View style={styles.errorContent}>
              <View style={styles.errorIcon}>
                <Ionicons name="alert-circle" size={24} color="#DC2626" />
              </View>
              <Text style={styles.errorText} numberOfLines={4}>
                {displayError}
              </Text>
            </View>
          </View>

          {/* Action Buttons - same layout as success */}
          <View style={styles.actions}>
            <Pressable style={styles.primaryButton} onPress={handleRetry}>
              <Text style={styles.primaryButtonText}>Try Again</Text>
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

  // Red X circle (88x88 - same as success)
  failureCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 39,
  },

  // Payment failed
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

  // Attempted amount
  subtitle: {
    fontFamily: "System",
    fontWeight: "600",
    fontSize: 20,
    lineHeight: 20,
    color: "#FFFFFF",
    marginBottom: 19,
    textAlign: "center",
  },

  // Red error card (mirrors success discount card)
  errorCard: {
    width: "100%",
    backgroundColor: "rgba(220, 38, 38, 0.25)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.24)",
    borderRadius: 18,
    paddingVertical: 19,
    paddingHorizontal: 10,
    marginBottom: 19,
  },

  errorContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 21,
  },

  errorIcon: {
    width: 33,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },

  errorText: {
    flex: 1,
    fontFamily: "System",
    fontWeight: "600",
    fontSize: 16,
    lineHeight: 18,
    color: "#FFFFFF",
  },

  // Action buttons
  actions: {
    width: "100%",
    gap: 12,
  },

  primaryButton: {
    width: "100%",
    backgroundColor: "#EF4444",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  primaryButtonText: {
    fontFamily: "System",
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
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
