import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function AuthLanding() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Welcome to Bassh
      </Text>

      <Pressable
        onPress={() => router.push("/login")}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>
          Get started
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.push("/staff-login")}
        style={styles.staffLink}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.staffLinkText}>Staff</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#EC4899",
    marginBottom: 40,
  },
  primaryButton: {
    width: "100%",
    backgroundColor: "#DB2777",
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  primaryButtonText: {
    textAlign: "center",
    color: "#FFFFFF",
    fontWeight: "600",
  },
  staffLink: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  staffLinkText: {
    fontSize: 14,
    color: "#9CA3AF",
    textDecorationLine: "underline",
  },
});