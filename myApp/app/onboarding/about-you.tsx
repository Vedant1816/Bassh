import { View, TextInput, Pressable, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, StatusBar, Dimensions } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { OnboardingTopBar } from "@/app/components/OnboardingTopBar";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { fetchWithFallback } from "@/_services/api-config";
import { LinearGradient } from "expo-linear-gradient";
import { DismissKeyboardView } from "@/components/DismissKeyboardView";
import { Colors, HeaderGradient, HeaderGradientLocations } from "@/constants/Colors";
import { ThemedButton } from "@/components/ui/ThemedButton";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function AboutYouScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [gender, setGender] = useState("");
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const genderOptions = [
    { label: "Male", value: "male" },
    { label: "Female", value: "female" },
    { label: "Other", value: "other" },
    { label: "Prefer not to say", value: "prefer_not_to_say" },
  ];

  const save = async () => {
    if (!firstName.trim() || !lastName.trim() || !username.trim() || !gender) return;

    setLoading(true);
    try {
      const res = await fetchWithFallback(
        `/api/users/me`,
        await withAuthHeaders({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            username: username.trim(),
            gender: gender,
          }),
        })
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        alert(`Failed to save: ${errorData.error || "Unknown error"}`);
        setLoading(false);
        return;
      }
      router.push("/onboarding/phone");
    } catch (error: any) {
      alert(`Network error: ${error.message || "Please check your connection"}`);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = firstName.trim() && lastName.trim() && username.trim() && gender;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <DismissKeyboardView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={[...HeaderGradient]}
          locations={[...HeaderGradientLocations]}
          style={styles.gradientBackground}
        />

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <OnboardingTopBar stepIndex={1} totalSteps={5} onBack={() => router.back()} />
          <View style={styles.skipRow}>
            <View style={styles.headerSpacer} />
            <Pressable onPress={() => router.push("/onboarding/phone")} style={styles.skipButton}>
              <Text style={styles.skipButtonText}>Skip</Text>
            </Pressable>
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.title}>Lastly, tell us more about yourself</Text>
            <Text style={styles.subtitle}>
              Please enter your legal name. This information will be used to verify your account.
            </Text>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.editButton}>Previous</Text>
            </Pressable>
          </View>

          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>First Name</Text>
              <TextInput
                placeholder=""
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={firstName}
                onChangeText={setFirstName}
                style={styles.input}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Last Name</Text>
              <TextInput
                placeholder=""
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={lastName}
                onChangeText={setLastName}
                style={styles.input}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Username</Text>
              <TextInput
                placeholder=""
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={username}
                onChangeText={setUsername}
                style={styles.input}
                autoCapitalize="none"
              />
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Gender</Text>
              <Pressable style={styles.pickerButton} onPress={() => setShowGenderPicker(!showGenderPicker)}>
                <Text style={[styles.pickerText, !gender && styles.placeholderText]}>
                  {gender ? genderOptions.find((opt) => opt.value === gender)?.label || gender : "Select gender"}
                </Text>
                <Ionicons name={showGenderPicker ? "chevron-up" : "chevron-down"} size={20} color={Colors.dark.primary} />
              </Pressable>
              {showGenderPicker && (
                <View style={styles.pickerOptions}>
                  {genderOptions.map((option) => (
                    <Pressable
                      key={option.value}
                      style={[styles.pickerOption, gender === option.value && styles.pickerOptionSelected]}
                      onPress={() => {
                        setGender(option.value);
                        setShowGenderPicker(false);
                      }}
                    >
                      <Text style={[styles.pickerOptionText, gender === option.value && styles.pickerOptionTextSelected]}>
                        {option.label}
                      </Text>
                      {gender === option.value && <Ionicons name="checkmark" size={20} color={Colors.dark.primary} />}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottomContainer}>
          <ThemedButton
            onPress={save}
            loading={loading}
            disabled={!isFormValid || loading}
            style={styles.sendButton}
            textStyle={styles.buttonText}
          >
            Continue
          </ThemedButton>
          <View style={styles.homeIndicator} />
        </View>
      </DismissKeyboardView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background
  },
  gradientBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.5,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 120
  },
  skipRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  headerSpacer: { flex: 1 },
  skipButton: { padding: 8 },
  skipButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.dark.primary
  },
  titleSection: { marginBottom: 32 },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: Colors.dark.text,
    marginBottom: 12
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 20,
    color: Colors.dark.textSecondary,
    marginBottom: 8
  },
  editButton: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.dark.primary
  },
  form: { gap: 20 },
  inputWrapper: { gap: 8 },
  inputLabel: {
    fontSize: 14,
    color: Colors.dark.text,
    fontWeight: "500"
  },
  input: {
    width: "100%",
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: Colors.dark.text,
    fontSize: 16,
  },
  pickerButton: {
    width: "100%",
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerText: {
    color: Colors.dark.text,
    fontSize: 16
  },
  placeholderText: {
    color: "rgba(255,255,255,0.4)"
  },
  pickerOptions: {
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  pickerOptionSelected: {
    backgroundColor: "rgba(233, 30, 140, 0.1)"
  },
  pickerOptionText: {
    color: Colors.dark.text,
    fontSize: 16
  },
  pickerOptionTextSelected: {
    color: Colors.dark.primary,
    fontWeight: "600"
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 34,
  },
  sendButton: {
    height: 56,
    borderRadius: 28
  },
  buttonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF"
  },
  homeIndicator: {
    height: 5,
    width: 134,
    backgroundColor: "#FFFFFF",
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 12,
    opacity: 0.3,
  },
});
