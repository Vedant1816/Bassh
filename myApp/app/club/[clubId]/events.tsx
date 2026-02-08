import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { fetchWithFallback } from "@/_services/api-config";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { Colors } from "@/constants/Colors";

export default function ClubEventsScreen() {
  const params = useLocalSearchParams<{ clubId?: string; clubid?: string }>();
  const clubId = params.clubId ?? params.clubid;
  const router = useRouter();

  const [club, setClub] = useState<{ club_name?: string; banner_image_url?: string } | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clubId) return;
    (async () => {
      const res = await fetchWithFallback(
        `/api/clubs/${clubId}`,
        await withAuthHeaders({ method: "GET" })
      );
      const data = await res.json();
      setClub(data.club);
      setEvents(data.events || []);
      setLoading(false);
    })();
  }, [clubId]);

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

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color={Colors.dark.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Events</Text>
        </View>
        <ActivityIndicator color={Colors.dark.primary400} size="large" style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={Colors.dark.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {club?.club_name || "Club"} – Events
        </Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {events.length === 0 ? (
          <Text style={styles.emptyText}>No upcoming events</Text>
        ) : (
          events.map((event) => (
            <Pressable
              key={event.id}
              style={styles.eventCard}
              onPress={() => router.push(`/event/${event.id}`)}
            >
              <View style={styles.eventCardContent}>
                <View style={styles.eventImageContainer}>
                  <Image
                    source={{
                      uri:
                        event.banner_image_url ||
                        event.image_url ||
                        event.poster_url ||
                        club?.banner_image_url ||
                        "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400",
                    }}
                    style={styles.eventImage}
                  />
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.2)"]}
                    style={StyleSheet.absoluteFill}
                  />
                </View>

                <View style={styles.eventFooter}>
                  <View style={styles.eventFooterTop}>
                    <Text style={styles.eventTitle} numberOfLines={1}>
                      {event.name || event.event_name || "Random Party Name"}
                    </Text>

                    <View style={styles.eventFooterActions}>
                      <Pressable style={styles.eventShareBtn}>
                        <Ionicons name="share-social-outline" size={22} color="#E91E63" />
                      </Pressable>

                      <View style={styles.eventAvatars}>
                        <Image
                          source={{ uri: "https://i. Pravatar.cc/100?img=1" }}
                          style={[styles.eventAvatar, styles.eventAvatar1]}
                        />
                        <Image
                          source={{ uri: "https://i.pravatar.cc/100?img=2" }}
                          style={[styles.eventAvatar, styles.eventAvatar2]}
                        />
                        <Image
                          source={{ uri: "https://i.pravatar.cc/100?img=5" }}
                          style={[styles.eventAvatar, styles.eventAvatar3]}
                        />
                        <View style={styles.eventCountBadge}>
                          <Text style={styles.eventCountText}>120</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.eventDateTime}>
                    {formatEventDate(event.event_date)} | {event.start_time?.slice(0, 5) || "16:00"} - {event.end_time?.slice(0, 5) || "20:00"}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: Colors.dark.text,
  },
  loader: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyText: {
    color: Colors.dark.textSecondary,
    fontSize: 16,
    textAlign: "center",
    marginTop: 40,
  },
  /* Event card styles */
  eventCard: {
    width: "100%",
    height: 240,
    alignSelf: "center",
    marginBottom: 20,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: Colors.dark.surface,
    borderWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  eventCardContent: {
    flex: 1,
  },

  eventImageContainer: {
    height: 150,
    width: "100%",
    position: "relative",
  },

  eventImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  eventFooter: {
    flex: 1,
    backgroundColor: "rgba(22, 22, 22, 0.36)",
    borderWidth: 1,
    borderColor: "rgba(219, 39, 144, 0.41)",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
  },

  eventFooterTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },

  eventTitle: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.1)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginRight: 8,
  },

  eventFooterActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  eventShareBtn: {
    padding: 4,
  },

  eventDateTime: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontWeight: "600",
  },

  eventAvatars: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 4,
  },

  eventAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    backgroundColor: "#ccc",
  },

  eventAvatar1: { zIndex: 3, marginLeft: 0 },
  eventAvatar2: { zIndex: 2, marginLeft: -10 },
  eventAvatar3: { zIndex: 1, marginLeft: -10 },

  eventCountBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E91E63",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 4,
    marginLeft: -10,
  },

  eventCountText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
});
