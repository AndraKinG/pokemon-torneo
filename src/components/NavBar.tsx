"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function NavBar() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const running = useRef(false);

  const [uid, setUid] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  async function refreshOnce() {
    if (running.current) return; // evita doble llamada
    running.current = true;

    setLoading(true);
    try {
      // Mejor que getSession para UI: devuelve rápido o error claro
      const { data, error } = await sb.auth.getUser();
      if (error) {
        setUid(null);
        setName("");
        return;
      }

      const userId = data.user?.id ?? null;
      setUid(userId);

      if (!userId) {
        setName("");
        return;
      }

      const { data: profile } = await sb
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .maybeSingle();

      setName(profile?.display_name ?? "Mi cuenta");
    } finally {
      setLoading(false);
      running.current = false;
    }
  }

  useEffect(() => {
    refreshOnce();
    const { data: sub } = sb.auth.onAuthStateChange(() => refreshOnce());
    return () => sub.subscription.unsubscribe();
  }, [sb]);

  return (
    <nav style={{ display: "flex", gap: 16, padding: 12, borderBottom: "1px solid #ddd", alignItems: "center" }}>
      <Link href="/equipo">Equipos</Link>
      <Link href="/capturas">Capturas</Link>
      <Link href="/historia">Historia</Link>
      <Link href="/reglas">Reglas</Link>

      <div style={{ marginLeft: "auto" }}>
        {loading ? (
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
