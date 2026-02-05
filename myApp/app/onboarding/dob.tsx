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
  StatusBar,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { OnboardingTopBar } from "@/app/components/OnboardingTopBar";
import DateTimePicker from "@react-native-community/datetimepicker";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { fetchWithFallback } from "@/_services/api-config";
import { LinearGradient } from "expo-linear-gradient";
import { DismissKeyboardView } from "@/components/DismissKeyboardView";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function DobScreen() {
  const router = useRouter();
  const [dob, setDob] = useState<Date>(new Date(2000, 0, 1));
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const formatDisplay = (d: Date) =>
    `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;

  const formatForAPI = (d: Date) =>
    `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;

  const onChangeAndroid = (event: any, selected?: Date) => {
    setShowPicker(false);
    if (event.type === "set" && selected) {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      setDob(selected > today ? today : selected);
    }
  };

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

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <DismissKeyboardView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={["#8B0045", "#2D0A1F", "#000000"]} locations={[0, 0.4, 1]} style={styles.gradientBackground} />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <OnboardingTopBar stepIndex={4} totalSteps={5} onBack={() => router.back()} />
        <View style={styles.skipRow}>
          <View style={styles.headerSpacer} />
          <Pressable onPress={() => router.push("/onboarding/social")} style={styles.skipButton}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </Pressable>
        </View>

        <View style={styles.titleSection}>
          <Text style={styles.title}>What's your date of birth?</Text>
          <Text style={styles.subtitle}>We use this to personalise your experience.</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.editButton}>Previous</Text>
          </Pressable>
        </View>

        <Pressable style={styles.dateInput} onPress={() => setShowPicker(true)}>
          <Text style={styles.dateText}>{formatDisplay(dob)}</Text>
          <Ionicons name="calendar-outline" size={22} color="#E91E8C" />
        </Pressable>

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
                      const today = new Date();
                      today.setHours(23, 59, 59, 999);
                      setDob(d > today ? today : d);
                    }
                  }}
                  maximumDate={new Date()}
                  minimumDate={new Date(1900, 0, 1)}
                />
              </View>
            </View>
          </Modal>
        )}
        </ScrollView>

        <View style={styles.bottomContainer}>
          <Pressable onPress={save} disabled={loading} style={styles.buttonWrapper}>
            <LinearGradient
              colors={["#E91E8C", "#DB1A85"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.sendButton, loading && styles.buttonDisabled]}
            >
              <Text style={styles.buttonText}>{loading ? "Saving…" : "Continue"}</Text>
            </LinearGradient>
          </Pressable>
          <View style={styles.homeIndicator} />
        </View>
      </DismissKeyboardView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  gradientBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.5,
  },
  scrollContent: { flexGrow: 1, paddingTop: 60, paddingHorizontal: 24, paddingBottom: 120 },
  skipRow: { flexDirection: "row", alignItems: "center", marginBottom: 20, paddingHorizontal: 8 },
  headerSpacer: { flex: 1 },
  skipButton: { padding: 8 },
  skipButtonText: { fontSize: 15, fontWeight: "600", color: "#E91E8C" },
  titleSection: { marginBottom: 32 },
  title: { fontSize: 32, fontWeight: "700", color: "#FFFFFF", marginBottom: 12 },
  subtitle: { fontSize: 15, lineHeight: 20, color: "rgba(255, 255, 255, 0.6)", marginBottom: 8 },
  editButton: { fontSize: 15, fontWeight: "600", color: "#E91E8C" },
  dateInput: {
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(233, 30, 140, 0.3)",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: { color: "#FFFFFF", fontSize: 16 },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 34,
  },
  buttonWrapper: { marginBottom: 16 },
  sendButton: { height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center" },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 17, fontWeight: "600", color: "#FFFFFF" },
  homeIndicator: { height: 5, width: 134, backgroundColor: "#FFFFFF", borderRadius: 3, alignSelf: "center", marginTop: 12 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: { backgroundColor: "#111", paddingBottom: 20 },
  modalHeader: { alignItems: "flex-end", padding: 12, borderBottomWidth: 1, borderBottomColor: "#333" },
  done: { color: "#E91E8C", fontSize: 16, fontWeight: "600" },
});
