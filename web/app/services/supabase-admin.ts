/// <reference types="node" />
import {createClient} from "@supabase/supabase-js";

const supabaseURL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SERVICE_ROLE_KEY;
if(!supabaseURL || !serviceRoleKey){
    throw new Error("Missing Supabase Credentials");
}

const supabaseAdmin = createClient(
    supabaseURL,
    serviceRoleKey
);

export default supabaseAdmin;