import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  ScrollView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/Colors";
import { LinearGradient } from "expo-linear-gradient";
import { PrimaryGradient, PrimaryGradientStart, PrimaryGradientEnd } from "../../constants/Colors";

type FilterClubsModalProps = {
  visible: boolean;
  onClose: () => void;
  onFindNow?: (filters: ClubFilterState) => void;
};

export type ClubFilterState = {
  tiers: number[] | null; // [1, 2, 3] for tier selection
  minRating: number | null;
  priceMin: number | null;
  priceMax: number | null;
  minGuestCount: number | null;
};

const PILL_BORDER = "#7D7D7D";
const PILL_BG = "#2A2A2A";

function FilterPill({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.pill, selected && styles.pillSelected]}
    >
      {icon && <Ionicons name={icon} size={16} color={Colors.dark.text} style={{ marginRight: 6 }} />}
      <Text style={styles.pillText}>{label}</Text>
    </Pressable>
  );
}

export default function FilterClubsModal({
  visible,
  onClose,
  onFindNow,
}: FilterClubsModalProps) {
  const [selectedTiers, setSelectedTiers] = useState<number[]>([]);
  const [minRating, setMinRating] = useState<string>("");
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");
  const [minGuestCount, setMinGuestCount] = useState<string>("");

  const toggleTier = (tier: number) => {
    setSelectedTiers((prev) =>
      prev.includes(tier) ? prev.filter((t) => t !== tier) : [...prev, tier]
    );
  };

  const handleFindNow = () => {
    onFindNow?.({
      tiers: selectedTiers.length > 0 ? selectedTiers : null,
      minRating: minRating.trim() ? parseFloat(minRating) : null,
      priceMin: priceMin.trim() ? parseFloat(priceMin) : null,
      priceMax: priceMax.trim() ? parseFloat(priceMax) : null,
      minGuestCount: minGuestCount.trim() ? parseInt(minGuestCount, 10) : null,
    });
    onClose();
  };

  const handleClearFilters = () => {
    setSelectedTiers([]);
    setMinRating("");
    setPriceMin("");
    setPriceMax("");
    setMinGuestCount("");
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <LinearGradient
          colors={[Colors.dark.surface, Colors.dark.background]}
          style={StyleSheet.absoluteFill}
        />
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Filter Clubs</Text>
          <View style={styles.headerActions}>
            <Pressable onPress={handleClearFilters} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>Clear</Text>
            </Pressable>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Ionicons name="close" size={28} color={Colors.dark.text} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Club Tier */}
          <Text style={styles.sectionLabel}>Club Tier</Text>
          <View style={styles.pillRow}>
            <FilterPill
              label="Tier 1"
              selected={selectedTiers.includes(1)}
              onPress={() => toggleTier(1)}
            />
            <FilterPill
              label="Tier 2"
              selected={selectedTiers.includes(2)}
              onPress={() => toggleTier(2)}
            />
            <FilterPill
              label="Tier 3"
              selected={selectedTiers.includes(3)}
              onPress={() => toggleTier(3)}
            />
          </View>

          {/* Minimum Rating */}
          <Text style={styles.sectionLabel}>Minimum Rating</Text>
          <View style={styles.ratingRow}>
            <TextInput
              style={styles.numberInput}
              placeholder="e.g., 4.0"
              placeholderTextColor={Colors.dark.textSecondary}
              value={minRating}
              onChangeText={setMinRating}
              keyboardType="decimal-pad"
            />
            <Pressable
              style={styles.clearNumberBtn}
              onPress={() => setMinRating("")}
            >
              <Ionicons name="close-circle" size={20} color={Colors.dark.textSecondary} />
            </Pressable>
          </View>
          <Text style={styles.hintText}>Filter clubs with rating above this value</Text>

          {/* Price Range */}
          <Text style={styles.sectionLabel}>Price Range (Rs.)</Text>
          <View style={styles.priceRangeRow}>
            <View style={styles.priceInputWrapper}>
              <Text style={styles.priceLabel}>Min</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="0"
                placeholderTextColor={Colors.dark.textSecondary}
                value={priceMin}
                onChangeText={setPriceMin}
                keyboardType="numeric"
              />
            </View>
            <Text style={styles.priceSeparator}>-</Text>
            <View style={styles.priceInputWrapper}>
              <Text style={styles.priceLabel}>Max</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="10000"
                placeholderTextColor={Colors.dark.textSecondary}
                value={priceMax}
                onChangeText={setPriceMax}
                keyboardType="numeric"
              />
            </View>
          </View>
          <Text style={styles.hintText}>Filter by entry price range</Text>

          {/* Minimum Guest Count */}
          <Text style={styles.sectionLabel}>Minimum Guest Count</Text>
          <View style={styles.ratingRow}>
            <TextInput
              style={styles.numberInput}
              placeholder="e.g., 100"
              placeholderTextColor={Colors.dark.textSecondary}
              value={minGuestCount}
              onChangeText={setMinGuestCount}
              keyboardType="numeric"
            />
            <Pressable
              style={styles.clearNumberBtn}
              onPress={() => setMinGuestCount("")}
            >
              <Ionicons name="close-circle" size={20} color={Colors.dark.textSecondary} />
            </Pressable>
          </View>
          <Text style={styles.hintText}>Filter clubs with guest count above this value</Text>

          <View style={styles.findNowWrap}>
            <Pressable onPress={handleFindNow} style={styles.findNowBtn}>
              <LinearGradient
                colors={PrimaryGradient}
                start={PrimaryGradientStart}
                end={PrimaryGradientEnd}
                style={styles.findNowGradient}
              >
                <Text style={styles.findNowText}>Find Now</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.dark.text,
    flex: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  clearBtn: {
    padding: 8,
  },
  clearBtnText: {
    fontSize: 16,
    color: Colors.dark.primary,
    fontWeight: "600",
  },
  closeBtn: {
    padding: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.dark.text,
    marginTop: 20,
    marginBottom: 10,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: PILL_BG,
    borderWidth: 1,
    borderColor: PILL_BORDER,
  },
  pillSelected: {
    borderColor: Colors.dark.primary,
    backgroundColor: "rgba(219, 68, 148, 0.2)",
  },
  pillText: {
    fontSize: 14,
    color: Colors.dark.text,
    fontWeight: "500",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  numberInput: {
    flex: 1,
    backgroundColor: PILL_BG,
    borderWidth: 1,
    borderColor: PILL_BORDER,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: Colors.dark.text,
    fontSize: 16,
  },
  clearNumberBtn: {
    padding: 4,
  },
  hintText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginTop: 6,
    marginBottom: 4,
  },
  priceRangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  priceInputWrapper: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginBottom: 6,
  },
  priceInput: {
    backgroundColor: PILL_BG,
    borderWidth: 1,
    borderColor: PILL_BORDER,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: Colors.dark.text,
    fontSize: 16,
  },
  priceSeparator: {
    fontSize: 18,
    color: Colors.dark.textSecondary,
    marginTop: 20,
  },
  findNowWrap: {
    marginTop: 32,
    alignItems: "center",
  },
  findNowBtn: {
    width: "100%",
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
  },
  findNowGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  findNowText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
