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
import { withAuthHeaders } from "@/_services/auth-fetch";
import { fetchWithFallback } from "@/_services/api-config";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function OtpScreen() {
  const router = useRouter();
  const { phone, email } = useLocalSearchParams<{ phone?: string; email?: string }>();

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
    // Auto-focus first input
    setTimeout(() => {
      inputRefs[0].current?.focus();
    }, 500);
  }, []);

  const handleOtpChange = (value: string, index: number) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs[index + 1].current?.focus();
    }

    // Auto-verify when all 6 digits entered
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

    try {
      setLoading(true);
      setError("");

      const res = await fetchWithFallback(
        `/api/auth/verify-whatsapp-otp`,
        await withAuthHeaders({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            phone: phone || undefined,
            email: email || undefined,
            otp: code 
          }),
        })
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      router.replace("/onboarding/avatar");
    } catch (e: any) {
      setError(e.message || "Invalid OTP");
      setOtp(["", "", "", "", "", ""]);
      inputRefs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="light-content" />

      {/* Gradient Background */}
      <LinearGradient
        colors={["#8B0045", "#2D0A1F", "#000000"]}
        locations={[0, 0.4, 1]}
        style={styles.gradientBackground}
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Welcome to BASH 🎉</Text>
          <Pressable onPress={() => router.replace("/onboarding/avatar")} style={styles.skipButton}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </Pressable>
        </View>

        {/* Title Section */}
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

        {/* OTP Input - Hidden but functional */}
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

          {/* Visual OTP Dots/Boxes */}
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
      </View>

      {/* Bottom Button */}
      <View style={styles.bottomContainer}>
        <Pressable
          onPress={() => verifyOtp()}
          disabled={loading || otp.some((digit) => !digit)}
          style={styles.buttonWrapper}
        >
          <LinearGradient
            colors={["#E91E8C", "#DB1A85"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.sendButton,
              (loading || otp.some((digit) => !digit)) && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.buttonText}>
              {loading ? "Verifying..." : "Send code"}
            </Text>
          </LinearGradient>
        </Pressable>

        {/* Home Indicator */}
        <View style={styles.homeIndicator} />
      </View>
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
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 32,
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

  skipButton: { padding: 8 },
  skipButtonText: { fontSize: 15, fontWeight: "600", color: "#E91E8C" },

  // Title Section
  titleSection: {
    paddingHorizontal: 24,
    marginBottom: 60,
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
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
    color: "rgba(255, 255, 255, 0.6)",
  },

  editButton: {
    fontSize: 15,
    fontWeight: "600",
    color: "#E91E8C",
    marginLeft: 12,
  },

  // OTP Input
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

  // Bottom Container
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