import { View, Text, Pressable, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type ClubPrices = {
  [dayOfWeek: string]: {
    male: number;
    female: number;
    couple: number;
  };
};

export type ClubCardData = {
  id: string;
  club_name: string;
  event_name?: string;
  event_date?: string;
  start_time?: string;
  end_time?: string;
  price?: number;
  prices?: ClubPrices;
  address_text?: string;
  latitude: number;
  longitude: number;
  guest_count?: number;
  distance_km: number;
  banner_image_url?: string;
  profile_image_url?: string;
  profile_picture_url?: string;
  cover_photo?: string;
  club_logo?: string;
  avatar_urls?: string[];
  rating?: number;
  tier?: number;
};

type ClubCardProps = {
  club: ClubCardData;
  width?: number; // default 320
  onPress: () => void;
  onNavigate: () => void;
};

export default function ClubCard({
  club,
  width = 320,
  onPress,
  onNavigate,
}: ClubCardProps) {
  // Get today's date formatted
  const today = new Date();
  // JavaScript getDay(): 0=Sunday, 1=Monday, ..., 6=Saturday
  // Database format: 1=Monday, 2=Tuesday, ..., 7=Sunday
  const jsDay = today.getDay(); // 0-6
  const dbDayOfWeek = jsDay === 0 ? 7 : jsDay; // Convert to 1-7 where 1=Monday, 7=Sunday

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const todayFormatted = `${today.getDate()} ${months[today.getMonth()]}, ${today.getFullYear()}`;

  // Parse prices if it's a JSON string (defensive parsing)
  const parsePrices = (): ClubPrices | null => {
    if (!club.prices) return null;

    // If it's already an object, return it
    if (typeof club.prices === 'object' && !Array.isArray(club.prices)) {
      return club.prices as ClubPrices;
    }

    // If it's a string, try to parse it
    if (typeof club.prices === 'string') {
      try {
        const parsed = JSON.parse(club.prices);
        return typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
      } catch (e) {
        return null;
      }
    }

    return null;
  };

  const parsedPrices = parsePrices();

  // Get male price for today from prices column
  const getTodayPrice = (): number => {
    if (parsedPrices) {
      const todayPrices = parsedPrices[String(dbDayOfWeek)];
      if (todayPrices && typeof todayPrices.male === 'number') {
        return todayPrices.male;
      }
    }
    // Fallback to legacy price field or default
    return club.price ?? 999;
  };

  // Get all price types for today (useful for detailed views)
  const getTodayPrices = () => {
    if (parsedPrices) {
      const todayPrices = parsedPrices[String(dbDayOfWeek)];
      if (todayPrices) {
        return {
          male: todayPrices.male ?? 999,
          female: todayPrices.female ?? 999,
          couple: todayPrices.couple ?? 1999,
        };
      }
    }
    // Fallback defaults
    return {
      male: club.price ?? 999,
      female: club.price ?? 999,
      couple: (club.price ?? 999) * 2,
    };
  };

  const dateTimeLabel = [
    todayFormatted,
    club.start_time && club.end_time
      ? `${club.start_time} –${club.end_time}`
      : "6:30 PM –11:00 PM",
  ].join(" | ");

  const currentPrice = getTodayPrice();

  // Format price with commas for thousands
  const formatPrice = (price: number): string => {
    return price.toLocaleString('en-IN');
  };

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { width }]}
    >
      <View style={styles.cardInner}>
        {/* ─────────────────── TOP SECTION ─────────────────── */}
        <View style={styles.topSection}>
          {/* Image */}
          <View style={styles.imageContainer}>
            {club.cover_photo ? (
              <Image
                source={{ uri: club.cover_photo }}
                style={styles.image}
              />
            ) : (
              <View style={styles.imageFallback}>
                <Text style={styles.imageFallbackText}>
                  {club.club_name?.[0]?.toUpperCase() || "C"}
                </Text>
              </View>
            )}
          </View>

          {/* Details */}
          <View style={styles.details}>
            {/* Date + Title */}
            <View style={styles.titleBlock}>
              <Text style={styles.dateTime} numberOfLines={1}>
                {dateTimeLabel || "23 Dec, 2024 | 6:30 PM –11:00 PM"}
              </Text>
              <Text style={styles.title} numberOfLines={1}>
                {club.event_name || club.club_name || "Club"}
              </Text>
            </View>

            {/* Price + Avatars */}
            <View style={styles.priceRow}>
              <View style={styles.priceBlock}>
                <Text style={styles.price}>Rs. {formatPrice(currentPrice)}</Text>
                <Text style={styles.priceLabel}>per entry</Text>
              </View>

              <View style={styles.avatarBlock}>
                <Text style={styles.joining}>Joining</Text>
                <View style={styles.avatarRow}>
                  {club.avatar_urls?.[0] ? (
                    <Image
                      source={{ uri: club.avatar_urls[0] }}
                      style={[styles.avatar, { zIndex: 3 }]}
                    />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]} />
                  )}

                  {club.avatar_urls?.[1] ? (
                    <Image
                      source={{ uri: club.avatar_urls[1] }}
                      style={[styles.avatar, styles.avatarOverlap, { zIndex: 2 }]}
                    />
                  ) : (
                    <View
                      style={[
                        styles.avatar,
                        styles.avatarOverlap,
                        styles.avatarFallback,
                      ]}
                    />
                  )}

                  <View style={[styles.avatar, styles.avatarBadge]}>
                    <Text style={styles.avatarBadgeText}>
                      +{club.guest_count ?? 220}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ─────────────────── DIVIDER ─────────────────── */}
        <View style={styles.divider} />

        {/* ─────────────────── FOOTER ─────────────────── */}
        <View style={styles.footer}>
          <View style={styles.locationBlock}>
            <Ionicons name="location-outline" size={16} color="#F0F1F3" />

            <View style={styles.locationText}>
              <Text style={styles.address} numberOfLines={1}>
                {club.address_text || "street Independence Square 40"}
              </Text>
              <Text style={styles.distance}>
                {(club.distance_km ?? 3).toFixed(1)} km
              </Text>
            </View>
          </View>

          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onNavigate();
            }}
            style={styles.navBtnWrap}
          >
            <Image
              source={require("@/assets/images/navigate-button.png")}
              style={styles.navBtn}
              resizeMode="contain"
            />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

