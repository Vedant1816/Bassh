import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  Linking,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Platform,
} from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// iPhone 16 specifications
const IPHONE_16_WIDTH = 393;
const IPHONE_16_HEIGHT = 852;
const IS_IPHONE_16 = SCREEN_WIDTH === IPHONE_16_WIDTH;

// Safe area insets for iPhone 16
const SAFE_AREA_TOP = Platform.OS === "ios" ? 59 : 0;
const SAFE_AREA_BOTTOM = Platform.OS === "ios" ? 34 : 0;

// Symmetric padding/margins
const HORIZONTAL_PADDING = 24; // Equal padding on both sides
const CARD_WIDTH = SCREEN_WIDTH - (HORIZONTAL_PADDING * 2); // Perfectly centered cards

import { useLocalSearchParams, useRouter } from "expo-router";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { fetchWithFallback } from "@/_services/api-config";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors, PrimaryGradient } from "@/constants/Colors";
import { BookEntryModal } from "@/app/club/components/BookEntryModal";
import { CouponsModal } from "@/app/club/components/CouponsModal";

interface Discount {
  id: string;
  discount_type: string;
  discount_value: number;
  min_purchase: number;
  max_discount: number | null;
  code: string | null;
  name: string;
  description: string | null;
}

export default function ClubProfile() {
  const params = useLocalSearchParams<{ clubId?: string; clubid?: string }>();
  const clubId = params.clubId ?? params.clubid;
  const router = useRouter();

  const [club, setClub] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showCouponsModal, setShowCouponsModal] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetchWithFallback(
        `/api/clubs/${clubId}`,
        await withAuthHeaders({ method: "GET" })
      );
      const data = await res.json();
      setClub(data.club);
      setEvents(data.events || []);
      setLoading(false);
    })();
  }, [clubId]);

  // Fetch discounts from dedicated endpoint
  useEffect(() => {
    if (!clubId) return;
    (async () => {
      const res = await fetchWithFallback(
        `/api/discounts/club?club_id=${clubId}`,
        await withAuthHeaders({ method: "GET" })
      );
      const data = await res.json();
      setDiscounts(data.discounts || []);
    })();
  }, [clubId]);

  const formatEventDate = (d: string | undefined) => {
    if (!d) return "Date TBA";
    try {
      const date = new Date(d);
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
    } catch {
      return d;
    }
  };

  const openDirections = () => {
    if (!club || club.latitude == null || club.longitude == null) return;
    const lat = Number(club.latitude);
    const lng = Number(club.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url).catch(() => { });
  };

  const handleBookTable = () => setShowBookingModal(true);

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator color={Colors.dark.primary400} size="large" style={styles.loader} />
      </View>
    );
  }

  if (!club) return null;

  // Only show events after current date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingEvents = events.filter((e) => {
    if (!e.event_date) return false;
    const d = new Date(e.event_date);
    d.setHours(0, 0, 0, 0);
    return d > today;
  });

  return (
    <>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* Pink gradient header */}
        <LinearGradient
          colors={["rgba(139, 0, 69, 0.9)", "rgba(80, 0, 40, 0.5)", "transparent"]}
          locations={[0, 0.5, 1]}
          style={styles.headerGradient}
          pointerEvents="none"
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER IMAGE - symmetric rounded corners */}
          <View style={styles.bannerWrap}>
            <Image
              source={{
                uri:
                  club.banner_image_url ||
                  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4",
              }}
              style={styles.banner}
            />
          </View>

          {/* CLUB INFO CARD - perfectly centered overlay */}
          <View style={styles.infoBox}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1}>
                {club.club_name}
              </Text>
              <View style={styles.ratingBox}>
                <Ionicons name="star" size={16} color={Colors.dark.rating} />
                <Text style={styles.ratingText}>
                  {club.rating?.toFixed(1) || "4.6"}
                </Text>
              </View>
            </View>

            <Text style={styles.subText} numberOfLines={2}>
              {club.address_text}
            </Text>

            <View style={styles.openRow}>
              <View style={styles.openPill}>
                <Text style={styles.openPillText}>Open till 3:00AM</Text>
              </View>
              <Pressable style={styles.directionsBtn} onPress={openDirections}>
                <LinearGradient
                  colors={PrimaryGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.directionsBtnGradient}
                >
                  <Ionicons name="navigate" size={16} color={Colors.dark.text} />
                </LinearGradient>
              </Pressable>
            </View>
          </View>

          {/* OFFERS - symmetric card */}
          <Text style={styles.sectionHeading}>Offers</Text>
          <View style={styles.offersCard}>
            <View style={styles.offersCardRow}>
              <Ionicons
                name="pricetag"
                size={20}
                color={Colors.dark.primary}
                style={styles.pricetagIcon}
              />
              <Text style={styles.offersCardTitle} numberOfLines={2}>
                {discounts.length > 0
                  ? `${discounts[0].discount_type === "percentage"
                    ? `${discounts[0].discount_value}% OFF`
                    : `₹${discounts[0].discount_value} OFF`} on orders above ₹${discounts[0].min_purchase}`
                  : "No offers available right now"}
              </Text>
            </View>
            {discounts.length > 0 && (
              <>
                <View style={styles.offersCardDivider} />
                <Pressable style={styles.offersCardFooter} onPress={() => setShowCouponsModal(true)}>
                  <Text style={styles.offersCardViewAll}>
                    View all Coupons ({discounts.length})
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color={Colors.dark.text} />
                </Pressable>
              </>
            )}
          </View>

          {/* ABOUT - symmetric layout */}
          <Text style={styles.sectionHeading}>About</Text>
          <View style={styles.aboutBlock}>
            <Text style={styles.aboutDesc} numberOfLines={4}>
              {club.description ||
                "Combining aggressive sound design w hypnotic grooves & melodies, Massano continues to rise at a meteoric rate. Hailing from a thriving music culture in Liverpool, Massano's been universally regarded a..."}
            </Text>
            <Pressable>
              <Text style={styles.aboutReadMore}>Read more..</Text>
            </Pressable>
          </View>

          {/* GALLERY - symmetric layout */}
          {(() => {
            // Parse gallery images
            let galleryImages: string[] = [];
            if (club.gallery) {
              if (Array.isArray(club.gallery)) {
                galleryImages = club.gallery.filter((url): url is string => typeof url === 'string' && url.length > 0);
              } else if (typeof club.gallery === 'string') {
                try {
                  const parsed = JSON.parse(club.gallery);
                  if (Array.isArray(parsed)) {
                    galleryImages = parsed.filter((url): url is string => typeof url === 'string' && url.length > 0);
                  }
                } catch (e) {
                  console.error('Failed to parse gallery:', e);
                }
              }
            }

            if (galleryImages.length === 0) return null;

            return (
              <>
                <Text style={styles.sectionHeading}>Gallery</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.galleryContainer}
                  style={styles.galleryScrollView}
                >
                  {galleryImages.map((imageUrl, index) => (
                    <View key={index} style={styles.galleryImageWrap}>
                      <Image
                        source={{ uri: imageUrl }}
                        style={styles.galleryImage}
                        resizeMode="cover"
                      />
                    </View>
                  ))}
                </ScrollView>
              </>
            );
          })()}

          {/* RESERVE A TABLE BUTTON - perfectly centered */}
          <Pressable style={styles.reserveTableBtn} onPress={handleBookTable}>
            <LinearGradient
              colors={PrimaryGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.reserveTableBtnText}>Reserve a table</Text>
          </Pressable>

          {/* EVENTS IN CLUB - symmetric cards */}
          <View style={styles.eventsHeader}>
            <Text style={styles.eventsInClubHeading}>Events in club</Text>
            {upcomingEvents.length > 2 && (
              <Pressable onPress={() => router.push(`/club/${clubId}/events`)}>
                <Text style={styles.viewAllHeaderLink}>View all</Text>
              </Pressable>
            )}
          </View>

          {upcomingEvents.slice(0, 2).map((event) => (
            <Pressable
              key={event.id}
              style={styles.eventCard}
              onPress={() => router.push(`/event/${event.id}`)}
            >
              <View style={styles.eventImageWrap}>
                <Image
                  source={{
                    uri:
                      event.banner_image_url ||
                      event.image_url ||
                      event.poster_url ||
                      club.banner_image_url ||
                      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400",
                  }}
                  style={styles.eventImage}
                />
                <View style={styles.eventCardOverlay}>
                  <Text style={styles.eventTitle} numberOfLines={1}>
                    {event.name || event.event_name || "Random Party Name"}
                  </Text>
                  <Text style={styles.eventDateTime}>
                    {formatEventDate(event.event_date)} | {event.start_time || "16:00"} - {event.end_time || "20:00"}
                  </Text>
                  <View style={styles.eventCardMeta}>
                    <Pressable style={styles.eventShareBtn}>
                      <Ionicons name="share-outline" size={24} color={Colors.dark.primary300} />
                    </Pressable>
                    <View style={styles.eventAvatars}>
                      <View style={[styles.eventAvatar, styles.eventAvatar1]} />
                      <View style={[styles.eventAvatar, styles.eventAvatar2]} />
                      <View style={[styles.eventAvatar, styles.eventAvatar3]} />
                      <View style={styles.eventCountBadge}>
                        <Text style={styles.eventCountText}>120</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </Pressable>
          ))}

          {/* Bottom spacing */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>

      <BookEntryModal
        visible={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        clubId={clubId!}
        club={club}
        discounts={discounts}
      />

      <CouponsModal
        visible={showCouponsModal}
        onClose={() => setShowCouponsModal(false)}
        discounts={discounts}
        clubName={club?.club_name || "Club"}
      />
    </>
  );
}

