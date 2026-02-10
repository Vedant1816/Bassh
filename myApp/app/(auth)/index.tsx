import { View, Text, Pressable, StyleSheet, Image, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, HeaderGradient, HeaderGradientLocations } from "@/constants/Colors";
import { ThemedButton } from "@/components/ui/ThemedButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AuthLanding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[...HeaderGradient]}
        locations={[...HeaderGradientLocations]}
        style={styles.background}
      />

      <View style={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.logoContainer}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>BASSH</Text>
          <Text style={styles.subtitle}>
            Discover the best clubs and events
          </Text>
        </View>

        <View style={styles.actions}>
          <ThemedButton
            onPress={() => router.push("/login")}
            style={styles.getStartedButton}
            textStyle={styles.getStartedText}
          >
            Get started
          </ThemedButton>

          <Pressable
            onPress={() => router.push("/staff-login")}
            style={styles.staffLink}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.staffLinkText}>Staff access</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 100,
  },
  logoContainer: {
    alignItems: "center",
    marginTop: 60,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 24,
    marginBottom: 32,
  },
  title: {
    fontSize: 42,
    fontWeight: "800",
    color: Colors.dark.text,
    textAlign: "center",
    letterSpacing: 2,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 17,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    maxWidth: "80%",
    lineHeight: 24,
  },
  actions: {
    width: "100%",
    gap: 16,
    marginBottom: 20,
  },
  getStartedButton: {
    height: 56,
    borderRadius: 28,
  },
  getStartedText: {
    fontSize: 18,
    fontWeight: "600",
  },
  staffLink: {
    alignItems: "center",
    paddingVertical: 12,
  },
  staffLinkText: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.5)",
    fontWeight: "500",
  },
});