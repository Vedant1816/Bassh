import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import supabasePublic from "@/_services/supabase-public";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { API_BASE_URL } from "@/_services/api-config";

export default function SignupScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSignup = async () => {
    if (!email.trim() || !password.trim()) {
      setMessage("Email and password required");
      return;
    }

    setLoading(true);
    setMessage("");

    /* -------- SUPABASE AUTH -------- */

    const { error } = await supabasePublic.auth.signUp({
      email: email.trim(),
      password: password.trim(),
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    /* -------- CREATE USER PROFILE -------- */

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
        console.error("Profile creation failed:", err);
      }
    } catch (e) {
      console.warn("API unreachable, continuing anyway");
    }

    /* -------- REDIRECT TO STAFF CHECK -------- */

    router.replace("/staff");
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Create account</Text>

        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          autoCapitalize="none"
        />

        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />

        <Pressable
          onPress={handleSignup}
          disabled={loading}
          style={styles.button}
        >
          <Text style={styles.buttonText}>
            {loading ? "Creating..." : "Sign up"}
          </Text>
        </Pressable>

        {message ? <Text style={styles.error}>{message}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", backgroundColor: "#000" },
  card: { padding: 24 },
  title: { color: "#fff", fontSize: 24, marginBottom: 16 },
  input: {
    backgroundColor: "#111",
    color: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#EC4899",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  error: { color: "red", marginTop: 8 },
});