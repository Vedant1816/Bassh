import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import supabasePublic from "@/_services/supabase-public";
import { redirectToRoleHome } from "@/_services/user-role";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validateForm = (): string | null => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail) {
      return "Email is required";
    }

    if (!trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
      return "Please enter a valid email address";
    }

    if (!trimmedPassword) {
      return "Password is required";
    }

    return null;
  };

  const handleLogin = async () => {
    // Validate form before submission
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    try {
      const { data, error } = await supabasePublic.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      });

      if (error) {
        console.error("Login error:", error);
        setError(error.message || "Login failed. Please try again.");
        setLoading(false);
        return;
      }

      // Verify session was created
      const { data: sessionData, error: sessionError } = await supabasePublic.auth.getSession();
      
      if (sessionError || !sessionData.session) {
        console.error("Session error:", sessionError);
        setError("Failed to create session. Please try again.");
        setLoading(false);
        return;
      }

      // Log the access token
      const token = sessionData.session.access_token;
      console.log("🔑 Access Token:", token);
      console.log("Login successful, redirecting based on role...");
      await redirectToRoleHome(router);
    } catch (err: any) {
      console.error("Unexpected login error:", err);
      setError(err.message || "An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        <View style={styles.form}>
          <TextInput
            placeholder="Email address"
            placeholderTextColor="#6B7280"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            placeholder="Password"
            placeholderTextColor="#6B7280"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            autoCapitalize="none"
          />

          <Pressable
            onPress={handleLogin}
            disabled={loading || !email.trim() || !password.trim()}
            style={[styles.button, (loading || !email.trim() || !password.trim()) && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>
              {loading ? "Signing in..." : "Sign In"}
            </Text>
          </Pressable>

          {error && (
            <Text style={styles.error} numberOfLines={3}>
              {error}
            </Text>
          )}
          {__DEV__ && error && (
            <Text style={[styles.error, { fontSize: 10, marginTop: 4 }]}>
              Check console for details
            </Text>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Don't have an account?{" "}
            <Text
              style={styles.footerLink}
              onPress={() => router.push("/signup")}
            >
              Sign up
            </Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(236, 72, 153, 0.3)",
    backgroundColor: "#000000",
    padding: 32,
    shadowColor: "#EC4899",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    color: "#EC4899",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    color: "#9CA3AF",
    marginBottom: 32,
  },
  form: {
    gap: 16,
  },
  input: {
    width: "100%",
    borderRadius: 8,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(236, 72, 153, 0.3)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#FFFFFF",
    fontSize: 16,
  },
  button: {
    width: "100%",
    borderRadius: 8,
    backgroundColor: "#DB2777",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#EC4899",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  error: {
    textAlign: "center",
    fontSize: 14,
    color: "#F87171",
    marginTop: 8,
  },
  footer: {
    marginTop: 24,
  },
  footerText: {
    textAlign: "center",
    fontSize: 14,
    color: "#6B7280",
  },
  footerLink: {
    color: "#EC4899",
    textDecorationLine: "underline",
  },
});