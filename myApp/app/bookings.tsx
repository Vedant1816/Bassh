import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
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
  // For table bookings (no event)
  clubs?: {
    club_name: string;
    address_text: string;
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
      setBookings(data.bookings || []);
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
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = date.getDate();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return "";
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getBookingType = (booking: Booking) => {
    // Check if it's a table booking (no event_id) or event booking
    if (!booking.event_id || !booking.events) {
      return "Table Entry";
    }
    
    // For event bookings, determine entry type from participants
    const participants = booking.participants || [];
    const males = participants.filter(p => p.gender?.toLowerCase() === "male").length;
    const females = participants.filter(p => p.gender?.toLowerCase() === "female").length;
    
    const couples = Math.min(males, females);
    const remainingMales = males - couples;
    const remainingFemales = females - couples;
    
    if (couples > 0 && remainingMales === 0 && remainingFemales === 0) {
      return couples === 1 ? "Couple Entry" : `Couple Entry (${couples})`;
    }
    
    if (remainingMales > 0 && remainingFemales === 0 && couples === 0) {
      return remainingMales === 1 ? "Male Entry" : `Male Entry (${remainingMales})`;
    }
    
    if (remainingFemales > 0 && remainingMales === 0 && couples === 0) {
      return remainingFemales === 1 ? "Female Entry" : `Female Entry (${remainingFemales})`;
    }
    
    // Mixed entry
    return `${participants.length} Guests`;
  };

  const getEventName = (booking: Booking) => {
    if (booking.events?.name) {
      return booking.events.name;
    }
    
    if (booking.clubs?.club_name) {
      return booking.clubs.club_name;
    }
    
    return "Event";
  };

  const getStatusBadge = (booking: Booking) => {
    const status = booking.booking_status?.toLowerCase();
    const entryStatus = booking.entry_status?.toLowerCase();
    
    if (entryStatus === "entered") {
      return { text: "Entered", color: Colors.dark.success };
    }
    
    if (status === "confirmed") {
      return { text: "Confirmed", color: Colors.dark.success };
    }
    
    if (status === "cancelled") {
      return { text: "Cancelled", color: Colors.dark.error };
    }
    
    if (status === "pending") {
      return { text: "Pending", color: Colors.dark.warning };
    }
    
    return { text: status || "Unknown", color: Colors.dark.textSecondary };
  };

  const renderBookingCard = ({ item }: { item: Booking }) => {
    const statusBadge = getStatusBadge(item);
    
    return (
      <Pressable
        style={({ pressed }) => [
          styles.bookingCard,
          pressed && styles.bookingCardPressed,
        ]}
        onPress={() => handleBookingPress(item)}
      >
        {/* Booking Code */}
        <View style={styles.codeRow}>
          <Text style={styles.bookingCode}>Booking Code - {item.id.slice(0, 13).toUpperCase()}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusBadge.color}20` }]}>
            <Text style={[styles.statusText, { color: statusBadge.color }]}>
              {statusBadge.text}
            </Text>
          </View>
        </View>

        {/* Info Grid */}
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoValue}>{formatDate(item.events?.event_date || item.booking_date)}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoValue}>{formatTime(item.events?.start_time || item.booking_time)}</Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoValue}>{getBookingType(item)}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoValue}>{getEventName(item)}</Text>
          </View>
        </View>

        {/* View Details */}
        <View style={styles.viewDetailsContainer}>
          <Text style={styles.viewDetailsText}>View Details</Text>
        </View>
      </Pressable>
    );
  };

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
            Your bookings will appear here
          </Text>
          <Pressable
            style={styles.exploreButton}
            onPress={() => router.push("/(tabs)")}
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
          headerTitle: "Table bookings",
          headerTitleStyle: { 
            color: Colors.dark.text, 
            fontWeight: "700",
            fontSize: 16,
          },
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
        {/* All bookings title */}
        <Text style={styles.sectionTitle}>All bookings</Text>

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
    backgroundColor: "#131315",
  },
  centerContainer: {
    flex: 1,
    backgroundColor: "#131315",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  backButton: {
    padding: 8,
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#D1D5DB",
    paddingHorizontal: 12,
    paddingTop: 20,
    paddingBottom: 12,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 100,
    gap: 12,
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
    marginTop: 16,
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
    backgroundColor: "#1E1E20",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#343434",
    padding: 16,
  },
  bookingCardPressed: {
    opacity: 0.7,
  },
  codeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  bookingCode: {
    fontSize: 16,
    fontWeight: "700",
    color: "#D1D5DB",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  infoGrid: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 10,
  },
  infoItem: {
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#D1D5DB",
  },
  viewDetailsContainer: {
    marginTop: 6,
    alignItems: "flex-end",
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});