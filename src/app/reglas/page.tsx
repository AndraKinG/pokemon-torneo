"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type RuleRow = {
  id: number;
  content: string;
  updated_at: string;
};

type Profile = {
  role: "player" | "admin";
  display_name: string;
};

export default function ReglasPage() {

  if (!supabase) {
    return <div style={{ padding: 16 }}>Supabase no configurado.</div>;
  }
  const [content, setContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    setMsg("");

    // 1) reglas
    const r = await supabase.from("rules").select("*").eq("id", 1).single();
    if (r.error) return setMsg(r.error.message);

    const row = r.data as RuleRow;
    setContent(row.content ?? "");
    setSavedContent(row.content ?? "");

    // 2) ver si soy admin
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) {
      setIsAdmin(false);
      setEditing(false);
      return;
    }

    const p = await supabase
      .from("profiles")
      .select("role, display_name")
      .eq("id", uid)
      .single();

    if (p.error) {
      setIsAdmin(false);
      setEditing(false);
      return;
    }

    const prof = p.data as Profile;
    setIsAdmin(prof.role === "admin");
  }

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
  }, []);

  async function save() {
    setMsg("");

    const { error } = await supabase
      .from("rules")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", 1);

    if (error) setMsg(error.message);
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
