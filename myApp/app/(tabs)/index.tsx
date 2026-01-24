import { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Text,
  Pressable,
} from "react-native";
import * as Location from "expo-location";
import Mapbox from "@rnmapbox/maps";
import { useRouter } from "expo-router";
import BottomSheet from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

import supabasePublic from "@/_services/supabase-public";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { API_BASE_URL } from "@/_services/api-config";
import LocationPickerSheet from "../components/LocationPickerSheet";

/* -------------------------------- TYPES -------------------------------- */

type GeoJSONFeatureCollection = {
  type: "FeatureCollection";
  features: any[];
};

type EventData = {
  id: string;
  event_name: string;
  club_name: string;
  latitude?: number;
  longitude?: number;
};

const EMPTY_GEOJSON: GeoJSONFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

/* -------------------------------- SCREEN -------------------------------- */

export default function HomeScreen() {
  const router = useRouter();

  const cameraRef = useRef<Mapbox.Camera>(null);
  const eventSheetRef = useRef<BottomSheet>(null);
  const locationSheetRef = useRef<BottomSheet>(null);

  const snapPoints = useMemo(() => ["30%", "60%"], []);

  const [authChecked, setAuthChecked] = useState(false);

  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [currentCity, setCurrentCity] = useState("Locating…");
  const [currentAddress, setCurrentAddress] = useState("");

  const [geojson, setGeojson] =
    useState<GeoJSONFeatureCollection>(EMPTY_GEOJSON);

  const [events, setEvents] = useState<EventData[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);

  /* ------------------------------ AUTH ------------------------------ */
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

  /* --------------------------- LOCATION --------------------------- */
  useEffect(() => {
    if (!authChecked) return;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      setLocation({ lat, lng });

      const geo = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng,
      });

      if (geo[0]) {
        setCurrentCity(geo[0].city || "Nearby");
        setCurrentAddress(
          [geo[0].name, geo[0].street, geo[0].district]
            .filter(Boolean)
            .join(", ")
        );
      }
    })();
  }, [authChecked]);

  /* ----------------------- HEATMAP (ASYNC) ----------------------- */
  useEffect(() => {
    if (!location || !authChecked) return;

    let cancelled = false;

    (async () => {
      try {
        // Ensure we have a session before making the request
        const { data: sessionData } = await supabasePublic.auth.getSession();
        if (!sessionData?.session?.access_token) {
          console.warn("⚠️ No session available for heatmap request");
          return;
        }

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
      } catch (error) {
        console.error("❌ Heatmap fetch error:", error);
        if (!cancelled) setGeojson(EMPTY_GEOJSON);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location, authChecked]);

  /* ---------------------------- EVENTS ---------------------------- */
  useEffect(() => {
    if (!authChecked) return;

    (async () => {
      try {
        // Ensure we have a session before making the request
        const { data: sessionData } = await supabasePublic.auth.getSession();
        if (!sessionData?.session?.access_token) {
          console.warn("⚠️ No session available for events request");
          return;
        }

        const res = await fetch(
          `${API_BASE_URL}/api/events`,
          await withAuthHeaders({ method: "GET" })
        );

        if (res.ok) {
          const data = await res.json();
          setEvents(data || []);
          setSelectedEvent(data?.[0] ?? null);
        }
      } catch (error) {
        console.error("❌ Events fetch error:", error);
      }
    })();
  }, [authChecked]);

  /* ---------------------------- LOADING ---------------------------- */
  if (!authChecked || !location) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#EC4899" />
      </View>
    );
  }

  /* ------------------------------ UI ------------------------------ */

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />

      {/* HEADER */}
      <Pressable
        style={styles.header}
        onPress={() => locationSheetRef.current?.expand()}
      >
        <Ionicons name="location" size={20} color="#EF4444" />
        <View style={{ marginLeft: 8 }}>
          <Text style={styles.city}>{currentCity}</Text>
          <Text style={styles.address}>{currentAddress}</Text>
        </View>
      </Pressable>

      {/* MAP */}
      <Mapbox.MapView style={{ flex: 1 }} styleURL={Mapbox.StyleURL.Dark}>
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [location.lng, location.lat],
            zoomLevel: 13,
          }}
        />

        <Mapbox.UserLocation visible />

        <Mapbox.ShapeSource id="heat" shape={geojson as any}>
          <Mapbox.HeatmapLayer
            id="heat-layer"
            style={{
              heatmapIntensity: 1.8,
              heatmapRadius: 45,
              heatmapOpacity: 0.85,
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

        {events.map(
          (e) =>
            e.latitude &&
            e.longitude && (
              <Mapbox.PointAnnotation
                key={e.id}
                id={e.id}
                coordinate={[e.longitude, e.latitude]}
                onSelected={() => {
                  setSelectedEvent(e);
                  eventSheetRef.current?.expand();
                }}
              >
                <View style={styles.pin} />
              </Mapbox.PointAnnotation>
            )
        )}
      </Mapbox.MapView>

      {/* EVENT CARD */}
      {selectedEvent && (
        <Pressable
          style={styles.eventCard}
          onPress={() => eventSheetRef.current?.expand()}
        >
          <Text style={styles.eventTitle}>{selectedEvent.event_name}</Text>
          <Text style={styles.eventSub}>{selectedEvent.club_name}</Text>
        </Pressable>
      )}

      {/* EVENT SHEET */}
      <BottomSheet
        ref={eventSheetRef}
        index={-1}
        snapPoints={snapPoints}
        backgroundStyle={styles.sheetBg}
      >
        <View style={{ padding: 20 }}>
          {selectedEvent && (
            <Pressable
              style={styles.detailsBtn}
              onPress={() => router.push(`/event/${selectedEvent.id}`)}
            >
              <Text style={{ color: "#fff" }}>View Details</Text>
            </Pressable>
          )}
        </View>
      </BottomSheet>

      {/* LOCATION PICKER */}
      <LocationPickerSheet
        sheetRef={locationSheetRef}
        onSelect={({ city, address, lat, lng }) => {
          setCurrentCity(city);
          setCurrentAddress(address);
          setLocation({ lat, lng });

          cameraRef.current?.flyTo([lng, lat], 1200);
          cameraRef.current?.zoomTo(13, 1200);
        }}
      />
    </GestureHandlerRootView>
  );
}

/* -------------------------------- STYLES -------------------------------- */

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    zIndex: 1000,
    flexDirection: "row",
    alignItems: "center",
  },

  city: { color: "#fff", fontSize: 16, fontWeight: "700" },
  address: { color: "#9CA3AF", fontSize: 12 },

  pin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#EC4899",
    borderWidth: 2,
    borderColor: "#000",
  },

  eventCard: {
    position: "absolute",
    bottom: 80,
    left: 16,
    right: 16,
    backgroundColor: "#1F1F1F",
    padding: 16,
    borderRadius: 14,
  },

  eventTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  eventSub: { color: "#9CA3AF", marginTop: 4 },

  sheetBg: {
    backgroundColor: "#1F1F1F",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

  detailsBtn: {
    backgroundColor: "#EC4899",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
});