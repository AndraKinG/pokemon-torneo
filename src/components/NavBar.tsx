"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

function withTimeout<T>(p: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

export default function NavBar() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const running = useRef(false);

  const [uid, setUid] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  async function refreshOnce() {
    if (running.current) return;
    running.current = true;

    setLoading(true);
    try {
      // auth
      const authRes: any = await withTimeout(sb.auth.getUser(), 6000).catch(() => null);

      if (!authRes || authRes.error) {
        setUid(null);
        setName("");
        return;
      }

      const userId: string | null = authRes.data?.user?.id ?? null;
      setUid(userId);

      if (!userId) {
        setName("");
        return;
      }

      // profile
      const profRes: any = await withTimeout(
        sb.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
        6000
      ).catch(() => null);

      const displayName = profRes?.data?.display_name ?? "Mi cuenta";
      setName(displayName);
    } finally {
      setLoading(false);
      running.current = false;
    }
  }

  useEffect(() => {
    refreshOnce();

    const { data: sub } = sb.auth.onAuthStateChange(() => refreshOnce());

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
