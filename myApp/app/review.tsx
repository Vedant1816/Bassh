import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { fetchWithFallback } from "@/_services/api-config";
import { LinearGradient } from "expo-linear-gradient";
import { DismissKeyboardView } from "@/components/DismissKeyboardView";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const OTP_GRADIENT = ["#8B0045", "#2D0A1F", "#000000"] as const;
const OTP_GRADIENT_LOCATIONS = [0, 0.4, 1] as const;

export default function ReviewScreen() {
  const { booking_id, club_id, club_name, event_id, event_name } = useLocalSearchParams();
  const router = useRouter();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert("Rating Required", "Please select a rating before submitting.");
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetchWithFallback(
        "/api/reviews",
        await withAuthHeaders({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            club_id: Array.isArray(club_id) ? club_id[0] : club_id,
            event_id: Array.isArray(event_id) ? event_id[0] : event_id,
            booking_id: Array.isArray(booking_id) ? booking_id[0] : booking_id,
            rating,
            comment: comment.trim() || null,
            is_verified: true, // Since it's from a booking
          }),
        })
      );

      if (!res.ok) {
        const contentType = res.headers.get("content-type") || "";
        let errorMessage = "Failed to submit review";
        if (contentType.includes("application/json")) {
          try {
            const data = await res.json();
            errorMessage = data.error || errorMessage;
          } catch (_) {}
        } else {
          const text = await res.text();
          if (text.startsWith("<")) {
            errorMessage =
              "Server returned an error page. If using ngrok, ensure the tunnel is running and try again.";
          }
        }
        throw new Error(errorMessage);
      }

      Alert.alert(
        "Thank You",
        "Your review has been submitted successfully.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err: any) {
      console.error("❌ Review submission error:", err);
      Alert.alert(
        "Submission Failed",
        err.message || "Failed to submit review. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const displayClubName = Array.isArray(club_name) ? club_name[0] : club_name;
  const displayEventName = Array.isArray(event_name) ? event_name[0] : event_name;

  return (
    <DismissKeyboardView>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={OTP_GRADIENT}
          locations={OTP_GRADIENT_LOCATIONS}
          style={styles.gradientBackground}
        />

        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Write a Review</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.titleSection}>
            <Text style={styles.title}>{displayEventName}</Text>
            <Text style={styles.subtitle}>at {displayClubName}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How was your experience?</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable
                  key={star}
                  onPress={() => setRating(star)}
                  style={styles.starButton}
                >
                  <Text style={[styles.star, star <= rating && styles.starFilled]}>
                    ★
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.ratingText}>
              {rating === 0 && "Tap to rate"}
              {rating === 1 && "Poor"}
              {rating === 2 && "Fair"}
              {rating === 3 && "Good"}
              {rating === 4 && "Very Good"}
              {rating === 5 && "Excellent"}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tell us more (Optional)</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Share your thoughts about the event, venue, music, ambiance..."
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={comment}
              onChangeText={setComment}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{comment.length}/500</Text>
          </View>

          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>Review tips</Text>
            <Text style={styles.tipText}>Be honest and specific</Text>
            <Text style={styles.tipText}>Mention what you liked or didn't like</Text>
            <Text style={styles.tipText}>Help others make informed decisions</Text>
            <Text style={styles.tipText}>Keep it respectful and constructive</Text>
          </View>

          <Pressable
            style={styles.buttonWrapper}
            onPress={handleSubmit}
            disabled={rating === 0 || submitting}
          >
            <LinearGradient
              colors={["#E91E8C", "#DB1A85"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.submitButton,
                (rating === 0 || submitting) && styles.submitButtonDisabled,
              ]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Review</Text>
              )}
            </LinearGradient>
          </Pressable>

          <View style={{ height: 80 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </DismissKeyboardView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  gradientBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 60,
    marginBottom: 24,
    gap: 12,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  backIcon: {
    fontSize: 32,
    color: "#FFFFFF",
    fontWeight: "300",
    marginLeft: -4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  titleSection: {
    marginBottom: 40,
    paddingHorizontal: 0,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.6)",
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 14,
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
  },
  star: {
    fontSize: 44,
    color: "rgba(255, 255, 255, 0.3)",
  },
  starFilled: {
    color: "#E91E8C",
  },
  ratingText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#E91E8C",
    textAlign: "center",
  },
  commentInput: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#FFFFFF",
    minHeight: 120,
    maxHeight: 200,
  },
  charCount: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "right",
    marginTop: 8,
  },
  tipsCard: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 28,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 10,
  },
  tipText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 6,
    lineHeight: 20,
  },
  buttonWrapper: {
    marginBottom: 16,
  },
  submitButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});