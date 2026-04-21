import { createClient } from "@supabase/supabase-js";

// Fetch Supabase credentials from .env (see Supabase project Settings → API).
// createClient throws if url/key are missing — without fallbacks the whole app shows a white screen when .env is absent.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    "[Supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set — using demo placeholders. Add a .env file for real auth and cloud saves."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
