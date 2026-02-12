import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import "react-native-reanimated";
import { useColorScheme } from "@/hooks/use-color-scheme";
import supabasePublic from "@/_services/supabase-public";
import { Colors } from "@/constants/Colors";
import Mapbox from "@rnmapbox/maps";
import { Session } from "@supabase/supabase-js";

/* ---------------- MAPBOX TOKEN ---------------- */
const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
if (mapboxToken) {
  Mapbox.setAccessToken(mapboxToken);
}

/* ---------------- ROOT LAYOUT ---------------- */
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Initial session check
    supabasePublic.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabasePublic.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (session && inAuthGroup) {
      // Redirect to tabs if logged in but on auth screen
      router.replace("/(tabs)");
    } else if (!session && !inAuthGroup) {
      // Redirect to auth if logged out but not on auth screen
      router.replace("/(auth)");
    }
  }, [session, segments, isLoading]);

  // Show loading screen while checking session
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.dark.primary} />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    alignItems: "center",
    justifyContent: "center",
  },
});