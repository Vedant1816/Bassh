import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import supabasePublic from "@/_services/supabase-public";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { fetchWithFallback } from "@/_services/api-config";

export default function StaffSignupScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSignup = async () => {
    console.log("👤 [STAFF-SIGNUP] Signup initiated");
    console.log("👤 [STAFF-SIGNUP] Email:", email.trim());
    console.log("👤 [STAFF-SIGNUP] Password length:", password.length);

    if (!email.trim() || !password.trim()) {
      console.warn("⚠️ [STAFF-SIGNUP] Validation failed: Email or password missing");
      setMessage("Email and password are required");
      return;
    }

    setLoading(true);
    setMessage("");

    /* ---------------- SUPABASE SIGNUP ---------------- */
    console.log("🔐 [STAFF-SIGNUP] Creating Supabase auth account...");

    const { data: signupData, error } = await supabasePublic.auth.signUp({
      email: email.trim(),
      password: password.trim(),
    });

    if (error) {
      console.error("❌ [STAFF-SIGNUP] Supabase signup error:", {
        message: error.message,
        status: error.status,
        name: error.name
      });
      setMessage(error.message);
      setLoading(false);
      return;
    }

    console.log("✅ [STAFF-SIGNUP] Supabase account created:", {
      userId: signupData?.user?.id,
      email: signupData?.user?.email,
      session: !!signupData?.session
    });

    /* ---------------- CREATE PROFILE (BACKEND) ---------------- */
    console.log("📝 [STAFF-SIGNUP] Creating staff profile in backend...");

    try {
      const authHeaders = await withAuthHeaders({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          role: "staff",
        }),
      });

      console.log("📤 [STAFF-SIGNUP] Sending request to /api/users");
      console.log("📤 [STAFF-SIGNUP] Request body:", {
        email: email.trim(),
        role: "staff"
      });
      console.log("📤 [STAFF-SIGNUP] Auth headers present:", !!authHeaders.headers?.Authorization);

      const res = await fetchWithFallback(
        `/api/users`,
        authHeaders
      );

      console.log("📥 [STAFF-SIGNUP] Response status:", res.status);
      console.log("📥 [STAFF-SIGNUP] Response ok:", res.ok);

      if (!res.ok) {
        const err = await res.json();
        console.error("❌ [STAFF-SIGNUP] Profile creation failed:", {
          status: res.status,
          error: err
        });
        setMessage("Account created, but profile setup failed.");
      } else {
        const responseData = await res.json();
        console.log("✅ [STAFF-SIGNUP] Profile created successfully:", responseData);
      }
    } catch (err: any) {
      console.error("❌ [STAFF-SIGNUP] API request error:", {
        message: err.message,
        stack: err.stack
      });
      console.warn("⚠️ [STAFF-SIGNUP] API unreachable, continuing anyway");
    }

    /* ---------------- REDIRECT ---------------- */
    console.log("🔄 [STAFF-SIGNUP] Redirecting to /staff");
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