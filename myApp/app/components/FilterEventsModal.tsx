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
  entryFeeMin: number;
  entryFeeMax: number;
  clubTier: "tier1" | "tier2" | "tier3" | null;
  distanceKm: number;
  fromMyLocation: boolean;
  liveEvent: boolean;
  date: "today" | "tomorrow" | "week" | "other" | null;
  time: "day" | "night" | "choose" | null;
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

export default function FilterEventsModal({
  visible,
  onClose,
  onFindNow,
}: FilterEventsModalProps) {
  const [entryFeeMin, setEntryFeeMin] = useState(200);
  const [entryFeeMax, setEntryFeeMax] = useState(5000);
  const [clubTier, setClubTier] = useState<"tier1" | "tier2" | "tier3" | null>(null);
  const [distanceKm, setDistanceKm] = useState(0.5);
  const [fromMyLocation, setFromMyLocation] = useState(true);
  const [liveEvent, setLiveEvent] = useState(false);
  const [date, setDate] = useState<"today" | "tomorrow" | "week" | "other" | null>(null);
  const [time, setTime] = useState<"day" | "night" | "choose" | null>(null);

  const handleFindNow = () => {
    onFindNow?.({
      entryFeeMin,
      entryFeeMax,
      clubTier,
      distanceKm,
      fromMyLocation,
      liveEvent,
      date,
      time,
    });
    onClose();
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
          <Text style={styles.title}>Filter the events near you</Text>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
            <Ionicons name="close" size={28} color={Colors.dark.text} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Entry fee range */}
          <Text style={styles.sectionLabel}>Entry fee range</Text>
          <View style={styles.sliderTrack}>
            <View style={[styles.sliderFill, styles.sliderFillRange]} />
            <View style={[styles.sliderThumb, styles.sliderThumbLeft]} />
            <View style={[styles.sliderThumb, styles.sliderThumbRight]} />
          </View>
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>Rs.{entryFeeMin}</Text>
            <Text style={styles.sliderLabel}>Rs.{entryFeeMax}</Text>
          </View>

          {/* Type of Club */}
          <Text style={styles.sectionLabel}>Type of Club</Text>
          <View style={styles.pillRow}>
            <FilterPill
              label="Tier-1"
              selected={clubTier === "tier1"}
              onPress={() => setClubTier(clubTier === "tier1" ? null : "tier1")}
            />
            <FilterPill
              label="Tier-2"
              selected={clubTier === "tier2"}
              onPress={() => setClubTier(clubTier === "tier2" ? null : "tier2")}
            />
            <FilterPill
              label="Tier-3"
              selected={clubTier === "tier3"}
              onPress={() => setClubTier(clubTier === "tier3" ? null : "tier3")}
            />
          </View>

          {/* Find party under distance of */}
          <Text style={styles.sectionLabel}>Find party under distance of</Text>
          <View style={styles.distanceRow}>
            <View style={styles.sliderTrackSingle}>
              <View style={[styles.sliderFillSingle, styles.sliderFillSingleWidth]} />
              <View style={[styles.sliderThumbSingle, styles.sliderThumbSinglePos]} />
            </View>
            <TextInput
              style={styles.distanceInput}
              value={`${distanceKm.toFixed(3)} km`}
              editable={false}
            />
          </View>

          {/* from */}
          <Text style={styles.sectionLabel}>from</Text>
          <View style={styles.pillRow}>
            <FilterPill
              label="My location"
              selected={fromMyLocation}
              onPress={() => setFromMyLocation(true)}
              icon="person-outline"
            />
            <FilterPill
              label="Search location"
              selected={!fromMyLocation}
              onPress={() => setFromMyLocation(false)}
              icon="search-outline"
            />
          </View>

          {/* Live event */}
          <Text style={styles.sectionLabel}>Live event</Text>
          <View style={styles.toggleRow}>
            <Switch
              value={liveEvent}
              onValueChange={setLiveEvent}
              trackColor={{ false: "#444", true: Colors.dark.primary }}
              thumbColor="#FFF"
            />
          </View>

          {/* Date */}
          <Text style={styles.sectionLabel}>Date</Text>
          <View style={styles.pillRowWrap}>
            <FilterPill
              label="Today"
              selected={date === "today"}
              onPress={() => setDate(date === "today" ? null : "today")}
            />
            <FilterPill
              label="Tomorrow"
              selected={date === "tomorrow"}
              onPress={() => setDate(date === "tomorrow" ? null : "tomorrow")}
            />
            <FilterPill
              label="This week"
              selected={date === "week"}
              onPress={() => setDate(date === "week" ? null : "week")}
            />
            <FilterPill
              label="Other date"
              selected={date === "other"}
              onPress={() => setDate(date === "other" ? null : "other")}
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
            <FilterPill
              label="Choose time"
              selected={time === "choose"}
              onPress={() => setTime(time === "choose" ? null : "choose")}
              icon="time-outline"
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
