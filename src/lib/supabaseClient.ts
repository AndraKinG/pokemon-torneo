// src/lib/supabaseClient.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _browser: SupabaseClient | null = null;

/**
 * ✅ Cliente “seguro” para importar en componentes client.
 * Si faltan env vars, queda en null (así no rompe el build/prerender).
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null = url && anon ? createClient(url, anon) : null;

/**
 * ✅ Si quieres forzar “solo browser” (y reutilizar instancia).
 * Útil cuando no quieres que alguien use Supabase en SSR.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error("getSupabaseBrowserClient() solo puede usarse en el navegador.");
  }
  if (_browser) return _browser;

  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  _browser = createClient(url, anon);
  return _browser;
}


