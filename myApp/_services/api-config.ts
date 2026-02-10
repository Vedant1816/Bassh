import { Platform } from "react-native";

/**
 * Fallback API URL (ngrok tunnel)
 * Used when primary API URL is unreachable
 */
export const FALLBACK_API_URL = "https://irrefutably-nondiscordant-ethan.ngrok-free.dev";

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
 * Try to fetch from primary URL, fallback to ngrok URL if it fails
 */
export async function fetchWithFallback(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const primaryUrl = API_BASE_URL;
  
  if (!primaryUrl) {
    // If no primary URL, use fallback directly
    const fullUrl = `${FALLBACK_API_URL}${path}`;
    return fetch(fullUrl, init);
  }

  try {
    // Create timeout controller for React Native compatibility
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    // Try primary URL first
    const fullUrl = `${primaryUrl}${path}`;
    
    const response = await fetch(fullUrl, {
      ...init,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    // If successful, return response
    if (response.ok || response.status < 500) {
      return response;
    }
    
    // If server error, try fallback
  } catch (error: any) {
    // Network error or timeout - try fallback
    // Network error or timeout - try fallback
  }

  // Try fallback URL
  const fallbackUrl = `${FALLBACK_API_URL}${path}`;
  return fetch(fallbackUrl, init);
}

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
