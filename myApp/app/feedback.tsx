import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { DismissKeyboardView } from "@/components/DismissKeyboardView";

export default function FeedbackScreen() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      Alert.alert("Message required", "Please enter your feedback.");
      return;
    }
    setSending(true);
    try {
      Alert.alert(
        "Thank you",
        "Your feedback has been recorded. We'll get back to you soon.",
        [{ text: "OK", onPress: () => { setMessage(""); router.back(); } }]
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Feedback",
          headerTitleStyle: {
            color: Colors.dark.text,
            fontWeight: "700",
            fontSize: 16,
          },
          headerStyle: { backgroundColor: Colors.dark.background },
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
            </Pressable>
          ),
        }}
      />
    <DismissKeyboardView>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionHeader}>Share feedback</Text>
          <Text style={styles.intro}>
            We'd love to hear from you. Share your ideas, report issues, or suggest improvements.
          </Text>

          <View style={styles.card}>
            <Text style={styles.label}>Your feedback</Text>
            <TextInput
              style={styles.input}
              placeholder="Tell us what you think..."
              placeholderTextColor="#666666"
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={1000}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{message.length}/1000</Text>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, sending && styles.submitButtonDisabled]}
            activeOpacity={0.8}
            onPress={handleSubmit}
            disabled={sending}
          >
            <Text style={styles.submitButtonText}>
              {sending ? "Sending..." : "Submit Feedback"}
            </Text>
          </TouchableOpacity>

          <View style={styles.bottomSpace} />
        </ScrollView>
      </KeyboardAvoidingView>
    </DismissKeyboardView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  backButton: { padding: 8, marginLeft: 8 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 100 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: 0,
    marginBottom: 8,
    marginTop: 8,
  },
  intro: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 16,
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#0F0F0F",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#000000",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1A1A1A",
    padding: 16,
    fontSize: 16,
    color: "#FFFFFF",
    minHeight: 120,
    maxHeight: 200,
  },
  charCount: {
    fontSize: 12,
    color: "#666666",
    textAlign: "right",
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: "#0F0F0F",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  bottomSpace: { height: 40 },
});