// Helper function to use in data fetching - ensures prices column is included
export const CLUB_SELECT_FIELDS = `
  id,
  club_name,
  event_name,
  event_date,
  start_time,
  end_time,
  price,
  prices,
  address_text,
  latitude,
  longitude,
  guest_count,
  banner_image_url,
  profile_image_url,
  profile_picture_url,
  cover_photo
`;

const styles = StyleSheet.create({
  /* ───────── CARD ───────── */
  card: {
    height: 132,
    borderRadius: 16,
    backgroundColor: "rgba(34, 34, 38, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(60, 60, 65, 0.6)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
  },

  cardInner: {
    flex: 1,
    borderRadius: 16,
  },

  /* ───────── TOP ───────── */
  topSection: {
    position: "relative",
    height: 68,
    marginTop: 10,
    marginHorizontal: 10,
  },

  imageContainer: {
    position: "absolute",
    left: -3,
    top: 7,
    width: 87,
    height: 49,
    borderRadius: 10,
    overflow: "hidden",
  },

  image: {
    width: 87,
    height: 49,
  },

  imageFallback: {
    flex: 1,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },

  imageFallbackText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },

  details: {
    position: "absolute",
    left: 90,
    right: 0,
    top: 0,
    height: 68,
    justifyContent: "space-between",
  },

  titleBlock: {
    marginTop: 4,
  },

  dateTime: {
    fontSize: 10,
    color: "#F357B6",
    lineHeight: 10,
  },

  title: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
    lineHeight: 19,
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },

  priceBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  price: {
    fontSize: 14,
    fontWeight: "700",
    color: "#F02DA4",
  },

  priceLabel: {
    fontSize: 10,
    color: "#B6B6B6",
  },

  avatarBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    position: "absolute",
    right: 0,
  },

  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.4,
    borderColor: "#fff",
    backgroundColor: "#161C2B",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarOverlap: {
    marginLeft: -6,
  },

  avatarBadge: {
    marginLeft: -6,
    zIndex: 1,
  },

  avatarBadgeText: {
    fontSize: 9,
    color: "#fff",
  },

  avatarFallback: {
    backgroundColor: "#6b7280",
  },

  joining: {
    fontSize: 10,
    color: "#D0D3D9",
  },

  /* ───────── DIVIDER ───────── */
  divider: {
    height: 1,
    backgroundColor: "#565656",
    opacity: 0.4,
    marginHorizontal: 10,
    marginTop: 10,
  },

  /* ───────── FOOTER ───────── */
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    marginTop: 5,
  },

  locationBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: 202,
  },

  locationText: {
    gap: 8,
  },

  address: {
    fontSize: 12,
    color: "#D0D3D9",
    lineHeight: 12,
  },

  distance: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
    lineHeight: 12,
  },

  navBtnWrap: {
    justifyContent: "center",
    alignItems: "center",
  },
  navBtn: {
    width: 28,
    height: 28,
  },
});
