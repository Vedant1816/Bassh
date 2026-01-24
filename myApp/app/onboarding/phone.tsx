import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "@/_services/api-config";

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

      const res = await fetch(`${API_BASE_URL}/api/auth/send-whatsapp-otp`, {
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
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>

      <Text style={styles.title}>Verify your phone</Text>
      <Text style={styles.subtitle}>
        We’ll send you a WhatsApp verification code
      </Text>

      <View style={styles.row}>
        <TextInput
          value={countryCode}
          onChangeText={setCountryCode}
          style={styles.country}
          keyboardType="phone-pad"
        />
        <TextInput
          value={phone}
          onChangeText={(t) => setPhone(t.replace(/\D/g, ""))}
          style={styles.phone}
          keyboardType="phone-pad"
          maxLength={10}
          placeholder="Phone number"
          placeholderTextColor="#777"
        />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        onPress={sendOtp}
        disabled={loading}
        style={styles.button}
      >
        <Text style={styles.buttonText}>
          {loading ? "Sending…" : "Send OTP"}
        </Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 24 },
  back: { marginBottom: 40 },
  title: { fontSize: 28, fontWeight: "700", color: "#fff" },
  subtitle: { color: "#9CA3AF", marginVertical: 12 },
  row: { flexDirection: "row", gap: 12, marginTop: 24 },
  country: {
    width: 80,
    backgroundColor: "#111",
    color: "#fff",
    borderRadius: 10,
    padding: 14,
    textAlign: "center",
  },
  phone: {
    flex: 1,
    backgroundColor: "#111",
    color: "#fff",
    borderRadius: 10,
    padding: 14,
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