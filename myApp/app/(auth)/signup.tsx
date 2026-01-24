import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Platform } from "react-native";
import supabasePublic from "@/_services/supabase-public";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { API_BASE_URL, isApiUrlConfiguredForDevice } from "@/_services/api-config";
import { redirectToRoleHome } from "@/_services/user-role";

export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

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

    if (trimmedPassword.length < 6) {
      return "Password must be at least 6 characters";
    }

    return null;
  };

  const handleSignup = async () => {
    // Validate form before submission
    const validationError = validateForm();
    if (validationError) {
      setMessage(validationError);
      return;
    }

    setLoading(true);
    setMessage("");

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    const { data, error } = await supabasePublic.auth.signUp({
      email: trimmedEmail,
      password: trimmedPassword,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    // Get session and log the access token
    const { data: sessionData } = await supabasePublic.auth.getSession();
    if (sessionData?.session?.access_token) {
      console.log("🔑 Signup Access Token:", sessionData.session.access_token);
    }


    // Using helper to attach Authorization automatically
    // Only call API if URL is configured (required for physical devices)
    if (!API_BASE_URL || (!isApiUrlConfiguredForDevice() && Platform.OS !== "web")) {
      console.warn("API URL not configured. Skipping profile creation.");
      setMessage(
        "Account created! Note: Profile setup requires API server. " +
        "Set EXPO_PUBLIC_API_URL in .env for full functionality."
      );
      setLoading(false);
      return;
    }

    try {
      console.log("📝 Creating user profile in database...");
      const res = await fetch(
        `${API_BASE_URL}/api/users`,
        await withAuthHeaders({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: trimmedEmail.split("@")[0],
            email: trimmedEmail,
            role: "user",
          }),
        })
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        console.error("❌ Profile creation failed:", err);
        setMessage(`Account created but profile setup failed: ${err.error || "Unknown error"}. Redirecting...`);
        // Still redirect to about-you even if profile setup failed - account exists
        setTimeout(async () => {
          await router.replace("/onboarding/about-you");
        }, 1500);
      } else {
        const result = await res.json().catch(() => ({}));
        console.log("✅ User profile created:", result);
        setMessage("Account created! Redirecting to onboarding...");
        // Redirect to about-you to start onboarding flow
        setTimeout(async () => {
          await router.replace("/onboarding/about-you");
        }, 1500);
      }
    } catch (fetchError: any) {
      // Handle network errors gracefully - account is still created in Supabase
      console.error("❌ API Error:", fetchError);
      const errorMsg = fetchError.message?.includes("Network request failed")
        ? "Account created! API server unreachable. Redirecting anyway..."
        : "Account created! Profile setup failed. Redirecting anyway...";
      setMessage(errorMsg);
      // Still redirect even if API failed - Supabase account exists
      setTimeout(async () => {
        await router.replace("/onboarding/about-you");
      }, 1500);
    }

    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Join Bassh</Text>
        <Text style={styles.subtitle}>Create your user account</Text>

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
            onPress={handleSignup}
            disabled={loading || !email.trim() || !password.trim()}
            style={[styles.button, (loading || !email.trim() || !password.trim()) && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>
              {loading ? "Creating..." : "Create Account"}
            </Text>
          </Pressable>

          {message && (
            <Text style={[styles.message, message.includes("successfully") ? styles.messageSuccess : styles.messageError]}>
              {message}
            </Text>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Already have an account?{" "}
            <Text
              style={styles.footerLink}
              onPress={() => router.push("/login")}
            >
              Sign in
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
  message: {
    textAlign: "center",
    fontSize: 14,
    marginTop: 8,
  },
  messageSuccess: {
    color: "#EC4899",
  },
  messageError: {
    color: "#F87171",
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