import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import supabasePublic from "@/_services/supabase-public";
import { redirectStaff } from "../../services/redirect-staff";
import { DismissKeyboardView } from "@/components/DismissKeyboardView";

export default function StaffLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    const { error } = await supabasePublic.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    await redirectStaff(router);
  };

  return (
    <DismissKeyboardView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Staff Login</Text>

        <TextInput
          placeholder="Email"
          placeholderTextColor="#6B7280"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />

        <TextInput
          placeholder="Password"
          placeholderTextColor="#6B7280"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />

        <Pressable onPress={handleLogin} style={styles.button}>
          <Text style={styles.buttonText}>
            {loading ? "Signing in..." : "Login"}
          </Text>
        </Pressable>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable onPress={() => router.push("/staff-signup")}>
          <Text style={styles.link}>Create staff account</Text>
        </Pressable>
      </View>
    </DismissKeyboardView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#111111",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(236, 72, 153, 0.3)",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#EC4899",
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    padding: 16,
    color: "#FFFFFF",
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#333333",
  },
  button: {
    backgroundColor: "#EC4899",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  error: {
    color: "#EF4444",
    fontSize: 14,
    marginTop: 12,
    textAlign: "center",
  },
  link: {
    color: "#EC4899",
    fontSize: 14,
    textAlign: "center",
    marginTop: 16,
    textDecorationLine: "underline",
  },
});