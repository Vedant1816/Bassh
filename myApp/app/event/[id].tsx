import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
  StatusBar,
  Dimensions,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { fetchWithFallback } from "@/_services/api-config";

const { width } = Dimensions.get("window");

export default function EventDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const id = (Array.isArray(params.id) ? params.id[0] : params.id) as string | undefined;

  const [event, setEvent] = useState<any>(null);
  const [club, setClub] = useState<any>(null);
  const [pricing, setPricing] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("Event ID is missing");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetchWithFallback(
          `/api/events/${id}`,
          await withAuthHeaders({ method: "GET" })
        );

        const data = await res.json();

        if (!res.ok) {
          setError(data?.error || `Error ${res.status}`);
          setLoading(false);
          return;
        }

        setEvent(data.event);
        setClub(data.club);
        setPricing(data.pricing ?? []);
      } catch (e) {
        console.error("Error fetching event:", e);
        setError(e instanceof Error ? e.message : "Failed to load event");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const formatEventDate = (d: string | undefined) => {
    if (!d) return "Date TBA";
    try {
      const date = new Date(d);
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
    } catch {
      return d;
    }
  };

  const openDirections = () => {
    if (club?.latitude && club?.longitude) {
      const url = `https://www.google.com/maps/search/?api=1&query=${club.latitude},${club.longitude}`;
      Linking.openURL(url);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator color="#EC4899" size="large" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.error}>Error: {error}</Text>
      </View>
    );
  }

  if (!event) return null;

  const bannerUrl = event.banner_image_url || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800";
  const djImageUrl = event.dj_image_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200";

  const prices = pricing
    .map((p: any) => Number(p.price))
    .filter((n) => !Number.isNaN(n) && n >= 0);
  const minPrice = prices.length > 0 ? Math.min(...prices) : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* BANNER IMAGE WITH OVERLAY */}
        <View style={styles.bannerContainer}>
          <Image source={{ uri: bannerUrl }} style={styles.bannerImage} />
          <View style={styles.bannerOverlay} />
          
          {/* HEADER BUTTONS */}
          <View style={styles.headerButtons}>
            <Pressable style={styles.headerBtn} onPress={() => router.back()}>
              <Text style={styles.headerBtnText}>‹</Text>
            </Pressable>
            <View style={styles.headerRight}>
              <Pressable style={styles.headerBtn}>
                <Text style={styles.headerBtnText}>🔖</Text>
              </Pressable>
              <Pressable style={[styles.headerBtn, { marginLeft: 12 }]}>
                <Text style={styles.headerBtnText}>↗</Text>
              </Pressable>
            </View>
          </View>

          {/* EVENT INFO CARD */}
          <View style={styles.eventCard}>
            {/* TAGS */}
            {event.categories && event.categories.length > 0 && (
              <View style={styles.tagsRow}>
                {event.categories.map((category: string, index: number) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{category}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* TITLE */}
            <Text style={styles.eventTitle}>{event.name}</Text>

            {/* DATE/TIME */}
            <Text style={styles.eventDateTime}>
              {formatEventDate(event.event_date)}, {event.start_time || "6:00 PM"}
            </Text>

            {/* LOCATION */}
            {club && (
              <Pressable style={styles.infoRow} onPress={openDirections}>
                <Text style={styles.infoIcon}>📍</Text>
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>{club.club_name || "Venue"}</Text>
                  <Text style={styles.infoSubtitle}>
                    {club.address_text || "Location TBA"}
                    {club.guest_count ? ` · ${club.guest_count} guests` : ""}
                  </Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </Pressable>
            )}

            {/* SCHEDULE */}
            <Pressable style={styles.infoRow}>
              <Text style={styles.infoIcon}>📅</Text>
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>
                  Gates open at {event.start_time ? getGatesOpenTime(event.start_time) : "5:30 PM"}
                </Text>
                <Text style={styles.infoSubtitle}>View full schedule & timeline</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
          </View>
        </View>

        {/* WHO'S TAKING THE STAGE */}
        {event.dj_name && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Who's taking the stage</Text>
            <View style={styles.performerCard}>
              <Image source={{ uri: djImageUrl }} style={styles.performerImage} />
              <View style={styles.performerInfo}>
                <Text style={styles.performerName}>{event.dj_name}</Text>
                <Pressable>
                  <Text style={styles.knowMore}>Know more ›</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* ABOUT THE EVENT */}
        {event.about && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About the event</Text>
            <Text style={styles.aboutText}>{event.about}</Text>
          </View>
        )}

        {/* THINGS TO KNOW */}
        {event.terms_and_conditions && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Things to Know</Text>
            <Text style={styles.aboutText}>{event.terms_and_conditions}</Text>
          </View>
        )}

        {/* BOTTOM SPACING FOR STICKY FOOTER */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* FLOATING ASK ANYTHING BUTTON */}
      <Pressable style={styles.askButton}>
        <Text style={styles.askIcon}>💬</Text>
        <Text style={styles.askText}>Ask anything</Text>
      </Pressable>

      {/* STICKY FOOTER: MIN PRICE + BOOK TICKETS */}
      <View style={styles.bookFooter}>
        <View style={styles.bookFooterLeft}>
          <Text style={styles.bookFooterPrice}>
            {minPrice != null ? `₹${minPrice}` : "—"}
          </Text>
        </View>
        <Pressable
          style={styles.bookFooterBtn}
          onPress={() => {
            if (id) {
              router.push(`/event/${id}/book` as any);
            }
          }}
        >
          <Text style={styles.bookFooterBtnText}>Book tickets</Text>
        </Pressable>
      </View>
    </View>
  );
}

function getGatesOpenTime(startTime: string): string {
  try {
    const [hours, minutes] = startTime.split(":").map(Number);
    const gateHours = hours - 1;
    const gateMinutes = minutes || 0;
    const period = gateHours >= 12 ? "PM" : "AM";
    const displayHours = gateHours > 12 ? gateHours - 12 : gateHours === 0 ? 12 : gateHours;
    return `${displayHours}:${gateMinutes.toString().padStart(2, "0")} ${period}`;
  } catch {
    return "5:30 PM";
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  scrollView: {
    flex: 1,
  },
  loadingText: {
    color: "#9CA3AF",
    marginTop: 12,
  },
  error: {
    color: "#EF4444",
    fontSize: 16,
    marginTop: 16,
  },
  bannerContainer: {
    width: width,
    height: 400,
    position: "relative",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  bannerOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  headerButtons: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    zIndex: 10,
  },
  headerRight: {
    flexDirection: "row",
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerBtnText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },
  eventCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#000",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingTop: 24,
  },
  tagsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  eventTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 8,
  },
  eventDateTime: {
    fontSize: 16,
    color: "#fbbf24",
    fontWeight: "600",
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingVertical: 4,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  infoSubtitle: {
    color: "#9ca3af",
    fontSize: 13,
  },
  arrow: {
    color: "#9ca3af",
    fontSize: 20,
    marginLeft: 8,
  },
  section: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 16,
  },
  performerCard: {
    flexDirection: "row",
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  performerImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#f97316",
  },
  performerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  performerName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  knowMore: {
    color: "#9ca3af",
    fontSize: 14,
  },
  aboutText: {
    color: "#d1d5db",
    fontSize: 15,
    lineHeight: 24,
  },
  bookFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0f0f0f",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
  },
  bookFooterLeft: {},
  bookFooterPrice: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },
  bookFooterBtn: {
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  bookFooterBtnText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },
  askButton: {
    position: "absolute",
    bottom: 96,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#333",
  },
  askIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  askText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
