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
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { fetchWithFallback } from "@/_services/api-config";
import { Colors } from "@/constants/Colors";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";

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
    name: string;
    event_date: string;
    start_time: string;
    banner_image_url: string;
    clubs: {
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
    } catch (err: any) {
      setError(err.message || "Failed to load booking");
    } finally {
      setLoading(false);
    }
  };

  /* ================= CANCEL BOOKING ================= */

  const handleCancelBooking = () => {
    if (!booking) return;

    // Check if already entered
    if (booking.entry_status === "entered") {
      Alert.alert(
        "Cannot Cancel",
        "This booking cannot be cancelled as you have already entered the venue.",
        [{ text: "OK" }]
      );
      return;
    }

    // Check if already cancelled
    if (booking.booking_status === "cancelled") {
      Alert.alert(
        "Already Cancelled",
        "This booking has already been cancelled.",
        [{ text: "OK" }]
      );
      return;
    }

    // Show confirmation dialog
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

      const data = await res.json();

      Alert.alert(
        "Booking Cancelled",
        "Your booking has been cancelled successfully.",
        [
          {
            text: "OK",
            onPress: () => {
              // Refresh booking data
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

      const message = `
🎟️ EVENT ENTRY PASS

📌 Event: ${booking.events.name}
📍 Club: ${booking.events.clubs.club_name}
🗺️ Address: ${booking.events.clubs.address_text}

📅 Date: ${formatDate(booking.events.event_date)}
⏰ Time: ${formatTime(booking.events.start_time)}

👥 Guests: ${booking.participants.length}
💰 Paid: ₹${booking.total_amount}

🆔 Booking ID: ${booking.id}

⚠️ Show this QR code at entry.
      `.trim();

      await Sharing.shareAsync(fileUri, {
        mimeType: "image/png",
        dialogTitle: "Share QR Code",
        UTI: "public.png",
        message: message,
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

  const statusColor = (s: string) =>
    s === "confirmed"
      ? Colors.dark.success
      : s === "pending"
      ? Colors.dark.warning
      : Colors.dark.error;

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

  /* ================= UI ================= */

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.dark.primary} />
        <Text style={styles.muted}>Loading booking…</Text>
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error || "Booking not found"}</Text>
        <Pressable onPress={() => router.back()} style={styles.btn}>
          <Text style={styles.btnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Booking Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* QR - Only show if not entered and not cancelled */}
        {shouldShowQR() ? (
          <View style={styles.qrBox}>
            <Image source={{ uri: booking.qr_code }} style={styles.qr} />
            <Text style={styles.muted}>Show at entry</Text>

            <Pressable style={styles.shareBtn} onPress={handleShareQR}>
              <Text style={styles.shareText}>📤 Share Ticket</Text>
            </Pressable>

            <Pressable style={styles.shareBtn} onPress={handleDownloadQR}>
              <Text style={styles.shareText}>⬇️ Download QR</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.qrBox}>
            {booking.entry_status === "entered" ? (
              <>
                <View style={styles.enteredBadge}>
                  <Text style={styles.enteredIcon}>✓</Text>
                </View>
                <Text style={styles.enteredText}>Already Entered</Text>
                <Text style={styles.muted}>
                  You entered on {formatDate(booking.entered_at || "")}
                </Text>
              </>
            ) : (
              <>
                <View style={styles.cancelledBadge}>
                  <Text style={styles.cancelledIcon}>✕</Text>
                </View>
                <Text style={styles.cancelledText}>Booking Cancelled</Text>
                <Text style={styles.muted}>
                  This booking has been cancelled
                </Text>
              </>
            )}
          </View>
        )}

        {/* STATUS */}
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.label}>Booking Status</Text>
              <Text
                style={[
                  styles.value,
                  { color: statusColor(booking.booking_status) },
                ]}
              >
                {booking.booking_status.toUpperCase()}
              </Text>
            </View>

            {/* Cancel Button */}
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
                  <ActivityIndicator size="small" color={Colors.dark.text} />
                ) : (
                  <Text style={styles.cancelBtnText}>Cancel Booking</Text>
                )}
              </Pressable>
            )}
          </View>

          {booking.entry_status === "entered" && booking.entered_at && (
            <View style={styles.entryInfo}>
              <Text style={styles.entryIcon}>✓</Text>
              <Text style={styles.entryText}>
                Entered on {formatDate(booking.entered_at)}
              </Text>
            </View>
          )}
        </View>

        {/* EVENT */}
        <View style={styles.card}>
          <Text style={styles.title}>{booking.events.name}</Text>

          {booking.events.banner_image_url && (
            <Image
              source={{ uri: booking.events.banner_image_url }}
              style={styles.banner}
            />
          )}

          <Text style={styles.muted}>
            📍 {booking.events.clubs.club_name}
          </Text>
          <Text style={styles.muted}>
            📅 {formatDate(booking.events.event_date)} ·{" "}
            {formatTime(booking.events.start_time)}
          </Text>
        </View>

        {/* PARTICIPANTS */}
        <View style={styles.card}>
          <Text style={styles.title}>Participants</Text>
          {booking.participants.map((p, i) => (
            <Text key={i} style={styles.muted}>
              {i + 1}. {p.name} · {p.gender} · {p.age}
            </Text>
          ))}
        </View>

        {/* PAYMENT */}
        <View style={styles.card}>
          <Text style={styles.label}>Total Paid</Text>
          <Text style={styles.amount}>₹{booking.total_amount}</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  back: { fontSize: 24, color: Colors.dark.text },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.dark.text,
  },
  qrBox: {
    alignItems: "center",
    padding: 24,
  },
  qr: {
    width: 260,
    height: 260,
    borderRadius: 16,
    backgroundColor: "#fff",
  },
  enteredBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.dark.successBg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  enteredIcon: {
    fontSize: 60,
    color: Colors.dark.success,
    fontWeight: "700",
  },
  enteredText: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.dark.success,
    marginBottom: 8,
  },
  cancelledBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.dark.errorBg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  cancelledIcon: {
    fontSize: 60,
    color: Colors.dark.error,
    fontWeight: "700",
  },
  cancelledText: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.dark.error,
    marginBottom: 8,
  },
  shareBtn: {
    marginTop: 12,
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  shareText: { color: Colors.dark.text, fontWeight: "700" },
  card: {
    backgroundColor: Colors.dark.surface,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.dark.text,
    marginBottom: 8,
  },
  label: { color: Colors.dark.textSecondary, marginBottom: 4 },
  value: { fontWeight: "700", fontSize: 16 },
  muted: { color: Colors.dark.textSecondary, marginTop: 4 },
  banner: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    marginVertical: 12,
  },
  amount: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.dark.primary,
  },
  btn: {
    marginTop: 16,
    backgroundColor: Colors.dark.primary,
    padding: 12,
    borderRadius: 10,
  },
  btnText: { color: Colors.dark.text, fontWeight: "700" },
  error: { color: Colors.dark.error, textAlign: "center" },
  cancelBtn: {
    backgroundColor: Colors.dark.error,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cancelBtnDisabled: {
    opacity: 0.6,
  },
  cancelBtnText: {
    color: Colors.dark.text,
    fontWeight: "700",
    fontSize: 13,
  },
  entryInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  entryIcon: {
    fontSize: 16,
    marginRight: 8,
    color: Colors.dark.success,
  },
  entryText: {
    fontSize: 13,
    color: Colors.dark.success,
    fontWeight: "500",
  },
});