// src/lib/supabaseClient.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ✅ Export que existe siempre. En build/SSR puede ser null y NO rompe.
export const supabase: SupabaseClient | null = url && anon ? createClient(url, anon) : null;

