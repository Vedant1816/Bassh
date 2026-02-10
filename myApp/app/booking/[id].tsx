import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { fetchWithFallback } from "@/_services/api-config";
import { LinearGradient } from "expo-linear-gradient";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

/* Theme aligned with payment/success.tsx: black bg, green gradient, #00FF6F accent, #515151 borders */
const GREEN_GRADIENT = ["#00FF6D", "#000000"] as const;
const GREEN_GRADIENT_LOCATIONS = [0.36, 1] as const;
const RED_GRADIENT = ["#DC2626", "#000000"] as const;
const RED_GRADIENT_LOCATIONS = [0.36, 1] as const;

const SUCCESS_CARD_BG = "rgba(31, 31, 31, 0.73)";
const SUCCESS_CARD_BORDER = "#515151";
const SUCCESS_PRIMARY_BG = "#00FF6F";
const SUCCESS_DIVIDER = "#515151";

const THEMES = {
  success: {
    gradient: GREEN_GRADIENT,
    gradientLocations: GREEN_GRADIENT_LOCATIONS,
    accent: "#00FF6F",
    accentDark: "#2D5016",
    cardBg: SUCCESS_CARD_BG,
    cardBorder: SUCCESS_CARD_BORDER,
    muted: "rgba(255, 255, 255, 0.7)",
    primaryButtonBg: SUCCESS_PRIMARY_BG,
    primaryButtonTextColor: "#000000",
    secondaryBorder: SUCCESS_CARD_BORDER,
    enteredBadgeBg: "rgba(0, 255, 111, 0.25)",
    enteredBadgeIcon: "#2D5016",
    reviewedBadgeBg: "rgba(0, 255, 111, 0.2)",
    reviewedBadgeBorder: "rgba(0, 255, 111, 0.5)",
    cancelledBadgeBg: "rgba(239, 68, 68, 0.2)",
    cancelledBadgeIcon: "#7F1D1D",
    amountColor: "#00FF6F",
    divider: SUCCESS_DIVIDER,
  },
  failure: {
    gradient: RED_GRADIENT,
    gradientLocations: RED_GRADIENT_LOCATIONS,
    accent: "#EF4444",
    accentDark: "#7F1D1D",
    cardBg: SUCCESS_CARD_BG,
    cardBorder: SUCCESS_CARD_BORDER,
    muted: "rgba(255, 255, 255, 0.7)",
    primaryButtonBg: "#EF4444",
    primaryButtonTextColor: "#FFFFFF",
    secondaryBorder: SUCCESS_CARD_BORDER,
    enteredBadgeBg: "rgba(0, 255, 111, 0.2)",
    enteredBadgeIcon: "#2D5016",
    reviewedBadgeBg: "rgba(0, 255, 111, 0.2)",
    reviewedBadgeBorder: "rgba(0, 255, 111, 0.5)",
    cancelledBadgeBg: "rgba(239, 68, 68, 0.25)",
    cancelledBadgeIcon: "#7F1D1D",
    amountColor: "#FFFFFF",
    divider: SUCCESS_DIVIDER,
  },
  default: {
    gradient: GREEN_GRADIENT,
    gradientLocations: GREEN_GRADIENT_LOCATIONS,
    accent: "#00FF6F",
    accentDark: "#2D5016",
    cardBg: SUCCESS_CARD_BG,
    cardBorder: SUCCESS_CARD_BORDER,
    muted: "rgba(255, 255, 255, 0.7)",
    primaryButtonBg: SUCCESS_PRIMARY_BG,
    primaryButtonTextColor: "#000000",
    secondaryBorder: SUCCESS_CARD_BORDER,
    enteredBadgeBg: "rgba(0, 255, 111, 0.25)",
    enteredBadgeIcon: "#2D5016",
    reviewedBadgeBg: "rgba(0, 255, 111, 0.2)",
    reviewedBadgeBorder: "rgba(0, 255, 111, 0.5)",
    cancelledBadgeBg: "rgba(239, 68, 68, 0.2)",
    cancelledBadgeIcon: "#7F1D1D",
    amountColor: "#00FF6F",
    divider: SUCCESS_DIVIDER,
  },
} as const;

