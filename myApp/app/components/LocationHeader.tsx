import { useState } from "react";
import { View, Text, Pressable, StyleSheet, Modal, ScrollView, TextInput, StatusBar, Image, useWindowDimensions, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "@/constants/Colors";
import MumbaiIcon from "@/app/components/Mumbai.Icon";
import DelhiIcon from "@/app/components/Delhi.Icon";
import BengaluruIcon from "@/app/components/Bengluru.Icon";
import ChandigarhIcon from "@/app/components/Chandigarh.Icon";
import HyderabadIcon from "@/app/components/Hyderabad.Icon";
import KolkataIcon from "@/app/components/Kolkata.Icon";

interface LocationHeaderProps {
  title: string;
  address: string;
  onLocationChange?: (city: { name: string; lat: number; lng: number }) => void;
  /** 'default' = transparent, 'circle' = dark circular bg behind icon */
  variant?: "default" | "circle";
  /** If true (default), tapping opens city picker. If false, location is display-only */
  changeable?: boolean;
}

// Popular Indian cities with coordinates
const CITIES = [
  { name: "Mumbai", lat: 19.0760, lng: 72.8777 },
  { name: "Delhi", lat: 28.7041, lng: 77.1025 },
  { name: "Bangalore", lat: 12.9716, lng: 77.5946 },
  { name: "Hyderabad", lat: 17.3850, lng: 78.4867 },
  { name: "Chennai", lat: 13.0827, lng: 80.2707 },
  { name: "Kolkata", lat: 22.5726, lng: 88.3639 },
  { name: "Pune", lat: 18.5204, lng: 73.8567 },
  { name: "Ahmedabad", lat: 23.0225, lng: 72.5714 },
  { name: "Jaipur", lat: 26.9124, lng: 75.7873 },
  { name: "Chandigarh", lat: 30.7333, lng: 76.7794 },
  { name: "Goa", lat: 15.2993, lng: 74.1240 },
  { name: "Lucknow", lat: 26.8467, lng: 80.9462 },
  { name: "Kochi", lat: 9.9312, lng: 76.2673 },
  { name: "Indore", lat: 22.7196, lng: 75.8577 },
  { name: "Coimbatore", lat: 11.0168, lng: 76.9558 },
  { name: "Visakhapatnam", lat: 17.6868, lng: 83.2185 },
  { name: "Bhopal", lat: 23.2599, lng: 77.4126 },
  { name: "Nagpur", lat: 21.1458, lng: 79.0882 },
  { name: "Vadodara", lat: 22.3072, lng: 73.1812 },
  { name: "Mysore", lat: 12.2958, lng: 76.6394 },
];

// Landmark-style icons (line-art feel) – light purple/lavender in UI
type IconName = React.ComponentProps<typeof Ionicons>["name"];
const POPULAR_CITIES: { name: string; icon: IconName; lat: number; lng: number }[] = [
  { name: "Delhi NCR", icon: "library-outline", lat: 28.7041, lng: 77.1025 },
  { name: "Mumbai", icon: "boat-outline", lat: 19.0760, lng: 72.8777 },
  { name: "Kolkata", icon: "school-outline", lat: 22.5726, lng: 88.3639 },
  { name: "Bengaluru", icon: "business-outline", lat: 12.9716, lng: 77.5946 },
  { name: "Hyderabad", icon: "partly-sunny-outline", lat: 17.3850, lng: 78.4867 },
  { name: "Chandigarh", icon: "hand-left-outline", lat: 30.7333, lng: 76.7794 },
];
const POPULAR_CITY_ICON_COLOR = "#B8A9C9";

export default function LocationHeader({ title, address, onLocationChange, variant = "default", changeable = true }: LocationHeaderProps) {
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { height: SCREEN_HEIGHT } = useWindowDimensions();

  const filteredCities = CITIES.filter(city =>
    city.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCitySelect = (city: { name: string; lat: number; lng: number }) => {
    onLocationChange?.(city);
    setShowCityPicker(false);
    setSearchQuery("");
  };

  const handlePress = () => {
    if (changeable) {
      setShowCityPicker(true);
    }
  };

  return (
    <>
      {/* Main container */}
      <Pressable style={styles.container} onPress={handlePress}>
        <View style={[styles.iconButton, variant === "circle" && styles.iconButtonCircle]}>
          <Image
            source={require("@/assets/images/location-pin-button.png")}
            style={styles.locationPinImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.textBlock}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {changeable && (
              <Ionicons name="chevron-down" size={15} color="#FFFFFF" style={styles.arrowDown} />
            )}
          </View>
          <Text style={styles.address} numberOfLines={1}>
            {address || "Select location"}
          </Text>
        </View>
      </Pressable>

      {/* NEW CITY PICKER MODAL */}
      <Modal
        visible={showCityPicker}
        animationType="slide"
        presentationStyle="overFullScreen"
        transparent={true} // Important for web/transparency if needed, though we use full black bg
        onRequestClose={() => setShowCityPicker(false)}
      >
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={["#8B0045", "#2D0A1F", "#000000"]}
            locations={[0, 0.4, 1]}
            style={[styles.gradientBackground, { height: SCREEN_HEIGHT * 0.5 }]}
          />
          <View style={styles.modalContentWrapper}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.modalHeader}>
              <Pressable
                style={styles.backButton}
                onPress={() => setShowCityPicker(false)}
              >
                <Ionicons name="chevron-down" size={28} color="#FFFFFF" />
              </Pressable>
              <Text style={styles.modalTitle}>Location</Text>
              <View style={{ width: 44 }} />
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={22} color="rgba(255,255,255,0.5)" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search city, area or locality"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Use Current Location */}
              <Pressable
                style={styles.currentLocationCard}
                onPress={() => {
                  onLocationChange?.({
                    name: "Your Location",
                    lat: 0,
                    lng: 0
                  });
                  setShowCityPicker(false);
                  setSearchQuery("");
                }}
              >
                <View style={styles.currentLocationIcon}>
                  <View style={styles.currentLocationDot} />
                </View>
                <View style={styles.currentLocationText}>
                  <Text style={styles.currentLocationTitle}>Use current location</Text>
                  <Text style={styles.currentLocationSubtitle}>{address || "Sector 12, Chandigarh"}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
              </Pressable>

              {/* Popular Cities */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Popular cities</Text>
                <View style={styles.cityGrid}>
                  {POPULAR_CITIES.map((city) => (
                    <Pressable
                      key={city.name}
                      style={styles.cityCard}
                      onPress={() => handleCitySelect({ name: city.name, lat: city.lat, lng: city.lng })}
                    >
                      <View style={styles.cityIconContainer}>
                        {city.name === "Mumbai" ? (
                          <MumbaiIcon size={36} color={POPULAR_CITY_ICON_COLOR} />
                        ) : city.name === "Delhi NCR" ? (
                          <DelhiIcon size={36} color={POPULAR_CITY_ICON_COLOR} />
                        ) : city.name === "Bengaluru" ? (
                          <BengaluruIcon size={36} color={POPULAR_CITY_ICON_COLOR} />
                        ) : city.name === "Chandigarh" ? (
                          <ChandigarhIcon size={36} color={POPULAR_CITY_ICON_COLOR} />
                        ) : city.name === "Hyderabad" ? (
                          <HyderabadIcon size={36} color={POPULAR_CITY_ICON_COLOR} />
                        ) : city.name === "Kolkata" ? (
                          <KolkataIcon size={36} color={POPULAR_CITY_ICON_COLOR} />
                        ) : (
                          <Ionicons name={city.icon} size={36} color={POPULAR_CITY_ICON_COLOR} />
                        )}
                      </View>
                      <Text style={styles.cityCardName}>{city.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* All Cities List */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>All cities</Text>
                <View style={styles.citiesList}>
                  {filteredCities.map((city) => (
                    <Pressable
                      key={city.name}
                      style={styles.cityListItem}
                      onPress={() => handleCitySelect(city)}
                    >
                      <Text style={styles.cityListName}>{city.name}</Text>
                    </Pressable>
                  ))}

                  {filteredCities.length === 0 && (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyText}>No cities found</Text>
                      <Text style={styles.emptySubtext}>Try a different search term</Text>
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Original Header Styles - Refactored for Flexbox
  container: {
    flexDirection: "row",
    alignItems: "center",
    // No fixed width, let parent constrain or flex
  },

  iconButton: {
    width: 40,
    height: 40,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  iconButtonCircle: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 20,
  },

  locationPinImage: {
    width: 40,
    height: 40,
  },

  textBlock: {
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 2,
    flexShrink: 1, // Allow text to shrink if constrained
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  title: {
    fontWeight: "900",
    fontSize: 17,
    lineHeight: 21,
    color: "#FFFFFF",
    flexShrink: 1,
  },

  arrowDown: {
    marginLeft: 2,
  },

  address: {
    fontWeight: "400",
    fontSize: 13,
    lineHeight: 17,
    color: "#E7E7E7",
    maxWidth: 200, // Reasonable max width for address before truncation
  },

  // NEW Modal Styles (OTP theme: gradient, pink accents)
  modalContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },

  modalContentWrapper: {
    flex: 1,
    width: "100%",
    maxWidth: 600, // Constrain width on tablets/desktop
    alignSelf: "center",
  },

  gradientBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 24 : 60, // Safe area adjustment
    paddingBottom: 16,
    marginBottom: 8,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    marginHorizontal: 16,
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    gap: 12,
  },

  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 16,
    paddingVertical: 0, // Fix alignment on Android
  },

  content: {
    flex: 1,
  },

  // Current Location Card (blue accent like reference)
  currentLocationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#4285F4",
    borderWidth: 0,
  },

  currentLocationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(66,133,244,0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  currentLocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#fff",
  },

  currentLocationText: {
    flex: 1,
  },

  currentLocationTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },

  currentLocationSubtitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
  },

  // Section
  section: {
    marginBottom: 32,
  },

  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
    marginHorizontal: 16,
  },

  // City Grid (Popular Cities – line-art style, lavender icons)
  cityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
    justifyContent: 'flex-start', // ensure items start from left
  },

  cityCard: {
    width: '30%', // Responsive grid
    minWidth: 100,
    aspectRatio: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 12, // Reduced padding for smaller screens
    justifyContent: "space-between",
    alignItems: "center",
    flexGrow: 1, // Allow growth
    maxWidth: 150, // Don't get too big on tablet
  },

  cityIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },

  cityCardName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: 'center',
  },

  // All Cities List
  citiesList: {
    paddingHorizontal: 16,
  },

  cityListItem: {
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },

  cityListName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "500",
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },

  emptyText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },

  emptySubtext: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
  },
});