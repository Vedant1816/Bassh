import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { View, ActivityIndicator, StyleSheet, Text, Pressable, ScrollView, Dimensions, TextInput } from "react-native";
import * as Location from "expo-location";
import Mapbox from "@rnmapbox/maps";
import { useRouter } from "expo-router";
import BottomSheet from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import supabasePublic from "@/_services/supabase-public";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { API_BASE_URL } from "@/_services/api-config";

type GeoJSONFeature = {
  type: "Feature";
  geometry: {
    type: string;
    coordinates: number[] | number[][] | number[][][];
  };
  properties?: Record<string, any>;
};

type GeoJSONFeatureCollection = {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
};

const EMPTY_GEOJSON: GeoJSONFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = SCREEN_WIDTH - 32; // Increased width to cover Mapbox logo

type VenueData = {
  id?: string;
  name?: string;
  category?: string;
  guest_count?: number;
  intensity?: number;
};

export default function HomeScreen() {
  const router = useRouter();

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geojson, setGeojson] = useState<GeoJSONFeatureCollection>(EMPTY_GEOJSON);
  const [authChecked, setAuthChecked] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<VenueData | null>(null);
  const [cameraTarget, setCameraTarget] = useState<{ lng: number; lat: number; zoom: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["25%", "50%"], []);
  const cameraRef = useRef<Mapbox.Camera>(null);

  // Sort clubs by intensity (highest first)
  const sortedClubs = useMemo(() => {
    return [...geojson.features]
      .map((f: GeoJSONFeature) => ({
        ...f,
        intensity: f.properties?.intensity || 0,
      }))
      .sort((a, b) => (b.intensity || 0) - (a.intensity || 0));
  }, [geojson.features]);

  // 1️⃣ Auth check
  useEffect(() => {
    (async () => {
      const { data } = await supabasePublic.auth.getSession();
      if (!data.session) {
        router.replace("/(auth)");
      } else {
        setAuthChecked(true);
      }
    })();
  }, []);

  // 2️⃣ Get live location (after auth check)
  useEffect(() => {
    if (!authChecked) return;

    (async () => {
      try {
        // Request location permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.warn("Location permission denied");
          return;
        }

        // Get initial position
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        console.log(
          "USER LOCATION:",
          pos.coords.latitude,
          pos.coords.longitude
        );

        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });

        // Watch for position updates
        Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          (position) => {
            console.log(
              "USER LOCATION:",
              position.coords.latitude,
              position.coords.longitude
            );
            setLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          }
        );
      } catch (error) {
        console.error("Location error:", error);
      }
    })();
  }, [authChecked]);

  useEffect(() => {
    console.log(
      "GEOJSON VALID:",
      geojson?.type,
      Array.isArray(geojson?.features),
      geojson?.features?.length
    );
  }, [geojson]);

  // 3️⃣ Fetch heatmap data
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/map/heatmap`,
          await withAuthHeaders({
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              categories: ["club"],
              minIntensity: 1,
            }),
          })
        );

        if (!res.ok) {
          console.error("API Error:", res.status);
          setGeojson(EMPTY_GEOJSON);
          return;
        }

        const data = await res.json();
        
        console.log("📊 Heatmap API response:", data?.features?.length || 0, "features");

        const safeGeoJson: GeoJSONFeatureCollection = {
          type: "FeatureCollection",
          features: Array.isArray(data?.features)
            ? data.features.filter(
                (f: any) =>
                  f?.type === "Feature" &&
                  f?.geometry?.type === "Point" &&
                  Array.isArray(f.geometry.coordinates) &&
                  f.geometry.coordinates.length === 2 &&
                  typeof f.geometry.coordinates[0] === "number" &&
                  typeof f.geometry.coordinates[1] === "number"
              )
            : [],
        };

        console.log("✅ Valid GeoJSON features:", safeGeoJson.features.length);
        
        // Calculate bounds to fit all features if we have data
        if (safeGeoJson.features.length > 0) {
          const coordinates = safeGeoJson.features.map(
            (f: any) => f.geometry.coordinates
          );
          const lngs = coordinates.map((c: number[]) => c[0]);
          const lats = coordinates.map((c: number[]) => c[1]);
          const bounds = [
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)],
          ];
          console.log("🗺️ Feature bounds:", bounds);
        }
        
        setGeojson(safeGeoJson);
      } catch (error) {
        console.error("Fetch error:", error);
        setGeojson(EMPTY_GEOJSON);
      }
    })();
  }, []);

  // Handle tap on heatmap - must be before early return
  const handleShapePress = useCallback((event: any) => {
    const { features, geometry } = event;
    
    if (features && features.length > 0) {
      // Get the first feature (the tapped one)
      const feature = features[0];
      const properties = feature.properties || {};
      
      // Extract venue data
      const venueData: VenueData = {
        id: properties.id,
        name: properties.name || "Unknown Venue",
        category: properties.category || "Unknown",
        guest_count: properties.guest_count || 0,
        intensity: properties.intensity || 0,
      };
      
      setSelectedVenue(venueData);
      bottomSheetRef.current?.expand();
    }
  }, []);

  // Close bottom sheet handler - must be before early return
  const handleClosePress = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);

  // Handle card tap - open bottom sheet only
  const handleCardPress = useCallback((feature: GeoJSONFeature) => {
    const properties = feature.properties || {};
    
    // Update venue data
    const venueData: VenueData = {
      id: properties.id,
      name: properties.name || "Unknown Venue",
      category: properties.category || "Unknown",
      guest_count: properties.guest_count || 0,
      intensity: properties.intensity || 0,
    };
    
    setSelectedVenue(venueData);
    
    // Open bottom sheet
    bottomSheetRef.current?.expand();
  }, []);

  // Show loading only while checking auth
  if (!authChecked) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#EC4899" />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  // Map renders immediately after auth check passes
  // Camera will center on user location once it's available (followUserLocation)
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search clubs..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <Mapbox.MapView style={{ flex: 1 }} styleURL={Mapbox.StyleURL.Dark}>
          {cameraTarget ? (
            // Center around specific club location when card is tapped
            <Mapbox.Camera
              key={`${cameraTarget.lng}-${cameraTarget.lat}`}
              ref={cameraRef}
              centerCoordinate={[cameraTarget.lng, cameraTarget.lat]}
              zoomLevel={cameraTarget.zoom}
              animationMode="flyTo"
              animationDuration={1000}
            />
          ) : geojson.features.length > 0 ? (
            // Fit all clubs in view initially
            <Mapbox.Camera
              ref={cameraRef}
              bounds={{
                ne: [
                  Math.max(...geojson.features.map((f: GeoJSONFeature) => f.geometry.coordinates[0] as number)),
                  Math.max(...geojson.features.map((f: GeoJSONFeature) => f.geometry.coordinates[1] as number)),
                ],
                sw: [
                  Math.min(...geojson.features.map((f: GeoJSONFeature) => f.geometry.coordinates[0] as number)),
                  Math.min(...geojson.features.map((f: GeoJSONFeature) => f.geometry.coordinates[1] as number)),
                ],
              }}
              animationMode="flyTo"
              animationDuration={1500}
            />
          ) : (
            // Default view centered on user location
            <Mapbox.Camera
              ref={cameraRef}
              followUserLocation
              followZoomLevel={13}
            />
          )}

          <Mapbox.UserLocation visible />

          <Mapbox.ShapeSource
            id="heatmapSource"
            shape={(geojson ?? EMPTY_GEOJSON) as any}
            onPress={handleShapePress}
          >
            {/* Transparent tappable layer for detecting taps */}
            <Mapbox.CircleLayer
              id="tapLayer"
              style={{
                circleRadius: 40,
                circleColor: "transparent",
                circleStrokeWidth: 0,
              }}
            />
            
            <Mapbox.HeatmapLayer
              id="heatmapLayer"
              style={{
                // More weight from intensity
                heatmapWeight: [
                  "interpolate",
                  ["linear"],
                  ["get", "intensity"],
                  0, 0,
                  12, 1,
                ],

                // 🔥 Increase density
                heatmapIntensity: 1.8,

                // 🔥 Bigger spread
                heatmapRadius: 45,

                // Slight transparency
                heatmapOpacity: 0.85,

                // 🎨 Color ramp (GREEN instead of BLUE)
                heatmapColor: [
                  "interpolate",
                  ["linear"],
                  ["heatmap-density"],

                  0, "rgba(0,0,0,0)",
                  0.2, "rgba(34,197,94,0.5)",   // green-500
                  0.4, "rgba(132,204,22,0.7)",  // lime-400
                  0.6, "rgba(253,224,71,0.85)", // yellow-300
                  0.8, "rgba(251,146,60,0.9)",  // orange-400
                  1, "rgba(239,68,68,1)",       // red-500
                ],
              }}
            />
          </Mapbox.ShapeSource>
        </Mapbox.MapView>

        {/* Club Card Carousel - One at a time with swipe */}
        {sortedClubs.length > 0 && (
          <View style={styles.cardsContainer}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={SCREEN_WIDTH}
              snapToAlignment="center"
              contentContainerStyle={styles.cardsScrollContent}
            >
              {sortedClubs.map((club: any, index: number) => {
                const coords = club.geometry.coordinates as number[];
                const props = club.properties || {};
                
                return (
                  <View key={club.id || index} style={styles.cardWrapper}>
                    <Pressable
                      style={styles.clubCard}
                      onPress={() => handleCardPress(club)}
                    >
                      <Text style={styles.clubCardName} numberOfLines={1}>
                        {props.name || "Unknown Club"}
                      </Text>
                      <View style={styles.clubCardStats}>
                        <Text style={styles.clubCardStat}>
                          👥 {props.guest_count || 0}
                        </Text>
                        <Text style={styles.clubCardStat}>
                          🔥 {(props.intensity || 0).toFixed(1)}
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Bottom Sheet */}
        <BottomSheet
          ref={bottomSheetRef}
          index={-1}
          snapPoints={snapPoints}
          enablePanDownToClose
          backgroundStyle={styles.bottomSheetBackground}
          handleIndicatorStyle={styles.bottomSheetIndicator}
        >
          <View style={styles.bottomSheetContent}>
            {selectedVenue ? (
              <>
                <Text style={styles.venueName}>{selectedVenue.name}</Text>
                <View style={styles.venueInfoRow}>
                  <Text style={styles.venueLabel}>Category:</Text>
                  <Text style={styles.venueValue}>{selectedVenue.category}</Text>
                </View>
                <View style={styles.venueInfoRow}>
                  <Text style={styles.venueLabel}>Guests:</Text>
                  <Text style={styles.venueValue}>{selectedVenue.guest_count}</Text>
                </View>
                <View style={styles.venueInfoRow}>
                  <Text style={styles.venueLabel}>Heat Level:</Text>
                  <Text style={styles.venueValue}>
                    {selectedVenue.intensity?.toFixed(1) || "0.0"}
                  </Text>
                </View>
              </>
            ) : (
              <Text style={styles.emptyText}>No venue selected</Text>
            )}
          </View>
        </BottomSheet>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
  },
  loadingText: {
    color: "#9CA3AF",
    marginTop: 12,
  },
  bottomSheetBackground: {
    backgroundColor: "#1F1F1F",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  bottomSheetIndicator: {
    backgroundColor: "#EC4899",
    width: 40,
  },
  bottomSheetContent: {
    flex: 1,
    padding: 20,
  },
  venueName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 20,
  },
  venueInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333333",
  },
  venueLabel: {
    fontSize: 16,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  venueValue: {
    fontSize: 16,
    color: "#EC4899",
    fontWeight: "500",
  },
  emptyText: {
    fontSize: 16,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 20,
  },
  searchContainer: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  searchInput: {
    backgroundColor: "#1F1F1F",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#333333",
  },
  cardsContainer: {
    position: "absolute",
    bottom: -10,
    left: 0,
    right: 0,
    height: 180,
  },
  cardsScrollContent: {
    paddingVertical: 8,
  },
  cardWrapper: {
    width: SCREEN_WIDTH,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  clubCard: {
    width: SCREEN_WIDTH - 16, // Wider card to cover Mapbox logo
    height: 140,
    backgroundColor: "#1F1F1F",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333333",
    justifyContent: "space-between",
  },
  clubCardName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  clubCardStats: {
    gap: 6,
  },
  clubCardStat: {
    fontSize: 12,
    color: "#EC4899",
    fontWeight: "500",
  },
});