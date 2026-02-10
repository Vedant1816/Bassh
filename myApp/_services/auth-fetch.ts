import supabasePublic from "./supabase-public";
import { fetchWithFallback } from "./api-config";

export async function withAuthHeaders(
  init: RequestInit = {}
): Promise<RequestInit> {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabasePublic.auth.getSession();

    if (sessionError) {
      console.error("Error getting session:", sessionError);
    }

    const existingHeaders = init.headers || {};
    const headers: Record<string, string> = 
      existingHeaders instanceof Headers
        ? Object.fromEntries(existingHeaders.entries())
        : typeof existingHeaders === 'object' && existingHeaders !== null
        ? { ...existingHeaders } as Record<string, string>
        : {};

    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
      console.log("✅ Auth token attached to request");
      console.log("🔐 [FRONTEND] Access Token:", session.access_token);
      console.log("🔐 [FRONTEND] Token length:", session.access_token.length);
    } else {
      console.warn("⚠️ No session or access token available");
    }

    return {
      ...init,
      headers,
    };
  } catch (error) {
    console.error("Error in withAuthHeaders:", error);
    // Return original init even if auth fails
    return init;
  }
}

/**
 * Fetch with authentication and automatic fallback to ngrok URL
 */
export async function authFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const authInit = await withAuthHeaders(init);
  return fetchWithFallback(path, authInit);
}
