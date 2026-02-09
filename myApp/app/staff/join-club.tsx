import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { withAuthHeaders, authFetch } from "@/_services/auth-fetch";
import { fetchWithFallback } from "@/_services/api-config";
import { DismissKeyboardView } from "@/components/DismissKeyboardView";
import { Colors, HeaderGradient, HeaderGradientLocations } from "@/constants/Colors";
import { ThemedButton } from "@/components/ui/ThemedButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function JoinClubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [clubToken, setClubToken] = useState("");
  const [post, setPost] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    checkStaffStatus();
  }, []);

  const checkStaffStatus = async () => {
    try {
      const res = await authFetch("/api/staff/me");
      const data = await res.json();
      if (res.ok && data?.club_status === "approved") {
        router.replace("/staff");
      }
    } catch (_) { }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await authFetch("/api/auth/logout", { method: "POST" });
          } catch (_) { }
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const handleSubmit = async () => {
    if (!clubToken.trim()) {
      setError("Please enter a club token");
      return;
    }
    if (!post.trim()) {
      setError("Please enter your role/position");
      return;
    }
    const normalizedToken = clubToken.trim().toUpperCase();
    if (normalizedToken.length !== 8) {
      setError("Club token must be exactly 8 characters");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetchWithFallback(
        `/api/staff/join-club`,
        await withAuthHeaders({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            club_token: normalizedToken,
            post: post.trim(),
          }),
        })
      );

      const data = await res.json().catch(() => ({ error: "Invalid response from server" }));

      if (!res.ok) {
        setError(data.error || "Failed to join club");
        setLoading(false);
        return;
      }

      Alert.alert(
        "Request Submitted",
        `You've requested to join ${data.data?.club_name} as ${data.data?.post}. Your request is pending approval from the club manager.`,
        [{ text: "OK", onPress: () => router.replace("/staff") }]
      );
    } catch (err: any) {
      setError(err.message || "Network error. Please try again.");
      setLoading(false);
    }
  };

  const handleTokenChange = (text: string) => {
    setClubToken(text.toUpperCase().slice(0, 8));
    setError("");
  };

  const handlePostChange = (text: string) => {
    setPost(text);
    setError("");
  };

  return (
    <DismissKeyboardView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <StatusBar barStyle="light-content" />

        <LinearGradient
          colors={[...HeaderGradient]}
          locations={[...HeaderGradientLocations]}
          style={styles.background}
        />

        <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backIcon}>‹</Text>
            </Pressable>
            <Text style={styles.headerTitle}>Join Club</Text>
            <View style={styles.headerRight}>
              <Pressable onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={24} color="#FFF" />
              </Pressable>
            </View>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.titleSection}>
              <View style={styles.iconCircle}>
                <Ionicons name="business-outline" size={36} color={Colors.dark.text} />
              </View>
              <Text style={styles.title}>Apply for Access</Text>
              <Text style={styles.subtitle}>
                Enter your club's token to link your staff profile
              </Text>
            </View>

            <View style={styles.formCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Club Token</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    placeholder="ABC12345"
                    placeholderTextColor={Colors.dark.textSecondary}
                    value={clubToken}
                    onChangeText={handleTokenChange}
                    style={styles.tokenInput}
                    editable={!loading}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={8}
                  />
                  {clubToken.length === 8 && (
                    <View style={styles.checkmark}>
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    </View>
                  )}
                </View>
                {clubToken.length > 0 && clubToken.length < 8 && (
                  <Text style={styles.validationHint}>
                    {8 - clubToken.length} more character{clubToken.length !== 7 ? "s" : ""} needed
                  </Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Your Position</Text>
                <TextInput
                  placeholder="e.g. Manager, Security, Bartender"
                  placeholderTextColor={Colors.dark.textSecondary}
                  value={post}
                  onChangeText={handlePostChange}
                  style={styles.postInput}
                  editable={!loading}
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="warning-outline" size={18} color={Colors.dark.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <ThemedButton
                onPress={handleSubmit}
                loading={loading}
                disabled={loading || clubToken.trim().length !== 8 || !post.trim()}
                style={styles.submitButton}
              >
                Submit Request
              </ThemedButton>
            </View>

            <View style={styles.infoSection}>
              <View style={styles.infoCard}>
                <Ionicons name="information-circle-outline" size={20} color={Colors.dark.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Where is my token?</Text>
                  <Text style={styles.infoText}>
                    Each club has a unique 8-character code. Ask your manager or owner for yours.
                  </Text>
                </View>
              </View>

              <View style={styles.securityNote}>
                <Ionicons name="lock-closed-outline" size={16} color={Colors.dark.textSecondary} />
                <Text style={styles.securityText}>
                  Your application must be manually approved by club management.
                </Text>
              </View>
            </View>

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </View>

        <View style={styles.homeIndicator}>
          <View style={styles.homeIndicatorBar} />
        </View>
      </KeyboardAvoidingView>
    </DismissKeyboardView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 44,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  backIcon: {
    fontSize: 32,
    color: "#FFFFFF",
    fontWeight: "300",
    marginLeft: -4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginRight: 32, // Balance back button
  },
  headerRight: { width: 32 },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  titleSection: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  formCard: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.dark.text,
    marginBottom: 12,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  inputWrapper: { position: "relative" },
  tokenInput: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 20,
    padding: 20,
    color: "#FFFFFF",
    fontSize: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    letterSpacing: 6,
    textAlign: "center",
    fontWeight: "800",
  },
  checkmark: {
    position: "absolute",
    right: 16,
    top: "50%",
    marginTop: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.dark.success,
    alignItems: "center",
    justifyContent: "center",
  },
  postInput: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 20,
    padding: 20,
    color: "#FFFFFF",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  validationHint: {
    fontSize: 12,
    color: "#FBBF24",
    marginTop: 10,
    textAlign: "center",
    fontWeight: "600",
  },
  submitButton: {
    height: 56,
    marginTop: 8,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  errorText: {
    flex: 1,
    color: Colors.dark.error,
    fontSize: 13,
    marginLeft: 10,
    fontWeight: "600",
  },
  infoSection: {
    gap: 16,
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "rgba(59, 130, 246, 0.08)",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.15)",
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    lineHeight: 18,
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  securityText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginLeft: 8,
    textAlign: "center",
  },
  bottomSpacer: { height: 40 },
  homeIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 34,
    alignItems: "center",
  },
  homeIndicatorBar: {
    width: 134,
    height: 5,
    backgroundColor: "#FFFFFF",
    borderRadius: 3,
    opacity: 0.2,
  },
});