interface BookingDetail {
  id: string;
  booking_date: string;
  booking_status: string;
  entry_status: string;
  total_amount: number;
  participants: {
    name: string;
    gender: string;
    age: number;
    email?: string;
  }[];
  qr_code: string;
  entered_at: string | null;
  events: {
    id: string;
    name: string;
    event_date: string;
    start_time: string;
    banner_image_url: string;
    clubs: {
      id: string;
      club_name: string;
      address_text: string;
    };
  };
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const [hasReviewed, setHasReviewed] = useState(false);
  const [checkingReview, setCheckingReview] = useState(false);

  useEffect(() => {
    fetchBooking();
  }, [id]);

  const fetchBooking = async () => {
    try {
      const res = await fetchWithFallback(
        `/api/bookings/${id}`,
        await withAuthHeaders({ method: "GET" })
      );

      if (!res.ok) throw new Error("Failed to fetch booking");

      const data = await res.json();
      setBooking(data.booking);

      // Check if user has already reviewed
      if (data.booking.entry_status === "entered") {
        checkIfReviewed(id as string);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load booking");
    } finally {
      setLoading(false);
    }
  };

  /* ================= CHECK IF REVIEWED ================= */

  const checkIfReviewed = async (bookingId: string) => {
    try {
      setCheckingReview(true);
      const res = await fetchWithFallback(
        `/api/reviews?booking_id=${bookingId}`,
        await withAuthHeaders({ method: "GET" })
      );

      if (res.ok) {
        const data = await res.json();
        setHasReviewed(data.reviews && data.reviews.length > 0);
      }
    } catch (err) {
      console.error("❌ Check review error:", err);
    } finally {
      setCheckingReview(false);
    }
  };

  /* ================= CANCEL BOOKING ================= */

  const handleCancelBooking = () => {
    if (!booking) return;

    if (booking.entry_status === "entered") {
      Alert.alert(
        "Cannot Cancel",
        "This booking cannot be cancelled as you have already entered the venue.",
        [{ text: "OK" }]
      );
      return;
    }

    if (booking.booking_status === "cancelled") {
      Alert.alert(
        "Already Cancelled",
        "This booking has already been cancelled.",
        [{ text: "OK" }]
      );
      return;
    }

    Alert.alert(
      "Cancel Booking?",
      "Are you sure you want to cancel this booking? This action cannot be undone.",
      [
        {
          text: "No, Keep It",
          style: "cancel",
        },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: confirmCancelBooking,
        },
      ]
    );
  };

  const confirmCancelBooking = async () => {
    if (!booking) return;

    try {
      setCancelling(true);

      const res = await fetchWithFallback(
        `/api/bookings/${booking.id}/cancel`,
        await withAuthHeaders({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel booking");
      }

      Alert.alert(
        "Booking Cancelled",
        "Your booking has been cancelled successfully.",
        [
          {
            text: "OK",
            onPress: () => {
              fetchBooking();
            },
          },
        ]
      );
    } catch (err: any) {
      console.error("❌ Cancel booking error:", err);
      Alert.alert(
        "Cancellation Failed",
        err.message || "Failed to cancel booking. Please try again."
      );
    } finally {
      setCancelling(false);
    }
  };

  /* ================= REVIEW ================= */

  const handleWriteReview = () => {
    if (!booking?.events?.clubs?.id || !booking.events?.id) return;

    router.push({
      pathname: "/review",
      params: {
        booking_id: booking.id,
        club_id: booking.events.clubs.id,
        club_name: booking.events.clubs.club_name ?? "",
        event_id: booking.events.id,
        event_name: booking.events.name ?? "",
      },
    });
  };

  /* ================= QR HELPERS ================= */

  const getQRFile = async () => {
    if (!booking?.qr_code) throw new Error("QR not available");

    if (!FileSystem.documentDirectory) {
      throw new Error("File system unavailable");
    }

    let base64 = booking.qr_code;
    if (base64.includes(";base64,")) {
      base64 = base64.split(";base64,")[1];
    }

    const fileUri =
      FileSystem.documentDirectory + `booking_${booking.id}_qr.png`;

    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return fileUri;
  };

  /* ================= SHARE ================= */

  const handleShareQR = async () => {
    try {
      if (!booking?.qr_code) {
        Alert.alert("QR not available");
        return;
      }

      if (!FileSystem.documentDirectory) {
        Alert.alert("File system unavailable");
        return;
      }

      let base64 = booking.qr_code;
      if (base64.includes(";base64,")) {
        base64 = base64.split(";base64,")[1];
      }

      const fileUri =
        FileSystem.documentDirectory + `booking_${booking.id}_qr.png`;

      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert("Sharing not available on this device");
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: "image/png",
        dialogTitle: "Share QR Code",
        UTI: "public.png",
      });
    } catch (err: any) {
      console.error("❌ QR Share Error:", err);
      Alert.alert("Share failed", err.message || "Something went wrong");
    }
  };

