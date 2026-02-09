import { View, Text, TextInput, Pressable, StyleSheet, StatusBar, Dimensions, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { OnboardingTopBar } from "@/app/components/OnboardingTopBar";
import supabasePublic from "@/_services/supabase-public";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { fetchWithFallback } from "@/_services/api-config";
import { LinearGradient } from "expo-linear-gradient";
import { DismissKeyboardView } from "@/components/DismissKeyboardView";
import { Colors, HeaderGradient, HeaderGradientLocations } from "@/constants/Colors";
import { ThemedButton } from "@/components/ui/ThemedButton";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function VerifyPhoneScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const router = useRouter();

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const verify = async () => {
    setLoading(true);
    setError("");

    const { error } = await supabasePublic.auth.verifyOtp({
      phone,
      token: otp,
      type: "sms",
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    await fetchWithFallback(
      `/api/users/me`,
      await withAuthHeaders({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phone }),
      })
    );

    router.replace("/onboarding/avatar");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <DismissKeyboardView style={styles.container}>
        <StatusBar barStyle="light-content" />

        <LinearGradient
          colors={[...HeaderGradient]}
          locations={[...HeaderGradientLocations]}
          style={styles.gradientBackground}
        />

        <View style={styles.content}>
          <OnboardingTopBar stepIndex={2} totalSteps={5} onBack={() => router.back()} />
          <View style={styles.skipRow}>
            <View style={styles.headerSpacer} />
            <Pressable onPress={() => router.replace("/onboarding/avatar")} style={styles.skipButton}>
              <Text style={styles.skipButtonText}>Skip</Text>
            </Pressable>
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.title}>Enter OTP</Text>
            <Text style={styles.subtitle}>
              Enter the code we sent to {phone}
            </Text>
          </View>

          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
            placeholder="000000"
            placeholderTextColor="rgba(255,255,255,0.4)"
          />

          {error && <Text style={styles.error}>{error}</Text>}
        </View>

        <View style={styles.bottomContainer}>
          <ThemedButton
            onPress={verify}
            loading={loading}
            disabled={loading || otp.length !== 6}
            style={styles.sendButton}
            textStyle={styles.buttonText}
          >
            Verify
          </ThemedButton>
          <View style={styles.homeIndicator} />
        </View>
      </DismissKeyboardView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
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
    paddingHorizontal: 24,
  },
  skipRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  headerSpacer: { flex: 1 },
  skipButton: { padding: 8 },
  skipButtonText: { fontSize: 15, fontWeight: "600", color: Colors.dark.textSecondary },
  titleSection: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: Colors.dark.text,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 20,
    color: Colors.dark.textSecondary,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    color: Colors.dark.text,
    padding: 16,
    borderRadius: 16,
    fontSize: 20,
    textAlign: "center",
    letterSpacing: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  error: {
    color: Colors.dark.error,
    marginTop: 12,
    fontSize: 14,
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 34,
  },
  sendButton: {
    height: 56,
    borderRadius: 28,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  homeIndicator: {
    height: 5,
    width: 134,
    backgroundColor: "#FFFFFF",
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 12,
  },
});
