import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useRef } from 'react';
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

// Removed anchor to prevent default navigation to tabs
// export const unstable_settings = {
//   anchor: '(tabs)',
// };

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const hasBootstrapped = useRef(false);

  useEffect(() => {
    const bootstrap = async () => {
      // Only run bootstrap once on app start
      if (hasBootstrapped.current) return;
      hasBootstrapped.current = true;

      // Check current route using segments array (cast for expo-router segment types)
      const segs = segments as string[];
      const isOnAuthPage = segs.includes('(auth)') || segs.length === 0;
      const isOnOnboardingPage = segs.includes('onboarding');
      const isOnTabsPage = segs.includes('(tabs)');

      // CRITICAL: If user is on onboarding, NEVER redirect away - let them complete it
      if (isOnOnboardingPage) {
        return;
      }

      const { data: sessionData } = await supabasePublic.auth.getSession();

      // If no session, redirect to auth (unless already on auth page)
      if (!sessionData.session) {
        if (!isOnAuthPage && !isOnOnboardingPage) {
          router.replace("/(auth)");
        }
        return;
      }

      // If we're already on auth page but have session, don't redirect (let user complete auth flow)
      if (isOnAuthPage) {
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
            if (!isOnOnboardingPage && !isOnAuthPage) {
              router.replace("/onboarding/about-you");
            }
            return;
          }
          // For other errors, log but don't redirect (especially if on onboarding)
          console.warn("Error checking onboarding status:", error.message);
          return;
        }

        // If onboarding not completed, redirect to onboarding (unless already there or on auth)
        if (!data?.onboarding_completed) {
          if (!isOnOnboardingPage && !isOnAuthPage) {
            router.replace("/onboarding/about-you");
          }
        } else {
          // Onboarding completed, redirect to tabs (unless already there or on onboarding/auth)
          if (!isOnTabsPage && !isOnOnboardingPage && !isOnAuthPage) {
            router.replace("/(tabs)");
          }
        }
      } catch (err) {
        console.warn("Unexpected error in bootstrap:", err);
      }
    };

    // Small delay to ensure segments are populated
    const timer = setTimeout(() => {
      bootstrap();
    }, 100);

    return () => clearTimeout(timer);
  }, [router, segments]);

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