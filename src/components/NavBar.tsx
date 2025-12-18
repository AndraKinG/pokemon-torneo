"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

function withTimeout<T>(p: Promise<T>, ms: number) {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

export default function NavBar() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const running = useRef(false);

  const [uid, setUid] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const refreshOnce = useCallback(async () => {
    if (running.current) return;
    running.current = true;

    setLoading(true);
    try {
      // ⛑️ timeout para evitar "..." infinito
      const { data, error } = await withTimeout(sb.auth.getUser(), 6000);

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

      const { data: profile } = await withTimeout(
        sb.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
        6000
      );

      setName(profile?.display_name ?? "Mi cuenta");
    } catch {
      // ⛑️ si se cuelga, salimos de loading
      setUid(null);
      setName("");
    } finally {
      setLoading(false);
      running.current = false;
    }
  }, [sb]);

  useEffect(() => {
    refreshOnce();

    const { data: sub } = sb.auth.onAuthStateChange(() => refreshOnce());

    // 🔁 reintenta al volver a la pestaña/ventana
    const onVis = () => {
      if (document.visibilityState === "visible") refreshOnce();
    };
    const onFocus = () => refreshOnce();

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);

    return () => {
      sub.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
    };
  }, [sb, refreshOnce]);

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
