import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { API_BASE_URL } from "@/_services/api-config";

export default function JoinClubScreen() {
  const router = useRouter();
  const [clubId, setClubId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!clubId.trim()) {
      setError("Please enter a club ID");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/staff/join-club`,
        await withAuthHeaders({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ club_id: clubId.trim() }),
        })
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Request failed" }));
        setError(errorData.error || "Failed to join club");
        setLoading(false);
        return;
      }

      // Redirect back to staff index which will check status
      router.replace("/staff");
    } catch (err: any) {
      setError(err.message || "Failed to submit request");
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Join Club</Text>
        <Text style={styles.subtitle}>
          Enter your club ID to request access
        </Text>

        <TextInput
          placeholder="Club ID"
          placeholderTextColor="#6B7280"
          value={clubId}
          onChangeText={(text) => {
            setClubId(text);
            setError("");
          }}
          style={styles.input}
          editable={!loading}
          autoCapitalize="none"
        />

        <Pressable
          onPress={handleSubmit}
          style={[styles.submitButton, loading && styles.buttonDisabled]}
          disabled={loading || !clubId.trim()}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Request</Text>
          )}
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </View>
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 24,
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
  submitButton: {
    backgroundColor: "#EC4899",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  error: {
    color: "#EF4444",
    fontSize: 14,
    marginTop: 12,
    textAlign: "center",
  },
});
