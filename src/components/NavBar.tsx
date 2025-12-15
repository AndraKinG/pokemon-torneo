"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

export default function NavBar() {
  const sb = useMemo(() => {
    try {
      return getSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  const [uid, setUid] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  async function refreshOnce() {
    if (!sb) return;

    setLoading(true);
    try {
      const { data, error } = await sb.auth.getSession();
      if (error) {
        setUid(null);
        setName("");
        return;
      }

      const userId = data.session?.user?.id ?? null;
      setUid(userId);

      if (!userId) {
        setName("");
        return;
      }

      const { data: profile } = await sb.from("profiles").select("display_name").eq("id", userId).single();
      setName(profile?.display_name ?? "Mi cuenta");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshOnce();
    if (!sb) return;

    const { data: sub } = sb.auth.onAuthStateChange(() => refreshOnce());
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sb]);

  return (
    <nav style={{ display: "flex", gap: 16, padding: 12, borderBottom: "1px solid #ddd", alignItems: "center" }}>
      <Link href="/equipo">Equipos</Link>
      <Link href="/capturas">Capturas</Link>
      <Link href="/historia">Historia</Link>
      <Link href="/reglas">Reglas</Link>

      <div style={{ marginLeft: "auto" }}>
        {!sb ? (
          <span>—</span>
        ) : loading ? (
          <span>…</span>
        ) : uid ? (
          <Link href="/mi-panel">
            <b>{name || "Mi cuenta"}</b>
          </Link>
        ) : (
          <Link href="/login">Login</Link>
        )}
      </div>
    </nav>
  );
}

