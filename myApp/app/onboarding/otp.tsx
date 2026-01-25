import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { API_BASE_URL } from "@/_services/api-config";

export default function OtpScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const verifyOtp = async () => {
    if (otp.length !== 6) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch(
        `${API_BASE_URL}/api/auth/verify-whatsapp-otp`,
        await withAuthHeaders({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, otp }),
        })
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      router.replace("/onboarding/avatar");
    } catch (e: any) {
      setError(e.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter OTP</Text>
      <Text style={styles.subtitle}>
        Sent to WhatsApp {phone}
      </Text>

      <TextInput
        value={otp}
        onChangeText={(t) => setOtp(t.replace(/\D/g, ""))}
        keyboardType="number-pad"
        maxLength={6}
        style={styles.otp}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        onPress={verifyOtp}
        disabled={loading}
        style={styles.button}
      >
        <Text style={styles.buttonText}>
          {loading ? "Verifying…" : "Verify"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 24 },
  title: { fontSize: 28, fontWeight: "700", color: "#fff" },
  subtitle: { color: "#9CA3AF", marginVertical: 12 },
  otp: {
    marginTop: 24,
    backgroundColor: "#111",
    color: "#fff",
    fontSize: 24,
    letterSpacing: 10,
    textAlign: "center",
    padding: 16,
    borderRadius: 12,
  },
  button: {
    marginTop: 32,
    backgroundColor: "#EC4899",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  error: { color: "#EF4444", marginTop: 12 },
});