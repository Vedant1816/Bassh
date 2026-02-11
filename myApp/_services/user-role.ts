import supabasePublic from "./supabase-public";
import { API_BASE_URL } from "./api-config";
import { withAuthHeaders } from "./auth-fetch";

export async function getUserRole(): Promise<"user" | "staff" | null> {
  try {
    const { data: { user } } = await supabasePublic.auth.getUser();
    
    if (!user) {
      return null;
    }

    // Try to get role from Supabase users table
    const { data, error } = await supabasePublic
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (error) {
      // If user doesn't exist in users table yet (PGRST116), that's okay
      // This can happen right after signup before the API creates the user record
      if (error.code === "PGRST116") {
        return null;
      }
      return null;
    }

    if (!data) {
      return null;
    }

    return data.role as "user" | "staff";
  } catch (error) {
    return null;
  }
}

export async function redirectToRoleHome(router: any, role?: "user" | "staff" | null) {
  // If role is provided (e.g., from signup), use it directly
  // Otherwise, try to fetch from database (e.g., from login)
  let userRole = role;
  
  if (!userRole) {
    userRole = await getUserRole();
  }
  
  if (userRole === "staff") {
    router.replace("/staff");
  } else if (userRole === "user") {
    router.replace("/(tabs)");
  } else {
    // Default to user home if role not found
    router.replace("/(tabs)");
  }
}
