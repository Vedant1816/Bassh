import { useEffect, useState, useRef } from "react";
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Text,
  Pressable,
  ScrollView,
  Dimensions,
  Image,
  Platform,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import Mapbox from "@rnmapbox/maps";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import LocationHeader from "@/app/components/LocationHeader";
import SearchBar from "@/app/components/SearchBar";
import MapFloatingActions from "@/app/components/MapFloatingActions";
import FilterClubsModal, { type ClubFilterState } from "@/app/components/FilterClubsModal";
import { NotificationsModal } from "@/app/components/Notifications";
import { DismissKeyboardView } from "@/components/DismissKeyboardView";
import { LinearGradient } from "expo-linear-gradient";
import ClubCard, { type ClubCardData } from "@/app/components/ClubCard";
import { Colors, PrimaryGradient, PrimaryGradientStart, PrimaryGradientEnd } from "@/constants/Colors";
import supabasePublic from "@/_services/supabase-public";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { fetchWithFallback } from "@/_services/api-config";

/* ---------------- TYPES ---------------- */

type ClubCard = ClubCardData;

type GeoJSON = {
  type: "FeatureCollection";
  features: any[];
};

type LocationState = {
  lat: number;
  lng: number;
  source: "gps" | "manual";
  cityName?: string;
};

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_HORIZONTAL_PADDING = 6;
const CARD_WIDTH = SCREEN_WIDTH - CARD_HORIZONTAL_PADDING * 2;

const EMPTY_GEOJSON: GeoJSON = {
  type: "FeatureCollection",
  features: [],
};

/* ---------------- SCREEN ---------------- */

