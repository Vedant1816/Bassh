import { useState } from "react";
import { View, Text, Pressable, StyleSheet, Modal, ScrollView, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface LocationHeaderProps {
  title: string;
  address: string;
  onLocationChange?: (city: { name: string; lat: number; lng: number }) => void;
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

export default function LocationHeader({ title, address, onLocationChange }: LocationHeaderProps) {
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCities = CITIES.filter(city =>
    city.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCitySelect = (city: typeof CITIES[0]) => {
    onLocationChange?.(city);
    setShowCityPicker(false);
    setSearchQuery("");
  };

  return (
    <>
      {/* Main container: 178x40 (position/size applied by parent in index) */}
      <View style={styles.container}>
        {/* Frame 1948755853 / Ellipse 2: 40x40 circle #FF007E */}
        <Pressable
          style={styles.iconButton}
          onPress={() => setShowCityPicker(true)}
        >
          <View style={styles.iconCircle}>
            {/* lucide:map-pin 24x24 at 8,9 */}
            <View style={styles.mapPinWrapper}>
              <Ionicons name="location" size={24} color="#FFFFFF" />
            </View>
          </View>
        </Pressable>

        {/* Frame 153: 128x40, left 50, flex column, gap 2 */}
        <Pressable
          style={styles.textBlock}
          onPress={() => setShowCityPicker(true)}
        >
          {/* Frame 152: row, gap 4, 67x21 - Home + arrow */}
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
            <Ionicons name="chevron-down" size={15} color="#FFFFFF" style={styles.arrowDown} />
          </View>
          <Text style={styles.address} numberOfLines={1}>
            {address || "Select location"}
          </Text>
        </Pressable>
      </View>

      {/* CITY PICKER MODAL */}
      <Modal
        visible={showCityPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCityPicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowCityPicker(false)}>
              <Text style={styles.modalClose}>Cancel</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Select City</Text>
            <View style={{ width: 60 }} />
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search cities..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")}>
                <Ionicons name="close" size={20} color="#666" />
              </Pressable>
            )}
          </View>

          {/* City List */}
          <ScrollView style={styles.cityList}>
            {/* Your Location Option */}
            <Pressable
              style={[styles.cityItem, styles.yourLocationItem]}
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
              <View style={styles.yourLocationIcon}>
                <View style={styles.yourLocationDot} />
              </View>
              <Text style={styles.yourLocationText}>Your Location</Text>
              <Ionicons name="chevron-forward" size={18} color="#666" />
            </Pressable>

            {/* Divider */}
            <View style={styles.divider} />

            {/* City List */}
            {filteredCities.map((city) => (
              <Pressable
                key={city.name}
                style={styles.cityItem}
                onPress={() => handleCitySelect(city)}
              >
                <Ionicons name="location-outline" size={20} color="#9ca3af" style={styles.cityIcon} />
                <Text style={styles.cityName}>{city.name}</Text>
                <Ionicons name="chevron-forward" size={18} color="#666" />
              </Pressable>
            ))}
            
            {filteredCities.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No cities found</Text>
                <Text style={styles.emptySubtext}>Try a different search term</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  /* Main: 178x40 */
  container: {
    width: 178,
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    padding: 0,
  },

  /* Frame 1948755853: 40x40, left 0, top 0 */
  iconButton: {
    width: 40,
    height: 40,
  },

  iconCircle: {
    position: "absolute",
    width: 40,
    height: 40,
    left: 0,
    top: 0,
    borderRadius: 20,
    backgroundColor: "#FF007E",
    justifyContent: "center",
    alignItems: "center",
  },

  /* lucide:map-pin 24x24 at 8,9 */
  mapPinWrapper: {
    position: "absolute",
    width: 24,
    height: 24,
    left: 8,
    top: 9,
    justifyContent: "center",
    alignItems: "center",
  },

  /* Frame 153: 128x40, left 50, flex column, gap 2 */
  textBlock: {
    position: "absolute",
    width: 128,
    height: 40,
    left: 50,
    top: 0,
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: 0,
    gap: 2,
  },

  /* Frame 152: row, gap 4, 67x21 */
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 0,
    gap: 4,
    width: 67,
    height: 21,
  },

  /* Home: Antebas Black, 17px, weight 900, #FFFFFF */
  title: {
    fontWeight: "900",
    fontSize: 17,
    lineHeight: 21,
    color: "#FFFFFF",
  },

  /* vuesax/linear/arrow-down 15x15 */
  arrowDown: {
    width: 15,
    height: 15,
  },

  /* Karol Bagh...: DM Sans, 13px, #E7E7E7 */
  address: {
    width: 128,
    height: 17,
    fontWeight: "400",
    fontSize: 13,
    lineHeight: 17,
    color: "#E7E7E7",
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#000",
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
  },

  modalClose: {
    color: "#EC4899",
    fontSize: 16,
  },

  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },

  searchIcon: {
    marginRight: 10,
  },

  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
  },

  cityList: {
    flex: 1,
  },

  yourLocationItem: {
    backgroundColor: "#1a1a1a",
  },

  yourLocationIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#4285F4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  yourLocationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },

  yourLocationText: {
    flex: 1,
    color: "#4285F4",
    fontSize: 16,
    fontWeight: "600",
  },

  divider: {
    height: 8,
    backgroundColor: "#0a0a0a",
  },

  cityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
  },

  cityIcon: {
    marginRight: 12,
  },

  cityName: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },

  emptyText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },

  emptySubtext: {
    color: "#666",
    fontSize: 14,
  },
});