import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { fetchWithFallback } from "@/_services/api-config";
import { Colors } from "@/constants/Colors";

interface Booking {
  id: string;
  event_id: string;
  booking_date: string;
  booking_time: string;
  booking_status: string;
  entry_status: string;
  total_amount: number;
  participants: any[];
  qr_code: string;
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

export default function BookingsScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await fetchWithFallback(
        "/api/bookings/my-bookings",
        await withAuthHeaders({ method: "GET" })
      );

      if (!res.ok) {
        throw new Error("Failed to fetch bookings");
      }

      const data = await res.json();
      const confirmedBookings = (data.bookings || []).filter(
        (booking: Booking) => booking.booking_status === "confirmed"
      );
      const sortedBookings = confirmedBookings.sort((a: Booking, b: Booking) => {
        return new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime();
      });
      setBookings(sortedBookings);
      setError("");
    } catch (err: any) {
      setError(err.message || "Failed to load bookings");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const handleBookingPress = (booking: Booking) => {
    router.push(`/booking/${booking.id}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return "";
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return Colors.dark.success;
      case "pending":
        return Colors.dark.warning;
      case "cancelled":
        return Colors.dark.error;
      default:
        return Colors.dark.textSecondary;
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return Colors.dark.successBg;
      case "pending":
        return Colors.dark.warningBg;
      case "cancelled":
        return Colors.dark.errorBg;
      default:
        return Colors.dark.surface;
    }
  };

  const renderBookingCard = ({ item }: { item: Booking }) => (
    <Pressable
      style={({ pressed }) => [
        styles.bookingCard,
        pressed && styles.bookingCardPressed,
      ]}
      onPress={() => handleBookingPress(item)}
    >
      <View style={styles.cardImageContainer}>
        {item.events?.banner_image_url ? (
          <Image
            source={{ uri: item.events.banner_image_url }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.cardPlaceholder}>
            <Ionicons name="musical-notes" size={48} color={Colors.dark.textTertiary} />
          </View>
        )}
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusBgColor(item.booking_status) },
          ]}
        >
          <Text
            style={[styles.statusText, { color: getStatusColor(item.booking_status) }]}
          >
            {item.booking_status.toUpperCase()}
          </Text>
        </View>
        {item.entry_status === "entered" && (
          <View style={styles.entryBadge}>
            <Text style={styles.entryBadgeText}>✓ Entered</Text>
          </View>
        )}
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.eventName} numberOfLines={2}>
          {item.events?.name || "Event"}
        </Text>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={14} color={Colors.dark.textSecondary} />
          <Text style={styles.infoText} numberOfLines={1}>
            {item.events?.clubs?.club_name || "Venue"}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={14} color={Colors.dark.textSecondary} />
          <Text style={styles.infoText}>
            {formatDate(item.events?.event_date)} · {formatTime(item.events?.start_time)}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="people-outline" size={14} color={Colors.dark.textSecondary} />
          <Text style={styles.infoText}>
            {item.participants?.length || 0} participant{item.participants?.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <View style={styles.cardDivider} />
        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.amountLabel}>Total Paid</Text>
            <Text style={styles.amountValue}>₹{item.total_amount}</Text>
          </View>
          <View style={styles.bookingDateContainer}>
            <Text style={styles.bookingDateLabel}>Booked on</Text>
            <Text style={styles.bookingDateValue}>{formatDate(item.booking_date)}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centerContainer}>
          <Ionicons name="warning-outline" size={64} color={Colors.dark.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={fetchBookings}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </>
    );
  }

  if (bookings.length === 0) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centerContainer}>
          <Ionicons name="receipt-outline" size={80} color={Colors.dark.textTertiary} />
          <Text style={styles.emptyTitle}>No Bookings Yet</Text>
          <Text style={styles.emptyText}>
            Your confirmed bookings will appear here
          </Text>
          <Pressable
            style={styles.exploreButton}
            onPress={() => router.push("/(tabs)/events")}
          >
            <Text style={styles.exploreButtonText}>Explore Events</Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "My Bookings",
          headerTitleStyle: { color: Colors.dark.text, fontWeight: "700" },
          headerStyle: { backgroundColor: Colors.dark.background },
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
            </Pressable>
          ),
        }}
      />
      <View style={styles.container}>
        <FlatList
          data={bookings}
          renderItem={renderBookingCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.dark.primary}
            />
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  backButton: {
    padding: 8,
    marginLeft: 8,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  loadingText: {
    color: Colors.dark.textSecondary,
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    color: Colors.dark.error,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: "600",
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.dark.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  exploreButtonText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: "600",
  },
  bookingCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 20,
    marginBottom: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  bookingCardPressed: {
    opacity: 0.8,
  },
  cardImageContainer: {
    width: "100%",
    height: 180,
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: Colors.dark.card,
    justifyContent: "center",
    alignItems: "center",
  },
  statusBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  entryBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.dark.successBg,
  },
  entryBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.dark.success,
  },
  cardContent: {
    padding: 16,
  },
  eventName: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.dark.text,
    marginBottom: 12,
    lineHeight: 26,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    flex: 1,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginVertical: 16,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  amountLabel: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.dark.primary,
  },
  bookingDateContainer: {
    alignItems: "flex-end",
  },
  bookingDateLabel: {
    fontSize: 11,
    color: Colors.dark.textTertiary,
    marginBottom: 2,
  },
  bookingDateValue: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    fontWeight: "500",
  },
});
