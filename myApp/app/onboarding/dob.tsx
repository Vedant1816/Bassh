import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { fetchWithFallback } from "@/_services/api-config";

export default function DobScreen() {
  const router = useRouter();

  const [dob, setDob] = useState<Date>(new Date(2000, 0, 1));
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  /* -------------------- HELPERS -------------------- */

  const formatDisplay = (d: Date) =>
    `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${d.getFullYear()}`;

  const formatForAPI = (d: Date) =>
    `${d.getFullYear()}-${(d.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;

  const onChangeAndroid = (event: any, selected?: Date) => {
    // Always hide picker first
    setShowPicker(false);
    
    // Only update date if user confirmed (not cancelled)
    if (event.type === "set" && selected) {
      // Ensure date is not in the future
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const finalDate = selected > today ? today : selected;
      setDob(finalDate);
      console.log("Date selected:", formatDisplay(finalDate));
    } else if (event.type === "dismissed") {
      console.log("Date picker dismissed");
    }
  };

  /* -------------------- SAVE -------------------- */

  const save = async () => {
    setLoading(true);

    try {
      const res = await fetchWithFallback(
        `/api/users/me`,
        await withAuthHeaders({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dob: formatForAPI(dob) }),
        })
      );

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        alert(e.error || "Failed to save DOB");
        setLoading(false);
        return;
      }

      router.push("/onboarding/social");
    } catch (err: any) {
      alert(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  /* -------------------- UI -------------------- */

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Welcome to BASH</Text>
          <Text style={styles.step}>4/6</Text>
        </View>

        {/* CARD */}
        <View style={styles.card}>
          <Text style={styles.title}>What’s your date of birth?</Text>
          <Text style={styles.subtitle}>
            We use this to personalise your experience.
          </Text>

          {/* DOB FIELD */}
          <Pressable
            style={styles.dateInput}
            onPress={() => setShowPicker(true)}
          >
            <Text style={styles.dateText}>{formatDisplay(dob)}</Text>
            <Ionicons name="calendar-outline" size={22} color="#EC4899" />
          </Pressable>

          {/* ANDROID PICKER */}
          {showPicker && Platform.OS === "android" && (
            <DateTimePicker
              value={dob}
              mode="date"
              display="default"
              onChange={onChangeAndroid}
              maximumDate={new Date()}
              minimumDate={new Date(1900, 0, 1)}
            />
          )}

          {/* IOS PICKER */}
          {Platform.OS === "ios" && (
            <Modal visible={showPicker} transparent animationType="slide">
              <View style={styles.modalOverlay}>
                <View style={styles.modalSheet}>
                  <View style={styles.modalHeader}>
                    <Pressable onPress={() => setShowPicker(false)}>
                      <Text style={styles.done}>Done</Text>
                    </Pressable>
                  </View>

                  <DateTimePicker
                    value={dob}
                    mode="date"
                    display="spinner"
                    onChange={(_, d) => {
                      if (d) {
                        // Ensure date is not in the future
                        const today = new Date();
                        today.setHours(23, 59, 59, 999);
                        const finalDate = d > today ? today : d;
                        setDob(finalDate);
                      }
                    }}
                    maximumDate={new Date()}
                    minimumDate={new Date(1900, 0, 1)}
                  />
                </View>
              </View>
            </Modal>
          )}

          {/* BUTTONS */}
          <View style={styles.buttons}>
            <Pressable style={styles.prev} onPress={() => router.back()}>
              <Text style={styles.prevText}>Previous</Text>
            </Pressable>

            <Pressable
              style={[styles.next, loading && { opacity: 0.6 }]}
              disabled={loading}
              onPress={save}
            >
              <Text style={styles.nextText}>
                {loading ? "Saving…" : "Continue"}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* -------------------- STYLES -------------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  scroll: { padding: 20, paddingTop: 60 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "600" },
  step: { color: "#9CA3AF" },

  card: { gap: 24 },
  title: { fontSize: 24, fontWeight: "700", color: "#fff" },
  subtitle: { color: "#9CA3AF", fontSize: 14 },

  dateInput: {
    borderWidth: 1,
    borderColor: "rgba(236,72,153,0.4)",
    borderRadius: 10,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: { color: "#fff", fontSize: 16 },

  buttons: { flexDirection: "row", gap: 12, marginTop: 20 },
  prev: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
  },
  prevText: { color: "#fff", fontWeight: "600" },

  next: {
    flex: 1,
    backgroundColor: "#EC4899",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
  },
  nextText: { color: "#fff", fontWeight: "600" },

  /* iOS modal */
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalSheet: {
    backgroundColor: "#111",
    paddingBottom: 20,
  },
  modalHeader: {
    alignItems: "flex-end",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  done: { color: "#EC4899", fontSize: 16, fontWeight: "600" },
});