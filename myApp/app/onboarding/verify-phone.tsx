import { View, Text, TextInput, Pressable, StyleSheet, StatusBar, Dimensions, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { OnboardingTopBar } from "@/app/components/OnboardingTopBar";
import supabasePublic from "@/_services/supabase-public";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { fetchWithFallback } from "@/_services/api-config";
import { LinearGradient } from "expo-linear-gradient";
import { DismissKeyboardView } from "@/components/DismissKeyboardView";

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
          colors={["#8B0045", "#2D0A1F", "#000000"]}
          locations={[0, 0.4, 1]}
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
          <Pressable
            onPress={verify}
            disabled={loading || otp.length !== 6}
            style={styles.buttonWrapper}
          >
            <LinearGradient
              colors={["#E91E8C", "#DB1A85"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.sendButton,
                (loading || otp.length !== 6) && styles.buttonDisabled,
              ]}
            >
              <Text style={styles.buttonText}>
                {loading ? "Verifying..." : "Verify"}
              </Text>
            </LinearGradient>
          </Pressable>
          <View style={styles.homeIndicator} />
        </View>
      </DismissKeyboardView>
    </KeyboardAvoidingView>
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
  skipButtonText: { fontSize: 15, fontWeight: "600", color: "#E91E8C" },
  titleSection: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 20,
    color: "rgba(255, 255, 255, 0.6)",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.1)",
    color: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    fontSize: 20,
    textAlign: "center",
    letterSpacing: 6,
  },
  error: {
    color: "#F87171",
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
  buttonWrapper: {
    marginBottom: 16,
  },
  sendButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
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
