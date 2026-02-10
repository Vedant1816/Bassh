import { View, TextInput, Pressable, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, StatusBar, Dimensions } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { OnboardingTopBar } from "@/app/components/OnboardingTopBar";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { fetchWithFallback } from "@/_services/api-config";
import { LinearGradient } from "expo-linear-gradient";
import { DismissKeyboardView } from "@/components/DismissKeyboardView";
import { Colors, HeaderGradient, HeaderGradientLocations } from "@/constants/Colors";
import { ThemedButton } from "@/components/ui/ThemedButton";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function SocialScreen() {
  const router = useRouter();
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [loading, setLoading] = useState(false);

  const finish = async () => {
    setLoading(true);
    try {
      await fetchWithFallback(
        `/api/users/me`,
        await withAuthHeaders({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instagram_handle: instagram.trim() || null,
            twitter_handle: twitter.trim() || null,
            onboarding_completed: true,
          }),
        })
      );
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Error completing onboarding:", error);
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <DismissKeyboardView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={[...HeaderGradient]}
          locations={[...HeaderGradientLocations]}
          style={styles.gradientBackground}
        />

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <OnboardingTopBar stepIndex={5} totalSteps={5} onBack={() => router.back()} />
          <View style={styles.skipRow}>
            <View style={styles.headerSpacer} />
            <Pressable
              onPress={async () => {
                try {
                  await fetchWithFallback(
                    `/api/users/me`,
                    await withAuthHeaders({
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ onboarding_completed: true }),
                    })
                  );
                  router.replace("/(tabs)");
                } catch (e) {
                  router.replace("/(tabs)");
                }
              }}
              style={styles.skipButton}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </Pressable>
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.title}>Are you on social media?</Text>
            <Text style={styles.subtitle}>
              Please share your social media handles for more connections and to socialize in events.
            </Text>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.editButton}>Previous</Text>
            </Pressable>
          </View>

          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Instagram Handle</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputPrefix}>@</Text>
                <TextInput
                  placeholder="profile_name"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={instagram}
                  onChangeText={setInstagram}
                  style={styles.input}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Twitter handle</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputPrefix}>@</Text>
                <TextInput
                  placeholder="profile_name"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={twitter}
                  onChangeText={setTwitter}
                  style={styles.input}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>
            <Pressable style={styles.addButton}>
              <Ionicons name="add" size={20} color={Colors.dark.primary} />
              <Text style={styles.addButtonText}>Add another social handle</Text>
            </Pressable>
          </View>
        </ScrollView>

        <View style={styles.bottomContainer}>
          <ThemedButton
            onPress={finish}
            loading={loading}
            style={styles.sendButton}
            textStyle={styles.buttonText}
          >
            Continue
          </ThemedButton>
          <View style={styles.homeIndicator} />
        </View>
      </DismissKeyboardView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
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
  skipButtonText: { fontSize: 15, fontWeight: "600", color: Colors.dark.primary },
  titleSection: { marginBottom: 32 },
  title: { fontSize: 32, fontWeight: "700", color: Colors.dark.text, marginBottom: 12 },
  subtitle: { fontSize: 15, lineHeight: 20, color: Colors.dark.textSecondary, marginBottom: 8 },
  editButton: { fontSize: 15, fontWeight: "600", color: Colors.dark.primary },
  form: { gap: 20 },
  inputWrapper: { gap: 8 },
  inputLabel: { fontSize: 14, color: Colors.dark.text, fontWeight: "500" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 16,
  },
  inputPrefix: { color: "rgba(255,255,255,0.6)", fontSize: 16, marginRight: 4 },
  input: { flex: 1, paddingVertical: 16, color: Colors.dark.text, fontSize: 16 },
  addButton: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12 },
  addButtonText: { color: Colors.dark.primary, fontSize: 14, fontWeight: "500" },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 34,
  },
  sendButton: { height: 56, borderRadius: 28 },
  buttonText: { fontSize: 17, fontWeight: "600", color: "#FFFFFF" },
  homeIndicator: {
    height: 5,
    width: 134,
    backgroundColor: "#FFFFFF",
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 12,
    opacity: 0.3,
  },
});
