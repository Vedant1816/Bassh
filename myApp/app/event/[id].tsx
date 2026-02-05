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
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { fetchWithFallback } from "@/_services/api-config";
import { Colors } from "@/constants/Colors";
import { GradientButton } from "@/components/ui/GradientButton";

const { width } = Dimensions.get("window");

export default function EventDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const id = (Array.isArray(params.id) ? params.id[0] : params.id) as string | undefined;

  const [event, setEvent] = useState<any>(null);
  const [club, setClub] = useState<any>(null);
  const [pricing, setPricing] = useState<any[]>([]);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        // Fetch event offers from dedicated discount API
        const discountRes = await fetchWithFallback(
          `/api/discounts/event?event_id=${id}`,
          await withAuthHeaders({ method: "GET" })
        );
        const discountData = await discountRes.json();
        if (discountRes.ok && discountData.discounts) {
          setDiscounts(discountData.discounts);
        } else {
          setDiscounts([]);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load event");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

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
    if (club?.latitude && club?.longitude) {
      const url = `https://www.google.com/maps/search/?api=1&query=${club.latitude},${club.longitude}`;
      Linking.openURL(url);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator color={Colors.dark.primary} size="large" />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.error}>Error: {error}</Text>
      </View>
    );
  }

  if (!event) return null;

  const bannerUrl = event.banner_image_url || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800";
  const djImageUrl = event.dj_image_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200";

  const prices = pricing
    .map((p: any) => Number(p.price))
    .filter((n) => !Number.isNaN(n) && n >= 0);
  const minPrice = prices.length > 0 ? Math.min(...prices) : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* BANNER IMAGE WITH OVERLAY */}
        <View style={styles.bannerContainer}>
          <Image source={{ uri: bannerUrl }} style={styles.bannerImage} />
          <View style={styles.bannerOverlay} />
          
          <View style={styles.headerRow}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backBtnText}>←</Text>
            </Pressable>
          </View>

          {/* EVENT INFO CARD */}
          <View style={styles.eventCard}>
            {/* TAGS */}
            {event.categories && event.categories.length > 0 && (
              <View style={styles.tagsRow}>
                {event.categories.map((category: string, index: number) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{category}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* TITLE */}
            <Text style={styles.eventTitle}>{event.name}</Text>

            {/* DATE/TIME */}
            <Text style={styles.eventDateTime}>
              {formatEventDate(event.event_date)}, {event.start_time || "6:00 PM"}
            </Text>

            {club && (
              <Pressable style={styles.infoRow} onPress={openDirections}>
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>{club.club_name || "Venue"}</Text>
                  <Text style={styles.infoSubtitle}>
                    {club.address_text || "Location TBA"}
                    {club.guest_count ? ` · ${club.guest_count} guests` : ""}
                  </Text>
                </View>
                <Text style={styles.arrow}>→</Text>
              </Pressable>
            )}

            <View style={styles.infoRow}>
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>
                  Gates {event.start_time ? getGatesOpenTime(event.start_time) : "5:30 PM"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* WHO'S TAKING THE STAGE */}
        {event.dj_name && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Who's taking the stage</Text>
            <View style={styles.performerCard}>
              <Image source={{ uri: djImageUrl }} style={styles.performerImage} />
              <View style={styles.performerInfo}>
                <Text style={styles.performerName}>{event.dj_name}</Text>
                <Pressable>
                  <Text style={styles.knowMore}>Know more ›</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* ABOUT THE EVENT */}
        {event.about && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About the event</Text>
            <Text style={styles.aboutText}>{event.about}</Text>
          </View>
        )}

        {/* THINGS TO KNOW */}
        {event.terms_and_conditions && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Things to Know</Text>
            <Text style={styles.aboutText}>{event.terms_and_conditions}</Text>
          </View>
        )}

        {/* OFFERS – at end */}
        {discounts.length > 0 && (
          <View style={styles.offersSection}>
            <Text style={styles.offersSectionTitle}>Offers for this event</Text>
            {discounts.map((offer: any) => (
              <Pressable
                key={offer.id}
                style={({ pressed }) => [
                  styles.offerCard,
                  pressed && styles.offerCardPressed,
                ]}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                  if (id) router.push(`/event/${id}/book` as any);
                }}
              >
                <View style={styles.offerCardLeft}>
                  {offer.discount_type === "percentage" ? (
                    <>
                      <Text style={styles.offerFlat}>FLAT</Text>
                      <Text style={styles.offerValue}>
                        {offer.discount_value}% OFF
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.offerValue}>
                      ₹{offer.discount_value} OFF
                    </Text>
                  )}
                </View>
                <View style={styles.offerCardRight}>
                  <Text style={styles.offerDetail}>
                    {offer.description || "Valid for this event"}
                  </Text>
                  {offer.min_purchase > 0 && (
                    <Text style={styles.offerMeta}>
                      Min booking ₹{offer.min_purchase}
                    </Text>
                  )}
                  <Text style={styles.offerCta}>Book now ›</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* STICKY FOOTER */}
      <View style={styles.bookFooter}>
        <View style={styles.bookFooterLeft}>
          <Text style={styles.bookFooterPrice}>
            {minPrice != null ? `₹${minPrice}` : "—"}
          </Text>
        </View>
        <GradientButton
          style={styles.bookFooterBtn}
          textStyle={styles.bookFooterBtnText}
          onPress={() => id && router.push(`/event/${id}/book` as any)}
        >
          Book tickets
        </GradientButton>
      </View>
    </View>
  );
}

function getGatesOpenTime(startTime: string): string {
  try {
    const [hours, minutes] = startTime.split(":").map(Number);
    const gateHours = hours - 1;
    const gateMinutes = minutes || 0;
    const period = gateHours >= 12 ? "PM" : "AM";
    const displayHours = gateHours > 12 ? gateHours - 12 : gateHours === 0 ? 12 : gateHours;
    return `${displayHours}:${gateMinutes.toString().padStart(2, "0")} ${period}`;
  } catch {
    return "5:30 PM";
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
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
  bannerContainer: {
    width: width,
    height: 400,
    position: "relative",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  bannerOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  headerRow: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    paddingHorizontal: 16,
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  backBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "500",
  },
  eventCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.dark.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingTop: 24,
  },
  offersSection: {
    paddingHorizontal: 20,
    marginTop: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  offersSectionTitle: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  offerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.dark.primary,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  offerCardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  offerCardLeft: {
    flex: 0,
  },
  offerFlat: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  offerValue: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  offerCardRight: {
    flex: 1,
    alignItems: "flex-end",
    marginLeft: 16,
  },
  offerDetail: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 4,
    textAlign: "right",
  },
  offerMeta: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    marginBottom: 8,
    textAlign: "right",
  },
  offerCta: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
  },
  tagsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: Colors.dark.card,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  tagText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.dark.text,
    marginBottom: 6,
  },
  eventDateTime: {
    fontSize: 15,
    color: Colors.dark.primary,
    fontWeight: "600",
    marginBottom: 18,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    paddingVertical: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  infoSubtitle: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
  },
  arrow: {
    color: Colors.dark.textSecondary,
    fontSize: 16,
    marginLeft: 8,
  },
  section: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: Colors.dark.text,
    marginBottom: 12,
  },
  performerCard: {
    flexDirection: "row",
    backgroundColor: Colors.dark.card,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  performerImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: Colors.dark.border,
  },
  performerInfo: {
    flex: 1,
    marginLeft: 14,
  },
  performerName: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  knowMore: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
  },
  aboutText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  bookFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.dark.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  bookFooterLeft: {},
  bookFooterPrice: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: "600",
  },
  bookFooterBtn: {
    minWidth: 140,
  },
  bookFooterBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});