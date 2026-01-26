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
      FileSystem.documentDirectory +
      `booking_${booking.id}_qr.png`;

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
        FileSystem.documentDirectory +
        `booking_${booking.id}_qr.png`;

      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert("Sharing not available on this device");
        return;
      }

      // Create message with booking details
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

      // Share PNG with message
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
        {/* QR */}
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

        {/* STATUS */}
        <View style={styles.card}>
          <Text style={styles.label}>Status</Text>
          <Text
            style={[
              styles.value,
              { color: statusColor(booking.booking_status) },
            ]}
          >
            {booking.booking_status.toUpperCase()}
          </Text>
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
  shareBtn: {
    marginTop: 12,
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  shareText: { color: "#000", fontWeight: "700" },
  card: {
    backgroundColor: Colors.dark.surface,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.dark.text,
    marginBottom: 8,
  },
  label: { color: Colors.dark.textSecondary },
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
  btnText: { color: "#000", fontWeight: "700" },
  error: { color: Colors.dark.error, textAlign: "center" },
});