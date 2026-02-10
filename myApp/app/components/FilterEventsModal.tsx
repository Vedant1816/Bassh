import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  ScrollView,
  Switch,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/Colors";
import { LinearGradient } from "expo-linear-gradient";
import { PrimaryGradient, PrimaryGradientStart, PrimaryGradientEnd } from "../../constants/Colors";

type FilterEventsModalProps = {
  visible: boolean;
  onClose: () => void;
  onFindNow?: (filters: FilterState) => void;
};

export type FilterState = {
  categories: string[] | null;
  ageLimit: string | null;
  djName: string | null;
  date: "today" | "tomorrow" | "week" | null;
  time: "day" | "night" | null;
  maxAttendees: number | null;
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

// Common event categories
const EVENT_CATEGORIES = [
  "Electronic",
  "Hip Hop",
  "Pop",
  "Rock",
  "Jazz",
  "Latin",
  "House",
  "Techno",
  "R&B",
  "Reggae",
  "Country",
  "Indie",
  "EDM",
  "Trance",
  "Dubstep",
];

const AGE_LIMITS = ["18+", "21+", "25+", "All Ages"];

export default function FilterEventsModal({
  visible,
  onClose,
  onFindNow,
}: FilterEventsModalProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [ageLimit, setAgeLimit] = useState<string | null>(null);
  const [djName, setDjName] = useState("");
  const [date, setDate] = useState<"today" | "tomorrow" | "week" | null>(null);
  const [time, setTime] = useState<"day" | "night" | null>(null);
  const [maxAttendees, setMaxAttendees] = useState<number | null>(null);

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const handleFindNow = () => {
    onFindNow?.({
      categories: selectedCategories.length > 0 ? selectedCategories : null,
      ageLimit: ageLimit || null,
      djName: djName.trim() || null,
      date,
      time,
      maxAttendees,
    });
    onClose();
  };

  const handleClearFilters = () => {
    setSelectedCategories([]);
    setAgeLimit(null);
    setDjName("");
    setDate(null);
    setTime(null);
    setMaxAttendees(null);
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
          <Text style={styles.title}>Filter Events</Text>
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
          {/* Categories */}
          <Text style={styles.sectionLabel}>Categories</Text>
          <View style={styles.pillRowWrap}>
            {EVENT_CATEGORIES.map((cat) => (
              <FilterPill
                key={cat}
                label={cat}
                selected={selectedCategories.includes(cat)}
                onPress={() => toggleCategory(cat)}
              />
            ))}
          </View>

          {/* Age Limit */}
          <Text style={styles.sectionLabel}>Age Limit</Text>
          <View style={styles.pillRow}>
            {AGE_LIMITS.map((age) => (
              <FilterPill
                key={age}
                label={age}
                selected={ageLimit === age}
                onPress={() => setAgeLimit(ageLimit === age ? null : age)}
              />
            ))}
          </View>

          {/* DJ Name */}
          <Text style={styles.sectionLabel}>DJ Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Search by DJ name"
            placeholderTextColor={Colors.dark.textSecondary}
            value={djName}
            onChangeText={setDjName}
            autoCapitalize="words"
          />

          {/* Max Attendees */}
          <Text style={styles.sectionLabel}>Max Attendees</Text>
          <View style={styles.maxAttendeesRow}>
            <TextInput
              style={styles.numberInput}
              placeholder="No limit"
              placeholderTextColor={Colors.dark.textSecondary}
              value={maxAttendees ? maxAttendees.toString() : ""}
              onChangeText={(text) => {
                const num = parseInt(text, 10);
                setMaxAttendees(isNaN(num) ? null : num);
              }}
              keyboardType="numeric"
            />
            <Pressable
              style={styles.clearNumberBtn}
              onPress={() => setMaxAttendees(null)}
            >
              <Ionicons name="close-circle" size={20} color={Colors.dark.textSecondary} />
            </Pressable>
          </View>

          {/* Date */}
          <Text style={styles.sectionLabel}>Date</Text>
          <View style={styles.pillRowWrap}>
            <FilterPill
              label="Today"
              selected={date === "today"}
              onPress={() => setDate(date === "today" ? null : "today")}
              icon="calendar-outline"
            />
            <FilterPill
              label="Tomorrow"
              selected={date === "tomorrow"}
              onPress={() => setDate(date === "tomorrow" ? null : "tomorrow")}
              icon="calendar-outline"
            />
            <FilterPill
              label="This week"
              selected={date === "week"}
              onPress={() => setDate(date === "week" ? null : "week")}
              icon="calendar-outline"
            />
          </View>

          {/* Time */}
          <Text style={styles.sectionLabel}>Time</Text>
          <View style={styles.pillRowWrap}>
            <FilterPill
              label="Day"
              selected={time === "day"}
              onPress={() => setTime(time === "day" ? null : "day")}
              icon="sunny-outline"
            />
            <FilterPill
              label="Night"
              selected={time === "night"}
              onPress={() => setTime(time === "night" ? null : "night")}
              icon="moon-outline"
            />
          </View>

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
  sliderTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#444",
    position: "relative",
  },
  sliderFill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    backgroundColor: "#666",
    borderRadius: 3,
  },
  sliderFillRange: {
    left: "5%",
    right: "30%",
  },
  sliderThumb: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFF",
    top: -7,
    marginLeft: -10,
  },
  sliderThumbLeft: { left: "5%" },
  sliderThumbRight: { left: "70%" },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  sliderLabel: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  sliderTrackSingle: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#444",
    position: "relative",
  },
  sliderFillSingle: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#666",
    borderRadius: 3,
  },
  sliderFillSingleWidth: { width: "25%" },
  sliderThumbSingle: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFF",
    top: -7,
    marginLeft: -10,
  },
  sliderThumbSinglePos: { left: "25%" },
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  distanceInput: {
    width: 90,
    height: 40,
    backgroundColor: "#2A2A2A",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PILL_BORDER,
    color: Colors.dark.text,
    fontSize: 14,
    paddingHorizontal: 12,
    textAlign: "center",
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  pillRowWrap: {
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
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  textInput: {
    backgroundColor: PILL_BG,
    borderWidth: 1,
    borderColor: PILL_BORDER,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: Colors.dark.text,
    fontSize: 16,
  },
  maxAttendeesRow: {
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
