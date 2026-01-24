import { View, TextInput, Pressable, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { API_BASE_URL } from "@/_services/api-config";

export default function AboutYouScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!firstName.trim() || !lastName.trim() || !username.trim()) {
      return;
    }

    setLoading(true);
    try {
      if (!API_BASE_URL) {
        console.error("❌ API_BASE_URL not configured");
        alert("API server not configured. Please set EXPO_PUBLIC_API_URL in .env");
        setLoading(false);
        return;
      }

      const res = await fetch(
        `${API_BASE_URL}/api/users/me`,
        await withAuthHeaders({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            username: username.trim(),
          }),
        })
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        console.error("❌ Failed to save profile:", errorData);
        alert(`Failed to save: ${errorData.error || "Unknown error"}`);
        setLoading(false);
        return;
      }

      console.log("✅ Profile saved successfully");
      router.push("/onboarding/phone");
    } catch (error: any) {
      console.error("❌ Error saving profile:", error);
      alert(`Network error: ${error.message || "Please check your connection"}`);
    } finally {
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
          <Text style={styles.pagination}>1/6</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Lastly, tell us more about yourself</Text>
          <Text style={styles.subtitle}>Please enter your legal name. This information will be used to verify your account.</Text>

          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>First Name</Text>
              <TextInput
                placeholder=""
                placeholderTextColor="#6B7280"
                value={firstName}
                onChangeText={setFirstName}
                style={styles.input}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Last Name</Text>
              <TextInput
                placeholder=""
                placeholderTextColor="#6B7280"
                value={lastName}
                onChangeText={setLastName}
                style={styles.input}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Username</Text>
              <TextInput
                placeholder=""
                placeholderTextColor="#6B7280"
                value={username}
                onChangeText={setUsername}
                style={styles.input}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.buttonRow}>
              <Pressable
                onPress={() => router.back()}
                style={styles.previousButton}
              >
                <Text style={styles.previousButtonText}>Previous</Text>
              </Pressable>
              <Pressable
                onPress={save}
                disabled={loading || !firstName.trim() || !lastName.trim() || !username.trim()}
                style={[
                  styles.continueButton,
                  (loading || !firstName.trim() || !lastName.trim() || !username.trim()) && styles.buttonDisabled
                ]}
              >
                <Text style={styles.continueButtonText}>
                  {loading ? "Saving..." : "Continue"}
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
  input: {
    width: "100%",
    borderRadius: 8,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(236, 72, 153, 0.3)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#FFFFFF",
    fontSize: 16,
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