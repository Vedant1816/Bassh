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
import { fetchWithFallback } from "@/_services/api-config";
import { LinearGradient } from "expo-linear-gradient";

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

      const res = await fetchWithFallback(`/api/auth/send-whatsapp-otp`, {
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
      setError(e.message || "Failed to send OTP");
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
          <Text style={styles.headerTitle}>Welcome to BASH</Text>
          <Pressable onPress={() => router.push("/onboarding/avatar")} style={styles.skipButton}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </Pressable>
        </View>

        <View style={styles.titleSection}>
          <Text style={styles.title}>Verify your phone</Text>
          <Text style={styles.subtitle}>
            We'll send you a WhatsApp verification code
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
        <Pressable
          onPress={sendOtp}
          disabled={loading || phone.length !== 10}
          style={styles.buttonWrapper}
        >
          <LinearGradient
            colors={["#E91E8C", "#DB1A85"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.sendButton,
              (loading || phone.length !== 10) && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.buttonText}>
              {loading ? "Sending…" : "Send OTP"}
            </Text>
          </LinearGradient>
        </Pressable>
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
    paddingHorizontal: 24,
  },
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
  row: {
    flexDirection: "row",
    gap: 12,
  },
  country: {
    width: 80,
    backgroundColor: "rgba(255,255,255,0.1)",
    color: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    textAlign: "center",
    fontSize: 16,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    color: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
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
