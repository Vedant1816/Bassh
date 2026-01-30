import { useEffect, useRef } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { fetchWithFallback } from "@/_services/api-config";

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
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#888"
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
    backgroundColor: "#2a2a2a",
    borderRadius: 16,
    padding: 12,
  },
  input: {
    color: "#fff",
    fontSize: 16,
  },
});