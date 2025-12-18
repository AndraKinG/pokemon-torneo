"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const sb = supabaseBrowser();
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function login() {
    setMsg("");
    setBusy(true);

    const { error } = await sb.auth.signInWithPassword({
      email,
      password,
    });

    setBusy(false);

    if (error) return setMsg(error.message);

    router.push("/mi-panel");
  }

  async function register() {
  setMsg("");

  const username = displayName.trim();
  if (!username) return setMsg("El nombre de usuario es obligatorio.");

  setBusy(true);
  try {
    const { data, error } = await sb.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) return setMsg(error.message);

    const user = data.user;
    if (!user) return setMsg("No se pudo crear el usuario.");

    // Ahora que hay sesión, RLS permite esto
    const { error: profileErr } = await sb.from("profiles").upsert(
      {
        id: user.id,
        display_name: username,
        role: "player",
      },
      { onConflict: "id" }
    );

    if (profileErr) return setMsg(profileErr.message);

    router.push("/mi-panel");
    router.refresh();
  } catch (e: any) {
    setMsg(e?.message ?? "Error desconocido");
  } finally {
    setBusy(false);
  }
}

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", padding: "0 16px" }}>
      <h1>{mode === "login" ? "Login" : "Registro"}</h1>

      <div style={{ display: "grid", gap: 12 }}>
        {mode === "register" && (
          <input
            placeholder="Nombre de usuario"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={busy}
          />
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
        />

        {msg && <div style={{ color: "crimson" }}>{msg}</div>}

        {mode === "login" ? (
          <button onClick={login} disabled={busy}>
            Entrar
          </button>
        ) : (
          <button onClick={register} disabled={busy}>
            Crear cuenta
          </button>
        )}

        <button
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          style={{ background: "transparent", border: "none", color: "#555" }}
        >
          {mode === "login"
            ? "¿No tienes cuenta? Regístrate"
            : "¿Ya tienes cuenta? Login"}
        </button>
      </div>
    </div>
  );
}
