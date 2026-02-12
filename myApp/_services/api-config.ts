/**
 * API Configuration
 * Derived from Environment Variables or falling back to the production URL.
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

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

  console.log(`[API Request] ${init?.method || 'GET'} ${fullUrl}`);
  if (init?.body) {
    try {
      console.log(`[API Body]`, JSON.parse(init.body as string));
    } catch {
      console.log(`[API Body]`, init.body);
    }
  }

  try {
    // Create timeout controller for React Native compatibility
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for mobile networks

    const response = await fetch(fullUrl, {
      ...init,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      console.log(`[API Response Error] Status: ${response.status} for ${cleanPath}`);
      try {
        console.log(`[API Error Body]`, JSON.parse(errorBody));
      } catch {
        console.log(`[API Error Body]`, errorBody);
      }
      return new Response(errorBody, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
    }

    console.log(`[API Response Success] Status: ${response.status} for ${cleanPath}`);
    return response;
  } catch (error: any) {
    console.log(`[API Request Error/Retry] ${error.message} for ${cleanPath}`);
    // If it was aborted by our timer or network failed, retry once without signal
    // This handles cases where the signal might be causing issues on some devices
    const retryResponse = await fetch(fullUrl, init);

    if (!retryResponse.ok) {
      const errorBody = await retryResponse.text();
      console.log(`[API Retry Response Error] Status: ${retryResponse.status} for ${cleanPath}`);
      try {
        console.log(`[API Retry Error Body]`, JSON.parse(errorBody));
      } catch {
        console.log(`[API Retry Error Body]`, errorBody);
      }
      return new Response(errorBody, {
        status: retryResponse.status,
        statusText: retryResponse.statusText,
        headers: retryResponse.headers
      });
    }

    console.log(`[API Retry Response Success] Status: ${retryResponse.status} for ${cleanPath}`);
    return retryResponse;
  }
}

/**
 * Check if API URL is configured (Always true now)
 */
export function isApiUrlConfiguredForDevice(): boolean {
  return true;
}
