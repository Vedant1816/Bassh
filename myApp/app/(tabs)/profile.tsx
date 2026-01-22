import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import supabasePublic from "@/_services/supabase-public";

export default function ProfileScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabasePublic.auth.signOut();
    router.replace("/(auth)");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      
      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
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
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 40,
  },
  logoutButton: {
    backgroundColor: "#EC4899",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
