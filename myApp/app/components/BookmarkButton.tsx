import React, { useState, useEffect, useCallback } from "react";
import { Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
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
  const [initializing, setInitializing] = useState(true);

  // Check bookmark status on mount and when event/club/type change
  useEffect(() => {
    checkBookmarkStatus();
  }, [eventId, clubId, bookmarkType]);

  // Re-check bookmark status when screen gains focus (e.g. after navigating back)
  useFocusEffect(
    useCallback(() => {
      checkBookmarkStatus();
    }, [eventId, clubId, bookmarkType])
  );

  const checkBookmarkStatus = async () => {
    try {
      setInitializing(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (bookmarkType === "event" && eventId) {
        params.append("event_id", eventId);
      } else if (bookmarkType === "club" && clubId) {
        params.append("club_id", clubId);
      }
      params.append("bookmark_type", bookmarkType);

      const res = await fetchWithFallback(
        `/api/bookmarks/check?${params.toString()}`,
        await withAuthHeaders({
          method: "GET",
        })
      );

      if (res.ok) {
        const data = await res.json();
        // If bookmark exists, set as bookmarked
        setIsBookmarked(data.bookmarked || false);
      } else {
        // If no bookmark found or error, default to not bookmarked
        setIsBookmarked(false);
      }
    } catch (err) {
      setIsBookmarked(false);
    } finally {
      setInitializing(false);
    }
  };

  const toggleBookmark = async () => {
    if (loading || initializing) return;

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
        // Revert optimistic update
        setIsBookmarked(prev);
        return;
      }

      // Success - call onToggle callback
      onToggle?.(!prev);
    } catch (err) {
      // Revert optimistic update
      setIsBookmarked(prev);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      onPress={toggleBookmark}
      disabled={loading || initializing}
      hitSlop={10}
      style={styles.container}
    >
      {loading || initializing ? (
        <ActivityIndicator 
          size="small" 
          color={isBookmarked ? Colors.dark.primary400 : "#fff"} 
        />
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