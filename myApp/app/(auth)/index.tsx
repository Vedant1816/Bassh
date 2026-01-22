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
          User / Club Login
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.push("/signup")}
        style={styles.secondaryButton}
      >
        <Text style={styles.secondaryButtonText}>
          Create User Account
        </Text>
      </Pressable>

      <View style={styles.staffSection}>
        <Pressable onPress={() => router.push("/staff-login")}>
          <Text style={styles.linkText}>
            Staff Login
          </Text>
        </Pressable>
        <Text style={styles.linkText}> • </Text>
        <Pressable onPress={() => router.push("/staff-signup")}>
          <Text style={styles.linkText}>
            Staff Signup
          </Text>
        </Pressable>
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
    marginBottom: 16,
  },
  primaryButtonText: {
    textAlign: "center",
    color: "#FFFFFF",
    fontWeight: "600",
  },
  secondaryButton: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#EC4899",
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 32,
  },
  secondaryButtonText: {
    textAlign: "center",
    color: "#EC4899",
    fontWeight: "600",
  },
  linkText: {
    color: "#9CA3AF",
    textDecorationLine: "underline",
  },
  staffSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});