import { useEffect, useRef } from "react";
import { Platform, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { fetchWithFallback } from "@/_services/api-config";

const PADDING = 18;
const ICON_SIZE = 19;
const ICON_GAP = 12;
/** Right padding matches left (padding + icon + gap) so input has equal side space */
const PADDING_RIGHT = PADDING + ICON_SIZE + ICON_GAP;

type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  onResults?: (results: any[]) => void; // 👈 results callback
  placeholder?: string;
};

export default function SearchBar({
  value,
  onChangeText,
  onResults,
  placeholder = "Search clubs or events",
}: SearchBarProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!onResults) return;

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!value || value.trim().length < 2) {
      onResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const path = `/api/search?q=${encodeURIComponent(value.trim())}`;
        const res = await fetchWithFallback(path, { method: "GET" });

        if (!res.ok) {
          onResults([]);
          return;
        }

        const data = await res.json();
        onResults(data.results || []);
      } catch (err) {
        console.error("🔍 Search error:", err);
        onResults([]);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, onResults]);

  return (
    <View style={styles.container}>
      <Ionicons name="search" size={ICON_SIZE} color="#9E9E9E" />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#9E9E9E"
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 8,
    paddingLeft: PADDING,
    paddingRight: PADDING_RIGHT,
    paddingVertical: PADDING,
    minHeight: 55,
    flexDirection: "row",
    alignItems: "center",
    gap: ICON_GAP,
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 20,
    padding: 0,
    ...(Platform.OS === "android" && {
      textAlignVertical: "center",
      includeFontPadding: false,
    }),
  },
});