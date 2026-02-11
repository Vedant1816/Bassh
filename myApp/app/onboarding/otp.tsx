import { useState, useRef, useEffect } from "react";
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
import { useLocalSearchParams, useRouter } from "expo-router";
import { DismissKeyboardView } from "@/components/DismissKeyboardView";
import { OnboardingTopBar } from "@/app/components/OnboardingTopBar";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { fetchWithFallback } from "@/_services/api-config";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, HeaderGradient, HeaderGradientLocations } from "@/constants/Colors";
import { ThemedButton } from "@/components/ui/ThemedButton";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function OtpScreen() {
  const router = useRouter();
  const { phone, email } = useLocalSearchParams<{
    phone?: string;
    email?: string;
  }>();

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const inputRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  useEffect(() => {
    setTimeout(() => {
      inputRefs[0].current?.focus();
    }, 500);
  }, []);

  const handleOtpChange = (value: string, index: number) => {
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs[index + 1].current?.focus();
    }

    if (newOtp.every((digit) => digit !== "") && index === 5) {
      verifyOtp(newOtp.join(""));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = "";
      setOtp(newOtp);
      inputRefs[index - 1].current?.focus();
    }
  };

  const verifyOtp = async (otpCode?: string) => {
    const code = otpCode || otp.join("");
    if (code.length !== 6) return;

    if (!phone) {
      setError("Phone number is required");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Step 1: Verify OTP via API (OTP is logged in server console when sent)
      const verifyRes = await fetchWithFallback(`/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp: code }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || "Invalid or expired OTP");

      // Step 2: Save phone to customer table (use existing session)
      const res = await fetchWithFallback(
        `/api/auth/verify-whatsapp-otp`,
        await withAuthHeaders({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
        })
      );
      const responseData = await res.json();
      if (!res.ok) throw new Error(responseData.error || "Failed to save phone");

      router.replace("/onboarding/avatar");
    } catch (e: any) {
      const errorMessage = e.message || "Invalid OTP. Please try again.";
      setError(errorMessage);
      setOtp(["", "", "", "", "", ""]);
      inputRefs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <DismissKeyboardView>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
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
            <Text style={styles.title}>We just sent an SMS</Text>
            <View style={styles.subtitleRow}>
              <Text style={styles.subtitle}>
                Enter the security code we sent to{"\n"}
                {email || phone || "your contact"}
              </Text>
              <Pressable onPress={() => router.back()}>
                <Text style={styles.editButton}>Edit</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.otpContainer}>
            <TextInput
              value={otp.join("")}
              onChangeText={(text) => {
                const digits = text.replace(/\D/g, "").slice(0, 6).split("");
                const newOtp = [...Array(6)].map((_, i) => digits[i] || "");
                setOtp(newOtp);

                if (digits.length === 6) {
                  verifyOtp(digits.join(""));
                }
              }}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              style={styles.hiddenInput}
              selectionColor="transparent"
            />

            <View style={styles.otpDotsContainer}>
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <View
                  key={index}
                  style={[
                    styles.otpDot,
                    otp[index] && styles.otpDotFilled,
                  ]}
                />
              ))}
            </View>
          </View>

          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : null}
        </View>

        <View style={styles.bottomContainer}>
          <ThemedButton
            onPress={() => verifyOtp()}
            loading={loading}
            disabled={loading || otp.some((digit) => !digit)}
            style={styles.sendButton}
            textStyle={styles.buttonText}
          >
            Send code
          </ThemedButton>

          <View style={styles.homeIndicator} />
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
    paddingHorizontal: 24,
    marginBottom: 60,
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    color: Colors.dark.text,
    marginBottom: 12,
  },

  subtitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  subtitle: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    color: Colors.dark.textSecondary,
  },

  editButton: {
    fontSize: 15,
    fontWeight: "600",
    color: "#E91E8C",
    marginLeft: 12,
  },

  otpContainer: {
    paddingHorizontal: 24,
    alignItems: "center",
  },

  hiddenInput: {
    position: "absolute",
    opacity: 0,
    width: 1,
    height: 1,
  },

  otpDotsContainer: {
    flexDirection: "row",
    gap: 16,
    paddingVertical: 20,
  },

  otpDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
    backgroundColor: "transparent",
  },

  otpDotFilled: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FFFFFF",
  },

  error: {
    color: "#F87171",
    marginTop: 12,
    fontSize: 14,
    paddingHorizontal: 24,
    textAlign: "center",
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