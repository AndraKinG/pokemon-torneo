"use client";

import { createClient } from "@supabase/supabase-js";

let _client: any = null;

export function supabaseBrowser() {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  console.log("SUPABASE INIT", { url, anon: anon?.slice(0, 6) });

  _client = createClient(url, anon);
  return _client;
}


