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
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import LocationHeader from "@/app/components/LocationHeader";
import SearchBar from "@/app/components/SearchBar";
import MapFloatingActions from "@/app/components/MapFloatingActions";
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
        {/* Location header: 178x40 at left 10, top 59 */}
        <View style={styles.locationHeaderWrapper}>
          <LocationHeader
            title="Home"
            address={locationAddress}
            onLocationChange={handleCitySelect}
          />
        </View>
        <Pressable style={styles.headerChatButton}>
          <View style={styles.headerChatCircle}>
            <Ionicons name="chatbubble-outline" size={20} color="#fff" />
          </View>
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
      />

      {/* BOTTOM CARD - positioned above tab bar */}
      <View
        style={[
          styles.cardsContainer,
          { bottom: insets.bottom + TAB_BAR_HEIGHT + CARD_BAR_GAP - 26 },
        ]}
      >
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
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ width: CARD_WIDTH * clubs.length }}
          >
            {clubs.map((club) => (
              <View key={club.id} style={[styles.cardWrapper, { width: CARD_WIDTH }]}>
                <Pressable
                  style={[styles.clubCard, { width: CARD_WIDTH }]}
                  onPress={() => router.push(`/club/${club.id}`)}
                >
                  {/* Pink glow effects */}
                  <View style={[styles.cardGlows, { zIndex: 1 }]} pointerEvents="none">
                    <View style={[styles.cardGlow, styles.cardGlow1]} />
                    <View style={[styles.cardGlow, styles.cardGlow2]} />
                    <View style={[styles.cardGlow, styles.cardGlow3]} />
                    <View style={[styles.cardGlow, styles.cardGlow4]} />
                    <View style={[styles.cardGlow, styles.cardGlow5]} />
                  </View>
                  <View style={styles.cardContent}>
                  {/* Top section */}
                  <View style={[styles.cardTopSection, { zIndex: 2 }]}>
                    <View style={styles.cardImageContainer}>
                      {club.banner_image_url || club.profile_image_url ? (
                        <Image
                          source={{ uri: club.banner_image_url || club.profile_image_url }}
                          style={styles.cardImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.cardImagePlaceholder}>
                          <Text style={styles.cardImageText}>
                            {club.club_name?.[0]?.toUpperCase() || "C"}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.cardDetails}>
                      <View style={styles.cardTitleSection}>
                        <Text style={styles.cardDateTime}>
                          ⭐ {(club.rating ?? 4.0).toFixed(1)}
                        </Text>
                        <Text style={styles.cardName} numberOfLines={1}>
                          {club.club_name || "Club"}
                        </Text>
                      </View>
                      <View style={styles.cardPriceRow}>
                        <View style={styles.cardPriceBlock}>
                          <Text style={styles.cardPrice}>Rs.999</Text>
                          <Text style={styles.cardPriceLabel}>per entry</Text>
                        </View>
                        <View style={styles.cardAvatarSection}>
                          <View style={styles.cardAvatars}>
                            <View style={[styles.cardAvatar, styles.cardAvatar1]} />
                            <View style={[styles.cardAvatar, styles.cardAvatar2]} />
                            <View style={styles.cardAvatarCount}>
                              <Text style={styles.cardAvatarCountText}>
                                +{club.guest_count ?? 220}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.cardJoiningText}>Joining</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  {/* Footer */}
                  <View style={[styles.cardFooter, { zIndex: 2 }]}>
                    <View style={styles.cardLocationBlock}>
                      <View style={styles.cardLocationIcon}>
                        <Ionicons name="location-outline" size={14} color="#F0F1F3" />
                      </View>
                      <View style={styles.cardLocationTextBlock}>
                        <Text style={styles.cardLocationText} numberOfLines={1}>
                          {club.address_text || "street Independence Square 40"}
                        </Text>
                        <Text style={styles.cardDistance}>
                          {(club.distance_km ?? 3.0).toFixed(1)} km
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      style={styles.cardNavigateBtn}
                      onPress={(e: any) => {
                        e?.stopPropagation?.();
                        openDirections(club);
                      }}
                    >
                      <LinearGradient
                        colors={["#DB4494", "#DB138D"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.cardNavigateGradient}
                      >
                        <Ionicons name="navigate" size={16} color="#fff" />
                      </LinearGradient>
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
  },

  headerChatCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#525252",
    justifyContent: "center",
    alignItems: "center",
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

  cardsContainer: {
    position: "absolute",
    left: CARD_HORIZONTAL_PADDING,
    right: CARD_HORIZONTAL_PADDING,
    height: 150,
  },

  cardWrapper: {
    height: 150,
  },

  clubCard: {
    height: 150,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "rgba(30, 30, 30, 0.95)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.8,
    shadowRadius: 32,
    elevation: 12,
  },

  cardContent: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 10,
  },

  cardGlows: {
    ...StyleSheet.absoluteFillObject,
  },

  cardGlow: {
    position: "absolute",
    width: 92,
    height: 67,
    backgroundColor: "#F02DA4",
    transform: [{ rotate: "-35deg" }],
  },

  cardGlow1: { left: 0, top: 71, opacity: 0 },
  cardGlow2: { left: 126, top: -22, opacity: 0 },
  cardGlow3: { left: 131, top: 48, opacity: 0.1 },
  cardGlow4: { left: -39, top: -60, opacity: 0.2 },
  cardGlow5: { left: 248, top: 23, opacity: 0.15 },

  cardTopSection: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 14,
  },

  cardImageContainer: {
    width: 96,
    height: 54,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 4,
  },

  cardImage: {
    width: 96,
    height: 54,
    borderRadius: 12,
  },

  cardImagePlaceholder: {
    width: 96,
    height: 54,
    borderRadius: 12,
    backgroundColor: "#F02DA4",
    justifyContent: "center",
    alignItems: "center",
  },

  cardImageText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },

  cardDetails: {
    flex: 1,
    minWidth: 0,
    justifyContent: "space-between",
  },

  cardTitleSection: {
    gap: 4,
  },

  cardDateTime: {
    fontSize: 10,
    fontWeight: "400",
    color: "#F357B6",
  },

  cardName: {
    fontSize: 17,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  cardPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  cardPriceBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  cardPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#F02DA4",
  },

  cardPriceLabel: {
    fontSize: 10,
    fontWeight: "400",
    color: "#B6B6B6",
  },

  cardAvatarSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  cardAvatars: {
    flexDirection: "row",
    alignItems: "center",
  },

  cardAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#6b7280",
    borderWidth: 1.4,
    borderColor: "#FFFFFF",
  },

  cardAvatar1: { zIndex: 3 },
  cardAvatar2: { marginLeft: -6, zIndex: 2 },

  cardAvatarCount: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginLeft: -6,
    backgroundColor: "#161C2B",
    borderWidth: 1.4,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },

  cardAvatarCountText: {
    fontSize: 9,
    fontWeight: "500",
    color: "#FFFFFF",
  },

  cardJoiningText: {
    fontSize: 10,
    fontWeight: "400",
    color: "#D0D3D9",
  },

  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 12,
  },

  cardLocationBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },

  cardLocationIcon: {
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  cardLocationTextBlock: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },

  cardLocationText: {
    fontSize: 12,
    fontWeight: "400",
    color: "#D0D3D9",
  },

  cardDistance: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  cardNavigateBtn: {
    overflow: "hidden",
  },

  cardNavigateGradient: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1.4 },
    shadowOpacity: 0.11,
    shadowRadius: 5,
    elevation: 2,
  },
});