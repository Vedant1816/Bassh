import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useRef, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import supabasePublic from '@/_services/supabase-public';
import { Colors } from '@/constants/Colors';

import Mapbox from "@rnmapbox/maps";

import type { Session } from '@supabase/supabase-js';

// Set Mapbox access token from environment variable (same as Supabase setup)
const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

if (mapboxToken) {
  Mapbox.setAccessToken(mapboxToken);
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);
  const isNavigating = useRef(false);

  // Route user based on session and onboarding status
  const routeUser = useCallback(async (session: Session | null) => {
    // Prevent concurrent navigation
    if (isNavigating.current) return;
    isNavigating.current = true;

    try {
      const segs = segments as string[];
      const isOnOnboardingPage = segs.includes('onboarding');

      // CRITICAL: If user is on onboarding, NEVER redirect away - let them complete it
      if (isOnOnboardingPage) {
        return;
      }

      if (!session) {
        // No session → go to auth
        router.replace("/(auth)");
        return;
      }

      // Session exists → check onboarding status
      try {
        const { data, error } = await supabasePublic
          .from("customers")
          .select("onboarding_completed")
          .eq("id", session.user.id)
          .single();

        if (error) {
          if (error.code === "PGRST116") {
            // No customer row yet → needs onboarding
            router.replace("/onboarding/about-you");
            return;
          }
          // Other DB errors → default to tabs (user is authenticated)
          router.replace("/(tabs)");
          return;
        }

        if (!data?.onboarding_completed) {
          router.replace("/onboarding/about-you");
        } else {
          router.replace("/(tabs)");
        }
      } catch {
        // DB check failed but user is authenticated → go to tabs
        router.replace("/(tabs)");
      }
    } finally {
      isNavigating.current = false;
    }
  }, [router, segments]);

  useEffect(() => {
    // Listen for auth state changes including the initial session restore from storage.
    // INITIAL_SESSION fires once Supabase has finished reading the persisted session
    // from AsyncStorage, so we avoid the race condition of calling getSession() too early.
    const { data: { subscription } } = supabasePublic.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'INITIAL_SESSION') {
          // Session restored from storage (or null if none persisted)
          await routeUser(session);
          setIsReady(true);
        } else if (event === 'SIGNED_IN') {
          // User just logged in — login/signup pages handle their own redirect,
          // so we only route here if the app isn't already navigating
          // (e.g. token refresh that yields a new SIGNED_IN event)
          if (isReady) {
            await routeUser(session);
          }
        } else if (event === 'SIGNED_OUT') {
          router.replace("/(auth)");
        } else if (event === 'TOKEN_REFRESHED') {
          // Token refreshed silently — no navigation needed
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [routeUser, isReady, router]);

  // Show a loading screen until the initial session check completes.
  // This prevents a flash of the auth screen for logged-in users.
  if (!isReady) {
    return (
      <View style={splashStyles.container}>
        <ActivityIndicator size="large" color={Colors.dark.primary} />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen
          name="onboarding"
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen
          name="modal"
          options={{ presentation: 'modal', headerShown: true }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});