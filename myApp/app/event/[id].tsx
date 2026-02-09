import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
  StatusBar,
  Dimensions,
  Linking,
  Platform,
  Modal,
  FlatList,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { fetchWithFallback } from "@/_services/api-config";
import { Colors, PrimaryGradient, PrimaryGradientStart, PrimaryGradientEnd } from "@/constants/Colors";
import BookmarkButton from "@/app/components/BookmarkButton";
import LocationHeader from "@/app/components/LocationHeader";

const { width } = Dimensions.get("window");

type Guest = {
  id: string;
  booking_id: string;
  user_id: string;
  created_at: string;
  name: string;
  age: number | null;
  gender: string | null;
  email: string | null;
};

export default function EventDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const id = (Array.isArray(params.id) ? params.id[0] : params.id) as string | undefined;

  const [event, setEvent] = useState<any>(null);
  const [club, setClub] = useState<any>(null);
  const [pricing, setPricing] = useState<any[]>([]);
  const [guestList, setGuestList] = useState<Guest[]>([]);
  const [totalGuests, setTotalGuests] = useState(0);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullAbout, setShowFullAbout] = useState(false);
  const [guestListModalVisible, setGuestListModalVisible] = useState(false);

  useEffect(() => {
    if (!id) {
      setError("Event ID is missing");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetchWithFallback(
          `/api/events/${id}`,
          await withAuthHeaders({ method: "GET" })
        );

        const data = await res.json();

        if (!res.ok) {
          setError(data?.error || `Error ${res.status}`);
          setLoading(false);
          return;
        }

        setEvent(data.event);
        setClub(data.club);
        setPricing(data.pricing ?? []);

        // Set guest list data
        const guests = data.guestList ?? [];
        const total = data.totalGuests ?? 0;

        setGuestList(guests);
        setTotalGuests(total);

        // Fetch discounts
        const discountRes = await fetchWithFallback(
          `/api/discounts/event?event_id=${id}`,
          await withAuthHeaders({ method: "GET" })
        );
        const discountData = await discountRes.json();
        if (discountRes.ok && discountData.discounts) {
          setDiscounts(discountData.discounts);
        }
      } catch (e) {
        console.error("📱 [FRONTEND] Error:", e);
        setError(e instanceof Error ? e.message : "Failed to load event");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Debug effects removed for production

  const formatEventDate = (d: string | undefined) => {
    if (!d) return "Date TBA";
    try {
      const date = new Date(d);
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      return `${date.getDate()} ${months[date.getMonth()]}, ${date.getFullYear()}`;
    } catch {
      return d;
    }
  };

  const formatTime = (time: string | undefined) => {
    if (!time) return "";
    return time;
  };

  const openDirections = () => {
    if (club?.latitude && club?.longitude) {
      const url = Platform.OS === "ios"
        ? `maps://app?daddr=${club.latitude},${club.longitude}`
        : `https://www.google.com/maps/search/?api=1&query=${club.latitude},${club.longitude}`;
      Linking.openURL(url);
    }
  };

  const callHost = () => {
    if (club?.phone_number) {
      Linking.openURL(`tel:${club.phone_number}`);
    }
  };

  const openChat = () => {
    // chat integration can be added here
  };

  const getAvatarUrl = (name: string, gender: string | null) => {
    const cleanName = (name || "G").trim() || "G";
    const bgColor = gender === "Female" ? "E91E8C" : gender === "Male" ? "4A90D9" : "8B0045";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=${bgColor}&color=fff&size=88`;
  };

  const getGenderIcon = (gender: string | null): "female" | "male" | "person" => {
    if (gender === "Female") return "female";
    if (gender === "Male") return "male";
    return "person";
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator color={Colors.dark.primary} size="large" />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.error}>Error: {error}</Text>
      </View>
    );
  }

  if (!event) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = event?.event_date ? new Date(event.event_date) : null;
  if (eventDate) eventDate.setHours(0, 0, 0, 0);
  const isPassed = eventDate ? eventDate < today : false;

  const bannerUrl = event.banner_image_url || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800";
  const couplePrice = pricing.find((p: any) => p.label?.toLowerCase().includes("couple"))?.couple_price || pricing.find((p: any) => p.label?.toLowerCase().includes("couple"))?.price || 999;
  const stagPrice = pricing.find((p: any) => p.label?.toLowerCase().includes("stag"))?.stag_price || pricing.find((p: any) => p.label?.toLowerCase().includes("stag"))?.price || 699;
  const aboutText = event.about || "Join us for an unforgettable night filled with music, energy, and great vibes.";
  const truncatedAbout = aboutText.length > 180 ? aboutText.substring(0, 180) + "..." : aboutText;

  const previewGuests = guestList.slice(0, 3);
  const remainingGuests = Math.max(0, totalGuests - 3);

  const renderGuestItem = ({ item }: { item: Guest }) => {
    const genderColor = item.gender === "Female" ? "#E91E8C" : item.gender === "Male" ? "#4A90D9" : Colors.dark.primary;
    return (
      <View style={styles.guestItem}>
        <View style={[styles.guestAvatarContainer, { borderColor: genderColor }]}>
          <Image
            source={{ uri: getAvatarUrl(item.name, item.gender) }}
            style={styles.guestAvatar}
          />
        </View>
        <View style={styles.guestInfo}>
          <Text style={styles.guestName}>{item.name || "Guest"}</Text>
          <View style={styles.guestMeta}>
            {item.gender && (
              <View style={[styles.guestMetaItem, { backgroundColor: `${genderColor}20` }]}>
                <Ionicons name={getGenderIcon(item.gender)} size={12} color={genderColor} />
                <Text style={[styles.guestMetaText, { color: genderColor }]}>{item.gender}</Text>
              </View>
            )}
            {item.age && (
              <View style={styles.guestMetaItem}>
                <Text style={styles.guestMetaText}>{item.age} yrs</Text>
              </View>
            )}
          </View>
        </View>
        <View style={[styles.guestStatusDot, { backgroundColor: genderColor }]} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* HEADER GRADIENT */}
      <LinearGradient
        colors={["rgba(139, 0, 69, 0.95)", "rgba(80, 0, 40, 0.6)", "transparent"]}
        locations={[0, 0.5, 1]}
        style={[styles.headerGradient, { paddingTop: insets.top }]}
      >
        <View style={styles.header}>
          <LocationHeader
            title="Home"
            address={club?.address_text || "Karol Bagh, New Delhi"}
            variant="circle"
            changeable={false}
          />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 60 }}
      >
        {/* HERO IMAGE */}
        <View style={styles.heroImageContainer}>
          <Image source={{ uri: bannerUrl }} style={styles.heroImage} resizeMode="cover" />
        </View>

        {/* EVENT TITLE AND ATTENDEES ROW */}
        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            <View style={styles.titleTextContainer}>
              <Text style={styles.eventTitle}>{event.name || "Random Party Name"}</Text>
              <Text style={styles.eventSubtitle}>{event.categories?.[0] || "Club Party"}</Text>
            </View>

            {/* Attendees Avatars */}
            <Pressable
              style={styles.attendeesContainer}
              onPress={() => {
                setGuestListModalVisible(true);
              }}
            >
              {previewGuests.length > 0 ? (
                <>
                  {previewGuests.map((guest, index) => (
                    <Image
                      key={guest.id}
                      source={{ uri: getAvatarUrl(guest.name, guest.gender) }}
                      style={[
                        styles.attendeeAvatar,
                        { marginLeft: index > 0 ? -10 : 0, zIndex: 3 - index }
                      ]}
                    />
                  ))}
                  {remainingGuests > 0 && (
                    <View style={[styles.attendeeAvatar, styles.attendeeBadge, { marginLeft: -10 }]}>
                      <Text style={styles.attendeeBadgeText}>+{remainingGuests}</Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={[styles.attendeeAvatar, styles.attendeeBadge]}>
                  <Text style={styles.attendeeBadgeText}>+{totalGuests || 0}</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* DATE & TIME */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="calendar-outline" size={18} color="#fff" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>{formatEventDate(event.event_date)}</Text>
              <Text style={styles.infoSubtitle}>{formatTime(event.start_time)} GMT</Text>
            </View>
            <BookmarkButton
              eventId={id}
              bookmarkType="event"
              size={22}
              initialBookmarked={false}
            />
          </View>
        </View>

        {/* LOCATION */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="location-outline" size={18} color="#fff" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>{club?.club_name || "Venue"}</Text>
              <Text style={styles.infoSubtitle} numberOfLines={1}>
                {club?.address_text || "Address TBA"}
              </Text>
            </View>
            <Pressable style={styles.navButton} onPress={openDirections}>
              <LinearGradient
                colors={PrimaryGradient}
                start={PrimaryGradientStart}
                end={PrimaryGradientEnd}
                style={styles.navButtonGradient}
              >
                <Ionicons name="navigate" size={14} color="#fff" />
              </LinearGradient>
            </Pressable>
          </View>
        </View>

        {/* ABOUT */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.aboutText}>
            {showFullAbout ? aboutText : truncatedAbout}
          </Text>
          {aboutText.length > 180 && (
            <Pressable onPress={() => setShowFullAbout(!showFullAbout)}>
              <Text style={styles.readMore}>{showFullAbout ? "Show less" : "Read more.."}</Text>
            </Pressable>
          )}
        </View>

        {/* GUEST LIST BUTTON */}
        <View style={styles.section}>
          <Pressable
            style={styles.guestListButton}
            onPress={() => {
              setGuestListModalVisible(true);
            }}
          >
            <View style={styles.guestListButtonInner}>
              <View style={styles.guestListIconBadge}>
                <Ionicons name="people" size={18} color="#fff" />
                <View style={styles.guestListBadge}>
                  <Text style={styles.guestListBadgeText}>{totalGuests > 99 ? '99+' : totalGuests}</Text>
                </View>
              </View>
              <Text style={styles.guestListText}>Get access to the guest list</Text>
            </View>
          </Pressable>
          <Text style={styles.guestListSubtext}>Spots filling fast</Text>
        </View>

        {/* ENTRY PRICES */}
        <View style={styles.section}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Couple's Entry</Text>
            <Text style={styles.priceValue}>{couplePrice}/-</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Stag Entry</Text>
            <Text style={styles.priceValue}>{stagPrice}/-</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Pressable
            style={[styles.bookButton, isPassed && styles.disabledButton]}
            onPress={() => !isPassed && id && router.push(`/event/${id}/book`)}
            disabled={isPassed}
          >
            <Text style={[styles.bookButtonText, isPassed && styles.disabledButtonText]}>
              {isPassed ? "Event Passed" : "Book tickets Now"}
            </Text>
          </Pressable>
        </View>

        {/* MORE INFORMATION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>More information</Text>
        </View>

        {/* HOST INFORMATION */}
        <View style={styles.section}>
          <View style={styles.hostRow}>
            <Image
              source={{ uri: event.dj_image_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200" }}
              style={styles.hostAvatar}
            />
            <View style={styles.hostInfo}>
              <Text style={styles.hostName}>{event.dj_name || "Host"}</Text>
              <Text style={styles.hostTitle}>
                {club?.club_name ? `Hotel Owner | ` : ""}<Text style={styles.hostTitleBold}>HOST</Text>
              </Text>
            </View>
            <View style={styles.hostActions}>
              <Pressable style={styles.hostActionButton} onPress={openChat}>
                <Ionicons name="chatbubble-outline" size={20} color="#888" />
              </Pressable>
              <Pressable style={styles.hostActionButtonPrimary} onPress={callHost}>
                <Ionicons name="call" size={18} color="#fff" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* RULES & WHAT WILL BE THERE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rules & what will be there</Text>
          <View style={styles.rulesList}>
            {[
              "Respect the space & others: Stay out of off-limits areas and be welcoming",
              "Bring and share: BYOB and contribute to the fun responsibly",
              "Clean up & stay safe: Tidy as you go and avoid reckless behavior.",
              "Keep it fun: Play games like Charades, Beer Pong, or Trivia.",
              "Engage everyone: Inclusive games like Karaoke or Never Have I Ever work great.",
              "Moderate noise. Keep it enjoyable without disturbing neighbors.",
            ].map((rule, index) => (
              <View key={index} style={styles.ruleItem}>
                <View style={styles.ruleBullet} />
                <Text style={styles.ruleText}>{rule}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 100 + insets.bottom }} />
      </ScrollView>

      {/* GUEST LIST MODAL */}
      <Modal
        visible={guestListModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setGuestListModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setGuestListModalVisible(false)}
          />
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Guest List</Text>
                <Text style={styles.modalSubtitle}>{totalGuests} guests attending</Text>
              </View>
              <Pressable
                style={styles.modalCloseButton}
                onPress={() => setGuestListModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
            </View>

            {/* Gender Legend */}
            <View style={styles.genderLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#E91E8C" }]} />
                <Text style={styles.legendText}>Female</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#4A90D9" }]} />
                <Text style={styles.legendText}>Male</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.dark.primary }]} />
                <Text style={styles.legendText}>Other</Text>
              </View>
            </View>

            {guestList.length > 0 ? (
              <FlatList
                data={guestList}
                renderItem={renderGuestItem}
                keyExtractor={(item) => item.id}
                style={styles.guestListScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.guestListContent}
                ItemSeparatorComponent={() => <View style={styles.guestSeparator} />}
              />
            ) : (
              <View style={styles.emptyGuestList}>
                <View style={styles.emptyGuestIconContainer}>
                  <Ionicons name="people-outline" size={48} color={Colors.dark.primary} />
                </View>
                <Text style={styles.emptyGuestText}>No guests yet</Text>
                <Text style={styles.emptyGuestSubtext}>Be the first to join this event!</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    justifyContent: "center",
    alignItems: "center",
  },
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  header: {
    marginTop: 8,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  locationIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  locationTextContainer: {
    flex: 1,
  },
  locationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  locationSubtitle: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  loadingText: {
    color: Colors.dark.textSecondary,
    marginTop: 12,
    fontSize: 14,
  },
  error: {
    color: Colors.dark.error,
    fontSize: 15,
    marginTop: 16,
  },
  heroImageContainer: {
    width: width - 32,
    height: 220,
    alignSelf: "center",
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  titleSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  titleTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  eventTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  eventSubtitle: {
    fontSize: 14,
    fontWeight: "400",
    color: "rgba(255, 255, 255, 0.7)",
  },
  attendeesContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  attendeeAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.dark.background,
    backgroundColor: Colors.dark.card,
  },
  attendeeBadge: {
    backgroundColor: Colors.dark.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  attendeeBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
  infoSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  infoSubtitle: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: "hidden",
  },
  navButtonGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 12,
  },
  aboutText: {
    fontSize: 13,
    lineHeight: 20,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 6,
  },
  readMore: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.dark.primary,
  },
  guestListButton: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.dark.primary,
    marginBottom: 6,
    overflow: "hidden",
  },
  guestListButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  guestListIconBadge: {
    position: "relative",
  },
  guestListBadge: {
    position: "absolute",
    top: -6,
    right: -8,
    backgroundColor: Colors.dark.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  guestListBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
  guestListText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  guestListSubtext: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  priceLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  priceValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  bookButton: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  bookButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "transparent",
  },
  disabledButtonText: {
    color: "rgba(255, 255, 255, 0.4)",
  },
  hostRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  hostAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.dark.card,
  },
  hostInfo: {
    flex: 1,
  },
  hostName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  hostTitle: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
  },
  hostTitleBold: {
    fontWeight: "700",
    color: "#fff",
  },
  hostActions: {
    flexDirection: "row",
    gap: 10,
  },
  hostActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  hostActionButtonPrimary: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  rulesList: {
    gap: 10,
  },
  ruleItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  ruleBullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    marginTop: 7,
  },
  ruleText: {
    flex: 1,
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 13,
    lineHeight: 18,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  modalContent: {
    backgroundColor: Colors.dark.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 16,
    maxHeight: "85%",
    minHeight: 300,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 16,
  },
  guestListScroll: {
    flex: 1,
  },
  guestItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  guestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.background,
  },
  guestInfo: {
    flex: 1,
  },
  guestName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  guestMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  guestMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  guestMetaText: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 12,
  },
  guestSeparator: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  emptyGuestList: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    flex: 1,
  },
  emptyGuestText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
  },
  emptyGuestSubtext: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 13,
    marginTop: 4,
  },
  guestAvatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    padding: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  guestStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  genderLegend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginBottom: 16,
    paddingVertical: 10,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
  },
  guestListContent: {
    paddingBottom: 20,
  },
  emptyGuestIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(139, 0, 69, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
});