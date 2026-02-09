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
  const [reviews, setReviews] = useState<any[]>([]);

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

  // Fetch reviews
  useEffect(() => {
    if (!clubId) return;
    (async () => {
      try {
        const res = await fetchWithFallback(
          `/api/reviews?club_id=${clubId}`,
          await withAuthHeaders({ method: "GET" })
        );
        const data = await res.json();
        setReviews(data.reviews || []);
      } catch (err) {
        console.error("Failed to fetch reviews:", err);
      }
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
                  club.cover_photo ||
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
              {club.club_desc ||
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
                galleryImages = club.gallery.filter((url: unknown): url is string => typeof url === 'string' && url.length > 0);
              } else if (typeof club.gallery === 'string') {
                try {
                  const parsed = JSON.parse(club.gallery);
                  if (Array.isArray(parsed)) {
                    galleryImages = parsed.filter((url: unknown): url is string => typeof url === 'string' && url.length > 0);
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
              <View style={styles.eventCardContent}>
                <View style={styles.eventImageContainer}>
                  <Image
                    source={{
                      uri:
                        event.banner_image_url ||
                        event.image_url ||
                        event.poster_url ||
                        club.cover_photo ||
                        "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400",
                    }}
                    style={styles.eventImage}
                  />
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.2)"]}
                    style={StyleSheet.absoluteFill}
                  />
                </View>

                <View style={styles.eventFooter}>
                  <View style={styles.eventFooterTop}>
                    <Text style={styles.eventTitle} numberOfLines={1}>
                      {event.name || event.event_name || "Random Party Name"}
                    </Text>

                    <View style={styles.eventFooterActions}>
                      <Pressable style={styles.eventShareBtn}>
                        <Ionicons name="share-social-outline" size={22} color="#E91E63" />
                      </Pressable>

                      <View style={styles.eventAvatars}>
                        <Image
                          source={{ uri: "https://i. Pravatar.cc/100?img=1" }}
                          style={[styles.eventAvatar, styles.eventAvatar1]}
                        />
                        <Image
                          source={{ uri: "https://i.pravatar.cc/100?img=2" }}
                          style={[styles.eventAvatar, styles.eventAvatar2]}
                        />
                        <Image
                          source={{ uri: "https://i.pravatar.cc/100?img=5" }}
                          style={[styles.eventAvatar, styles.eventAvatar3]}
                        />
                        <View style={styles.eventCountBadge}>
                          <Text style={styles.eventCountText}>120</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.eventDateTime}>
                    {formatEventDate(event.event_date)} | {event.start_time?.slice(0, 5) || "16:00"} - {event.end_time?.slice(0, 5) || "20:00"}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}

          <Pressable onPress={() => router.push(`/club/${clubId}/events`)} style={{ alignItems: 'center', marginBottom: 24 }}>
            <Text style={styles.viewAllHeaderLink}>View all</Text>
          </Pressable>

          {/* MORE INFORMATION */}
          <View style={styles.moreInfoContainer}>
            <Text style={styles.sectionHeading}>More information</Text>

            <View style={styles.hostRow}>
              <Image
                source={{ uri: club.club_logo || club.cover_photo || "https://i.pravatar.cc/150?u=host" }}
                style={styles.hostAvatar}
              />
              <View style={styles.hostInfo}>
                <Text style={styles.hostName}>{club.club_name}</Text>
                <Text style={styles.hostRole}>{club.address_text || "Host"}</Text>
              </View>
              <View style={styles.hostActions}>
                <Pressable style={styles.hostActionBtn}>
                  <Ionicons name="chatbubble-outline" size={20} color="#fff" />
                </Pressable>
                {club.phone_number && (
                  <Pressable style={[styles.hostActionBtn, styles.callBtn]} onPress={() => Linking.openURL(`tel:${club.phone_number}`)}>
                    <Ionicons name="call" size={20} color="#fff" />
                  </Pressable>
                )}
              </View>
            </View>

            <Text style={styles.subHeading}>Rules & what will be there</Text>
            <View style={styles.rulesContainer}>
              {club.terms_and_conditions ? (
                <Text style={styles.rulesText}>{club.terms_and_conditions}</Text>
              ) : (
                <>
                  <Text style={styles.rulesBullet}>• Respect the space & others: Stay out of off-limits areas and be welcoming.</Text>
                  <Text style={styles.rulesBullet}>• Bring and share: BYOB and contribute to the fun responsibly.</Text>
                  <Text style={styles.rulesBullet}>• Clean up & stay safe: Tidy as you go and avoid reckless behavior.</Text>
                  <Text style={styles.rulesBullet}>• Keep it fun: Play games like Charades, Beer Pong, or Trivia.</Text>
                  <Text style={styles.rulesBullet}>• Engage everyone: Inclusive games like Karaoke or Never Have I Ever work great.</Text>
                  <Text style={styles.rulesBullet}>• Moderate noise: Keep it enjoyable without disturbing neighbors.</Text>
                </>
              )}
            </View>
          </View>

          {/* REVIEWS */}
          <View style={styles.reviewsContainer}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionHeading}>Reviews</Text>
              <Pressable>
                <Text style={styles.seeAllLink}>See All</Text>
              </Pressable>
            </View>

            {reviews.slice(0, 3).map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <Image
                  source={{ uri: review.user?.avatar_url || "https://i.pravatar.cc/150" }}
                  style={styles.reviewerAvatar}
                />
                <View style={styles.reviewContent}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewerName}>
                      {review.user?.first_name} {review.user?.last_name || ""}
                      {!review.user?.first_name && !review.user?.last_name && (review.user?.email?.split('@')[0] || "User")}
                    </Text>
                    <View style={styles.reviewRating}>
                      <Ionicons name="star" size={14} color={Colors.dark.rating} />
                      <Text style={styles.reviewRatingText}>{review.rating}</Text>
                    </View>
                  </View>
                  <Text style={styles.reviewComment} numberOfLines={3}>
                    {review.comment || "No comment provided."}
                  </Text>
                  {review.created_at && (
                    <Text style={styles.reviewDate}>{new Date(review.created_at).toLocaleDateString()}</Text>
                  )}
                </View>
              </View>
            ))}

            {reviews.length === 0 && (
              <Text style={styles.noReviewsText}>No reviews yet.</Text>
            )}
          </View>

          {/* Bottom spacing */}
          <View style={{ height: 100 }} />
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
  /* Event card - perfectly centered */
  eventCard: {
    width: CARD_WIDTH,
    height: 240,
    alignSelf: "center",
    marginBottom: 20,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: Colors.dark.surface,
    borderWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  eventCardContent: {
    flex: 1,
  },

  eventImageContainer: {
    height: 150,
    width: "100%",
    position: "relative",
  },

  eventImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  eventFooter: {
    flex: 1,
    backgroundColor: "rgba(22, 22, 22, 0.36)",
    borderWidth: 1,
    borderColor: "rgba(219, 39, 144, 0.41)",
    borderBottomLeftRadius: 24, 
    borderBottomRightRadius: 24, 
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
  },

  eventFooterTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },

  eventTitle: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.1)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginRight: 8,
  },

  eventFooterActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  eventShareBtn: {
    padding: 4,
  },

  eventDateTime: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontWeight: "600",
  },

  eventAvatars: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 4,
  },

  eventAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    backgroundColor: "#ccc",
  },

  eventAvatar1: { zIndex: 3, marginLeft: 0 },
  eventAvatar2: { zIndex: 2, marginLeft: -10 },
  eventAvatar3: { zIndex: 1, marginLeft: -10 },

  eventCountBadge: {
    marginLeft: -10,
    zIndex: 4,
    backgroundColor: Colors.dark.primaryBadge,
    borderRadius: 14,
    height: 28,
    width: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },

  eventCountText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },

  /* More Information Section */
  moreInfoContainer: {
    marginBottom: 24,
  },

  hostRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: HORIZONTAL_PADDING,
    marginBottom: 24,
  },

  hostAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },

  hostInfo: {
    flex: 1,
  },

  hostName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  hostRole: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },

  hostActions: {
    flexDirection: "row",
    gap: 12,
  },

  hostActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },

  callBtn: {
    backgroundColor: Colors.dark.primary, // Pink call button
  },

  subHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginHorizontal: HORIZONTAL_PADDING,
    marginBottom: 8,
  },

  rulesContainer: {
    paddingHorizontal: HORIZONTAL_PADDING,
  },

  rulesText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },

  rulesBullet: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },

  /* Reviews Section */
  reviewsContainer: {
    paddingHorizontal: HORIZONTAL_PADDING,
  },

  reviewsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 0, // already spaced by more info container
    marginBottom: 16,
  },

  seeAllLink: {
    color: Colors.dark.primary400,
    fontSize: 14,
    fontWeight: "700",
  },

  reviewCard: {
    flexDirection: "row",
    backgroundColor: "transparent", // Simple list item
    marginBottom: 20,
    gap: 12,
  },

  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.surface,
  },

  reviewContent: {
    flex: 1,
  },

  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },

  reviewerName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  reviewRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  reviewRatingText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  reviewComment: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },

  reviewDate: {
    marginTop: 4,
    color: Colors.dark.textSubtle,
    fontSize: 12,
  },

  noReviewsText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    fontStyle: 'italic',
  },
});