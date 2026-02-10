import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        animation: "fade",
        // Prevent any navigation away from onboarding screens
        animationTypeForReplace: "push",
      }}
    />
  );
}
