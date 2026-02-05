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
  ScrollView,
  Dimensions,
  Modal,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { fetchWithFallback } from "@/_services/api-config";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const width = SCREEN_WIDTH;
const FEATURED_CARD_WIDTH = width * 0.65;
const GRID_CARD_WIDTH = (width - 60) / 2;

interface Event {
  id: string;
  name: string;
  club_id: string;
  event_date: string;
  start_time: string;
  banner_image_url: string | null;
  dj_name: string | null;
  dj_instagram: string | null;
  about: string | null;
  age_limit: string | null;
  max_attendees: number | null;
  categories: string[] | null;
  clubs: {
    club_name: string;
    address_text: string;
  };
}

const DATE_FILTERS = [
  { id: "all", label: "All" },
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "weekend", label: "This Weekend" },
  { id: "week", label: "This Week" },
];

export default function EventsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDateFilter, setSelectedDateFilter] = useState("all");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [events, selectedDateFilter]);

  const fetchEvents = async () => {
    try {
      const res = await fetchWithFallback("/api/events", {
        method: "GET",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch events");
      }

      const data = await res.json();
      const allEvents = data.events || [];
      
      console.log("📱 [APP] Fetched events:", allEvents.length);
      
      setEvents(allEvents);
      setFeaturedEvents(allEvents.slice(0, 3));
      setError("");
    } catch (err: any) {
      console.error("❌ Fetch events error:", err);
      setError(err.message || "Failed to load events");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...events];

    // Date filter
    if (selectedDateFilter !== "all") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      filtered = filtered.filter((event) => {
        const eventDate = new Date(event.event_date);
        eventDate.setHours(0, 0, 0, 0);

        switch (selectedDateFilter) {
          case "today":
            return eventDate.getTime() === today.getTime();
          
          case "tomorrow":
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return eventDate.getTime() === tomorrow.getTime();
          
          case "weekend":
            const endOfWeek = new Date(today);
            endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
            return eventDate >= today && eventDate <= endOfWeek && (eventDate.getDay() === 5 || eventDate.getDay() === 6 || eventDate.getDay() === 0);
          
          case "week":
            const endOfWeekDay = new Date(today);
            endOfWeekDay.setDate(today.getDate() + 7);
            return eventDate >= today && eventDate <= endOfWeekDay;
          
          default:
            return true;
        }
      });
    }

    setFilteredEvents(filtered);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const handleEventPress = (eventId: string) => {
    router.push(`/event/${eventId}`);
  };

  const handleDateFilterPress = (filterId: string) => {
    setSelectedDateFilter(filterId);
  };

  const clearFilters = () => {
    setSelectedDateFilter("all");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      day: "2-digit",
      month: "short",
    };
    return date.toLocaleDateString("en-US", options);
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return "";
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Featured Event Card
  const renderFeaturedCard = ({ item }: { item: Event }) => (
    <Pressable
      style={styles.featuredCard}
      onPress={() => handleEventPress(item.id)}
    >
      <View style={styles.featuredImageContainer}>
        {item.banner_image_url ? (
          <Image
            source={{ uri: item.banner_image_url }}
            style={styles.featuredImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.featuredPlaceholder}>
            <Ionicons name="musical-notes-outline" size={48} color="rgba(255,255,255,0.4)" />
          </View>
        )}
        
        <View style={styles.bookmarkIcon}>
          <Ionicons name="bookmark-outline" size={22} color="rgba(255,255,255,0.8)" />
        </View>
      </View>

      <View style={styles.featuredInfo}>
        <View style={styles.featuredVenue}>
          <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.6)" style={styles.venueIconWrap} />
          <Text style={styles.venueText} numberOfLines={1}>
            {item.clubs?.address_text || item.clubs?.club_name || "Venue TBA"}
          </Text>
        </View>

        <Text style={styles.featuredName} numberOfLines={2}>
          {item.name}
        </Text>

        <Text style={styles.featuredDate}>
          {formatDate(item.event_date)}, {formatTime(item.start_time)}
        </Text>
      </View>
    </Pressable>
  );

  // Grid Event Card
  const renderGridCard = ({ item }: { item: Event }) => (
    <Pressable
      style={styles.gridCard}
      onPress={() => handleEventPress(item.id)}
    >
      <View style={styles.gridImageContainer}>
        {item.banner_image_url ? (
          <Image
            source={{ uri: item.banner_image_url }}
            style={styles.gridImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.gridPlaceholder}>
            <Ionicons name="musical-notes-outline" size={40} color="rgba(255,255,255,0.4)" />
          </View>
        )}
        
        <View style={styles.gridBookmarkIcon}>
          <Ionicons name="bookmark-outline" size={18} color="rgba(255,255,255,0.8)" />
        </View>
      </View>

      <View style={styles.gridInfo}>
        <Text style={styles.gridName} numberOfLines={2}>
          {item.name}
        </Text>

        <Text style={styles.gridVenue} numberOfLines={1}>
          {item.clubs?.club_name || "Venue TBA"}
        </Text>

        <Text style={styles.gridDate}>
          {formatDate(item.event_date)}
        </Text>
      </View>
    </Pressable>
  );

  // Date Filter Chip
  const renderDateFilterChip = (filter: typeof DATE_FILTERS[0]) => (
    <Pressable
      key={filter.id}
      style={[
        styles.filterChip,
        selectedDateFilter === filter.id && styles.filterChipActive,
      ]}
      onPress={() => handleDateFilterPress(filter.id)}
    >
      <Text
        style={[
          styles.filterChipText,
          selectedDateFilter === filter.id && styles.filterChipTextActive,
        ]}
      >
        {filter.label}
      </Text>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={["#8B0045", "#2D0A1F", "#000000"]}
          locations={[0, 0.4, 1]}
          style={styles.gradientBackground}
        />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#E91E8C" />
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={["#8B0045", "#2D0A1F", "#000000"]}
          locations={[0, 0.4, 1]}
          style={styles.gradientBackground}
        />
        <View style={styles.centerContainer}>
          <Ionicons name="warning-outline" size={64} color="rgba(255,255,255,0.6)" style={styles.errorIcon} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButtonWrapper} onPress={fetchEvents}>
            <LinearGradient
              colors={["#E91E8C", "#DB1A85"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.retryButton}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  const displayEvents = selectedDateFilter !== "all" ? filteredEvents : events;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#8B0045", "#2D0A1F", "#000000"]}
        locations={[0, 0.4, 1]}
        style={styles.gradientBackground}
      />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Events</Text>
        </View>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#E91E8C"
          />
        }
      >
        {/* Featured Events */}
        {featuredEvents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Featured events</Text>
            
            <FlatList
              data={featuredEvents}
              renderItem={renderFeaturedCard}
              keyExtractor={(item) => `featured-${item.id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredList}
              snapToInterval={FEATURED_CARD_WIDTH + 16}
              decelerationRate="fast"
            />
          </View>
        )}

        {/* Filter Bar */}
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterList}
          >
            {DATE_FILTERS.map(renderDateFilterChip)}
          </ScrollView>

          {/* Clear Filters */}
          {selectedDateFilter !== "all" && (
            <Pressable style={styles.clearFiltersButton} onPress={clearFilters}>
              <Ionicons name="close" size={14} color="#FFFFFF" />
              <Text style={styles.clearFiltersText}>Clear</Text>
            </Pressable>
          )}
        </View>

        {/* Results Count */}
        <View style={styles.resultsSection}>
          <Text style={styles.resultsText}>
            {displayEvents.length} event{displayEvents.length !== 1 ? "s" : ""} found
          </Text>
        </View>

        {/* All Events Grid */}
        <View style={styles.gridSection}>
          {displayEvents.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={64} color="rgba(255,255,255,0.4)" style={styles.emptyIcon} />
              <Text style={styles.emptyText}>No events found</Text>
              <Text style={styles.emptySubtext}>
                Try changing your filters
              </Text>
            </View>
          ) : (
            <View style={styles.gridContainer}>
              {displayEvents.map((event) => (
                <View key={event.id} style={styles.gridCardWrapper}>
                  {renderGridCard({ item: event })}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
      </View>
      <View style={styles.bottomContainer}>
        <View style={styles.homeIndicator} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  gradientBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.5,
  },
  content: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 12,
    fontSize: 16,
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
  },
  retryButtonWrapper: {
    marginBottom: 16,
  },
  retryButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 16,
    paddingHorizontal: 24,
  },

  featuredList: {
    paddingHorizontal: 24,
  },
  featuredCard: {
    width: FEATURED_CARD_WIDTH,
    marginRight: 16,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  featuredImageContainer: {
    width: "100%",
    height: 320,
    position: "relative",
  },
  featuredImage: {
    width: "100%",
    height: "100%",
  },
  featuredPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    justifyContent: "center",
    alignItems: "center",
  },
  bookmarkIcon: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  featuredInfo: {
    padding: 16,
  },
  featuredVenue: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  venueIconWrap: {
    marginRight: 6,
  },
  venueText: {
    fontSize: 12,
    color: "#E91E8C",
    fontWeight: "600",
  },
  featuredName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
    lineHeight: 24,
  },
  featuredDate: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "500",
  },

  filterSection: {
    marginTop: 24,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 24,
  },
  filterList: {
    paddingHorizontal: 24,
    flex: 1,
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    marginRight: 10,
  },
  filterChipActive: {
    backgroundColor: "#E91E8C",
    borderColor: "#E91E8C",
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.6)",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  clearFiltersButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 20,
  },
  clearFiltersText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  resultsSection: {
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  resultsText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "500",
  },

  gridSection: {
    paddingHorizontal: 24,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridCardWrapper: {
    width: GRID_CARD_WIDTH,
    marginBottom: 20,
  },
  gridCard: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  gridImageContainer: {
    width: "100%",
    height: 220,
    position: "relative",
  },
  gridImage: {
    width: "100%",
    height: "100%",
  },
  gridPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    justifyContent: "center",
    alignItems: "center",
  },
  gridBookmarkIcon: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  gridInfo: {
    padding: 12,
  },
  gridName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 6,
    lineHeight: 18,
    minHeight: 36,
  },
  gridVenue: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 4,
  },
  gridDate: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.5)",
    fontWeight: "500",
  },

  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },

  bottomSpacing: {
    height: 100,
  },

  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 34,
    alignItems: "center",
  },
  homeIndicator: {
    height: 5,
    width: 134,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    borderRadius: 3,
  },
});