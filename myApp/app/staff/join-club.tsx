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
} from "react-native";
import { useRouter } from "expo-router";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { fetchWithFallback } from "@/_services/api-config";
import { Colors } from "@/constants/Colors";
import { DismissKeyboardView } from "@/components/DismissKeyboardView";

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
        "✅ Request Submitted!",
        `You've requested to join ${data.data?.club_name} as ${data.data?.post}.\n\nYour request is pending approval from the club manager.`,
        [
          {
            text: "OK",
            onPress: () => router.replace("/staff"),
          },
        ]
      );
    } catch (err: any) {
      setError(err.message || "Network error. Please check your connection and try again.");
      setLoading(false);
    }
  };

  const handleTokenChange = (text: string) => {
    const formatted = text.toUpperCase().slice(0, 8);
    setClubToken(formatted);
    setError("");
  };

  const handlePostChange = (text: string) => {
    setPost(text);
    setError("");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <DismissKeyboardView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Text style={styles.emoji}>🏢</Text>
          </View>
          <Text style={styles.title}>Join Club</Text>
          <Text style={styles.subtitle}>
            Enter your club's unique token and your role to request access
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          {/* Club Token Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>CLUB TOKEN</Text>
            <Text style={styles.inputHint}>8-character code from your manager</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                placeholder="ABC12345"
                placeholderTextColor={Colors.dark.textTertiary}
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
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </View>
            {clubToken.length > 0 && clubToken.length < 8 && (
              <Text style={styles.validationHint}>
                {8 - clubToken.length} more character{clubToken.length !== 7 ? "s" : ""} needed
              </Text>
            )}
          </View>

          {/* Post/Role Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>YOUR ROLE</Text>
            <Text style={styles.inputHint}>e.g., Bouncer, Manager, Bartender</Text>
            <TextInput
              placeholder="Enter your role"
              placeholderTextColor={Colors.dark.textTertiary}
              value={post}
              onChangeText={handlePostChange}
              style={styles.postInput}
              editable={!loading}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </View>

          {/* Submit Button */}
          <Pressable
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.submitButton,
              (loading || clubToken.trim().length !== 8 || !post.trim()) &&
                styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
            disabled={loading || clubToken.trim().length !== 8 || !post.trim()}
          >
            {loading ? (
              <ActivityIndicator color={Colors.dark.text} />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Submit Request</Text>
                <Text style={styles.submitButtonArrow}>→</Text>
              </>
            )}
          </Pressable>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : null}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <View style={styles.infoHeader}>
            <Text style={styles.infoIcon}>💡</Text>
            <Text style={styles.infoTitle}>How to get a club token?</Text>
          </View>
          <Text style={styles.infoText}>
            Contact your club manager or owner to receive your unique 8-character access token.
          </Text>
        </View>

        {/* Security Note */}
        <View style={styles.securityBox}>
          <Text style={styles.securityIcon}>🔒</Text>
          <Text style={styles.securityText}>
            Your request will be reviewed by the club manager before access is granted.
          </Text>
        </View>
      </ScrollView>
      </DismissKeyboardView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.dark.surface,
    borderWidth: 2,
    borderColor: Colors.dark.borderLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emoji: {
    fontSize: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: Colors.dark.primary,
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.dark.borderLight,
    marginBottom: 20,
    shadowColor: Colors.dark.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.dark.textSecondary,
    marginBottom: 4,
    letterSpacing: 1,
  },
  inputHint: {
    fontSize: 12,
    color: Colors.dark.textTertiary,
    marginBottom: 10,
  },
  inputWrapper: {
    position: "relative",
  },
  tokenInput: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 18,
    color: Colors.dark.text,
    fontSize: 22,
    borderWidth: 2,
    borderColor: Colors.dark.border,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
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
    backgroundColor: Colors.dark.success,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmarkText: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: "700",
  },
  postInput: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 18,
    color: Colors.dark.text,
    fontSize: 16,
    borderWidth: 2,
    borderColor: Colors.dark.border,
  },
  validationHint: {
    fontSize: 12,
    color: Colors.dark.warning,
    marginTop: 8,
    textAlign: "center",
    fontWeight: "500",
  },
  submitButton: {
    backgroundColor: Colors.dark.primary,
    borderRadius: 12,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: Colors.dark.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  submitButtonArrow: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.errorBg,
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.dark.errorBorder,
  },
  errorIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  error: {
    flex: 1,
    color: Colors.dark.error,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  infoBox: {
    backgroundColor: Colors.dark.infoBg,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.dark.infoBorder,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.dark.info,
  },
  infoText: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    lineHeight: 20,
  },
  securityBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.successBg,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.dark.successBorder,
  },
  securityIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    color: Colors.dark.textSecondary,
    lineHeight: 18,
  },
});