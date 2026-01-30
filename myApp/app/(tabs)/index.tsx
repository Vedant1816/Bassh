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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import Mapbox from "@rnmapbox/maps";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";

import LocationHeader from "@/app/components/LocationHeader";
import SearchBar from "@/app/components/SearchBar";
import supabasePublic from "@/_services/supabase-public";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { fetchWithFallback } from "@/_services/api-config";

/* ---------------- TYPES ---------------- */

type ClubCard = {
  id: string;
  club_name: string;
  address_text?: string;
  latitude: number;
  longitude: number;
  rating?: number;
  guest_count?: number;
  distance_km: number;
  banner_image_url?: string;
  profile_image_url?: string;
};

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

const EMPTY_GEOJSON: GeoJSON = {
  type: "FeatureCollection",
  features: [],
};

/* ---------------- SCREEN ---------------- */

export default function HomeScreen() {
  const router = useRouter();
  const cameraRef = useRef<Mapbox.Camera>(null);

  const [authChecked, setAuthChecked] = useState(false);
  const [location, setLocation] = useState<LocationState | null>(null);
  const [locationAddress, setLocationAddress] = useState("");

  const [clubs, setClubs] = useState<ClubCard[]>([]);
  const [geojson, setGeojson] = useState<GeoJSON>(EMPTY_GEOJSON);

  const [loadingCards, setLoadingCards] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { type: "club" | "event"; id: string; name: string; subtitle?: string; date?: string; club_id?: string }[]
  >([]);

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
        console.log("⚠️ Location permission denied");
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLocation((prev) => {
        if (prev?.source === "manual") {
          console.log("🏙️ Keeping manually selected city");
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

  /* ---------------- HANDLE CITY SELECTION ---------------- */
  const handleCitySelect = async (city: { name: string; lat: number; lng: number }) => {
    console.log("🏙️ City selected:", city.name);
    
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

        if (cameraRef.current) {
          cameraRef.current.setCamera({
            centerCoordinate: [pos.coords.longitude, pos.coords.latitude],
            zoomLevel: 13,
            animationDuration: 1000,
          });
        }
      } catch (error) {
        console.error("❌ Failed to get location:", error);
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

    if (cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [city.lng, city.lat],
        zoomLevel: 13,
        animationDuration: 1000,
      });
    }
  };

  /* ---------------- CLUB CARDS ---------------- */
  useEffect(() => {
    if (!location) return;

    (async () => {
      setLoadingCards(true);

      console.log(`📍 Fetching clubs for: ${location.cityName || "GPS location"}`);

      const res = await fetchWithFallback(
        `/api/clubs/nearby?lat=${location.lat}&lng=${location.lng}`,
        await withAuthHeaders({ method: "GET" })
      );

      if (!res.ok) {
        console.error("❌ Clubs fetch failed");
        setLoadingCards(false);
        return;
      }

      const raw = await res.json();
      const mapped: ClubCard[] = (raw || []).map((c: any) => ({
        ...c,
        club_name: c.club_name ?? c.name ?? "Club",
      }));
      
      console.log(`✅ Found ${mapped.length} clubs`);
      setClubs(mapped);
      setLoadingCards(false);
    })();
  }, [location]);

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
        <ActivityIndicator color="#EC4899" />
        <Text style={styles.loadingText}>
          {!authChecked ? "Checking authentication..." : "Getting your location..."}
        </Text>
      </View>
    );
  }

  /* ---------------- UI ---------------- */
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />

      {/* MAP */}
      <Mapbox.MapView style={{ flex: 1 }} styleURL={Mapbox.StyleURL.Dark}>
        <Mapbox.Camera
          ref={cameraRef}
          centerCoordinate={[location.lng, location.lat]}
          zoomLevel={13}
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
            <View style={styles.cityPin}>
              <View style={styles.cityPinInner}>
                <Ionicons name="location" size={22} color="#fff" />
              </View>
            </View>
          </Mapbox.PointAnnotation>
        )}

        {/* HEATMAP */}
        <Mapbox.ShapeSource id="heatmap" shape={geojson as any}>
          <Mapbox.HeatmapLayer
            id="heatmap-layer"
            style={{
              heatmapIntensity: 1.8,
              heatmapRadius: 45,
              heatmapOpacity: 0.85,
            }}
          />
        </Mapbox.ShapeSource>

        {/* CLUB MARKERS - Circular with Image + Rating */}
        {clubs.map((club, index) => (
          <Mapbox.PointAnnotation
            key={club.id}
            id={club.id}
            coordinate={[club.longitude, club.latitude]}
            anchor={{ x: 0.5, y: 1 }}
            onSelected={() => {
              console.log("📍 Club tapped:", club.club_name);
              router.push(`/club/${club.id}`);
            }}
          >
            <Pressable
              style={[styles.clubMarkerContainer, { zIndex: 1000 + index }]}
              onPress={() => router.push(`/club/${club.id}`)}
            >
              {/* Main circular image */}
              <View style={styles.clubMarkerCircle}>
                {club.banner_image_url || club.profile_image_url ? (
                  <Image
                    source={{ uri: club.banner_image_url || club.profile_image_url }}
                    style={styles.clubMarkerImageReal}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.clubMarkerPlaceholder}>
                    <Text style={styles.clubMarkerPlaceholderText}>
                      {club.club_name?.[0]?.toUpperCase() || "C"}
                    </Text>
                  </View>
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
          </Mapbox.PointAnnotation>
        ))}
      </Mapbox.MapView>

      {/* HEADER */}
      <View style={styles.headerContainer}>
        <LocationHeader
          title="Home"
          address={locationAddress}
          onLocationChange={handleCitySelect}
        />
        
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

      {/* BOTTOM CARD */}
      <View style={styles.cardsContainer}>
        {loadingCards ? (
          <View style={styles.loadingCards}>
            <ActivityIndicator color="#EC4899" />
            <Text style={styles.loadingCardsText}>Loading clubs...</Text>
          </View>
        ) : clubs.length === 0 ? (
          <View style={styles.emptyCards}>
            <Text style={styles.emptyCardsText}>No clubs found</Text>
            <Text style={styles.emptyCardsSubtext}>Try a different city</Text>
          </View>
        ) : (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {clubs.map((club) => (
              <View key={club.id} style={styles.cardWrapper}>
                <Pressable
                  style={styles.eventCard}
                  onPress={() => router.push(`/club/${club.id}`)}
                >
                  {/* Date & Time Header */}
                  <Text style={styles.cardDateTime}>
                    23 Dec, 2024 | 6:30 PM -11:00 PM
                  </Text>

                  {/* Content Row */}
                  <View style={styles.cardContent}>
                    {/* Club Image */}
                    <View style={styles.cardImageContainer}>
                      {club.banner_image_url || club.profile_image_url ? (
                        <Image
                          source={{ uri: club.banner_image_url || club.profile_image_url }}
                          style={styles.cardImageReal}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.cardImagePlaceholder}>
                          <Text style={styles.cardImagePlaceholderText}>
                            {club.club_name?.[0]?.toUpperCase() || "C"}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Details */}
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardName} numberOfLines={1}>
                        {club.club_name || "The Daily All Day"}
                      </Text>

                      <View style={styles.cardPriceRow}>
                        <Text style={styles.cardPrice}>Rs.999</Text>
                        <Text style={styles.cardPriceLabel}>per entry</Text>
                      </View>
                    </View>

                    {/* Joining */}
                    <View style={styles.cardJoining}>
                      <View style={styles.cardAvatars}>
                        <View style={[styles.cardAvatar, { zIndex: 3 }]} />
                        <View style={[styles.cardAvatar, { zIndex: 2, marginLeft: -10 }]} />
                        <View style={[styles.cardAvatarCount, { zIndex: 1, marginLeft: -10 }]}>
                          <Text style={styles.cardAvatarCountText}>
                            +{club.guest_count ?? 220}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.cardJoiningText}>Joining</Text>
                    </View>
                  </View>

                  {/* Footer */}
                  <View style={styles.cardFooter}>
                    <View style={styles.cardLocation}>
                      <Ionicons name="location-outline" size={16} color="#9ca3af" />
                      <Text style={styles.cardLocationText} numberOfLines={1}>
                        {club.address_text || "street Independence Square 40"}
                      </Text>
                    </View>

                    <View style={styles.cardDistance}>
                      <Text style={styles.cardDistanceText}>
                        {(club.distance_km ?? 3.0).toFixed(1)} km
                      </Text>
                      <Pressable style={styles.cardNavigateBtn}>
                        <Ionicons name="navigate" size={18} color="#fff" />
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </GestureHandlerRootView>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    gap: 12,
  },

  loadingText: {
    color: "#999",
    fontSize: 14,
  },

  headerContainer: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    zIndex: 10,
  },

  searchResultsContainer: {
    marginTop: 8,
    maxHeight: 240,
    backgroundColor: "#1a1a1a",
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
    borderBottomColor: "#2a2a2a",
    gap: 10,
  },

  searchResultContent: {
    flex: 1,
    minWidth: 0,
  },

  searchResultName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },

  searchResultSubtitle: {
    color: "#888",
    fontSize: 13,
    marginTop: 2,
  },

  searchResultType: {
    color: "#EC4899",
    fontSize: 11,
    fontWeight: "600",
  },

  cityPin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EC4899",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#EC4899",
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

  // Google Maps-style blue user location marker
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
    borderColor: "#fff",
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

  // Club Marker Styles (matching screenshot)
  clubMarkerContainer: {
    alignItems: "center",
    zIndex: 1000,
    elevation: 10,
  },

  clubMarkerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#EC4899",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  clubMarkerEmoji: {
    fontSize: 28,
  },

  clubMarkerPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EC4899",
    justifyContent: "center",
    alignItems: "center",
  },

  clubMarkerPlaceholderText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },

  clubMarkerImageReal: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
    shadowColor: "#000",
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

  // Bottom Card Styles (matching screenshot)
  cardsContainer: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    zIndex: 5,
  },

  loadingCards: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 8,
  },

  loadingCardsText: {
    color: "#999",
    fontSize: 14,
  },

  emptyCards: {
    paddingVertical: 40,
    paddingHorizontal: 32,
    alignItems: "center",
    gap: 8,
  },

  emptyCardsText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  emptyCardsSubtext: {
    color: "#999",
    fontSize: 14,
    textAlign: "center",
  },

  cardWrapper: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 16,
  },

  eventCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  cardDateTime: {
    color: "#EC4899",
    fontSize: 12,
    marginBottom: 12,
  },

  cardContent: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },

  cardImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#2a2a2a",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },

  cardImageEmoji: {
    fontSize: 36,
  },

  cardImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#EC4899",
    justifyContent: "center",
    alignItems: "center",
  },

  cardImagePlaceholderText: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "700",
  },

  cardImageReal: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },

  cardInfo: {
    flex: 1,
    justifyContent: "center",
  },

  cardName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },

  cardPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },

  cardPrice: {
    color: "#EC4899",
    fontSize: 20,
    fontWeight: "700",
  },

  cardPriceLabel: {
    color: "#9ca3af",
    fontSize: 12,
  },

  cardJoining: {
    alignItems: "center",
    justifyContent: "center",
  },

  cardAvatars: {
    flexDirection: "row",
    marginBottom: 4,
  },

  cardAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#6b7280",
    borderWidth: 2,
    borderColor: "#1a1a1a",
  },

  cardAvatarCount: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#000",
    borderWidth: 2,
    borderColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },

  cardAvatarCountText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },

  cardJoiningText: {
    color: "#9ca3af",
    fontSize: 11,
  },

  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  cardLocation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },

  cardLocationText: {
    color: "#fff",
    fontSize: 14,
    flex: 1,
  },

  cardDistance: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  cardDistanceText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  cardNavigateBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EC4899",
    justifyContent: "center",
    alignItems: "center",
  },

});