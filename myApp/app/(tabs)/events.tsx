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
} from "react-native";
import { useRouter } from "expo-router";
import { fetchWithFallback } from "@/_services/api-config";
import { Colors } from "@/constants/Colors";

const { width } = Dimensions.get("window");
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

const EXPLORE_CATEGORIES = [
  // Music & Vibe
  { id: "edm", name: "EDM", emoji: "⚡", searchTerm: "EDM" },
  { id: "techno", name: "Techno", emoji: "🎛️", searchTerm: "techno" },
  { id: "house", name: "House", emoji: "🏠", searchTerm: "house music" },
  { id: "bollywood", name: "Bollywood", emoji: "🎬", searchTerm: "Bollywood night" },
  { id: "hiphop", name: "Hip Hop", emoji: "🎤", searchTerm: "hip hop night" },
  { id: "retro", name: "Retro", emoji: "📻", searchTerm: "retro night" },
  
  // Event Types
  { id: "rave", name: "Rave", emoji: "🌈", searchTerm: "rave party" },
  { id: "rooftop", name: "Rooftop", emoji: "🌃", searchTerm: "rooftop party" },
  { id: "theme", name: "Theme Party", emoji: "🎭", searchTerm: "theme party" },
  
  // Drinks & Experience
  { id: "cocktail", name: "Cocktails", emoji: "🍹", searchTerm: "cocktail night" },
  { id: "ladies", name: "Ladies Night", emoji: "👯‍♀️", searchTerm: "ladies night" },
  { id: "beer", name: "Beer", emoji: "🍺", searchTerm: "beer" },
];

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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [events, selectedDateFilter, selectedCategory]);

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

    // Category filter
    if (selectedCategory) {
      const category = EXPLORE_CATEGORIES.find(c => c.id === selectedCategory);
      if (category) {
        filtered = filtered.filter((event) => {
          const eventCategories = event.categories || [];
          return eventCategories.some(cat => 
            cat.toLowerCase().includes(category.searchTerm.toLowerCase())
          );
        });
      }
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

  const handleCategoryPress = (categoryId: string) => {
    // Navigate to category page
    router.push(`/category/${categoryId}`);
  };

  const handleDateFilterPress = (filterId: string) => {
    setSelectedDateFilter(filterId);
  };

  const clearFilters = () => {
    setSelectedDateFilter("all");
    setSelectedCategory(null);
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
            <Text style={styles.featuredPlaceholderText}>🎉</Text>
          </View>
        )}
        
        <View style={styles.bookmarkIcon}>
          <Text style={styles.bookmarkText}>🔖</Text>
        </View>
      </View>

      <View style={styles.featuredInfo}>
        <View style={styles.featuredVenue}>
          <Text style={styles.venueIcon}>📍</Text>
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
            <Text style={styles.gridPlaceholderText}>🎉</Text>
          </View>
        )}
        
        <View style={styles.gridBookmarkIcon}>
          <Text style={styles.gridBookmarkText}>🔖</Text>
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

  // Category Card
  const renderCategoryCard = (category: typeof EXPLORE_CATEGORIES[0]) => (
    <Pressable
      key={category.id}
      style={styles.categoryCard}
      onPress={() => handleCategoryPress(category.id)}
    >
      <View style={styles.categoryIconContainer}>
        <Text style={styles.categoryEmoji}>{category.emoji}</Text>
      </View>
      <Text style={styles.categoryName}>{category.name}</Text>
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
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.dark.primary} />
        <Text style={styles.loadingText}>Loading events...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={fetchEvents}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const displayEvents = selectedDateFilter !== "all" || selectedCategory ? filteredEvents : events;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.dark.primary}
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

        {/* Explore Events */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Explore events</Text>
          
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          >
            {EXPLORE_CATEGORIES.map(renderCategoryCard)}
          </ScrollView>
        </View>

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
          {(selectedDateFilter !== "all" || selectedCategory) && (
            <Pressable style={styles.clearFiltersButton} onPress={clearFilters}>
              <Text style={styles.clearFiltersText}>✕ Clear</Text>
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
              <Text style={styles.emptyIcon}>🎪</Text>
              <Text style={styles.emptyText}>No events found</Text>
              <Text style={styles.emptySubtext}>
                Try changing your filters
              </Text>
            </View>
          ) : (
            <View style={styles.gridContainer}>
              {displayEvents.map((event) => (
                <View key={event.id} style={styles.gridCardWrapper}>
                  {renderGridCard({ item: event, index: 0 })}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
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
    backgroundColor: Colors.dark.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    color: Colors.dark.textSecondary,
    marginTop: 12,
    fontSize: 16,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
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
  
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.dark.text,
    marginBottom: 16,
    paddingHorizontal: 20,
  },

  featuredList: {
    paddingHorizontal: 20,
  },
  featuredCard: {
    width: FEATURED_CARD_WIDTH,
    marginRight: 16,
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.dark.border,
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
    backgroundColor: Colors.dark.card,
    justifyContent: "center",
    alignItems: "center",
  },
  featuredPlaceholderText: {
    fontSize: 80,
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
  bookmarkText: {
    fontSize: 22,
  },
  featuredInfo: {
    padding: 16,
  },
  featuredVenue: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  venueIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  venueText: {
    fontSize: 12,
    color: Colors.dark.primary,
    fontWeight: "600",
  },
  featuredName: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.dark.text,
    marginBottom: 8,
    lineHeight: 24,
  },
  featuredDate: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    fontWeight: "500",
  },

  categoriesList: {
    paddingHorizontal: 20,
  },
  categoryCard: {
    width: 110,
    marginRight: 12,
    alignItems: "center",
  },
  categoryIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 16,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryEmoji: {
    fontSize: 40,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.dark.text,
    textAlign: "center",
  },

  filterSection: {
    marginTop: 24,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 20,
  },
  filterList: {
    paddingHorizontal: 20,
    flex: 1,
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginRight: 10,
  },
  filterChipActive: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.dark.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.dark.text,
  },
  clearFiltersButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.dark.error,
    borderRadius: 20,
  },
  clearFiltersText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.dark.text,
  },

  resultsSection: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  resultsText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    fontWeight: "500",
  },

  gridSection: {
    paddingHorizontal: 20,
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
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.dark.border,
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
    backgroundColor: Colors.dark.card,
    justifyContent: "center",
    alignItems: "center",
  },
  gridPlaceholderText: {
    fontSize: 60,
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
  gridBookmarkText: {
    fontSize: 18,
  },
  gridInfo: {
    padding: 12,
  },
  gridName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.dark.text,
    marginBottom: 6,
    lineHeight: 18,
    minHeight: 36,
  },
  gridVenue: {
    fontSize: 11,
    color: Colors.dark.textSecondary,
    marginBottom: 4,
  },
  gridDate: {
    fontSize: 11,
    color: Colors.dark.textTertiary,
    fontWeight: "500",
  },

  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.dark.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },

  bottomSpacing: {
    height: 100,
  },
});