import {
  View,
  Pressable,
  Image,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  useWindowDimensions,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { OnboardingTopBar } from "@/app/components/OnboardingTopBar";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { fetchWithFallback, getApiBaseUrl, FALLBACK_API_URL } from "@/_services/api-config";
import { Colors, HeaderGradient, HeaderGradientLocations } from "@/constants/Colors";
import { ThemedButton } from "@/components/ui/ThemedButton";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

let ImagePicker: any = null;
try {
  ImagePicker = require("expo-image-picker");
  } catch {
    // image picker not available; ignore
  }

/* Local avatar assets (same 4 as design); served at /avatars/avatar-N.png for API */
const AVATAR_IDS = ["avatar-1", "avatar-2", "avatar-3", "avatar-4"];
const AVATAR_SOURCES = [
  require("@/assets/images/avatar-1.png"),
  require("@/assets/images/avatar-2.png"),
  require("@/assets/images/avatar-3.png"),
  require("@/assets/images/avatar-4.png"),
];

const STEP_INDEX = 3;
const TOTAL_STEPS = 5;

export default function AvatarScreen() {
  const router = useRouter();
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  const [loading, setLoading] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const pickImage = async () => {
    if (!ImagePicker) {
      const { Alert } = await import("react-native");
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
        const { Alert } = await import("react-native");
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
      const { Alert } = await import("react-native");
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

  const contentWidth = Math.min(343, SCREEN_WIDTH - 32);
  const baseUrl = getApiBaseUrl() || FALLBACK_API_URL;
  const avatars = AVATAR_IDS.map((id, i) => ({
    source: AVATAR_SOURCES[i],
    url: `${baseUrl}/avatars/${id}.png`,
  }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={[...HeaderGradient]}
        locations={[...HeaderGradientLocations]}
        style={styles.gradientBackground}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <OnboardingTopBar stepIndex={STEP_INDEX} totalSteps={TOTAL_STEPS} onBack={() => router.back()} />

        <View style={[styles.titleSection, { width: contentWidth }]}>
          <Text style={styles.title}>Choose your avatar</Text>
          <Text style={styles.subtitle}>Upload your image or choose any from the below given avatars.</Text>
        </View>

        <TouchableOpacity
          onPress={pickImage}
          style={[styles.uploadArea, { width: contentWidth }]}
          disabled={loading}
        >
          {uploadedImage ? (
            <Image source={{ uri: uploadedImage }} style={styles.uploadedImage} />
          ) : (
            <View style={styles.uploadContent}>
              <Ionicons name="cloud-upload-outline" size={32} color={Colors.dark.primary} />
              <Text style={styles.uploadText}>Click to select or browse file</Text>
              <Text style={styles.uploadHint}>Format: .jpeg, .png & Max file size: 25 MB</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={[styles.avatarsSection, { width: contentWidth }]}>
          <Text style={styles.avatarsHeadline}>Avatars available</Text>
          <View style={styles.avatarGrid}>
            {avatars.map((avatar) => (
              <Pressable
                key={avatar.url}
                onPress={() => selectAvatar(avatar.url)}
                disabled={loading}
                style={[
                  styles.avatarContainer,
                  selectedAvatar === avatar.url && styles.avatarSelected,
                  loading && styles.avatarDisabled,
                ]}
              >
                <Image source={avatar.source} style={styles.avatarImage} />
                {loading && selectedAvatar === avatar.url && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator color={Colors.dark.primary} />
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomContainer}>
        <View style={styles.bottomButtons}>
          <Pressable onPress={() => router.back()} style={styles.previousButton}>
            <Text style={styles.previousText}>Previous</Text>
          </Pressable>
          <ThemedButton
            onPress={saveUploadedImage}
            loading={loading && !!uploadedImage}
            disabled={loading || !uploadedImage}
            style={styles.buttonWrapper}
            textStyle={styles.continueText}
          >
            Continue
          </ThemedButton>
        </View>
        <View style={styles.homeIndicator} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
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
    paddingBottom: 140,
    alignItems: "center",
  },
  titleSection: {
    marginBottom: 20,
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: Colors.dark.text,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 20,
    color: Colors.dark.textSecondary,
  },
  uploadArea: {
    height: 160,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 38,
    paddingHorizontal: 46,
    marginBottom: 20,
    overflow: "hidden",
  },
  uploadContent: {
    alignItems: "center",
    gap: 8,
  },
  uploadedImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.dark.text,
    lineHeight: 24,
  },
  uploadHint: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.dark.textSecondary,
  },
  avatarsSection: {
    gap: 20,
  },
  avatarsHeadline: {
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 20,
    color: Colors.dark.text,
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
  },
  avatarContainer: {
    width: 101,
    height: 101,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
    position: "relative",
    borderWidth: 2,
    borderColor: "transparent",
  },
  avatarSelected: {
    borderColor: Colors.dark.primary,
  },
  avatarDisabled: {
    opacity: 0.5,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
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
  bottomButtons: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  previousButton: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  previousText: {
    fontSize: 17,
    fontWeight: "600",
    color: Colors.dark.textSecondary,
  },
  buttonWrapper: {
    flex: 1,
  },
  continueText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
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
