import { useEffect, useState, useRef } from "react";
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Text,
  Pressable,
  ScrollView,
  Dimensions,
} from "react-native";
import * as Location from "expo-location";
import Mapbox from "@rnmapbox/maps";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";

import supabasePublic from "@/_services/supabase-public";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { API_BASE_URL } from "@/_services/api-config";

/* ---------------- TYPES ---------------- */

type ClubCard = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  intensity: number;
  guest_count: number;
  distance_km: number;
  score: number;
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

  const [clubs, setClubs] = useState<ClubCard[]>([]);
  const [geojson, setGeojson] = useState<GeoJSON>(EMPTY_GEOJSON);

  const [loadingCards, setLoadingCards] = useState(true);

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
    })();
  }, [authChecked]);

  /* ---------------- CLUB CARDS ---------------- */
  useEffect(() => {
    if (!location) return;

    (async () => {
      setLoadingCards(true);

      const res = await fetch(
        `${API_BASE_URL}/api/clubs/nearby?lat=${location.lat}&lng=${location.lng}`,
        await withAuthHeaders({ method: "GET" })
      );

      if (!res.ok) {
        const err = await res.json();
        console.error("❌ Clubs fetch failed:", err);
        setLoadingCards(false);
        return;
      }

      setClubs(await res.json());
      setLoadingCards(false);
    })();
  }, [location]);

  /* ---------------- HEATMAP (ASYNC) ---------------- */
  useEffect(() => {
    if (!location) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/map/heatmap`,
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
      } catch (err) {
        console.error("❌ Heatmap error:", err);
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

        {/* 🔵 USER LOCATION */}
        <Mapbox.UserLocation visible animated />

        {/* 🔥 HEATMAP */}
        <Mapbox.ShapeSource id="heatmap" shape={geojson as any}>
          <Mapbox.HeatmapLayer
            id="heatmap-layer"
            style={{
              heatmapIntensity: 1.8,
              heatmapRadius: 45,
              heatmapOpacity: 0.85,
              heatmapColor: [
                "interpolate",
                ["linear"],
                ["heatmap-density"],
                0, "rgba(0,0,0,0)",
                0.2, "rgba(34,197,94,0.4)",   // green
                0.4, "rgba(132,204,22,0.6)",  // lime
                0.6, "rgba(253,224,71,0.8)",  // yellow
                0.8, "rgba(251,146,60,0.9)",  // orange
                1, "rgba(239,68,68,1)",       // red
              ],
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

      {/* 🔥 POPULAR NEAR YOU */}
      <View style={styles.cardsContainer}>
        <Text style={styles.sectionTitle}>🔥 Popular near you</Text>

        {loadingCards ? (
          <ActivityIndicator color="#EC4899" />
        ) : (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {clubs.map((club) => (
              <View key={club.id} style={styles.cardWrapper}>
                <Pressable style={styles.card}>
                  <Text style={styles.cardTitle}>{club.name}</Text>
                  <Text style={styles.cardMeta}>
                    {club.distance_km} km · 🔥 {club.intensity.toFixed(1)}
                  </Text>
                  <Text style={styles.cardMeta}>
                    👥 {club.guest_count}
                  </Text>
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
  },

  pin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#EC4899",
    borderWidth: 2,
    borderColor: "#000",
  },

  cardsContainer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
  },

  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 16,
    marginBottom: 8,
  },

  cardWrapper: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 16,
  },

  card: {
    backgroundColor: "#1F1F1F",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333",
  },

  cardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  cardMeta: {
    color: "#EC4899",
    marginTop: 6,
    fontSize: 13,
  },
});