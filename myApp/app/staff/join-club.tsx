import { useState } from "react";
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
import { withAuthHeaders } from "@/_services/auth-fetch";
import { fetchWithFallback } from "@/_services/api-config";
import { DismissKeyboardView } from "@/components/DismissKeyboardView";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function JoinClubScreen() {
  const router = useRouter();
  const [clubToken, setClubToken] = useState("");
  const [post, setPost] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
          colors={["#8B0045", "#2D0A1F", "#000000"]}
          locations={[0, 0.4, 1]}
          style={styles.gradientBackground}
        />

        <View style={styles.content}>
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backIcon}>‹</Text>
            </Pressable>
            <Text style={styles.headerTitle}>Join Club</Text>
            <View style={styles.headerRight} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.titleSection}>
              <View style={styles.iconCircle}>
                <Ionicons name="business-outline" size={36} color="rgba(255,255,255,0.8)" />
              </View>
              <Text style={styles.title}>Join Club</Text>
              <Text style={styles.subtitle}>
                Enter your club&apos;s unique token and your role to request access
              </Text>
            </View>

            <View style={styles.card}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>CLUB TOKEN</Text>
                <Text style={styles.inputHint}>8-character code from your manager</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    placeholder="ABC12345"
                    placeholderTextColor="rgba(255,255,255,0.4)"
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
                <Text style={styles.label}>YOUR ROLE</Text>
                <Text style={styles.inputHint}>e.g., Bouncer, Manager, Bartender</Text>
                <TextInput
                  placeholder="Enter your role"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={post}
                  onChangeText={handlePostChange}
                  style={styles.postInput}
                  editable={!loading}
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
              </View>

              <Pressable
                onPress={handleSubmit}
                disabled={loading || clubToken.trim().length !== 8 || !post.trim()}
                style={styles.buttonWrapper}
              >
                <LinearGradient
                  colors={["#E91E8C", "#DB1A85"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.submitButton,
                    (loading || clubToken.trim().length !== 8 || !post.trim()) && styles.buttonDisabled,
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit Request</Text>
                  )}
                </LinearGradient>
              </Pressable>

              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="warning-outline" size={18} color="#EF4444" style={{ marginRight: 8 }} />
                  <Text style={styles.error}>{error}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.infoBox}>
              <View style={styles.infoHeader}>
                <Ionicons name="information-circle-outline" size={20} color="rgba(255,255,255,0.7)" style={{ marginRight: 8 }} />
                <Text style={styles.infoTitle}>How to get a club token?</Text>
              </View>
              <Text style={styles.infoText}>
                Contact your club manager or owner to receive your unique 8-character access token.
              </Text>
            </View>

            <View style={styles.securityBox}>
              <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.6)" style={{ marginRight: 12 }} />
              <Text style={styles.securityText}>
                Your request will be reviewed by the club manager before access is granted.
              </Text>
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
    backgroundColor: "#000000",
  },
  gradientBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.5,
  },
  content: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 12,
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
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerRight: { width: 32 },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  titleSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.5)",
    marginBottom: 4,
    letterSpacing: 1,
  },
  inputHint: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.4)",
    marginBottom: 10,
  },
  inputWrapper: { position: "relative" },
  tokenInput: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    padding: 18,
    color: "#FFFFFF",
    fontSize: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    letterSpacing: 6,
    textAlign: "center",
    fontWeight: "700",
  },
  checkmark: {
    position: "absolute",
    right: 16,
    top: "50%",
    marginTop: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
  },
  postInput: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    padding: 18,
    color: "#FFFFFF",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  validationHint: {
    fontSize: 12,
    color: "#FBBF24",
    marginTop: 8,
    textAlign: "center",
    fontWeight: "500",
  },
  buttonWrapper: { marginTop: 8 },
  submitButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.5 },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  error: {
    flex: 1,
    color: "#EF4444",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  infoBox: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  infoText: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
    lineHeight: 20,
  },
  securityBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    lineHeight: 18,
  },
  bottomSpacer: { height: 24 },
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
  },
});
