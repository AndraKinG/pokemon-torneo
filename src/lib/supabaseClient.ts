// src/lib/supabaseClient.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ✅ Exporta un cliente "seguro":
// - En servidor/build será null (para no romper el build)
// - En navegador será el cliente real
export const supabase: SupabaseClient | null =
  typeof window === "undefined" ? null : createClient(url ?? "", anon ?? "");

// ✅ Por si aún quieres usarlo así en algunos sitios
let _client: SupabaseClient | null = null;
export function getSupabaseBrowserClient(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error("Supabase client requested on the server. Use it only in client components.");
  }
  if (_client) return _client;

  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  _client = createClient(url, anon);
  return _client;
}
