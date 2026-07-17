import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const isDemoMode = import.meta.env.VITE_DEMO_MODE === "true";

// A harmless placeholder keeps the application renderable so it can show a useful setup error.
export const supabase = createClient(
  supabaseUrl || "https://configuration-required.supabase.co",
  supabaseAnonKey || "configuration-required",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
