import React, { useState } from "react";
import { Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { fetchWithFallback } from "@/_services/api-config";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { Colors } from "@/constants/Colors";

interface BookmarkButtonProps {
  eventId?: string;
  clubId?: string;
  bookmarkType: "event" | "club";
  size?: number;
  initialBookmarked?: boolean;
  onToggle?: (isBookmarked: boolean) => void;
}

export default function BookmarkButton({
  eventId,
  clubId,
  bookmarkType,
  size = 24,
  initialBookmarked = false,
  onToggle,
}: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [loading, setLoading] = useState(false);

  const toggleBookmark = async () => {
    if (loading) return;

    // Haptic feedback
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) {
      // Haptics not available, ignore
    }

    const prev = isBookmarked;
    const method = prev ? "DELETE" : "POST";

    // Optimistic update
    setIsBookmarked(!prev);
    setLoading(true);

    try {
      const body =
        bookmarkType === "event"
          ? { bookmark_type: "event", event_id: eventId }
          : { bookmark_type: "club", club_id: clubId };

      const res = await fetchWithFallback(
        "/api/bookmarks/save",
        await withAuthHeaders({
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      );

      if (!res.ok) {
        setIsBookmarked(prev);
        console.error("Bookmark failed:", await res.text());
        return;
      }

      onToggle?.(!prev);
    } catch (err) {
      setIsBookmarked(prev);
      console.error("Bookmark error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      onPress={toggleBookmark}
      disabled={loading}
      hitSlop={10}
      style={styles.container}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isBookmarked ? Colors.dark.primary400 : "#fff"} />
      ) : (
        <Ionicons
          name={isBookmarked ? "bookmark" : "bookmark-outline"}
          size={size}
          color={isBookmarked ? Colors.dark.primary400 : "#fff"}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
});