import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { API_BASE_URL } from "@/_services/api-config";
import { withAuthHeaders } from "@/_services/auth-fetch";

type EventItem = {
  id: string;
  club_name: string;
  event_name: string;
  event_date: string;
  event_time: string;
};

export default function EventsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    (async () => {
      const res = await fetch(
        `${API_BASE_URL}/api/events`,
        await withAuthHeaders({ method: "GET" })
      );
      const data = await res.json();
      setEvents(data);
    })();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎉 Upcoming Events</Text>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push(`/event/${item.id}`)}
          >
            <Text style={styles.eventName}>{item.event_name}</Text>
            <Text style={styles.clubName}>{item.club_name}</Text>
            <Text style={styles.meta}>
              📅 {item.event_date} · ⏰ {item.event_time}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EC4899",
  },
  eventName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  clubName: {
    color: "#EC4899",
    marginTop: 4,
    fontWeight: "600",
  },
  meta: {
    color: "#9CA3AF",
    marginTop: 6,
    fontSize: 12,
  },
});