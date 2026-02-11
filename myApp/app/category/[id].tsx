import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { fetchWithFallback } from "@/_services/api-config";
import { Colors } from "@/constants/Colors";

const CATEGORY_DATA: Record<string, { name: string; emoji: string; searchTerm: string }> = {
  edm: { name: "EDM", emoji: "⚡", searchTerm: "EDM" },
  techno: { name: "Techno", emoji: "🎛️", searchTerm: "techno" },
  house: { name: "House", emoji: "🏠", searchTerm: "house music" },
  bollywood: { name: "Bollywood", emoji: "🎬", searchTerm: "Bollywood night" },
  hiphop: { name: "Hip Hop", emoji: "🎤", searchTerm: "hip hop night" },
  retro: { name: "Retro", emoji: "📻", searchTerm: "retro night" },
  rave: { name: "Rave", emoji: "🌈", searchTerm: "rave party" },
  rooftop: { name: "Rooftop", emoji: "🌃", searchTerm: "rooftop party" },
  theme: { name: "Theme Party", emoji: "🎭", searchTerm: "theme party" },
  cocktail: { name: "Cocktails", emoji: "🍹", searchTerm: "cocktail night" },
  ladies: { name: "Ladies Night", emoji: "👯‍♀️", searchTerm: "ladies night" },
  beer: { name: "Beer", emoji: "🍺", searchTerm: "beer" },
};

export default function CategoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const categoryId = params.id as string;
  
  const category = CATEGORY_DATA[categoryId];
  
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (category) {
      fetchCategoryEvents();
    }
  }, [categoryId]);

  const fetchCategoryEvents = async () => {
    try {
      const res = await fetchWithFallback("/api/events", {
        method: "GET",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch events");
      }

      const data = await res.json();
      const allEvents = data.events || [];
      
      // Filter by category
      const filtered = allEvents.filter((event: any) => {
        const eventCategories = event.categories || [];
        return eventCategories.some((cat: string) =>
          cat.toLowerCase().includes(category.searchTerm.toLowerCase())
        );
      });

      setEvents(filtered);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const handleEventPress = (eventId: string) => {
    router.push(`/event/${eventId}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.dark.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerEmoji}>{category.emoji}</Text>
          <Text style={styles.headerTitle}>{category.name}</Text>
          <Text style={styles.headerSubtitle}>
            {events.length} event{events.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* Events List */}
      {events.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎪</Text>
          <Text style={styles.emptyText}>No {category.name} events found</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          renderItem={({ item }) => (
            <Pressable
              style={styles.eventCard}
              onPress={() => handleEventPress(item.id)}
            >
              <Image
                source={{ uri: item.banner_image_url }}
                style={styles.eventImage}
                resizeMode="cover"
              />
              <View style={styles.eventInfo}>
                <Text style={styles.eventName} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.eventVenue} numberOfLines={1}>
                  📍 {item.clubs?.club_name}
                </Text>
                <Text style={styles.eventDate}>
                  {formatDate(item.event_date)}
                </Text>
              </View>
            </Pressable>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.dark.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.surface,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 24,
    color: Colors.dark.text,
  },
  headerContent: {
    flex: 1,
  },
  headerEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.dark.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  eventCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  eventImage: {
    width: "100%",
    height: 200,
  },
  eventInfo: {
    padding: 16,
  },
  eventName: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.dark.text,
    marginBottom: 8,
  },
  eventVenue: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 13,
    color: Colors.dark.textTertiary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
});
