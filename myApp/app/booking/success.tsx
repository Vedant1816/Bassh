import { useEffect, useState } from "react";
import { View, Text, Image, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { API_BASE_URL } from "@/_services/api-config";

export default function BookingSuccess() {
  const { booking_id } = useLocalSearchParams();
  const [booking, setBooking] = useState<any>(null);

  useEffect(() => {
    if (!booking_id) return;

    (async () => {
      const res = await fetch(
        `${API_BASE_URL}/api/bookings/${booking_id}`,
        await withAuthHeaders({ method: "GET" })
      );
      const data = await res.json();
      if (res.ok) setBooking(data);
    })();
  }, [booking_id]);

  if (!booking) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000", justifyContent: "center" }}>
        <ActivityIndicator color="#EC4899" />
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#000",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <Text style={{ color: "#fff", fontSize: 26, fontWeight: "800" }}>
        Booking Confirmed 🎉
      </Text>

      <Text style={{ color: "#9ca3af", marginTop: 8 }}>
        Show this QR at entry
      </Text>

      <Image
        source={{ uri: booking.qr_code }}
        style={{ width: 220, height: 220, marginTop: 32 }}
      />

      <Text style={{ color: "#EC4899", marginTop: 16 }}>
        Booking ID: {booking.id}
      </Text>
    </View>
  );
}