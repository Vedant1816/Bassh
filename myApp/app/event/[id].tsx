import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { API_BASE_URL } from "@/_services/api-config";
import { withAuthHeaders } from "@/_services/auth-fetch";

export default function EventDetailScreen() {
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [event, setEvent] = useState<any>(null);
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
        
        const res = await fetch(
          `${API_BASE_URL}/api/events/${id}`,
          await withAuthHeaders({ method: "GET" })
        );

        const contentType = res.headers.get("content-type");
        const isJson = contentType?.includes("application/json");
        
        let responseText: string;
        try {
          responseText = await res.text();
        } catch (e) {
          setError("Failed to read response");
          setLoading(false);
          return;
        }

        if (!res.ok) {
          let errorMessage = `Error ${res.status}`;
          if (isJson && responseText) {
            try {
              const errorData = JSON.parse(responseText);
              errorMessage = errorData.error || errorMessage;
            } catch {
              errorMessage = responseText || errorMessage;
            }
          } else {
            errorMessage = responseText || errorMessage;
          }
          setError(errorMessage);
          setLoading(false);
          return;
        }

        if (!isJson) {
          setError("Invalid response format");
          setLoading(false);
          return;
        }

        if (!responseText || responseText.trim() === "") {
          setError("Empty response from server");
          setLoading(false);
          return;
        }

        const data = JSON.parse(responseText);
        setEvent(data);
      } catch (error) {
        console.error("Error fetching event:", error);
        setError(error instanceof Error ? error.message : "Failed to load event");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Error: {error}</Text>
      </View>
    );
  }

  if (!event) return null;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{event.event_name}</Text>
      <Text style={styles.club}>{event.club_name}</Text>

      <Text style={styles.meta}>
        📅 {event.event_date} · ⏰ {event.event_time}
      </Text>

      <Text style={styles.section}>Event Details</Text>
      <Text style={styles.text}>{event.event_specs}</Text>

      {event.extra_notes && (
        <>
          <Text style={styles.section}>Additional Info</Text>
          <Text style={styles.text}>{event.extra_notes}</Text>
        </>
      )}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#000",
      padding: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: "800",
      color: "#fff",
    },
    club: {
      fontSize: 16,
      color: "#EC4899",
      marginTop: 6,
      fontWeight: "600",
    },
    meta: {
      color: "#9CA3AF",
      marginTop: 8,
    },
    section: {
      marginTop: 24,
      fontSize: 18,
      fontWeight: "700",
      color: "#fff",
    },
    text: {
      color: "#D1D5DB",
      marginTop: 8,
      lineHeight: 20,
    },
    error: {
      color: "#EF4444",
      fontSize: 16,
      marginTop: 16,
    },
  });