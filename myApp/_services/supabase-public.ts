import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const supabaseURL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon_key = process.env.EXPO_PUBLIC_ANON_KEY;

if (!supabaseURL || !anon_key) {
  throw new Error("Missing Supabase Credentials");
}

// Import AsyncStorage only for native platforms
let AsyncStorage: any = null;
if (Platform.OS !== "web") {
  try {
    AsyncStorage = require("@react-native-async-storage/async-storage").default;
  } catch (e) {
    // AsyncStorage will fall back to default storage
  }
}

const supabasePublic = createClient(
  supabaseURL,
  anon_key,
  AsyncStorage
    ? {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      }
    : {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      }
);

export default supabasePublic;
