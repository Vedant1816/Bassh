import { createClient } from "@supabase/supabase-js";
const supabaseURL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon_key = process.env.NEXT_PUBLIC_ANON_KEY;
if(!supabaseURL || !anon_key){
    throw new Error("Missing Supabase Credentials");
}
const supabasePublic = createClient(
    supabaseURL,
    anon_key
);
export default supabasePublic;