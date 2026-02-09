import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import BottomSheet from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import Mapbox from "@rnmapbox/maps";
import { DismissKeyboardView } from "@/components/DismissKeyboardView";

type Props = {
  sheetRef: React.RefObject<BottomSheet | null>;
  onSelect: (data: {
    city: string;
    address: string;
    lat: number;
    lng: number;
  }) => void;
};

export default function LocationPickerSheet({ sheetRef, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const searchCity = async () => {
    if (!query.trim()) return;

    try {
      setLoading(true);

      const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
      if (!mapboxToken) {
        return;
      }

      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?access_token=${mapboxToken}&limit=1`
      );

      const data = await res.json();
      if (!data.features?.length) return;

      const place = data.features[0];
      const [lng, lat] = place.center;

      onSelect({
        city: place.text,
        address: place.place_name,
        lat,
        lng,
      });

      sheetRef.current?.close();
      setQuery("");
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={["45%", "70%"]}
      enablePanDownToClose
      backgroundStyle={styles.bg}
      handleIndicatorStyle={styles.indicator}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <DismissKeyboardView style={styles.container}>
          <Text style={styles.title}>Change location</Text>

          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              placeholder="Search city"
              placeholderTextColor="#9CA3AF"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={searchCity}
              style={styles.input}
            />
          </View>

          <Pressable
            style={[styles.button, loading && { opacity: 0.6 }]}
            onPress={searchCity}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Searching..." : "Confirm location"}
            </Text>
          </Pressable>

          {/* QUICK PICKS */}
          <View style={styles.quickRow}>
            {["Delhi", "Mumbai", "Bengaluru", "Chandigarh"].map((city) => (
              <Pressable
                key={city}
                onPress={() => setQuery(city)}
                style={styles.quickChip}
              >
                <Text style={styles.quickText}>{city}</Text>
              </Pressable>
            ))}
          </View>
        </DismissKeyboardView>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  bg: {
    backgroundColor: "#1F1F1F",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  indicator: {
    backgroundColor: "#EC4899",
    width: 40,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#333",
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 10,
    fontSize: 16,
    color: "#FFFFFF",
  },
  button: {
    marginTop: 20,
    backgroundColor: "#EC4899",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  quickChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "#333",
    borderRadius: 20,
  },
  quickText: {
    color: "#EC4899",
    fontSize: 14,
  },
});