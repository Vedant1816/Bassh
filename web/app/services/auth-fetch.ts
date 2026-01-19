import supabasePublic from "./supabase-public";

export async function withAuthHeaders(
  init: RequestInit = {}
): Promise<RequestInit> {
  const {
    data: { session },
  } = await supabasePublic.auth.getSession();

  const headers = new Headers(init.headers);

  if (session?.access_token) {
    headers.set(
      "Authorization",
      `Bearer ${session.access_token}`
    );
  }

  return {
    ...init,
    headers,
  };
}
