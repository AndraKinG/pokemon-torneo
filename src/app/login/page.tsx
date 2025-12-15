"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {

  if (!supabase) {
    return <div style={{ padding: 16 }}>Supabase no configurado.</div>;
  }
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signUp() {
  setMsg("...");
  setLoading(true);

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: email.split("@")[0] } },
  });

  setLoading(false);

  if (error) setMsg(error.message);
  else setMsg("Cuenta creada. Ahora inicia sesión.");
}


  async function signIn() {
  setMsg("...");
  setLoading(true);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  setLoading(false);

  if (error) setMsg(error.message);
  else router.push("/mi-panel");
}


  async function signOut() {
    await supabase.auth.signOut();
    setMsg("Sesión cerrada.");
  }

  return (
    <div style={{ maxWidth: 360 }}>
      <h1>Login</h1>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", padding: 8, marginBottom: 8 }}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", padding: 8, marginBottom: 8 }}
      />

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={signIn} disabled={loading}>Entrar</button>
<button onClick={signUp} disabled={loading}>Registrarse</button>
<button onClick={signOut} disabled={loading}>Salir</button>

      </div>

      <p>{msg}</p>
    </div>
  );
}
