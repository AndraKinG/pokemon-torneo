"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function LoginPage() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrMsg(null);
    setLoading(true);

    try {
      console.log("LOGIN: antes signIn");

      const res = await Promise.race([
        sb.auth.signInWithPassword({
          email: email.trim(),
          password,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout (10s): la request no respondió")), 10000)
        ),
      ]);

      console.log("LOGIN: después signIn", res);

      if (res.error) {
        setErrMsg(res.error.message);
        return;
      }

      router.push("/mi-panel");
      router.refresh();
    } catch (err: any) {
      console.error("LOGIN ERROR", err);
      setErrMsg(err?.message ?? "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420 }}>
      <h1>Login</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
        />

        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          type="password"
          autoComplete="current-password"
        />

        <button type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>

        {errMsg && <p style={{ color: "crimson" }}>{errMsg}</p>}
      </form>
    </div>
  );
}