const TAB_BAR_HEIGHT = 64;
const CARD_BAR_GAP = 8;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<Mapbox.Camera>(null);

  const [authChecked, setAuthChecked] = useState(false);
  const [location, setLocation] = useState<LocationState | null>(null);
  const [locationAddress, setLocationAddress] = useState("");

  const [clubs, setClubs] = useState<ClubCard[]>([]);
  const [geojson, setGeojson] = useState<GeoJSON>(EMPTY_GEOJSON);

  const [loadingCards, setLoadingCards] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { type: "club" | "event"; id: string; name: string; subtitle?: string; date?: string; club_id?: string; image?: string }[]
  >([]);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<ClubFilterState | null>(null);
  const [filteredClubs, setFilteredClubs] = useState<ClubCard[]>([]);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  /* ---------------- FETCH UNREAD NOTIFICATION COUNT ---------------- */
  const fetchUnreadCount = async () => {
    try {
      const res = await fetchWithFallback(
        "/api/notifications/send-all?limit=1",
        await withAuthHeaders({ method: "GET" })
      );
      const json = await res.json();
      if (res.ok) {
        setUnreadNotificationCount(json.unreadCount || 0);
      }
    } catch {
      // ignore notification count errors
    }
  };

  // Fetch unread count on mount and after auth check
  useEffect(() => {
    if (authChecked) {
      fetchUnreadCount();
    }
  }, [authChecked]);

  /* ---------------- AUTH ---------------- */
  useEffect(() => {
    (async () => {
      const { data } = await supabasePublic.auth.getSession();
      if (!data.session) router.replace("/(auth)");
      else setAuthChecked(true);
    })();
  }, []);

  /* ---------------- GPS LOCATION ---------------- */
  useEffect(() => {
    if (!authChecked) return;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLocation((prev) => {
        if (prev?.source === "manual") {
          return prev;
        }

        return {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          source: "gps",
        };
      });

      const [addr] = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });

      if (addr) {
        setLocationAddress(
          `${addr.district || addr.subregion || ""}, ${addr.city || ""}`
        );
      }
    })();
  }, [authChecked]);

  /* ---------------- OPEN DIRECTIONS ---------------- */
  const openDirections = (club: ClubCard) => {
    const url =
      Platform.OS === "ios"
        ? `maps://app?daddr=${club.latitude},${club.longitude}`
        : `https://www.google.com/maps/dir/?api=1&destination=${club.latitude},${club.longitude}`;
    Linking.openURL(url);
  };

  /* ---------------- HANDLE CITY SELECTION ---------------- */
  const handleCitySelect = async (city: { name: string; lat: number; lng: number }) => {
    // If "Your Location" is selected, get GPS coordinates
    if (city.name === "Your Location") {
      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const [addr] = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });

        const addressText = addr
          ? `${addr.district || addr.subregion || ""}, ${addr.city || ""}`
          : "Your Location";

        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          source: "gps",
        });

        setLocationAddress(addressText);
      } catch (error) {
      }
      return;
    }

    // Manual city selection
    setLocation({
      lat: city.lat,
      lng: city.lng,
      source: "manual",
      cityName: city.name,
    });

    setLocationAddress(city.name);
  };

  /* ---------------- RECENTER TO USER LOCATION (floating action) ---------------- */
  const handleRecenterToUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const [addr] = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });

      const addressText = addr
        ? `${addr.district || addr.subregion || ""}, ${addr.city || ""}`
        : "Your Location";

      setLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        source: "gps",
      });
      setLocationAddress(addressText);
    } catch (error) {
    }
  };

  /* ---------------- RECENTER MAP WHEN LOCATION CHANGES ---------------- */
  /* setCamera ref can be unreliable when modal is open; run after a short delay so map is visible */
  useEffect(() => {
    if (!location) return;
    const t = setTimeout(() => {
      if (cameraRef.current) {
        cameraRef.current.setCamera({
          centerCoordinate: [location.lng, location.lat],
          zoomLevel: 13,
          animationDuration: 3000,
        });
      }
    }, 150);
    return () => clearTimeout(t);
  }, [location?.lat, location?.lng]);

  /* ---------------- CLUB CARDS ---------------- */
  useEffect(() => {
    if (!location) return;

    (async () => {
      setLoadingCards(true);
      const res = await fetchWithFallback(
        `/api/clubs/nearby?lat=${location.lat}&lng=${location.lng}`,
        await withAuthHeaders({ method: "GET" })
      );

      if (!res.ok) {
        setLoadingCards(false);
        return;
      }

      const raw = await res.json();
      const mapped: ClubCard[] = (raw || []).map((c: any) => {
        return {
          ...c,
          club_name: c.club_name ?? c.name ?? "Club",
          profile_picture_url: c.profile_picture_url ?? c.profilePictureUrl,
          banner_image_url: c.banner_image_url ?? c.bannerImageUrl,
          cover_photo: c.cover_photo, // Include cover_photo for ClubCard
          club_logo: c.club_logo, // Include club_logo for map markers
          prices: c.prices, // Explicitly include prices
          tier: c.tier, // Include tier for filtering
          rating: c.rating, // Include rating for filtering
        };
      });

      setClubs(mapped);
      setLoadingCards(false);
    })();
  }, [location]);

  // Apply filters to clubs
  useEffect(() => {
    let filtered = [...clubs];

    if (appliedFilters) {
      const filters = appliedFilters;

      // Filter by tier
      if (filters.tiers && filters.tiers.length > 0) {
        filtered = filtered.filter((club) => {
          // Check if club has tier property and it matches selected tiers
          return club.tier !== undefined && club.tier !== null && filters.tiers!.includes(club.tier);
        });
      }

      // Filter by minimum rating
      if (filters.minRating !== null && filters.minRating !== undefined) {
        filtered = filtered.filter((club) => {
          const rating = club.rating ?? 0;
          return rating >= filters.minRating!;
        });
      }

      // Filter by price range
      if (filters.priceMin !== null || filters.priceMax !== null) {
        filtered = filtered.filter((club) => {
          // Get today's price from prices JSONB
          const today = new Date();
          const jsDay = today.getDay();
          const dbDayOfWeek = jsDay === 0 ? 7 : jsDay;

          let clubPrice: number | null = null;

          // Try to get price from prices JSONB
          if (club.prices && typeof club.prices === 'object' && !Array.isArray(club.prices)) {
            const prices = club.prices as any;
            const todayPrices = prices[String(dbDayOfWeek)];
            if (todayPrices && typeof todayPrices.male === 'number') {
              clubPrice = todayPrices.male;
            }
          }

          // Fallback to legacy price field
          if (clubPrice === null) {
            clubPrice = club.price ?? null;
          }

          if (clubPrice === null) return false;

          const minPrice = filters.priceMin ?? 0;
          const maxPrice = filters.priceMax ?? Infinity;

          return clubPrice >= minPrice && clubPrice <= maxPrice;
        });
      }

      // Filter by minimum guest count
      if (filters.minGuestCount !== null && filters.minGuestCount !== undefined) {
        filtered = filtered.filter((club) => {
          const guestCount = club.guest_count ?? 0;
          return guestCount >= filters.minGuestCount!;
        });
      }
    }

    setFilteredClubs(filtered);
  }, [clubs, appliedFilters]);

  /* ---------------- HEATMAP ---------------- */
  useEffect(() => {
    if (!location) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetchWithFallback(
          `/api/map/heatmap`,
          await withAuthHeaders({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lat: location.lat,
              lng: location.lng,
              radius: 10000,
            }),
          })
        );

        if (!cancelled && res.ok) {
          setGeojson(await res.json());
        }
      } catch {
        if (!cancelled) setGeojson(EMPTY_GEOJSON);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location]);

  /* ---------------- LOADING ---------------- */
  if (!authChecked || !location) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.dark.primary} />
        <Text style={styles.loadingText}>
          {!authChecked ? "Checking authentication..." : "Getting your location..."}
        </Text>
      </View>
    );
  }

  /* ---------------- UI ---------------- */
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DismissKeyboardView style={{ flex: 1 }}>
        <StatusBar style="light" />

        {/* MAP - key forces Camera to recenter when location changes (ref setCamera can be unreliable) */}
        <Mapbox.MapView style={{ flex: 1 }} styleURL={Mapbox.StyleURL.Dark}>
          <Mapbox.Camera
            key={`${location.lat}-${location.lng}`}
            ref={cameraRef}
            centerCoordinate={[location.lng, location.lat]}
            zoomLevel={13}
            animationDuration={3000}
            animationMode="easeTo"
          />

          {/* User Location Marker - Blue Google Maps style */}
          {location.source === "gps" && (
            <Mapbox.PointAnnotation
              id="user-location"
              coordinate={[location.lng, location.lat]}
            >
              <View style={styles.userLocationMarker}>
                <View style={styles.userLocationOuter}>
                  <View style={styles.userLocationInner} />
                </View>
              </View>
            </Mapbox.PointAnnotation>
          )}

          {/* Show selected city marker if manual selection */}
          {location.source === "manual" && (
            <Mapbox.PointAnnotation
              id="selected-city"
              coordinate={[location.lng, location.lat]}
            >
              <LinearGradient
                colors={PrimaryGradient}
                start={PrimaryGradientStart}
                end={PrimaryGradientEnd}
                style={styles.cityPin}
              >
                <View style={styles.cityPinInner}>
                  <Ionicons name="location" size={22} color={Colors.dark.text} />
                </View>
              </LinearGradient>
            </Mapbox.PointAnnotation>
          )}

          {/* HEATMAP — red (hot) → orange → yellow → green (cool); layerIndex 0 so it draws below roads and club markers */}
          <Mapbox.ShapeSource id="heatmap" shape={geojson as any}>
  <Mapbox.HeatmapLayer
    id="heatmap-layer"
    layerIndex={0}
    style={{
      heatmapRadius: 100,
      heatmapWeight: 1,
      heatmapIntensity: 1.2,
      heatmapOpacity: 0.75,
      heatmapColor: [
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        0,
        "rgba(0, 0, 0, 0)",
        0.12,
        "rgba(50, 190, 100, 0.55)",
        0.24,
        "rgba(85, 210, 140, 0.65)",
        0.36,
        "rgba(180, 235, 35, 0.7)",
        0.48,
        "rgba(200, 245, 40, 0.74)",
        0.6,
        "rgba(220, 255, 50, 0.78)",
        0.78,
        "rgba(255, 140, 140, 0.75)",
        0.92,
        "rgba(255, 100, 100, 0.8)",
        1,
        "rgba(240, 75, 75, 0.83)",
      ] as any,
    }}
  />
