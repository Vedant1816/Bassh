import { View, Text, StyleSheet } from "react-native";

export default function StaffProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Staff Profile</Text>
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
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
});
