import { Platform } from "react-native";

/**
 * Get the API base URL for the current platform
 * - iOS Simulator: localhost works
 * - Android Emulator: Use 10.0.2.2 (special alias for host machine)
 * - Physical devices: MUST use actual IP address via EXPO_PUBLIC_API_URL
 */
export function getApiBaseUrl(): string | null {
  // Check if explicit API URL is set in env (REQUIRED for physical devices)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Platform-specific defaults (only work in simulators/emulators)
  if (Platform.OS === "android") {
    // Android emulator uses 10.0.2.2 to access host machine
    return "http://10.0.2.2:3000";
  }

  // iOS simulator or web - localhost works
  return "http://localhost:3000";
}

export const API_BASE_URL = getApiBaseUrl();

/**
 * Check if API URL is configured for physical devices
 * Physical devices need EXPO_PUBLIC_API_URL set to computer's IP
 */
export function isApiUrlConfiguredForDevice(): boolean {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return true;
  }
  // If no explicit URL and not using localhost/10.0.2.2 on simulator, likely a device
  return false;
}