/* ---------------- STYLES - iPhone 16 Optimized ---------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },

  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  /* Pink gradient header */
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingTop: SAFE_AREA_TOP,
  },

  /* Banner image - symmetric rounded corners */
  bannerWrap: {
    width: SCREEN_WIDTH,
    height: 340,
    overflow: "hidden",
  },

  banner: {
    width: SCREEN_WIDTH,
    height: 340,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    resizeMode: "cover",
  },

  /* Info box - perfectly centered */
  infoBox: {
    width: CARD_WIDTH,
    minHeight: 143,
    alignSelf: "center",
    marginTop: -50, // Overlay on banner
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  title: {
    flex: 1,
    color: Colors.dark.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
    marginRight: 12,
  },

  ratingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
  },

  ratingText: {
    color: Colors.dark.text,
    fontWeight: "700",
    fontSize: 14,
  },

  subText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 18,
    marginBottom: 16,
  },

  openRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  openPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.dark.primaryAccent,
    borderRadius: 8,
  },

  openPillText: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: "700",
  },

  directionsBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: "hidden",
  },

  directionsBtnGradient: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },

  /* Section headings - consistent left padding */
  sectionHeading: {
    marginTop: 32,
    marginBottom: 16,
    marginHorizontal: HORIZONTAL_PADDING,
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 24,
  },

  /* Offers card - perfectly centered */
  offersCard: {
    width: CARD_WIDTH,
    alignSelf: "center",
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.borderLight,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    shadowColor: "rgba(16, 24, 40, 0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },

  offersCardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },

  pricetagIcon: {
    transform: [{ rotate: "90deg" }],
    marginTop: 2,
  },

  offersCardTitle: {
    flex: 1,
    color: Colors.dark.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
  },

  offersCardDivider: {
    height: 1,
    backgroundColor: Colors.dark.divider,
    opacity: 0.3,
    marginBottom: 16,
  },

  offersCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  offersCardViewAll: {
    color: Colors.dark.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },

  /* About section - symmetric padding */
  aboutBlock: {
    width: CARD_WIDTH,
    alignSelf: "center",
  },

  aboutDesc: {
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
    color: Colors.dark.textSecondary,
    marginBottom: 8,
  },

  aboutReadMore: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.dark.primary400,
  },

  /* Gallery section */
  galleryContainer: {
    paddingHorizontal: HORIZONTAL_PADDING,
    gap: 12,
  },

  galleryScrollView: {
    marginBottom: 8,
  },

  galleryImageWrap: {
    width: 200,
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },

  galleryImage: {
    width: "100%",
    height: "100%",
  },

  /* Reserve table button - perfectly centered */
  reserveTableBtn: {
    width: CARD_WIDTH,
    height: 56,
    alignSelf: "center",
    marginTop: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.primaryBorder,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },

  reserveTableBtnText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.24,
  },

  /* Events section header */
  eventsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 32,
    marginBottom: 16,
    marginHorizontal: HORIZONTAL_PADDING,
  },

  eventsInClubHeading: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: "700",
  },

  viewAllHeaderLink: {
    color: Colors.dark.primary400,
    fontSize: 16,
    fontWeight: "600",
  },

  /* Event card - perfectly centered */
  eventCard: {
    width: CARD_WIDTH,
    height: 200,
    alignSelf: "center",
    marginBottom: 16,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: Colors.dark.cardOverlay,
    borderWidth: 1,
    borderColor: Colors.dark.borderPrimaryTint,
  },

  eventImageWrap: {
    width: "100%",
    height: 120,
    overflow: "hidden",
  },

  eventImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  eventCardOverlay: {
    position: "absolute",
    bottom: 12,
    left: 16,
    right: 16,
  },

  eventTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
    marginBottom: 4,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  eventDateTime: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 18,
    marginBottom: 8,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  eventCardMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  eventShareBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },

  eventAvatars: {
    flexDirection: "row",
    alignItems: "center",
  },

  eventAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.dark.border,
    borderWidth: 2,
    borderColor: Colors.dark.text,
  },

  eventAvatar1: { marginRight: -8 },
  eventAvatar2: { marginRight: -8 },
  eventAvatar3: { marginRight: 8 },

  eventCountBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.dark.primaryBadge,
    borderWidth: 2,
    borderColor: Colors.dark.text,
    justifyContent: "center",
    alignItems: "center",
  },

  eventCountText: {
    color: Colors.dark.text,
    fontSize: 10,
    fontWeight: "700",
  },
});