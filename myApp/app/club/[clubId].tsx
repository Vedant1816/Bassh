import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { fetchWithFallback } from "@/_services/api-config";

export default function ClubProfile() {
  const params = useLocalSearchParams<{ clubId?: string; clubid?: string }>();
  const clubId = params.clubId ?? params.clubid;
  const router = useRouter();

  const [club, setClub] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"offers" | "menu" | "ask" | "gallery">("offers");

  useEffect(() => {
    (async () => {
      const res = await fetchWithFallback(
        `/api/clubs/${clubId}`,
        await withAuthHeaders({ method: "GET" })
      );
      const data = await res.json();
      setClub(data.club);
      setEvents(data.events || []);
    })();
  }, [clubId]);

  if (!club) return null;

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
    const url = `https://www.google.com/maps/search/?api=1&query=${club.latitude},${club.longitude}`;
    Linking.openURL(url);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* IMAGE / GALLERY */}
      <View>
        <Image
          source={{
            uri:
              club.banner_image_url ||
              "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4",
          }}
          style={styles.banner}
        />
      </View>

      {/* CLUB INFO */}
      <View style={styles.infoBox}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{club.club_name}</Text>

          <View style={styles.ratingBox}>
            <Text style={styles.ratingText}>{club.rating?.toFixed(1) || "4.5"} ★</Text>
            <Text style={styles.reviewCount}>615</Text>
          </View>
        </View>

        <Text style={styles.subText}>
          {club.address_text}
        </Text>

        <Text style={styles.metaText}>
          {club.distance_km?.toFixed(1) || "4.6"} km · ₹1800 for two
        </Text>

        <Text style={styles.openText}>Open · 12:00 PM to 1:00 AM</Text>

        {/* ACTION BUTTONS */}
        <View style={styles.actionsRow}>
          <Pressable style={styles.actionBtn}>
            <Text style={styles.actionText}>✨ What's good here?</Text>
          </Pressable>

          <Pressable style={styles.actionBtn} onPress={openDirections}>
            <Text style={styles.actionText}>🧭 Directions</Text>
          </Pressable>
        </View>
      </View>

      {/* TABS */}
      <View style={styles.tabsRow}>
        {[
          { key: "offers", label: "Offers" },
          { key: "menu", label: "Menu" },
          { key: "ask", label: "Ask anything" },
          { key: "gallery", label: "Gallery" },
        ].map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setActiveTab(t.key as any)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === t.key && styles.activeTab,
              ]}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* OFFERS + EVENTS */}
      {activeTab === "offers" && (
        <View style={styles.offersEventsWrapper}>
          {/* OFFERS */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Offers for today, lunch</Text>
            <Text style={styles.chevron}>▾</Text>
          </View>

          {events.slice(0, 2).map((event) => (
            <Pressable
              key={`offer-${event.id}`}
              style={styles.offerCard}
              onPress={() => router.push(`/event/${event.id}`)}
            >
              <View style={styles.offerLeft}>
                <Text style={styles.offerLine1}>FLAT</Text>
                <Text style={styles.offerLine2}>20% OFF</Text>
              </View>
              <View style={styles.offerDashed} />
              <View style={styles.offerRight}>
                <Text style={styles.offerTime}>
                  From {event.start_time || "4:15 PM"}, today
                </Text>
                <Text style={styles.offerMeta}>
                  2 slots left · Cover charge ₹25
                </Text>
                <Text style={styles.bookNow}>Book now ›</Text>
              </View>
            </Pressable>
          ))}

          {/* EVENTS */}
          <View style={[styles.sectionHeader, { marginTop: 28 }]}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            <Text style={styles.chevron}>▾</Text>
          </View>

          {events.map((event) => (
            <Pressable
              key={event.id}
              style={styles.eventCard}
              onPress={() => router.push(`/event/${event.id}`)}
            >
              <View style={styles.eventImageWrap}>
                <Image
                  source={{
                    uri:
                      event.banner_image_url ||
                      event.image_url ||
                      event.poster_url ||
                      club.banner_image_url ||
                      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400",
                  }}
                  style={styles.eventImage}
                />
                <View style={styles.bookmark}>
                  <Text style={styles.bookmarkIcon}>🔖</Text>
                </View>
              </View>
              <View style={styles.eventContent}>
                <Text style={styles.eventTitle} numberOfLines={2}>
                  {event.name || event.event_name || "Event"}
                </Text>
                <Text style={styles.eventDateTime}>
                  {formatEventDate(event.event_date)} · {event.start_time || "7:00 PM"}
                </Text>
                <Text style={styles.eventVenue} numberOfLines={1}>
                  {club.address_text || "Venue to be announced"}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  banner: {
    height: 240,
    width: "100%",
  },

  infoBox: {
    padding: 16,
  },

  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    flex: 1,
  },

  ratingBox: {
    backgroundColor: "#1DB954",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
  },

  ratingText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  reviewCount: {
    color: "#e5e5e5",
    fontSize: 11,
  },

  subText: {
    color: "#aaa",
    marginTop: 6,
  },

  metaText: {
    color: "#aaa",
    marginTop: 4,
  },

  openText: {
    color: "#4ade80",
    marginTop: 6,
  },

  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },

  actionBtn: {
    backgroundColor: "#1f1f1f",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  actionText: {
    color: "#fff",
    fontSize: 13,
  },

  tabsRow: {
    flexDirection: "row",
    gap: 18,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
    paddingBottom: 10,
  },

  tabText: {
    color: "#777",
    fontSize: 14,
  },

  activeTab: {
    color: "#a855f7",
    fontWeight: "700",
  },

  offersEventsWrapper: {
    paddingBottom: 24,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },

  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },

  chevron: {
    color: "#9ca3af",
    fontSize: 14,
  },

  offerCard: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#6f42c1",
    alignItems: "stretch",
  },

  offerLeft: {
    width: 110,
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
  },

  offerLine1: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
  },

  offerLine2: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 28,
  },

  offerDashed: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginVertical: 8,
  },

  offerRight: {
    flex: 1,
    padding: 14,
    justifyContent: "center",
  },

  offerTime: {
    color: "#fff",
    fontSize: 14,
  },

  offerMeta: {
    color: "#9ca3af",
    marginTop: 4,
    fontSize: 12,
  },

  bookNow: {
    color: "#fff",
    marginTop: 10,
    fontWeight: "600",
    fontSize: 14,
  },

  eventCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
  },

  eventImageWrap: {
    position: "relative",
    width: "100%",
    aspectRatio: 16 / 10,
  },

  eventImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  bookmark: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  bookmarkIcon: {
    fontSize: 14,
  },

  eventContent: {
    padding: 14,
  },

  eventTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
  },

  eventDateTime: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 4,
  },

  eventVenue: {
    color: "#9ca3af",
    fontSize: 13,
  },
});