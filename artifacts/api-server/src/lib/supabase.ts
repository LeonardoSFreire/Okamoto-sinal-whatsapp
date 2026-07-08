import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

// Optional in single-user mode. When missing, auth falls back to local-only.
export const supabase: SupabaseClient | null =
  url && serviceKey
    ? createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;
