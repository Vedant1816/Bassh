import { View, Pressable, Image, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Platform, Alert } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { API_BASE_URL } from "@/_services/api-config";

// Conditionally import ImagePicker to handle cases where native module isn't available
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
        "Image upload requires a native build. Please rebuild the app with 'npx expo prebuild' and 'npx expo run:ios' or 'npx expo run:android', or select an avatar from the options below.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Sorry, we need camera roll permissions to upload your image!");
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
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try selecting an avatar from the options below.");
    }
  };

  const selectAvatar = async (url: string) => {
    setSelectedAvatar(url);
    setUploadedImage(null);
    setLoading(true);
    try {
      await fetch(
        `${API_BASE_URL}/api/users/me`,
        await withAuthHeaders({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatar_url: url }),
        })
      );

      router.push("/onboarding/dob");
    } catch (error) {
      console.error("Error saving avatar:", error);
      setLoading(false);
      setSelectedAvatar(null);
    }
  };

  const saveUploadedImage = async () => {
    if (!uploadedImage) return;
    
    setLoading(true);
    try {
      // For now, we'll use the uploaded image URI directly
      // In production, you'd upload to a storage service first
      await fetch(
        `${API_BASE_URL}/api/users/me`,
        await withAuthHeaders({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatar_url: uploadedImage }),
        })
      );

      router.push("/onboarding/dob");
    } catch (error) {
      console.error("Error saving avatar:", error);
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Welcome to BASH</Text>
          <Text style={styles.pagination}>3/6</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Choose your avatar</Text>
          <Text style={styles.subtitle}>Upload your image or choose any from the below given avatars.</Text>

          {/* Upload Area */}
          <TouchableOpacity
            onPress={pickImage}
            style={styles.uploadArea}
            disabled={loading}
          >
            {uploadedImage ? (
              <Image source={{ uri: uploadedImage }} style={styles.uploadedImage} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={32} color="#EC4899" />
                <Text style={styles.uploadText}>Click to select or browse file</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Avatar Grid */}
          <View style={styles.avatarGrid}>
            {avatars.map((avatarUrl) => (
              <Pressable
                key={avatarUrl}
                onPress={() => selectAvatar(avatarUrl)}
                disabled={loading}
                style={[
                  styles.avatarContainer,
                  selectedAvatar === avatarUrl && styles.avatarSelected,
                  loading && styles.avatarDisabled,
                ]}
              >
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatarImage}
                />
                {loading && selectedAvatar === avatarUrl && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator color="#EC4899" />
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <Pressable
              onPress={() => router.back()}
              style={styles.previousButton}
            >
              <Text style={styles.previousButtonText}>Previous</Text>
            </Pressable>
            <Pressable
              onPress={saveUploadedImage}
              disabled={loading || !uploadedImage}
              style={[
                styles.continueButton,
                (loading || !uploadedImage) && styles.buttonDisabled
              ]}
            >
              <Text style={styles.continueButtonText}>
                {loading ? "Saving..." : "Continue"}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 32,
    paddingHorizontal: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },
  pagination: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "500",
    width: 40,
    textAlign: "right",
  },
  card: {
    width: "100%",
    borderRadius: 16,
    backgroundColor: "#000000",
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 24,
    lineHeight: 20,
  },
  uploadArea: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "rgba(236, 72, 153, 0.3)",
    borderStyle: "dashed",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    overflow: "hidden",
  },
  uploadedImage: {
    width: "100%",
    height: "100%",
  },
  uploadText: {
    color: "#EC4899",
    fontSize: 14,
    fontWeight: "500",
    marginTop: 8,
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 24,
  },
  avatarContainer: {
    width: "30%",
    aspectRatio: 1,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "rgba(236, 72, 153, 0.3)",
    overflow: "hidden",
    backgroundColor: "#1F1F1F",
    position: "relative",
  },
  avatarSelected: {
    borderColor: "#EC4899",
    borderWidth: 3,
    shadowColor: "#EC4899",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 8,
  },
  avatarDisabled: {
    opacity: 0.5,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  previousButton: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  previousButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  continueButton: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: "#DB2777",
    paddingVertical: 16,
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
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});