</Mapbox.ShapeSource>

          {/* CLUB MARKERS - Using MarkerView for native React component rendering */}
          {(appliedFilters ? filteredClubs : clubs).map((club, index) => (
            <Mapbox.MarkerView
              key={club.id}
              id={club.id}
              coordinate={[club.longitude, club.latitude]}
              anchor={{ x: 0.5, y: 0.5 }}
              allowOverlap={true}
              allowOverlapWithPuck={true}
            >
              <Pressable
                style={[styles.clubMarkerContainer, { zIndex: 10000 + index, elevation: 10000 + index }]}
                onPress={() => {
                  router.push(`/club/${club.id}`);
                }}
              >
                {/* Main circular image */}
                <View style={club.club_logo ? styles.clubMarkerCircleWithImage : styles.clubMarkerCircle}>
                  {club.club_logo ? (
                    <Image
                      source={{ uri: club.club_logo }}
                      style={styles.clubMarkerImageReal}
                      resizeMode="cover"
                    />
                  ) : (
                    <LinearGradient
                      colors={PrimaryGradient}
                      start={PrimaryGradientStart}
                      end={PrimaryGradientEnd}
                      style={styles.clubMarkerPlaceholder}
                    >
                      <Text style={styles.clubMarkerPlaceholderText}>
                        {club.club_name?.[0]?.toUpperCase() || "C"}
                      </Text>
                    </LinearGradient>
                  )}
                </View>
                {/* Rating badge below */}
                <View style={styles.clubMarkerBadge}>
                  <Ionicons name="star" size={12} color="#EAB308" />
                  <Text style={styles.clubMarkerRating}>
                    {(club.rating ?? 4.0).toFixed(1)}
                  </Text>
                </View>
              </Pressable>
            </Mapbox.MarkerView>
          ))}
        </Mapbox.MapView>

        {/* HEADER */}
        <View style={styles.headerContainer}>
          {/* Location header: 178x40 at left 10, top 59 */}
          <View style={styles.locationHeaderWrapper}>
            <LocationHeader
              title="Home"
              address={locationAddress}
              onLocationChange={handleCitySelect}
            />
          </View>
          <Pressable
            style={styles.headerChatButton}
            onPress={() => setNotificationModalVisible(true)}
          >
            <Ionicons name="notifications-outline" size={22} color={Colors.dark.text} />
            {unreadNotificationCount > 0 && (
              <View style={styles.notificationBadge} />
            )}
          </Pressable>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onResults={setSearchResults}
          />

          {searchResults.length > 0 && (
            <View style={styles.searchResultsContainer}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                style={styles.searchResultsScroll}
                nestedScrollEnabled
              >
                {searchResults.map((item) => (
                  <Pressable
                    key={`${item.type}-${item.id}`}
                    style={styles.searchResultRow}
                    onPress={() => {
                      setSearchQuery("");
                      setSearchResults([]);
                      if (item.type === "club") {
                        router.push(`/club/${item.id}`);
                      } else {
                        router.push(`/event/${item.id}`);
                      }
                    }}
                  >
                    <View style={styles.searchResultImageWrapper}>
                      {item.image ? (
                        <Image source={{ uri: item.image }} style={styles.searchResultImage} />
                      ) : (
                        <View style={styles.searchResultPlaceholder}>
                          <Ionicons
                            name={item.type === "club" ? "business" : "musical-notes"}
                            size={20}
                            color={Colors.dark.textSecondary}
                          />
                        </View>
                      )}
                    </View>
                    <View style={styles.searchResultContent}>
                      <Text style={styles.searchResultName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {(item.subtitle || item.date) && (
                        <Text style={styles.searchResultSubtitle} numberOfLines={1}>
                          {item.type === "club"
                            ? item.subtitle
                            : item.date
                              ? new Date(item.date).toLocaleDateString()
                              : ""}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.searchResultType}>
                      {item.type === "club" ? "Venue" : "Event"}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Map floating actions */}
        <MapFloatingActions
          top={107 + 55 + 8}
          onRecenterToUserLocation={handleRecenterToUserLocation}
          actions={[
            { id: "people", icon: "people-outline", onPress: () => { } },
            { id: "filter", icon: "options-outline", onPress: () => setFilterModalVisible(true) },
            { id: "location", icon: "locate-outline", onPress: () => { } },
          ]}
        />

        {/* Filter clubs modal - opens from map filter button */}
        <FilterClubsModal
          visible={filterModalVisible}
          onClose={() => setFilterModalVisible(false)}
          onFindNow={(filters: ClubFilterState) => {
            setAppliedFilters(filters);
            setFilterModalVisible(false);
          }}
        />

        {/* BOTTOM CARD - positioned at bottom, just above tab bar */}
        <View
          style={[
            styles.cardsContainer,
            { bottom: insets.bottom + TAB_BAR_HEIGHT + CARD_BAR_GAP - 42 },
          ]}
        >
          {loadingCards ? (
            <View style={styles.loadingCards}>
              <ActivityIndicator color={Colors.dark.primary} />
              <Text style={styles.loadingCardsText}>Loading clubs...</Text>
            </View>
          ) : (appliedFilters ? filteredClubs : clubs).length === 0 ? (
            <View style={styles.emptyCards}>
              <Text style={styles.emptyCardsText}>
                {appliedFilters ? "No clubs match your filters" : "No clubs found"}
              </Text>
              <Text style={styles.emptyCardsSubtext}>
                {appliedFilters ? "Try adjusting your filters" : "Try a different city"}
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ width: CARD_WIDTH * (appliedFilters ? filteredClubs : clubs).length }}
            >
              {(appliedFilters ? filteredClubs : clubs).map((club) => (
                <ClubCard
                  key={club.id}
                  club={club}
                  width={CARD_WIDTH}
                  onPress={() => router.push(`/club/${club.id}`)}
                  onNavigate={() => openDirections(club)}
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* NOTIFICATIONS MODAL */}
        <NotificationsModal
          visible={notificationModalVisible}
          onClose={() => {
            setNotificationModalVisible(false);
            // Refresh unread count after closing modal (user may have read notifications)
            fetchUnreadCount();
          }}
        />
      </DismissKeyboardView>
    </GestureHandlerRootView >
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.dark.background,
    gap: 12,
  },

  loadingText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
  },

  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 107,
    paddingHorizontal: 16,
    zIndex: 10,
  },

  locationHeaderWrapper: {
    position: "absolute",
    width: 178,
    height: 40,
    left: 10,
    top: 59,
  },

  headerChatButton: {
    position: "absolute",
    right: 10,
    top: 59,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 50,
  },

  searchResultsContainer: {
    marginTop: 8,
    maxHeight: 240,
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },

  searchResultsScroll: {
    maxHeight: 240,
  },

  searchResultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.dark.border,
    gap: 12,
  },

  searchResultImageWrapper: {
    width: 40,
    height: 40,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: Colors.dark.surface,
  },

  searchResultImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  searchResultPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },

  searchResultContent: {
    flex: 1,
    minWidth: 0,
  },

  searchResultName: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: "600",
  },

  searchResultSubtitle: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },

  searchResultType: {
    color: Colors.dark.primary,
    fontSize: 11,
    fontWeight: "600",
  },

  cityPin: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: Colors.dark.text,
    shadowColor: Colors.dark.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },

  cityPinInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  userLocationMarker: {
    alignItems: "center",
    justifyContent: "center",
  },

  userLocationOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(66, 133, 244, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.dark.text,
    shadowColor: "#4285F4",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },

  userLocationInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4285F4",
  },

  clubMarkerContainer: {
    alignItems: "center",
    zIndex: 10000,
    elevation: 10000,
  },

  clubMarkerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: Colors.dark.primary,
    overflow: "hidden",
    shadowColor: Colors.dark.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  clubMarkerCircleWithImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: Colors.dark.primary,
    overflow: "hidden",
    shadowColor: Colors.dark.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  clubMarkerPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },

  clubMarkerPlaceholderText: {
    color: Colors.dark.text,
    fontSize: 24,
    fontWeight: "700",
  },

  clubMarkerImageReal: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "transparent",
  },

  clubMarkerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: -6,
    gap: 2,
    shadowColor: Colors.dark.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },

  clubMarkerRating: {
    color: "#000",
    fontSize: 11,
    fontWeight: "700",
  },

  loadingCards: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 8,
  },

  loadingCardsText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
  },

  emptyCards: {
    paddingVertical: 40,
    paddingHorizontal: 32,
    alignItems: "center",
    gap: 8,
  },

  emptyCardsText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: "600",
  },

  emptyCardsSubtext: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },

  cardsContainer: {
    position: "absolute",
    left: CARD_HORIZONTAL_PADDING,
    right: CARD_HORIZONTAL_PADDING,
    height: 150,
  },

  notificationBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF3B30",
    borderWidth: 1.5,
    borderColor: Colors.dark.background,
  },
});