import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import supabasePublic from '@/_services/supabase-public';

import Mapbox from "@rnmapbox/maps";

// Set Mapbox access token from environment variable (same as Supabase setup)
const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

if (!mapboxToken) {
  console.error("❌ EXPO_PUBLIC_MAPBOX_TOKEN is missing. Add it to your .env file");
} else {
  Mapbox.setAccessToken(mapboxToken);
  console.log("✅ Mapbox token loaded");
}

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      // Only run bootstrap once on app start
      if (isInitialized) return;

      // Check current route using segments array
      const isOnAuthPage = segments.includes('(auth)') || segments.length === 0;
      const isOnOnboardingPage = segments.includes('onboarding');
      const isOnTabsPage = segments.includes('(tabs)');

      const { data: sessionData } = await supabasePublic.auth.getSession();

      // If no session, redirect to auth (unless already on auth page)
      if (!sessionData.session) {
        if (!isOnAuthPage) {
          router.replace("/(auth)");
        }
        setIsInitialized(true);
        return;
      }

      // If we're already on auth page but have session, don't redirect (let user complete auth flow)
      if (isOnAuthPage) {
        setIsInitialized(true);
        return;
      }

      // Check onboarding status from customers table
      try {
        const { data, error } = await supabasePublic
          .from("customers")
          .select("onboarding_completed")
          .eq("id", sessionData.session.user.id)
          .single();

        if (error) {
          // PGRST116 means no rows found - customer doesn't exist yet, go to onboarding
          if (error.code === "PGRST116") {
            if (!isOnOnboardingPage) {
              router.replace("/onboarding/about-you");
            }
            setIsInitialized(true);
            return;
          }
          // For other errors, log but don't redirect
          console.warn("Error checking onboarding status:", error.message);
          setIsInitialized(true);
          return;
        }

        // If onboarding not completed, redirect to onboarding (unless already there)
        if (!data?.onboarding_completed) {
          if (!isOnOnboardingPage) {
            router.replace("/onboarding/about-you");
          }
        } else {
          // Onboarding completed, redirect to tabs (unless already there)
          if (!isOnTabsPage && !isOnOnboardingPage) {
            router.replace("/(tabs)");
          }
        }
      } catch (err) {
        console.warn("Unexpected error in bootstrap:", err);
      }

      setIsInitialized(true);
    };

    // Small delay to ensure segments are populated
    const timer = setTimeout(() => {
      bootstrap();
    }, 100);

    return () => clearTimeout(timer);
  }, [router, segments, isInitialized]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen
          name="modal"
          options={{ presentation: 'modal', headerShown: true }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}