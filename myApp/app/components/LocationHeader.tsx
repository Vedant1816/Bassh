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
      <View style={styles.container}>
        {/* Pink Circle Icon */}
        <Pressable 
          style={styles.iconButton}
          onPress={() => setShowCityPicker(true)}
        >
          <View style={styles.iconCircle}>
            <View style={styles.locationPin}>
              <View style={styles.locationPinTop} />
              <View style={styles.locationPinBottom} />
            </View>
          </View>
        </Pressable>

        {/* Text Content */}
        <Pressable 
          style={styles.textContainer}
          onPress={() => setShowCityPicker(true)}
        >
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.chevron}>▾</Text>
          </View>
          <Text style={styles.address} numberOfLines={1}>
            {address || "Select location"}
          </Text>
        </Pressable>

        {/* Chat Icon */}
        <Pressable style={styles.chatButton}>
          <View style={styles.chatCircle}>
            <Ionicons name="chatbubble-outline" size={22} color="#fff" />
          </View>
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
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },

  // Pink Circle Icon
  iconButton: {
    width: 56,
    height: 56,
  },

  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EC4899",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#EC4899",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },

  // Location Pin Icon
  locationPin: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },

  locationPinTop: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 3,
    borderColor: "#fff",
  },

  locationPinBottom: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#fff",
    marginTop: -3,
  },

  iconText: {
    fontSize: 28,
  },

  // Text Content
  textContainer: {
    flex: 1,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },

  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },

  chevron: {
    color: "#fff",
    fontSize: 18,
  },

  address: {
    color: "#9ca3af",
    fontSize: 15,
  },

  // Chat Button
  chatButton: {
    width: 48,
    height: 48,
  },

  chatCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
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