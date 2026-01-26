import { useEffect, useState, useRef } from "react";
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Text,
  Pressable,
  ScrollView,
  Dimensions,
  TextInput,
} from "react-native";
import * as Location from "expo-location";
import Mapbox from "@rnmapbox/maps";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";

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
};

type GeoJSON = {
  type: "FeatureCollection";
  features: any[];
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
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationAddress, setLocationAddress] = useState("");

  const [clubs, setClubs] = useState<ClubCard[]>([]);
  const [geojson, setGeojson] = useState<GeoJSON>(EMPTY_GEOJSON);

  const [loadingCards, setLoadingCards] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  /* ---------------- AUTH ---------------- */
  useEffect(() => {
    (async () => {
      const { data } = await supabasePublic.auth.getSession();
      if (!data.session) router.replace("/(auth)");
      else setAuthChecked(true);
    })();
  }, []);

  /* ---------------- LOCATION ---------------- */
  useEffect(() => {
    if (!authChecked) return;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
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
        console.error("❌ Clubs fetch failed");
        setLoadingCards(false);
        return;
      }

      const raw = await res.json();
      const mapped: ClubCard[] = (raw || []).map((c: any) => ({
        ...c,
        club_name: c.club_name ?? c.name ?? "Club",
      }));
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

        <Mapbox.UserLocation visible animated />

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

        {/* CLUB PINS */}
        {clubs.map((club) => (
          <Mapbox.PointAnnotation
            key={club.id}
            id={club.id}
            coordinate={[club.longitude, club.latitude]}
          >
            <View style={styles.pin} />
          </Mapbox.PointAnnotation>
        ))}
      </Mapbox.MapView>

      {/* HEADER */}
      <View style={styles.headerContainer}>
        <Text style={styles.locationTitle}>Home</Text>
        <Text style={styles.locationAddress}>{locationAddress}</Text>

        <View style={styles.searchContainer}>
          <TextInput
            placeholder="Search location for event"
            placeholderTextColor="#888"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* 🔥 FIGMA CARDS */}
      <View style={styles.cardsContainer}>
        {loadingCards ? (
          <ActivityIndicator color="#EC4899" />
        ) : (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {clubs.map((club) => (
              <View key={club.id} style={styles.cardWrapper}>
                <Pressable
                  style={styles.figmaCard}
                  onPress={() => router.push(`/club/${club.id}`)}
                >
                  <View style={styles.cardTopRow}>
                    <View style={styles.cardImage}>
                      <Text style={{ fontSize: 28 }}>🏙️</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardDate}>
                        ⭐ {(club.rating ?? 0).toFixed(1)}
                      </Text>

                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {club.club_name || "Club"}
                      </Text>

                      <View style={styles.priceRow}>
                        <Text style={styles.price}>Rs.999</Text>
                        <Text style={styles.priceLabel}>per entry</Text>
                      </View>
                    </View>

                    <View style={styles.joiningContainer}>
                      <View style={styles.avatarRow}>
                        <View style={styles.avatar} />
                        <View style={styles.avatar} />
                        <View style={styles.avatarCount}>
                          <Text style={styles.avatarCountText}>
                            +{club.guest_count ?? 0}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.joiningText}>Joining</Text>
                    </View>
                  </View>

                  <View style={styles.cardBottomRow}>
                    <View style={styles.locationRow}>
                      <Text style={styles.locationIcon}>📍</Text>
                      <Text style={styles.locationText} numberOfLines={1}>
                        {club.address_text ?? ""}
                      </Text>
                    </View>

                    <View style={styles.distanceRow}>
                      <Text style={styles.distanceText}>
                        {(club.distance_km ?? 0).toFixed(1)} km
                      </Text>
                      <View style={styles.navigateBtn}>
                        <Text style={{ color: "#fff" }}>📍</Text>
                      </View>
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
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" },

  headerContainer: { position: "absolute", top: 50, left: 16, right: 16 },
  locationTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  locationAddress: { color: "#888", fontSize: 12, marginBottom: 8 },

  searchContainer: { backgroundColor: "#2a2a2a", borderRadius: 16, padding: 12 },
  searchInput: { color: "#fff" },

  pin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#EC4899",
    borderWidth: 2,
    borderColor: "#000",
  },

  cardsContainer: { position: "absolute", bottom: 10, left: 0, right: 0 },
  cardWrapper: { width: SCREEN_WIDTH, paddingHorizontal: 16 },

  figmaCard: {
    backgroundColor: "#2a2a2a",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#3a3a3a",
  },

  cardTopRow: { flexDirection: "row", gap: 12 },
  cardImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: "#444",
    justifyContent: "center",
    alignItems: "center",
  },

  cardDate: { color: "#EC4899", fontSize: 11, marginBottom: 4 },
  cardTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },

  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  price: { color: "#EC4899", fontSize: 18, fontWeight: "700" },
  priceLabel: { color: "#9ca3af", fontSize: 11 },

  joiningContainer: { alignItems: "center" },
  avatarRow: { flexDirection: "row" },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#6b7280",
    marginLeft: -6,
  },
  avatarCount: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#111",
    marginLeft: -6,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarCountText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  joiningText: { color: "#9ca3af", fontSize: 11, marginTop: 4 },

  cardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
  },

  locationRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  locationIcon: { fontSize: 14 },
  locationText: { color: "#9ca3af", fontSize: 13, flex: 1 },

  distanceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  distanceText: { color: "#9ca3af", fontSize: 13 },

  navigateBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EC4899",
    justifyContent: "center",
    alignItems: "center",
  },
});