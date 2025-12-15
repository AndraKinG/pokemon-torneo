// src/lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// OJO: no tirar error en import-time (build). Solo avisar en runtime si faltan.
export const supabase =
  url && anon
    ? createClient(url, anon)
    : (null as unknown as ReturnType<typeof createClient>);
