import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Dimensions,
  StatusBar,
  TextInput,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchWithFallback } from "@/_services/api-config";
import { withAuthHeaders } from "@/_services/auth-fetch";
import LocationHeader from "@/app/components/LocationHeader";
import { PayBillModal } from "@/app/club/components/PayBillModal";
import type { Discount } from "@/app/club/components/PayBillModal";
import BookmarkButton from "@/app/components/BookmarkButton";
import FilterEventsModal, { FilterState } from "@/app/components/FilterEventsModal";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Same gradient as event/[id]/book.tsx – pink to dark to black
const HEADER_GRADIENT = ["#8B0045", "#2D0A1F", "#000000"] as const;
const HEADER_GRADIENT_LOCATIONS = [0, 0.4, 1] as const;

// CSS spec: Frame 1948755884 – card 336px, left 22. Scale from 375 design width.
const CARD_MARGIN_H = 22;
const CARD_WIDTH = SCREEN_WIDTH - CARD_MARGIN_H * 2;

// Design: search 281px, filter 59px, left 15 / 305 on 375 → proportional
const SEARCH_LEFT = 15;
const FILTER_BTN_WIDTH = 59;
const SEARCH_HEIGHT = 55;

// Colors from CSS
const BG = "#000000";
const SEARCH_BG = "rgba(255, 255, 255, 0.06)";
const SEARCH_BORDER = "rgba(255, 255, 255, 0.2)";
const SEARCH_PLACEHOLDER = "#9E9E9E";
const FILTER_ACTIVE = "#AA2074";
const FILTER_INACTIVE_BG = "rgba(170, 32, 116, 0.13)";
const CARD_BG = "rgba(22, 22, 22, 0.36)";
const CARD_BORDER = "rgba(219, 39, 144, 0.41)";
const RATING_STAR = "#EDB900";
const SHARE_BORDER = "#F572C2";
const VENUE_COLOR = "#F0F1F3";
const MUTED_COLOR = "#929292";
const BTN_PINK = "#DC2B91";
const BADGE_PINK = "#C7288A";
const HOME_INDICATOR_BG = "#FFFFFF";

/** Default location (Chandigarh) so events load with 30 km radius until user picks location */
const DEFAULT_LAT = 30.7333;
const DEFAULT_LNG = 76.7794;
const EVENTS_RADIUS_KM = 30;

const AVATARS = [
  require("@/assets/images/avatar-1.png"),
  require("@/assets/images/avatar-2.png"),
  require("@/assets/images/avatar-3.png"),
];

interface Event {
  id: string;
  name: string;
  club_id: string;
  event_date: string;
  start_time: string;
  banner_image_url: string | null;
  dj_name: string | null;
  dj_instagram: string | null;
  about: string | null;
  age_limit: string | null;
  max_attendees: number | null;
  categories: string[] | null;
  clubs: {
    club_name: string;
    address_text: string;
  };
}

const EVENT_FILTERS = [
  { id: "live", label: "Live", icon: "radio" },
  { id: "past", label: "Past Events", icon: "time-outline" },
  { id: "saved", label: "Saved", icon: "heart-outline" },
  { id: "going", label: "Going", icon: "ticket-outline" },
];

/** Booking from /api/bookings/my-bookings – event or club (table) entry; club entry has no event_id */
interface MyBooking {
  id: string;
  event_id: string | null;
  club_id: string | null;
  booking_date: string | null;
  booking_time: string | null;
  booking_status: string;
  entry_status?: string;
  events?: {
    name: string;
    event_date: string;
    start_time: string;
    banner_image_url: string | null;
    club_id?: string;
    clubs: { club_name: string; address_text: string } | null;
  } | null;
  clubs?: { id?: string; club_name: string; address_text: string } | null;
}

/** ClubInfo for PayBillModal (from /api/clubs/[id]) */
interface ClubInfoForBill {
  club_name?: string;
  address_text?: string;
  banner_image_url?: string;
}

const YOUR_EVENT_CARD_WIDTH = 175;
const YOUR_EVENT_CARD_HEIGHT = 260;
const YOUR_EVENT_CARD_GAP = 12;

/** Bookmark data from /api/bookmarks/fetch */
interface SavedEventBookmark {
  id: string;
  bookmark_type: string;
  created_at: string;
  event: {
    id: string;
    name: string;
    event_date: string;
    start_time: string;
    banner_image_url: string | null;
    club: {
      id: string;
      club_name: string;
      address_text: string;
    } | null;
  } | null;
  club: {
    id: string;
    club_name: string;
    address_text: string;
    cover_photo: string | null;
  } | null;
}

