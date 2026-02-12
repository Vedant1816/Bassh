import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  StatusBar,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { OnboardingTopBar } from "@/app/components/OnboardingTopBar";
import { fetchWithFallback } from "@/_services/api-config";
import { LinearGradient } from "expo-linear-gradient";
import { DismissKeyboardView } from "@/components/DismissKeyboardView";
import { Colors, HeaderGradient, HeaderGradientLocations } from "@/constants/Colors";
import { ThemedButton } from "@/components/ui/ThemedButton";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function PhoneScreen() {
  const router = useRouter();

  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sendOtp = async () => {
    setError("");

    if (phone.length !== 10) {
      setError("Enter valid 10 digit number");
      return;
    }

    const fullPhone = `${countryCode}${phone}`;

    try {
      setLoading(true);

      const res = await fetchWithFallback(`/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      router.push({
        pathname: "/onboarding/otp",
        params: { phone: fullPhone },
      });
    } catch (e: any) {
      setError(e.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
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
            <Pressable onPress={() => router.push("/onboarding/avatar")} style={styles.skipButton}>
              <Text style={styles.skipButtonText}>Skip</Text>
            </Pressable>
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.title}>Verify your phone</Text>
            <Text style={styles.subtitle}>
              We'll send you an SMS verification code
            </Text>
          </View>

          <View style={styles.row}>
            <TextInput
              value={countryCode}
              onChangeText={setCountryCode}
              style={styles.country}
              keyboardType="phone-pad"
              placeholderTextColor="rgba(255,255,255,0.5)"
            />
            <TextInput
              value={phone}
              onChangeText={(t) => setPhone(t.replace(/\D/g, ""))}
              style={styles.phoneInput}
              keyboardType="phone-pad"
              maxLength={10}
              placeholder="Phone number"
              placeholderTextColor="rgba(255,255,255,0.5)"
            />
          </View>

          {error && <Text style={styles.error}>{error}</Text>}
        </View>

        <View style={styles.bottomContainer}>
          <ThemedButton
            onPress={sendOtp}
            loading={loading}
            disabled={loading || phone.length !== 10}
            style={styles.sendButton}
            textStyle={styles.buttonText}
          >
            Send OTP
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
  skipButtonText: { fontSize: 15, fontWeight: "600", color: Colors.dark.primary },
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
  row: {
    flexDirection: "row",
    gap: 12,
  },
  country: {
    width: 80,
    backgroundColor: "rgba(255,255,255,0.08)",
    color: Colors.dark.text,
    borderRadius: 16,
    padding: 16,
    textAlign: "center",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  phoneInput: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    color: Colors.dark.text,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
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