  /* ================= DOWNLOAD ================= */

  const handleDownloadQR = async () => {
    try {
      const fileUri = await getQRFile();

      Alert.alert(
        "Downloaded",
        "QR code saved successfully.\n\nYou can find it in your app storage or files."
      );
    } catch (err: any) {
      Alert.alert("Download failed", err.message || "Something went wrong");
    }
  };

  /* ================= HELPERS ================= */

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-IN", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  const formatTime = (time: string) => {
    const [h, m] = time.split(":");
    const hour = Number(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 || 12}:${m} ${ampm}`;
  };

  const canCancelBooking = () => {
    if (!booking) return false;
    return (
      booking.entry_status !== "entered" &&
      booking.booking_status !== "cancelled"
    );
  };

  const shouldShowQR = () => {
    if (!booking) return false;
    return (
      booking.entry_status !== "entered" &&
      booking.booking_status !== "cancelled"
    );
  };

  const shouldShowReviewButton = () => {
    if (!booking) return false;
    return booking.entry_status === "entered" && !hasReviewed && !checkingReview;
  };

  const isSuccessState = (b: BookingDetail) =>
    b.booking_status === "confirmed" || b.entry_status === "entered";
  const isFailureState = (b: BookingDetail) =>
    b.booking_status === "cancelled" || (b.booking_status as string) === "missed";

  const getTheme = (b: BookingDetail | null) =>
    b && isFailureState(b) ? THEMES.failure : b && isSuccessState(b) ? THEMES.success : THEMES.default;

  /* ================= UI ================= */

  const defaultTheme = THEMES.default;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#00FF6F" />
        <Text style={styles.loadingText}>Loading your booking...</Text>
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <LinearGradient
          colors={defaultTheme.gradient}
          locations={defaultTheme.gradientLocations}
          style={styles.gradientBlur}
        />
        <View style={styles.center}>
          <Text style={styles.error}>{error || "Booking not found"}</Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.primaryButtonSolid, { backgroundColor: defaultTheme.primaryButtonBg }]}
          >
            <Text style={[styles.primaryButtonTextSolid, { color: defaultTheme.primaryButtonTextColor }]}>
              Go Back
            </Text>
          </Pressable>
        </View>
        <View style={styles.homeIndicator} />
      </View>
    );
  }

  const theme = getTheme(booking);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={theme.gradient}
        locations={theme.gradientLocations}
        style={styles.gradientBlur}
      />

      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          onPress={() => router.back()}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>Booking Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {shouldShowQR() ? (
          <View style={[styles.qrCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <View style={styles.qrWrapper}>
              <Image source={{ uri: booking.qr_code }} style={styles.qr} />
            </View>
            <Text style={[styles.qrHint, { color: theme.muted }]}>Show at entry</Text>

            <Pressable
              style={[styles.primaryButtonSolid, { backgroundColor: theme.primaryButtonBg }]}
              onPress={handleShareQR}
            >
              <Text style={[styles.primaryButtonTextSolid, { color: theme.primaryButtonTextColor }]}>
                Share Ticket
              </Text>
            </Pressable>

            <Pressable
              style={[styles.secondaryButtonSolid, { borderColor: theme.secondaryBorder }]}
              onPress={handleDownloadQR}
            >
              <Text style={styles.secondaryButtonTextSolid}>Download QR</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.statusCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            {booking.entry_status === "entered" ? (
              <>
                <View style={[styles.enteredBadge, { backgroundColor: theme.enteredBadgeBg }]}>
                  <Text style={[styles.enteredIcon, { color: theme.enteredBadgeIcon }]}>✓</Text>
                </View>
                <Text style={[styles.enteredText, { color: theme.accent }]}>Already Entered</Text>
                <Text style={[styles.muted, { color: theme.muted }]}>
                  You entered on {formatDate(booking.entered_at || "")}
                </Text>

                {shouldShowReviewButton() && (
                  <Pressable
                    style={[styles.primaryButtonSolid, { backgroundColor: theme.primaryButtonBg }]}
                    onPress={handleWriteReview}
                  >
                    <Text style={[styles.primaryButtonTextSolid, { color: theme.primaryButtonTextColor }]}>
                      Write a Review
                    </Text>
                  </Pressable>
                )}

                {hasReviewed && (
                  <View
                    style={[
                      styles.reviewedBadge,
                      { backgroundColor: theme.reviewedBadgeBg, borderColor: theme.reviewedBadgeBorder },
                    ]}
                  >
                    <Text style={[styles.reviewedText, { color: theme.accent }]}>Review Submitted</Text>
                  </View>
                )}
              </>
            ) : (
              <>
                <View style={[styles.cancelledBadge, { backgroundColor: theme.cancelledBadgeBg }]}>
                  <Text style={[styles.cancelledIcon, { color: theme.cancelledBadgeIcon }]}>✕</Text>
                </View>
                <Text style={[styles.cancelledText, { color: theme.accent }]}>Booking Cancelled</Text>
                <Text style={[styles.muted, { color: theme.muted }]}>
                  This booking has been cancelled
                </Text>
              </>
            )}
          </View>
        )}

        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
          <Text style={[styles.sectionLabel, { color: theme.muted }]}>STATUS</Text>
          <View style={styles.statusRow}>
            <View>
              <Text style={[styles.label, { color: theme.muted }]}>Booking Status</Text>
              <Text
                style={[
                  styles.value,
                  {
                    color:
                      booking.booking_status === "confirmed" || booking.entry_status === "entered"
                        ? theme.accent
                        : booking.booking_status === "cancelled"
                          ? theme.accent
                          : "#FBBF24",
                  },
                ]}
              >
                {booking.booking_status.toUpperCase()}
              </Text>
            </View>

            {canCancelBooking() && (
              <Pressable
                style={[
                  styles.cancelBtn,
                  cancelling && styles.cancelBtnDisabled,
                ]}
                onPress={handleCancelBooking}
                disabled={cancelling}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.cancelBtnText}>Cancel Booking</Text>
                )}
              </Pressable>
            )}
          </View>

          {booking.entry_status === "entered" && booking.entered_at && (
            <View style={[styles.entryInfo, { borderTopColor: theme.divider }]}>
              <Text style={[styles.entryIcon, { color: theme.accent }]}>✓</Text>
              <Text style={[styles.entryText, { color: theme.accent }]}>
                Entered on {formatDate(booking.entered_at)}
              </Text>
            </View>
          )}
        </View>

        {booking.events && (
          <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <Text style={[styles.sectionLabel, { color: theme.muted }]}>EVENT</Text>
            <Text style={styles.title}>{booking.events.name ?? "Event"}</Text>

            {booking.events.banner_image_url && (
              <Image
                source={{ uri: booking.events.banner_image_url }}
                style={styles.banner}
              />
            )}

            <View style={[styles.eventMeta, { borderTopColor: theme.divider }]}>
              <Text style={[styles.clubName, { color: theme.muted }]}>{booking.events.clubs?.club_name ?? ""}</Text>
              <Text style={[styles.eventDateTime, { color: theme.muted }]}>
                {booking.events.event_date ? formatDate(booking.events.event_date) : ""}
                {booking.events.event_date && booking.events.start_time ? " · " : ""}
                {booking.events.start_time ? formatTime(booking.events.start_time) : ""}
              </Text>
            </View>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
          <Text style={[styles.sectionLabel, { color: theme.muted }]}>PARTICIPANTS</Text>
          {booking.participants.map((p, i) => (
            <View
              key={p.name + i}
              style={[
                styles.participantRow,
                {
                  borderBottomWidth: i < booking.participants.length - 1 ? 1 : 0,
                  borderBottomColor: theme.divider,
                },
              ]}
            >
              <View style={[styles.participantAvatar, { backgroundColor: `${theme.accent}20` }]}>
                <Text style={[styles.participantInitial, { color: theme.accent }]}>
                  {p.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.participantInfo}>
                <Text style={styles.participantName}>{p.name}</Text>
                <Text style={[styles.participantDetail, { color: theme.muted }]}>
                  {p.gender} · {p.age} yrs
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.amountCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
          <Text style={[styles.amountLabel, { color: theme.muted }]}>Total Paid</Text>
          <Text style={[styles.amount, { color: theme.amountColor }]}>₹{booking.total_amount}</Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.homeIndicator} />
    </View>
  );
}

/* ================= STYLES ================= */

const HEADER_TOP = Platform.OS === "ios" ? 56 : 48;
const CARD_RADIUS = 18;
const CARD_PADDING = 20;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
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
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: HEADER_TOP,
    paddingBottom: 16,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonPressed: { opacity: 0.7 },
  backIcon: {
    fontSize: 26,
    color: "#FFFFFF",
    fontWeight: "400",
    marginLeft: -2,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerSpacer: { width: 40 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 50 },
  qrCard: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 24,
    marginBottom: 20,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  qr: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  qrHint: {
    fontSize: 14,
    marginTop: 16,
    letterSpacing: 0.3,
    color: "#FFFFFF",
  },
  muted: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 15,
    marginTop: 8,
  },
  primaryButtonSolid: {
    marginTop: 20,
    width: "100%",
    maxWidth: 280,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonTextSolid: {
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButtonSolid: {
    marginTop: 12,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: "center",
  },
  secondaryButtonTextSolid: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  statusCard: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 24,
    marginBottom: 20,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
  },
  enteredBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  enteredIcon: {
    fontSize: 36,
    fontWeight: "700",
  },
  enteredText: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
  },
  cancelledBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  cancelledIcon: {
    fontSize: 36,
    fontWeight: "700",
  },
  cancelledText: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
  },
  reviewedBadge: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  reviewedText: {
    fontWeight: "600",
    fontSize: 14,
  },
  card: {
    marginBottom: 16,
    borderRadius: CARD_RADIUS,
    padding: CARD_PADDING,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    marginBottom: 4,
  },
  value: { fontWeight: "700", fontSize: 16, color: "#FFFFFF" },
  banner: {
    width: "100%",
    height: 140,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  eventMeta: {
    borderTopWidth: 1,
    paddingTop: 14,
  },
  clubName: {
    fontSize: 15,
    fontWeight: "600",
  },
  eventDateTime: {
    fontSize: 14,
    marginTop: 4,
  },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  participantAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  participantInitial: {
    fontSize: 18,
    fontWeight: "700",
  },
  participantInfo: { flex: 1 },
  participantName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  participantDetail: {
    fontSize: 13,
    marginTop: 2,
  },
  amountCard: {
    marginBottom: 24,
    borderRadius: CARD_RADIUS,
    padding: CARD_PADDING,
    borderWidth: 1,
    alignItems: "center",
  },
  amountLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  amount: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  error: {
    color: "#EF4444",
    textAlign: "center",
    fontSize: 15,
    marginBottom: 20,
  },
  cancelBtn: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  cancelBtnDisabled: { opacity: 0.6 },
  cancelBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  entryInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  entryIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  entryText: {
    fontSize: 14,
    fontWeight: "600",
  },
  bottomSpacer: {
    height: Platform.OS === "ios" ? 40 : 24,
  },
  homeIndicator: {
    position: "absolute",
    width: 134,
    height: 5,
    left: "50%",
    bottom: 8,
    marginLeft: -67,
    backgroundColor: "#FFFFFF",
    borderRadius: 100,
    opacity: 0.3,
  },
});