export default function EventsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("live");
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [locationTitle, setLocationTitle] = useState("Home");
  const [locationAddress, setLocationAddress] = useState("Chandigarh");
  const [locationLat, setLocationLat] = useState<number>(DEFAULT_LAT);
  const [locationLng, setLocationLng] = useState<number>(DEFAULT_LNG);
  const [myBookings, setMyBookings] = useState<MyBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [payBillVisible, setPayBillVisible] = useState(false);
  const [payBillClubId, setPayBillClubId] = useState<string | null>(null);
  const [payBillClub, setPayBillClub] = useState<ClubInfoForBill | null>(null);
  const [payBillDiscounts, setPayBillDiscounts] = useState<Discount[]>([]);
  const [savedEvents, setSavedEvents] = useState<SavedEventBookmark[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<FilterState | null>(null);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const lat = locationLat;
      const lng = locationLng;
      const url = `/api/events?lat=${lat}&lng=${lng}&radius_km=${EVENTS_RADIUS_KM}`;
      const res = await fetchWithFallback(url, await withAuthHeaders({ method: "GET" }));
      if (!res.ok) throw new Error("Failed to fetch events");
      const data = await res.json();
      setEvents(data.events || []);
      setError("");
    } catch (err: any) {
      setError(err.message || "Failed to load events");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [locationLat, locationLng]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Apply search and filters to events
  useEffect(() => {
    let filtered = [...events];

    // Apply search query
    if (searchQuery.trim().length >= 2) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((e) => {
        const nameMatch = e.name?.toLowerCase().includes(query);
        const djMatch = e.dj_name?.toLowerCase().includes(query);
        const clubMatch = e.clubs?.club_name?.toLowerCase().includes(query);
        return nameMatch || djMatch || clubMatch;
      });
    }

    // Apply filters
    if (appliedFilters) {
      const filters = appliedFilters;
      
      // Filter by categories
      if (filters.categories && filters.categories.length > 0) {
        filtered = filtered.filter((e) => {
          if (!e.categories || e.categories.length === 0) return false;
          return filters.categories!.some((cat: string) => e.categories!.includes(cat));
        });
      }

      // Filter by age limit
      if (filters.ageLimit) {
        filtered = filtered.filter((e) => e.age_limit === filters.ageLimit);
      }

      // Filter by DJ name
      if (filters.djName && filters.djName.trim().length > 0) {
        const djQuery = filters.djName.toLowerCase().trim();
        filtered = filtered.filter((e) => e.dj_name?.toLowerCase().includes(djQuery));
      }

      // Filter by date
      if (filters.date) {
        const now = new Date();
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);

        filtered = filtered.filter((e) => {
          const eventDate = new Date(e.event_date);
          eventDate.setHours(0, 0, 0, 0);

          switch (filters.date) {
            case "today":
              return eventDate.getTime() === today.getTime();
            case "tomorrow":
              return eventDate.getTime() === tomorrow.getTime();
            case "week":
              return eventDate >= today && eventDate <= weekFromNow;
            default:
              return true;
          }
        });
      }

      // Filter by time (day/night)
      if (filters.time) {
        filtered = filtered.filter((e) => {
          if (!e.start_time) return false;
          const [hours] = e.start_time.split(":").map(Number);
          const hour = hours ?? 0;

          switch (filters.time) {
            case "day":
              return hour >= 6 && hour < 18; // 6 AM to 6 PM
            case "night":
              return hour >= 18 || hour < 6; // 6 PM to 6 AM
            default:
              return true;
          }
        });
      }

      // Filter by max attendees
      if (filters.maxAttendees) {
        filtered = filtered.filter((e) => {
          if (!e.max_attendees) return false;
          return e.max_attendees <= filters.maxAttendees!;
        });
      }
    }

    setFilteredEvents(filtered);
  }, [events, searchQuery, appliedFilters]);

  const fetchMyBookings = useCallback(async () => {
    setLoadingBookings(true);
    try {
      const res = await fetchWithFallback(
        "/api/bookings/my-bookings",
        await withAuthHeaders({ method: "GET" })
      );
      if (!res.ok) return;
      const data = await res.json();
      setMyBookings((data.bookings || []) as MyBooking[]);
    } catch {
      setMyBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  useEffect(() => {
    if (
      selectedFilter === "live" ||
      selectedFilter === "past" ||
      selectedFilter === "going"
    ) {
      fetchMyBookings();
    }
  }, [selectedFilter, fetchMyBookings]);

  /** Fetch saved events from bookmarks API */
  const fetchSavedEvents = useCallback(async () => {
    setLoadingSaved(true);
    try {
      const res = await fetchWithFallback(
        "/api/bookmarks/fetch?bookmark_type=event",
        await withAuthHeaders({ method: "GET" })
      );
      if (!res.ok) return;
      const data = await res.json();
      setSavedEvents((data.bookmarks || []) as SavedEventBookmark[]);
    } catch {
      setSavedEvents([]);
    } finally {
      setLoadingSaved(false);
    }
  }, []);

  useEffect(() => {
    if (selectedFilter === "saved") {
      fetchSavedEvents();
    }
  }, [selectedFilter, fetchSavedEvents]);

  const handleLocationChange = useCallback(async (city: { name: string; lat: number; lng: number }) => {
    if (city.name === "Your Location") {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationAddress("Location permission denied");
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const [addr] = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        const addressText = addr
          ? `${addr.district || addr.subregion || ""}, ${addr.city || ""}`.trim() || "Your Location"
          : "Your Location";
        setLocationLat(pos.coords.latitude);
        setLocationLng(pos.coords.longitude);
        setLocationAddress(addressText);
        setLocationTitle("Home");
      } catch (e) {
        console.error("Location error:", e);
        setLocationAddress("Unable to get location");
      }
      return;
    }
    setLocationTitle("Home");
    setLocationAddress(city.name);
    setLocationLat(city.lat);
    setLocationLng(city.lng);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchEvents();
    if (
      selectedFilter === "live" ||
      selectedFilter === "past" ||
      selectedFilter === "going"
    ) {
      fetchMyBookings();
    }
    if (selectedFilter === "saved") {
      fetchSavedEvents();
    }
  };

  /** True if entry_status is entered and (event today within start_time..start_time+12h, or club entry today 6 PM..6 PM+12h) */
  const isOngoingBooking = (b: MyBooking): boolean => {
    if ((b.entry_status ?? "").toLowerCase() !== "entered") return false;
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const currentMins = now.getHours() * 60 + now.getMinutes();

    if (b.event_id && b.events) {
      const ev = b.events;
      if (!ev.event_date || !ev.start_time) return false;
      const eventDate = new Date(ev.event_date);
      eventDate.setHours(0, 0, 0, 0);
      if (eventDate.getTime() !== today.getTime()) return false;
      const [sh, sm] = ev.start_time.split(":").map(Number);
      const startMins = (sh ?? 0) * 60 + (sm ?? 0);
      const endMins = startMins + 12 * 60;
      return currentMins >= startMins && currentMins <= endMins;
    }

    if (!b.event_id && b.club_id && b.clubs && b.booking_date) {
      const bookingDate = new Date(b.booking_date);
      bookingDate.setHours(0, 0, 0, 0);
      if (bookingDate.getTime() !== today.getTime()) return false;
      const startMins = 18 * 60; // 6 PM
      const endMins = startMins + 12 * 60; // 6 PM + 12 hours
      return currentMins >= startMins && currentMins <= endMins;
    }
    return false;
  };

  const openPayBill = async (clubId: string) => {
    try {
      const res = await fetchWithFallback(
        `/api/clubs/${clubId}`,
        await withAuthHeaders({ method: "GET" })
      );
      if (!res.ok) return;
      const data = await res.json();
      setPayBillClubId(clubId);
      setPayBillClub({
        club_name: data.club?.club_name,
        address_text: data.club?.address_text,
        banner_image_url: data.club?.banner_image_url,
      });
      setPayBillDiscounts(data.discounts ?? []);
      setPayBillVisible(true);
    } catch {
      setPayBillVisible(false);
    }
  };

  const formatEventDateShort = (dateString: string) => {
    const d = new Date(dateString);
    const day = d.getDate();
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const formatTimeRange = (timeString: string) => {
    if (!timeString) return "16:00 - 20:00";
    const [h, m] = timeString.split(":");
    const hour = parseInt(h, 10);
    const endHour = (hour + 4) % 24;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(hour)}:${m || "00"} - ${pad(endHour)}:00`;
  };

  const formatDateTimePipe = (dateString: string, timeString: string) => {
    return `${formatEventDateShort(dateString)} | ${formatTimeRange(timeString)}`;
  };

  /** Check if an event date has passed */
  const isEventPast = (eventDate: string, startTime: string | null): boolean => {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const eventDateObj = new Date(eventDate);
    eventDateObj.setHours(0, 0, 0, 0);

    // If event date is before today, it's past
    if (eventDateObj.getTime() < today.getTime()) {
      return true;
    }

    // If event date is today, check if start time has passed
    if (eventDateObj.getTime() === today.getTime() && startTime) {
      const [sh, sm] = startTime.split(":").map(Number);
      const startMins = (sh ?? 0) * 60 + (sm ?? 0);
      return startMins < currentMins;
    }

    // If event date is in the future, it's not past
    return false;
  };

  const goToBook = (eventId: string) => {
    router.push(`/event/${eventId}/book` as any);
  };

  const renderYourEventCard = (booking: MyBooking) => {
    const ev = booking.events;
    if (!ev) return null;
    const eventId = booking.event_id;
    return (
      <Pressable
        key={booking.id}
        style={[styles.yourEventCard, { marginRight: YOUR_EVENT_CARD_GAP }]}
        onPress={() => eventId && router.push(`/event/${eventId}`)}
      >
        <View style={styles.yourEventCardImageWrap}>
          {ev.banner_image_url ? (
            <Image
              source={{ uri: ev.banner_image_url }}
              style={styles.yourEventCardImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.yourEventCardPlaceholder}>
              <Ionicons name="musical-notes-outline" size={36} color="rgba(255,255,255,0.4)" />
            </View>
          )}
        </View>
        <View style={styles.yourEventCardBody}>
          <Text style={styles.yourEventCardTitle} numberOfLines={1}>
            {ev.name || "Random Party Name"}
          </Text>
          <Text style={styles.yourEventCardDateTime}>
            {formatEventDateShort(ev.event_date)} {formatTimeRange(ev.start_time)}
          </Text>
        </View>
      </Pressable>
    );
  };

  /** Compact saved event card for "Your saved events" strip */
  const renderSavedEventCard = (bookmark: SavedEventBookmark) => {
    const ev = bookmark.event;
    if (!ev) return null;
    return (
      <Pressable
        key={bookmark.id}
        style={[styles.yourEventCard, { marginRight: YOUR_EVENT_CARD_GAP }]}
        onPress={() => router.push(`/event/${ev.id}`)}
      >
        <View style={styles.yourEventCardImageWrap}>
          {ev.banner_image_url ? (
            <Image
              source={{ uri: ev.banner_image_url }}
              style={styles.yourEventCardImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.yourEventCardPlaceholder}>
              <Ionicons name="musical-notes-outline" size={36} color="rgba(255,255,255,0.4)" />
            </View>
          )}
        </View>
        <View style={styles.yourEventCardBody}>
          <Text style={styles.yourEventCardTitle} numberOfLines={1}>
            {ev.name || "Event"}
          </Text>
          <Text style={styles.yourEventCardDateTime}>
            {formatEventDateShort(ev.event_date)} {formatTimeRange(ev.start_time)}
          </Text>
        </View>
      </Pressable>
    );
  };

  /** Compact club entry card for "Your events" strip (Going) */
  const renderYourClubEntryCard = (booking: MyBooking) => {
    const club = booking.clubs;
    const clubId = booking.club_id;
    if (!club || !clubId) return null;
    return (
      <Pressable
        key={booking.id}
        style={[styles.yourEventCard, { marginRight: YOUR_EVENT_CARD_GAP }]}
        onPress={() => router.push(`/club/${clubId}`)}
      >
        <View style={styles.yourEventCardImageWrap}>
          <View style={styles.yourEventCardPlaceholder}>
            <Ionicons name="business-outline" size={36} color="rgba(255,255,255,0.4)" />
          </View>
        </View>
        <View style={styles.yourEventCardBody}>
          <Text style={styles.yourEventCardTitle} numberOfLines={1}>
            {club.club_name || "Club"}
          </Text>
          <Text style={styles.yourEventCardDateTime}>
            Club entry · {booking.booking_date ? formatEventDateShort(booking.booking_date) : ""}
          </Text>
        </View>
      </Pressable>
    );
  };

  /** Full-width ongoing event card with Details + Pay Bill (Going section) */
  const renderOngoingEventCard = (booking: MyBooking) => {
    const ev = booking.events;
    if (!ev) return null;
    const eventId = booking.event_id;
    const clubId = ev.club_id;
    return (
      <View key={booking.id} style={styles.cardWrapper}>
        <View style={styles.card}>
          <Pressable onPress={() => eventId && router.push(`/event/${eventId}`)}>
            <View style={styles.cardImageWrap}>
              {ev.banner_image_url ? (
                <Image
                  source={{ uri: ev.banner_image_url }}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.cardImagePlaceholder}>
                  <Ionicons name="musical-notes-outline" size={48} color="rgba(255,255,255,0.4)" />
                </View>
              )}
            </View>
            <View style={styles.cardBody}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardEventName} numberOfLines={1}>
                  {ev.name || "Random Party Name"}
                </Text>
                <View style={styles.shareRatingRow}>
                  <View style={styles.shareIconWrap}>
                    <Image
                      source={require("@/assets/images/share-icon.png")}
                      style={styles.shareIconImage}
                      resizeMode="contain"
                    />
                  </View>
                  <Ionicons name="star" size={16} color={RATING_STAR} />
                  <Text style={styles.ratingText}>4.6</Text>
                </View>
              </View>
              <Text style={styles.venueName}>{ev.clubs?.club_name || "Venue TBA"}</Text>
              <Text style={styles.venueAddress} numberOfLines={1}>
                {ev.clubs?.address_text || "Address TBA"}
              </Text>
              <Text style={styles.dateTimeText}>
                {formatEventDateShort(ev.event_date)} | {formatTimeRange(ev.start_time)}
              </Text>
              <View style={styles.attendeesRow}>
                <View style={styles.avatarGroup}>
                  {AVATARS.map((src, i) => (
                    <Image
                      key={i}
                      source={src}
                      style={[styles.avatarImg, i > 0 && { marginLeft: -8 }]}
                      resizeMode="cover"
                    />
                  ))}
                </View>
                <View style={styles.attendeesBadge}>
                  <Text style={styles.attendeesCount}>120</Text>
                </View>
              </View>
            </View>
          </Pressable>
          <View style={styles.ongoingActionsRow}>
            <Pressable
              style={styles.detailsBtn}
              onPress={() => eventId && router.push(`/event/${eventId}`)}
            >
              <Text style={styles.detailsBtnText}>Details</Text>
            </Pressable>
            <Pressable
              style={styles.payBillBtn}
              onPress={() => clubId && openPayBill(clubId)}
            >
              <Text style={styles.payBillBtnText}>Pay Bill</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  /** Full-width ongoing club entry card with Details + Pay Bill (Going section) */
  const renderOngoingClubEntryCard = (booking: MyBooking) => {
    const club = booking.clubs;
    const clubId = booking.club_id;
    if (!club || !clubId) return null;
    return (
      <View key={booking.id} style={styles.cardWrapper}>
        <View style={styles.card}>
          <Pressable onPress={() => router.push(`/club/${clubId}`)}>
            <View style={styles.cardImageWrap}>
              <View style={styles.cardImagePlaceholder}>
                <Ionicons name="business-outline" size={48} color="rgba(255,255,255,0.4)" />
              </View>
            </View>
            <View style={styles.cardBody}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardEventName} numberOfLines={1}>
                  {club.club_name || "Club"}
                </Text>
              </View>
              <Text style={styles.venueName}>Club entry</Text>
              <Text style={styles.venueAddress} numberOfLines={1}>
                {club.address_text || ""}
              </Text>
              <Text style={styles.dateTimeText}>
                {booking.booking_date ? formatEventDateShort(booking.booking_date) : ""} · 6 PM – 6 AM
              </Text>
            </View>
          </Pressable>
          <View style={styles.ongoingActionsRow}>
            <Pressable
              style={styles.detailsBtn}
              onPress={() => router.push(`/club/${clubId}`)}
            >
              <Text style={styles.detailsBtnText}>Details</Text>
            </Pressable>
            <Pressable
              style={styles.payBillBtn}
              onPress={() => openPayBill(clubId)}
            >
              <Text style={styles.payBillBtnText}>Pay Bill</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  const renderEventCard = ({ item }: { item: Event }) => {
    const isPast = isEventPast(item.event_date, item.start_time);
    
    return (
      <View style={styles.cardWrapper}>
        <Pressable style={styles.card} onPress={() => router.push(`/event/${item.id}`)}>
          <View style={styles.cardImageWrap}>
            {item.banner_image_url ? (
              <Image source={{ uri: item.banner_image_url }} style={styles.cardImage} resizeMode="cover" />
            ) : (
              <View style={styles.cardImagePlaceholder}>
                <Ionicons name="musical-notes-outline" size={48} color="rgba(255,255,255,0.4)" />
              </View>
            )}
          </View>
          <View style={styles.cardBody}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardEventName} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.shareRatingRow}>
                <BookmarkButton
                  eventId={item.id}
                  bookmarkType="event"
                  size={22}
                />
                <View style={styles.shareIconWrap}>
                  <Image
                    source={require("@/assets/images/share-icon.png")}
                    style={styles.shareIconImage}
                    resizeMode="contain"
                  />
                </View>
                <Ionicons name="star" size={16} color={RATING_STAR} />
                <Text style={styles.ratingText}>4.6</Text>
              </View>
            </View>
            <Text style={styles.venueName}>{item.clubs?.club_name || "Venue TBA"}</Text>
            <Text style={styles.venueAddress} numberOfLines={1}>
              {item.clubs?.address_text || "Address TBA"}
            </Text>
            <Text style={styles.dateTimeText}>
              {formatDateTimePipe(item.event_date, item.start_time)}
            </Text>
            <View style={styles.attendeesRow}>
              <View style={styles.avatarGroup}>
                {AVATARS.map((src, i) => (
                  <Image
                    key={i}
                    source={src}
                    style={[styles.avatarImg, i > 0 && { marginLeft: -8 }]}
                    resizeMode="cover"
                  />
                ))}
              </View>
              <View style={styles.attendeesBadge}>
                <Text style={styles.attendeesCount}>{item.max_attendees ?? 120}</Text>
              </View>
            </View>
            {isPast ? (
              <View style={styles.bookTicketsBtnLocked}>
                <Ionicons name="lock-closed" size={16} color={MUTED_COLOR} />
                <Text style={styles.bookTicketsTextLocked}>Book Ticket Locked</Text>
              </View>
            ) : (
              <Pressable
                style={styles.bookTicketsBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  goToBook(item.id);
                }}
              >
                <Text style={styles.bookTicketsText}>BOOK Tickets</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={HEADER_GRADIENT}
          locations={HEADER_GRADIENT_LOCATIONS}
          style={styles.gradientBackground}
        />
        <View style={[styles.headerArea, { paddingTop: insets.top + 12 }]}>
          <View style={styles.locationRow}>
            <LocationHeader
              title={locationTitle}
              address={locationAddress}
              onLocationChange={handleLocationChange}
            />
          </View>
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={BTN_PINK} />
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={HEADER_GRADIENT}
          locations={HEADER_GRADIENT_LOCATIONS}
          style={styles.gradientBackground}
        />
        <View style={[styles.headerArea, { paddingTop: insets.top + 12 }]}>
          <View style={styles.locationRow}>
            <LocationHeader
              title={locationTitle}
              address={locationAddress}
              onLocationChange={handleLocationChange}
            />
          </View>
        </View>
        <View style={styles.loadingWrap}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={fetchEvents}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={HEADER_GRADIENT}
        locations={HEADER_GRADIENT_LOCATIONS}
        style={styles.gradientBackground}
      />

      {/* Header: location + search row + filter pills */}
      <View style={[styles.headerArea, { paddingTop: insets.top + 12 }]}>
        <View style={styles.locationRow}>
          <LocationHeader
            title={locationTitle}
            address={locationAddress}
            onLocationChange={handleLocationChange}
          />
        </View>
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={19} color={SEARCH_PLACEHOLDER} />
            <TextInput
              placeholder="Search location for event"
              placeholderTextColor={SEARCH_PLACEHOLDER}
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <Pressable
            style={styles.filterButton}
            onPress={() => setFilterModalVisible(true)}
          >
            <Ionicons name="options-outline" size={22} color="#FFFFFF" />
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
          style={styles.filtersRowScroll}
        >
          {EVENT_FILTERS.map((f) => (
            <Pressable
              key={f.id}
              style={({ pressed }) => [
                styles.filterPill,
                selectedFilter === f.id && styles.filterPillActive,
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => setSelectedFilter(f.id)}
              android_ripple={null}
            >
              <Ionicons
                name={f.icon as any}
                size={16}
                color={selectedFilter === f.id ? "#FFFFFF" : "rgba(255, 255, 255, 0.6)"}
              />
              <Text style={[styles.filterPillText, selectedFilter === f.id && styles.filterPillTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={BTN_PINK} />
        }
      >
        {(selectedFilter === "live" ||
          selectedFilter === "past" ||
          selectedFilter === "saved" ||
          selectedFilter === "going") && (
            <>
              <Text style={styles.sectionHeading}>
                {selectedFilter === "live" && "Your events"}
                {selectedFilter === "past" && "Your past events"}
                {selectedFilter === "saved" && "Your saved events"}
                {selectedFilter === "going" && "Ongoing Events"}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.yourEventsScrollContent}
                style={styles.yourEventsScroll}
              >
                {selectedFilter === "saved" ? (
                  loadingSaved ? (
                    <View style={styles.yourEventsLoading}>
                      <ActivityIndicator size="small" color={BTN_PINK} />
                    </View>
                  ) : savedEvents.length === 0 ? (
                    <View style={[styles.yourEventCard, { marginRight: YOUR_EVENT_CARD_GAP }]}>
                      <View style={styles.yourEventCardImageWrap}>
                        <View style={styles.yourEventCardPlaceholder}>
                          <Ionicons name="heart-outline" size={36} color="rgba(255,255,255,0.3)" />
                        </View>
                      </View>
                      <View style={styles.yourEventCardBody}>
                        <Text style={styles.yourEventCardTitle}>No saved events</Text>
                        <Text style={styles.yourEventCardDateTime}>
                          Save events to see them here
                        </Text>
                      </View>
                    </View>
                  ) : (
                    savedEvents.filter((b) => b.event).map((b) => renderSavedEventCard(b))
                  )
                ) : loadingBookings ? (
                  <View style={styles.yourEventsLoading}>
                    <ActivityIndicator size="small" color={BTN_PINK} />
                  </View>
                ) : (() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const yourBookings =
                    selectedFilter === "past"
                      ? myBookings.filter((b) => b.events && (() => {
                        const d = new Date(b.events.event_date);
                        d.setHours(0, 0, 0, 0);
                        return d < today;
                      })())
                      : selectedFilter === "going"
                        ? myBookings.filter((b) => isOngoingBooking(b))
                        : myBookings.filter((b) => b.event_id && b.events);
                  if (yourBookings.length === 0) {
                    return (
                      <View style={[styles.yourEventCard, { marginRight: YOUR_EVENT_CARD_GAP }]}>
                        <View style={styles.yourEventCardImageWrap}>
                          <View style={styles.yourEventCardPlaceholder}>
                            <Ionicons name="calendar-outline" size={36} color="rgba(255,255,255,0.3)" />
                          </View>
                        </View>
                        <View style={styles.yourEventCardBody}>
                          <Text style={styles.yourEventCardTitle}>
                            {selectedFilter === "past"
                              ? "No past booked events"
                              : selectedFilter === "going"
                                ? "No ongoing events"
                                : "No booked events"}
                          </Text>
                          <Text style={styles.yourEventCardDateTime}>
                            {selectedFilter === "past"
                              ? "Events you attended will appear here"
                              : selectedFilter === "going"
                                ? "Events happening today will appear here"
                                : "Book an event to see it here"}
                          </Text>
                        </View>
                      </View>
                    );
                  }
                  return yourBookings.map((b) =>
                    b.event_id && b.events
                      ? renderYourEventCard(b)
                      : renderYourClubEntryCard(b)
                  );
                })()}
              </ScrollView>
              <Text style={[styles.sectionHeading, styles.allEventsHeading]}>
                {selectedFilter === "live" && "All events"}
                {selectedFilter === "past" && "Past events"}
                {selectedFilter === "saved" && "Saved events"}
                {selectedFilter === "going" && "Ongoing events"}
              </Text>
            </>
          )}
        {selectedFilter === "going" ? (
          (() => {
            const ongoingBookings = myBookings.filter((b) => isOngoingBooking(b));
            return ongoingBookings.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No ongoing events</Text>
              </View>
            ) : (
              ongoingBookings.map((b) =>
                b.event_id && b.events
                  ? renderOngoingEventCard(b)
                  : renderOngoingClubEntryCard(b)
              )
            );
          })()
        ) : selectedFilter === "saved" ? (
          (() => {
            const savedEventsList = savedEvents.filter((b) => b.event);
            return savedEventsList.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No saved events</Text>
              </View>
            ) : (
              savedEventsList.map((bookmark) => {
                const ev = bookmark.event!;
                const isPast = isEventPast(ev.event_date, ev.start_time);
                return (
                  <View key={bookmark.id} style={styles.cardWrapper}>
                    <Pressable style={styles.card} onPress={() => router.push(`/event/${ev.id}`)}>
                      <View style={styles.cardImageWrap}>
                        {ev.banner_image_url ? (
                          <Image source={{ uri: ev.banner_image_url }} style={styles.cardImage} resizeMode="cover" />
                        ) : (
                          <View style={styles.cardImagePlaceholder}>
                            <Ionicons name="musical-notes-outline" size={48} color="rgba(255,255,255,0.4)" />
                          </View>
                        )}
                      </View>
                      <View style={styles.cardBody}>
                        <View style={styles.cardTitleRow}>
                          <Text style={styles.cardEventName} numberOfLines={1}>
                            {ev.name}
                          </Text>
                          <View style={styles.shareRatingRow}>
                            <BookmarkButton
                              eventId={ev.id}
                              bookmarkType="event"
                              size={22}
                              initialBookmarked={true}
                              onToggle={() => fetchSavedEvents()}
                            />
                            <View style={styles.shareIconWrap}>
                              <Image
                                source={require("@/assets/images/share-icon.png")}
                                style={styles.shareIconImage}
                                resizeMode="contain"
                              />
                            </View>
                            <Ionicons name="star" size={16} color={RATING_STAR} />
                            <Text style={styles.ratingText}>4.6</Text>
                          </View>
                        </View>
                        <Text style={styles.venueName}>{ev.club?.club_name || "Venue TBA"}</Text>
                        <Text style={styles.venueAddress} numberOfLines={1}>
                          {ev.club?.address_text || "Address TBA"}
                        </Text>
                        <Text style={styles.dateTimeText}>
                          {formatDateTimePipe(ev.event_date, ev.start_time)}
                        </Text>
                        <View style={styles.attendeesRow}>
                          <View style={styles.avatarGroup}>
                            {AVATARS.map((src, i) => (
                              <Image
                                key={i}
                                source={src}
                                style={[styles.avatarImg, i > 0 && { marginLeft: -8 }]}
                                resizeMode="cover"
                              />
                            ))}
                          </View>
                          <View style={styles.attendeesBadge}>
                            <Text style={styles.attendeesCount}>120</Text>
                          </View>
                        </View>
                        {isPast ? (
                          <View style={styles.bookTicketsBtnLocked}>
                            <Ionicons name="lock-closed" size={16} color={MUTED_COLOR} />
                            <Text style={styles.bookTicketsTextLocked}>Book Ticket Locked</Text>
                          </View>
                        ) : (
                          <Pressable
                            style={styles.bookTicketsBtn}
                            onPress={(e) => {
                              e.stopPropagation();
                              goToBook(ev.id);
                            }}
                          >
                            <Text style={styles.bookTicketsText}>BOOK Tickets</Text>
                          </Pressable>
                        )}
                      </View>
                    </Pressable>
                  </View>
                );
              })
            );
          })()
        ) : (
          (() => {
            const now = new Date();
            const today = new Date(now);
            today.setHours(0, 0, 0, 0);
            const currentMins = now.getHours() * 60 + now.getMinutes();
            
            // Use filteredEvents if search or filters are active, otherwise use events
            const baseEvents = (searchQuery.trim().length >= 2 || appliedFilters) ? filteredEvents : events;
            
            const displayEvents =
              selectedFilter === "past"
                ? baseEvents.filter((e) => {
                  const eventDate = new Date(e.event_date);
                  eventDate.setHours(0, 0, 0, 0);
                  // Past events: event date is before today, or if today, start time has passed
                  if (eventDate.getTime() < today.getTime()) {
                    return true;
                  }
                  if (eventDate.getTime() === today.getTime() && e.start_time) {
                    const [sh, sm] = e.start_time.split(":").map(Number);
                    const startMins = (sh ?? 0) * 60 + (sm ?? 0);
                    return startMins < currentMins;
                  }
                  return false;
                })
                : selectedFilter === "live"
                  ? baseEvents.filter((e) => {
                    const eventDate = new Date(e.event_date);
                    eventDate.setHours(0, 0, 0, 0);
                    // Future events: event date is after today, or if today, start time hasn't passed yet
                    if (eventDate.getTime() > today.getTime()) {
                      return true;
                    }
                    if (eventDate.getTime() === today.getTime() && e.start_time) {
                      const [sh, sm] = e.start_time.split(":").map(Number);
                      const startMins = (sh ?? 0) * 60 + (sm ?? 0);
                      return startMins >= currentMins;
                    }
                    // If no start_time, only include if date is in the future
                    return eventDate.getTime() > today.getTime();
                  })
                  : baseEvents;
            return displayEvents.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>
                  {selectedFilter === "past"
                    ? "No past events"
                    : selectedFilter === "live"
                      ? "No upcoming events"
                      : "No events found"}
                </Text>
              </View>
            ) : (
              displayEvents.map((item) => (
                <View key={item.id}>{renderEventCard({ item })}</View>
              ))
            );
          })()
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={[styles.homeIndicatorWrap, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.homeIndicator} />
      </View>

      <PayBillModal
        visible={payBillVisible}
        onClose={() => {
          setPayBillVisible(false);
          setPayBillClubId(null);
          setPayBillClub(null);
          setPayBillDiscounts([]);
        }}
        clubId={payBillClubId ?? ""}
        club={payBillClub}
        discounts={payBillDiscounts}
      />

      <FilterEventsModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onFindNow={(filters) => {
          setAppliedFilters(filters);
          setFilterModalVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },
  gradientBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.5,
  },
  headerArea: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  locationRow: {
    marginBottom: 16,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: SEARCH_HEIGHT,
    backgroundColor: SEARCH_BG,
    borderWidth: 1,
    borderColor: SEARCH_BORDER,
    borderRadius: 8,
    paddingHorizontal: 20,
    gap: 21,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 24,
    padding: 0,
    ...(Platform.OS === "android" && { paddingVertical: 0 }),
  },
  filterButton: {
    width: FILTER_BTN_WIDTH,
    height: SEARCH_HEIGHT,
    backgroundColor: SEARCH_BG,
    borderWidth: 1,
    borderColor: SEARCH_BORDER,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  filtersRowScroll: {
    marginHorizontal: -15,
  },
  filtersRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 7,
    paddingHorizontal: 15,
    paddingBottom: 4,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  filterPillActive: {
    backgroundColor: "#AA2074",
    borderColor: "#DB2C90",
    shadowColor: "#FF007E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.7)",
    letterSpacing: 0.3,
  },
  filterPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: CARD_MARGIN_H,
    paddingTop: 24,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  allEventsHeading: {
    marginTop: 24,
  },
  yourEventsScroll: {
    marginHorizontal: -CARD_MARGIN_H,
  },
  yourEventsScrollContent: {
    paddingHorizontal: CARD_MARGIN_H,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  yourEventsLoading: {
    width: YOUR_EVENT_CARD_WIDTH,
    height: YOUR_EVENT_CARD_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  yourEventCard: {
    width: YOUR_EVENT_CARD_WIDTH,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 15,
    overflow: "hidden",
  },
  yourEventCardImageWrap: {
    width: YOUR_EVENT_CARD_WIDTH,
    height: 160,
    overflow: "hidden",
  },
  yourEventCardImage: {
    width: "100%",
    height: "100%",
  },
  yourEventCardPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  yourEventCardBody: {
    padding: 12,
    flex: 1,
  },
  yourEventCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  yourEventCardDateTime: {
    fontSize: 12,
    color: MUTED_COLOR,
  },
  cardWrapper: {
    marginBottom: 24,
  },
  card: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 15,
    overflow: "hidden",
  },
  cardImageWrap: {
    width: "100%",
    height: 202,
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    height: "100%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  cardImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardBody: {
    padding: 17,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 8,
  },
  cardEventName: {
    flex: 1,
    fontFamily: Platform.select({ ios: "System", default: "sans-serif" }),
    fontWeight: "700",
    fontSize: 18,
    lineHeight: 20,
    color: "#FFFFFF",
  },
  shareRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  shareIconWrap: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  shareIconImage: {
    width: 16,
    height: 16,
  },
  ratingText: {
    fontFamily: Platform.select({ ios: "System", default: "sans-serif" }),
    fontWeight: "600",
    fontSize: 12,
    lineHeight: 26,
    color: "#FFFFFF",
    marginLeft: 2,
  },
  venueName: {
    fontFamily: Platform.select({ ios: "System", default: "sans-serif" }),
    fontWeight: "500",
    fontSize: 16,
    lineHeight: 20,
    color: VENUE_COLOR,
    marginBottom: 4,
  },
  venueAddress: {
    fontFamily: Platform.select({ ios: "System", default: "sans-serif" }),
    fontWeight: "500",
    fontSize: 14,
    lineHeight: 16,
    color: MUTED_COLOR,
    marginBottom: 4,
  },
  dateTimeText: {
    fontFamily: Platform.select({ ios: "System", default: "sans-serif" }),
    fontWeight: "500",
    fontSize: 14,
    lineHeight: 16,
    color: MUTED_COLOR,
    marginBottom: 12,
  },
  attendeesRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarGroup: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  avatarImg: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  attendeesBadge: {
    backgroundColor: BADGE_PINK,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  attendeesCount: {
    fontFamily: Platform.select({ ios: "System", default: "sans-serif" }),
    fontWeight: "500",
    fontSize: 9,
    lineHeight: 12,
    color: "#FFFFFF",
  },
  ongoingActionsRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 17,
    paddingBottom: 17,
    paddingTop: 0,
  },
  detailsBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    backgroundColor: "transparent",
  },
  detailsBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  payBillBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BTN_PINK,
  },
  payBillBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  bookTicketsBtn: {
    backgroundColor: BTN_PINK,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bookTicketsText: {
    fontFamily: Platform.select({ ios: "System", default: "sans-serif" }),
    fontWeight: "600",
    fontSize: 15,
    lineHeight: 20,
    color: "#FFFFFF",
  },
  bookTicketsBtnLocked: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  bookTicketsTextLocked: {
    fontFamily: Platform.select({ ios: "System", default: "sans-serif" }),
    fontWeight: "600",
    fontSize: 15,
    lineHeight: 20,
    color: MUTED_COLOR,
  },
  emptyWrap: {
    paddingVertical: 48,
    alignItems: "center",
  },
  emptyText: {
    color: MUTED_COLOR,
    fontSize: 16,
  },
  bottomSpacer: {
    height: 100,
  },
  homeIndicatorWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  homeIndicator: {
    width: 134,
    height: 5,
    backgroundColor: HOME_INDICATOR_BG,
    borderRadius: 100,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    color: MUTED_COLOR,
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    color: "#FFFFFF",
    fontSize: 16,
    marginBottom: 16,
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: BTN_PINK,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});