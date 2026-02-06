import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { fetchWithFallback } from "@/_services/api-config";
import { withAuthHeaders } from "@/_services/auth-fetch";
import supabase from "@/_services/supabase-public";

type ReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  is_verified: boolean;
  created_at: string;
  clubs: { id: string; club_name: string } | null;
  events: { id: string; name: string } | null;
};

export default function MyReviewsScreen() {
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchReviews = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/(auth)");
        return;
      }

      const res = await fetchWithFallback(
        `/api/reviews?user_id=${encodeURIComponent(user.id)}`,
        await withAuthHeaders({ method: "GET" })
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load reviews");
      }

      const data = await res.json();
      setReviews(data.reviews || []);
      setError("");
    } catch (err: any) {
      setError(err.message || "Failed to load reviews");
      setReviews([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReviews();
  };

  const formatDateWithTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const date = d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const time = d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      return `${date} ${time}`;
    } catch {
      return dateStr;
    }
  };

  const headerOptions = {
    headerShown: true,
    headerTitle: "Your Reviews",
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
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={headerOptions} />
        <View style={styles.container}>
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.dark.text} />
            <Text style={styles.loadingText}>Loading reviews...</Text>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={headerOptions} />
      <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
          />
        }
      >
        {error ? (
          <View style={styles.errorBlock}>
            <Ionicons name="warning-outline" size={48} color="#CCCCCC" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchReviews}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : reviews.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Ionicons name="star-outline" size={56} color="#666666" />
            <Text style={styles.emptyTitle}>No reviews yet</Text>
            <Text style={styles.emptySubtitle}>
              Your reviews will appear here after you submit them from a booking.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionHeader}>All Reviews</Text>
            <View style={styles.list}>
              {reviews.map((item) => (
                <View key={item.id} style={styles.card}>
                  <Text style={styles.reviewText} numberOfLines={3}>
                    {item.comment || "No comment"}
                  </Text>
                  <View style={styles.cardFooter}>
                    <Text style={styles.dateTime}>
                      {formatDateWithTime(item.created_at)}
                    </Text>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => {
                        router.push({
                          pathname: "/review",
                          params: {
                            review_id: item.id,
                            club_id: item.clubs?.id,
                            club_name: item.clubs?.club_name,
                            event_id: item.events?.id,
                            event_name: item.events?.name,
                          },
                        } as any);
                      }}
                    >
                      <Text style={styles.editReviewText}>Edit Review</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  backButton: { padding: 8, marginLeft: 8 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: "#666666",
    marginTop: 12,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: 16,
    marginBottom: 8,
    marginTop: 8,
  },
  list: { paddingHorizontal: 16 },
  card: {
    backgroundColor: "#0F0F0F",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reviewText: {
    fontSize: 16,
    fontWeight: "400",
    color: "#FFFFFF",
    lineHeight: 22,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateTime: { fontSize: 13, color: "#666666" },
  editReviewText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  errorBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  errorText: {
    fontSize: 16,
    color: "#CCCCCC",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#0F0F0F",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  emptyBlock: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
    lineHeight: 22,
  },
  bottomSpace: { height: 40 },
});
