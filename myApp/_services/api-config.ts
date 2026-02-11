/**
 * API Configuration
 * Derived from Environment Variables or falling back to the production URL.
 */
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || "https://bassh-green.vercel.app").replace(/\/$/, "");

/**
 * Fallback API URL
 */
export const FALLBACK_API_URL = API_BASE_URL;

/**
 * Get the API base URL
 */
export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

/**
 * Try to fetch from primary URL
 */
export async function fetchWithFallback(
  path: string,
  init?: RequestInit
): Promise<Response> {
  // Ensure path starts with a slash
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const fullUrl = `${API_BASE_URL}${cleanPath}`;

  try {
    // Create timeout controller for React Native compatibility
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for mobile networks

    const response = await fetch(fullUrl, {
      ...init,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    // If it was aborted by our timer or network failed, retry once without signal
    // This handles cases where the signal might be causing issues on some devices
    return fetch(fullUrl, init);
  }
}

/**
 * Check if API URL is configured (Always true now)
 */
export function isApiUrlConfiguredForDevice(): boolean {
  return true;
}
