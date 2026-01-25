import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import supabasePublic from "@/_services/supabase-public";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { API_BASE_URL } from "@/_services/api-config";

export default function StaffSignupScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSignup = async () => {
    if (!email.trim() || !password.trim()) {
      setMessage("Email and password are required");
      return;
    }

    setLoading(true);
    setMessage("");

    /* ---------------- SUPABASE SIGNUP ---------------- */

    const { error } = await supabasePublic.auth.signUp({
      email: email.trim(),
      password: password.trim(),
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    /* ---------------- CREATE PROFILE (BACKEND) ---------------- */

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/users`,
        await withAuthHeaders({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            role: "staff",
          }),
        })
      );

      if (!res.ok) {
        const err = await res.json();
        console.error("❌ Profile creation failed:", err);
        setMessage("Account created, but profile setup failed.");
      }
    } catch (err) {
      console.warn("⚠️ API unreachable, continuing anyway");
    }

    /* ---------------- REDIRECT ---------------- */

    router.replace("/staff");
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Staff Signup</Text>

        <TextInput
          placeholder="Email"
          placeholderTextColor="#777"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          autoCapitalize="none"
        />

        <TextInput
          placeholder="Password"
          placeholderTextColor="#777"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />

        <Pressable
          onPress={handleSignup}
          disabled={loading}
          style={[styles.button, loading && styles.disabled]}
        >
          <Text style={styles.buttonText}>
            {loading ? "Creating..." : "Create Account"}
          </Text>
        </Pressable>

        {message ? <Text style={styles.error}>{message}</Text> : null}
      </View>
    </View>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#111",
    padding: 24,
    borderRadius: 12,
  },
  title: {
    color: "#EC4899",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#1F1F1F",
    color: "#fff",
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#EC4899",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  error: {
    color: "#F87171",
    marginTop: 10,
    textAlign: "center",
  },
});