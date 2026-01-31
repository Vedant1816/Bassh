import { View, Pressable, Image, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Platform, Alert, StatusBar, Dimensions } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { fetchWithFallback } from "@/_services/api-config";
import { LinearGradient } from "expo-linear-gradient";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

let ImagePicker: any = null;
try {
  ImagePicker = require("expo-image-picker");
} catch (error) {
  console.warn("expo-image-picker not available:", error);
}

const avatars = [
  "https://api.dicebear.com/7.x/avataaars/png?seed=1",
  "https://api.dicebear.com/7.x/avataaars/png?seed=2",
  "https://api.dicebear.com/7.x/avataaars/png?seed=3",
  "https://api.dicebear.com/7.x/avataaars/png?seed=4",
  "https://api.dicebear.com/7.x/avataaars/png?seed=5",
  "https://api.dicebear.com/7.x/avataaars/png?seed=6",
  "https://api.dicebear.com/7.x/avataaars/png?seed=7",
  "https://api.dicebear.com/7.x/avataaars/png?seed=8",
];

export default function AvatarScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const pickImage = async () => {
    if (!ImagePicker) {
      Alert.alert(
        "Image Upload Unavailable",
        "Image upload requires a native build. Please rebuild the app or select an avatar from the options below.",
        [{ text: "OK" }]
      );
      return;
    }
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "We need camera roll permissions to upload your image.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setUploadedImage(result.assets[0].uri);
        setSelectedAvatar(null);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image. Please try selecting an avatar below.");
    }
  };

  const selectAvatar = async (url: string) => {
    setSelectedAvatar(url);
    setUploadedImage(null);
    setLoading(true);
    try {
      await fetchWithFallback(
        `/api/users/me`,
        await withAuthHeaders({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatar_url: url }),
        })
      );
      router.push("/onboarding/dob");
    } catch (error) {
      setLoading(false);
      setSelectedAvatar(null);
    }
  };

  const saveUploadedImage = async () => {
    if (!uploadedImage) return;
    setLoading(true);
    try {
      await fetchWithFallback(
        `/api/users/me`,
        await withAuthHeaders({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatar_url: uploadedImage }),
        })
      );
      router.push("/onboarding/dob");
    } catch (error) {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#8B0045", "#2D0A1F", "#000000"]} locations={[0, 0.4, 1]} style={styles.gradientBackground} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Welcome to BASH</Text>
          <Pressable onPress={() => router.push("/onboarding/dob")} style={styles.skipButton}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </Pressable>
        </View>

        <View style={styles.titleSection}>
          <Text style={styles.title}>Choose your avatar</Text>
          <Text style={styles.subtitle}>Upload your image or choose any from the below given avatars.</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.editButton}>Previous</Text>
          </Pressable>
        </View>

        <TouchableOpacity onPress={pickImage} style={styles.uploadArea} disabled={loading}>
          {uploadedImage ? (
            <Image source={{ uri: uploadedImage }} style={styles.uploadedImage} />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={32} color="#E91E8C" />
              <Text style={styles.uploadText}>Click to select or browse file</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.avatarGrid}>
          {avatars.map((avatarUrl) => (
            <Pressable
              key={avatarUrl}
              onPress={() => selectAvatar(avatarUrl)}
              disabled={loading}
              style={[styles.avatarContainer, selectedAvatar === avatarUrl && styles.avatarSelected, loading && styles.avatarDisabled]}
            >
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              {loading && selectedAvatar === avatarUrl && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator color="#E91E8C" />
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottomContainer}>
        <Pressable onPress={saveUploadedImage} disabled={loading || !uploadedImage} style={styles.buttonWrapper}>
          <LinearGradient
            colors={["#E91E8C", "#DB1A85"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.sendButton, (loading || !uploadedImage) && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>{loading ? "Saving..." : "Continue"}</Text>
          </LinearGradient>
        </Pressable>
        <View style={styles.homeIndicator} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  gradientBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.5,
  },
  scrollContent: { flexGrow: 1, paddingTop: 60, paddingHorizontal: 24, paddingBottom: 120 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 32, gap: 12 },
  backButton: { width: 32, height: 32, justifyContent: "center", alignItems: "center" },
  backIcon: { fontSize: 32, color: "#FFFFFF", fontWeight: "300", marginLeft: -4 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: "700", color: "#FFFFFF" },
  skipButton: { padding: 8 },
  skipButtonText: { fontSize: 15, fontWeight: "600", color: "#E91E8C" },
  titleSection: { marginBottom: 24 },
  title: { fontSize: 32, fontWeight: "700", color: "#FFFFFF", marginBottom: 12 },
  subtitle: { fontSize: 15, lineHeight: 20, color: "rgba(255, 255, 255, 0.6)", marginBottom: 8 },
  editButton: { fontSize: 15, fontWeight: "600", color: "#E91E8C" },
  uploadArea: {
    width: "100%",
    height: 150,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(233, 30, 140, 0.3)",
    borderStyle: "dashed",
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    overflow: "hidden",
  },
  uploadedImage: { width: "100%", height: "100%" },
  uploadText: { color: "#E91E8C", fontSize: 14, fontWeight: "500", marginTop: 8 },
  avatarGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12, marginBottom: 24 },
  avatarContainer: {
    width: "30%",
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(233, 30, 140, 0.3)",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.1)",
    position: "relative",
  },
  avatarSelected: { borderColor: "#E91E8C", borderWidth: 3 },
  avatarDisabled: { opacity: 0.5 },
  avatarImage: { width: "100%", height: "100%" },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 34,
  },
  buttonWrapper: { marginBottom: 16 },
  sendButton: { height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center" },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 17, fontWeight: "600", color: "#FFFFFF" },
  homeIndicator: { height: 5, width: 134, backgroundColor: "#FFFFFF", borderRadius: 3, alignSelf: "center", marginTop: 12 },
});
