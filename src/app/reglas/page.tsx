"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type RuleRow = {
  id: number;
  content: string;
  updated_at: string;
};

type Profile = {
  role: "player" | "admin";
  display_name: string;
};

function withTimeout<T>(p: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}


export default function ReglasPage() {
  const sb = useMemo(() => supabaseBrowser(), []);

  const [content, setContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState("");

  const loadingRef = useRef(false);

  async function load() {
    if (loadingRef.current) return; // evita llamadas solapadas
    loadingRef.current = true;

    setMsg("");

    // 1) reglas (con timeout)
    const r = await withTimeout(sb.from("rules").select("*").eq("id", 1).single(), 6000).catch(() => null);

    if (!r) {
      setMsg("Timeout cargando reglas.");
      loadingRef.current = false;
      return;
    }
    if ((r as any).error) {
      setMsg((r as any).error.message);
      loadingRef.current = false;
      return;
    }

    const row = (r as any).data as RuleRow;
    setContent(row.content ?? "");
    setSavedContent(row.content ?? "");

    // 2) ver si soy admin (getUser con timeout)
    const authRes = await withTimeout(sb.auth.getUser(), 6000).catch(() => null);

    if (!authRes || (authRes as any).error) {
      setIsAdmin(false);
      setEditing(false);
      loadingRef.current = false;
      return;
    }

    const uid = (authRes as any).data?.user?.id ?? null;

    if (!uid) {
      setIsAdmin(false);
      setEditing(false);
      loadingRef.current = false;
      return;
    }

    // 3) perfil (maybeSingle para no romper)
    const p = await withTimeout(
      sb.from("profiles").select("role, display_name").eq("id", uid).maybeSingle(),
      6000
    ).catch(() => null);

    if (!p || (p as any).error || !(p as any).data) {
      setIsAdmin(false);
      setEditing(false);
      loadingRef.current = false;
      return;
    }

    const prof = (p as any).data as Profile;
    setIsAdmin(prof.role === "admin");

    loadingRef.current = false;
  }

  useEffect(() => {
    load();

    const { data: sub } = sb.auth.onAuthStateChange(() => load());

    // 🔁 reintenta al volver a la pestaña/ventana
    const onVis = () => {
      if (document.visibilityState === "visible") load();
    };
    const onFocus = () => load();

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);

    return () => {
      sub.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setMsg("");

    const up = await withTimeout(
      sb.from("rules").update({ content, updated_at: new Date().toISOString() }).eq("id", 1),
      6000
    ).catch(() => null);

    if (!up) return setMsg("Timeout guardando reglas.");
    if ((up as any).error) setMsg((up as any).error.message);
    else {
      setSavedContent(content);
      setEditing(false);
      setMsg("Reglas guardadas ✅");
    }
  }

  function cancel() {
    setContent(savedContent);
    setEditing(false);
    setMsg("");
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <h1>Reglas</h1>

      {msg && <p>{msg}</p>}

      {!editing ? (
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 12,
            whiteSpace: "pre-wrap",
            lineHeight: 1.5,
          }}
        >
          {savedContent || <span style={{ color: "#777" }}>No hay reglas aún.</span>}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={14}
            style={{ width: "100%", padding: 10 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={save}>Guardar</button>
            <button onClick={cancel}>Cancelar</button>
          </div>
        </div>
      )}

      {isAdmin && !editing && (
        <div style={{ marginTop: 12 }}>
          <button onClick={() => setEditing(true)}>Editar reglas (admin)</button>
        </div>
      )}
    </div>
  );
}
