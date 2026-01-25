import { View, TextInput, Pressable, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { API_BASE_URL } from "@/_services/api-config";

export default function SocialScreen() {
  const router = useRouter();
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [loading, setLoading] = useState(false);

  const finish = async () => {
    setLoading(true);
    try {
      await fetch(
        `${API_BASE_URL}/api/users/me`,
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Welcome to BASH</Text>
          <Text style={styles.pagination}>5/6</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Are you on social media?</Text>
          <Text style={styles.subtitle}>Please share your social media handles for more connections and to socialize in events.</Text>

          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Instagram Handle</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputPrefix}>@</Text>
                <TextInput
                  placeholder="profile_name"
                  placeholderTextColor="#6B7280"
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
                  placeholderTextColor="#6B7280"
                  value={twitter}
                  onChangeText={setTwitter}
                  style={styles.input}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <Pressable style={styles.addButton}>
              <Ionicons name="add" size={20} color="#EC4899" />
              <Text style={styles.addButtonText}>Add another social handle</Text>
            </Pressable>

            <View style={styles.buttonRow}>
              <Pressable
                onPress={() => router.back()}
                style={styles.previousButton}
              >
                <Text style={styles.previousButtonText}>Previous</Text>
              </Pressable>
              <Pressable
                onPress={finish}
                disabled={loading}
                style={[styles.continueButton, loading && styles.buttonDisabled]}
              >
                <Text style={styles.continueButtonText}>
                  {loading ? "Finishing..." : "Continue"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 32,
    paddingHorizontal: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },
  pagination: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "500",
    width: 40,
    textAlign: "right",
  },
  card: {
    width: "100%",
    borderRadius: 16,
    backgroundColor: "#000000",
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 32,
    lineHeight: 20,
  },
  form: {
    gap: 20,
  },
  inputWrapper: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(236, 72, 153, 0.3)",
    paddingHorizontal: 16,
  },
  inputPrefix: {
    color: "#9CA3AF",
    fontSize: 16,
    marginRight: 4,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    color: "#FFFFFF",
    fontSize: 16,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  addButtonText: {
    color: "#EC4899",
    fontSize: 14,
    fontWeight: "500",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  previousButton: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  previousButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  continueButton: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: "#DB2777",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#EC4899",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});