"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import PokemonSprite from "@/components/PokemonSprite";

type CaptureStatus = "vivo" | "muerto" | "no_capturado";

type Capture = {
  id: number;
  user_id: string;
  pokemon: string;
  nickname: string;
  route: string | null;
  route_id: number | null;
  game_id: number | null;
  status: CaptureStatus;
  captured_at: string;
};

type TeamSlot = {
  id: number;
  user_id: string;
  slot: number;
  pokemon: string;
  nickname: string | null;
};

type Profile = {
  id: string;
  display_name: string;
  role?: "player" | "admin";
};

function clampBadges(n: any) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(8, Math.floor(x)));
}

function BadgeSprite({ index, filled }: { index: number; filled: boolean }) {
  const label = `Medalla ${index + 1}`;
  const opacity = filled ? 1 : 0.22;
  const stroke = filled ? "#111" : "#777";
  const bg = filled ? "#fff" : "#f7f7f7";

  return (
    <div
      title={label}
      aria-label={label}
      style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        border: `1px solid ${filled ? "#ddd" : "#e6e6e6"}`,
        background: bg,
        display: "grid",
        placeItems: "center",
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" style={{ opacity }} role="img">
        <circle cx="12" cy="12" r="9" fill="none" stroke={stroke} strokeWidth="2" />
        <path
          d="M12 7.2l1.2 2.7 3 .3-2.25 1.9.7 2.9L12 13.5 9.35 15l.7-2.9L7.8 10.2l3-.3L12 7.2z"
          fill={filled ? "#111" : "#777"}
        />
      </svg>
    </div>
  );
}

export default function MiPanelPage() {
  const sb = useMemo(() => supabaseBrowser(), []);

  function cardStyle() {
    return {
      border: "1px solid #ddd",
      borderRadius: 16,
      background: "white",
      padding: 14,
    } as const;
  }

  const [msg, setMsg] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [activeGameId, setActiveGameId] = useState<number | null>(null);
  const [games, setGames] = useState<{ id: number; name: string }[]>([]);
  const [routes, setRoutes] = useState<{ id: number; game_id: number; name: string; name_es?: string | null }[]>([]);

  const [captures, setCaptures] = useState<Capture[]>([]);
  const [teamSlots, setTeamSlots] = useState<TeamSlot[]>([]);

  const [teamInput, setTeamInput] = useState<Record<number, string>>({
    1: "",
    2: "",
    3: "",
    4: "",
    5: "",
    6: "",
  });

  const [pokemon, setPokemon] = useState("");
  const [nickname, setNickname] = useState("");
  const [routeId, setRouteId] = useState<number | "">("");
  const [status, setStatus] = useState<CaptureStatus>("vivo");

  const [myBadges, setMyBadges] = useState<number>(0);
  const [myProgressUpdatedAt, setMyProgressUpdatedAt] = useState<string | null>(null);

  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const apply = () => setIsDesktop(mq.matches);
    apply();

    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    } else {
      // @ts-ignore
      mq.addListener(apply);
      // @ts-ignore
      return () => mq.removeListener(apply);
    }
  }, []);

  // Lista de Pokémon para autocompletar (PokeAPI)
  const [allPokemon, setAllPokemon] = useState<string[]>([]);
  const [pokemonLoading, setPokemonLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPokemonList() {
      try {
        setPokemonLoading(true);
        const res = await fetch("https://pokeapi.co/api/v2/pokemon?limit=2000");
        const json = await res.json();
        const names: string[] = (json?.results ?? []).map((r: any) => r.name);
        if (!cancelled) setAllPokemon(names);
      } catch {
        // silencio
      } finally {
        if (!cancelled) setPokemonLoading(false);
      }
    }

    loadPokemonList();
    return () => {
      cancelled = true;
    };
  }, []);

  const aliveCaptures = useMemo(() => captures.filter((c) => c.status === "vivo"), [captures]);

  const alivePokemonSet = useMemo(() => {
    return new Set(aliveCaptures.map((c) => c.pokemon.trim().toLowerCase()));
  }, [aliveCaptures]);

  const nicknameByPokemon = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of aliveCaptures) m.set(c.pokemon.trim().toLowerCase(), c.nickname);
    return m;
  }, [aliveCaptures]);

  function selectedRouteName(): string | null {
    if (routeId === "" || !activeGameId) return null;
    const r = routes.find((x) => x.id === routeId);
    return r?.name ?? null;
  }

  async function loadRunData() {
    const run = await sb.from("runs").select("active_game_id").eq("id", 1).single();
    if (!run.error) setActiveGameId((run.data?.active_game_id as number | null) ?? null);

    const g = await sb.from("games").select("id, name").order("name");
    if (!g.error) setGames((g.data ?? []) as any);

    const r = await sb.from("routes").select("id, game_id, name, name_es");
    if (!r.error) setRoutes((r.data ?? []) as any);
  }

  async function loadAll() {
    setMsg("");

    const { data: auth, error: authErr } = await sb.auth.getUser();
    if (authErr) {
      setUserId(null);
      setProfile(null);
      setCaptures([]);
      setTeamSlots([]);
      setMyBadges(0);
      setMyProgressUpdatedAt(null);
      return;
    }

    const uid = auth?.user?.id ?? null;
    setUserId(uid);

    await loadRunData();

    if (!uid) {
      setProfile(null);
      setCaptures([]);
      setTeamSlots([]);
      setMyBadges(0);
      setMyProgressUpdatedAt(null);
      return;
    }

    const p = await sb.from("profiles").select("id, display_name, role").eq("id", uid).maybeSingle();
    if (!p.error && p.data) setProfile(p.data as Profile);
    else setProfile(null);

    const caps = await sb.from("captures").select("*").eq("user_id", uid).order("captured_at", { ascending: false });
    if (caps.error) setMsg(caps.error.message);
    else setCaptures((caps.data ?? []) as Capture[]);

    const team = await sb.from("team_slots").select("*").eq("user_id", uid).order("slot");
    if (team.error) setMsg(team.error.message);
    else {
      const rows = (team.data ?? []) as TeamSlot[];
      setTeamSlots(rows);

      const next: Record<number, string> = { 1: "", 2: "", 3: "", 4: "", 5: "", 6: "" };
      for (const r of rows) next[r.slot] = r.pokemon ?? "";
      setTeamInput(next);
    }

    const pr = await sb.from("progress").select("user_id, badges, updated_at").eq("user_id", uid).maybeSingle();
    if (!pr.error) {
      setMyBadges(clampBadges(pr.data?.badges ?? 0));
      setMyProgressUpdatedAt(pr.data?.updated_at ?? null);
    }
  }

  useEffect(() => {
    loadAll();
    const { data: sub } = sb.auth.onAuthStateChange(() => loadAll());
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setActiveGameAsAdmin(nextGameId: number) {
    setMsg("");
    if (profile?.role !== "admin") return;

    setBusy(true);
    const up = await sb
      .from("runs")
      .update({ active_game_id: nextGameId, updated_at: new Date().toISOString() })
      .eq("id", 1);
    setBusy(false);

    if (up.error) return setMsg(up.error.message);

    setActiveGameId(nextGameId);
    setMsg("Región/juego activo actualizado ✅");
  }

  async function addCapture() {
    setMsg("");
    if (!userId) return setMsg("No estás logueado.");

    const p = pokemon.trim();
    const n = nickname.trim();
    const s = status;

    if (!activeGameId) return setMsg("Aún no hay región/juego activo seleccionado (admin).");
    if (routeId === "") return setMsg("La Ruta es obligatoria.");
    const rName = selectedRouteName();
    if (!rName) return setMsg("Ruta inválida.");
    if (!p || !n || !s) return setMsg("Pokémon, Mote y Estado son obligatorios.");

    setBusy(true);
    const ins = await sb
      .from("captures")
      .insert({
        user_id: userId,
        pokemon: p,
        nickname: n,
        status: s,
        game_id: activeGameId,
        route_id: routeId,
        route: rName,
      })
      .select("*")
      .single();
    setBusy(false);

    if (ins.error) return setMsg(ins.error.message);

    setPokemon("");
    setNickname("");
    setRouteId("");
    setStatus("vivo");
    await loadAll();
  }

  async function deleteCapture(id: number) {
    setMsg("");
    if (!userId) return;

    setBusy(true);
    const del = await sb.from("captures").delete().eq("id", id);
    setBusy(false);

    if (del.error) return setMsg(del.error.message);
    await loadAll();
  }

  async function updateCaptureStatus(id: number, newStatus: CaptureStatus) {
    setMsg("");
    if (!userId) return;

    setBusy(true);
    const up = await sb.from("captures").update({ status: newStatus }).eq("id", id);
    setBusy(false);

    if (up.error) return setMsg(up.error.message);
    await loadAll();
  }

  async function saveBadges(nextBadges: number) {
    setMsg("");
    if (!userId) return setMsg("No estás logueado.");

    const b = clampBadges(nextBadges);

    setBusy(true);
    const up = await sb
      .from("progress")
      .upsert({ user_id: userId, badges: b, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
      .select("badges, updated_at")
      .single();
    setBusy(false);

    if (up.error) return setMsg(up.error.message);

    setMyBadges(clampBadges(up.data.badges));
    setMyProgressUpdatedAt(up.data.updated_at ?? null);
    setMsg("Medallas actualizadas ✅");
  }

  async function setSlot(slot: number, pokemonName: string) {
    setMsg("");
    if (!userId) return setMsg("No estás logueado.");

    const p = pokemonName.trim();
    if (!p) return;

    const key = p.toLowerCase();
    if (!alivePokemonSet.has(key)) return setMsg("Solo puedes usar Pokémon capturados y VIVOS.");

    for (const [slotStr, val] of Object.entries(teamInput)) {
      const s = Number(slotStr);
      if (s === slot) continue;
      if ((val ?? "").trim().toLowerCase() === key) return setMsg("Ese Pokémon ya está en tu equipo. Solo puede estar una vez.");
    }

    const nick = nicknameByPokemon.get(key) ?? null;

    setBusy(true);
    const up = await sb
      .from("team_slots")
      .upsert({ user_id: userId, slot, pokemon: p, nickname: nick }, { onConflict: "user_id,slot" });
    setBusy(false);

    if (up.error) return setMsg(up.error.message);
    await loadAll();
  }

  async function clearSlot(slot: number) {
    setMsg("");
    if (!userId) return;

    setBusy(true);
    const del = await sb.from("team_slots").delete().eq("user_id", userId).eq("slot", slot);
    setBusy(false);

    if (del.error) return setMsg(del.error.message);
    await loadAll();
  }

  if (!userId) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px" }}>
        <h1>Mi panel</h1>
        <p>
          No estás logueado. Ve a <a href="/login">Login</a>.
        </p>
        {msg && <p style={{ color: "crimson" }}>{msg}</p>}
      </div>
    );
  }

  const routesForActiveGame = activeGameId ? routes.filter((r) => r.game_id === activeGameId) : [];
  const isAdmin = profile?.role === "admin";

  return (
    <div style={{ width: "100%", maxWidth: 1100, margin: "0 auto", padding: "0 16px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ marginBottom: 6 }}>Mi panel</h1>
          <p style={{ marginTop: 0, color: "#666" }}>
            Usuario: <b>{profile?.display_name ?? "..."}</b>
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a href="/equipo">Ver Equipos</a>
          <a href="/capturas">Ver Capturas</a>
          <a href="/historia">Ver Historia</a>
        </div>
      </div>

      {msg && (
        <div style={{ marginTop: 10, padding: 10, border: "1px solid #ddd", borderRadius: 12, background: "white" }}>
          {msg}
        </div>
      )}

      {/* ================== ADMIN: REGIÓN/JUEGO ACTIVO ================== */}
      <div style={{ marginTop: 18, ...cardStyle() }}>
        <h2 style={{ marginTop: 0 }}>Región / juego activo</h2>
        <p style={{ marginTop: 0, color: "#666" }}>
          Esta selección afecta a las rutas disponibles para <b>todos</b>. Solo el admin puede cambiarlo.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={activeGameId ?? ""}
            disabled={!isAdmin || busy}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!v) return;
              if (isAdmin) setActiveGameAsAdmin(v);
            }}
            style={{ padding: 10, border: "1px solid #ddd", borderRadius: 12, minWidth: 220 }}
          >
            <option value="">(Selecciona juego)</option>
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          {!isAdmin && <span style={{ color: "#888", fontSize: 13 }}>(Solo admin puede cambiarlo)</span>}
        </div>
      </div>

      {/* ================== MIS MEDALLAS ================== */}
      <div style={{ marginTop: 18, ...cardStyle() }}>
        <h2 style={{ marginTop: 0 }}>Mis medallas</h2>
        <p style={{ marginTop: 0, color: "#666" }}>
          Toca una medalla para indicar cuántas llevas (0–8). Esto alimenta el ranking de <a href="/historia">Historia</a>.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>
            {myBadges} {myBadges === 1 ? "medalla" : "medallas"}
          </div>
          <div style={{ color: "#888", fontSize: 12 }}>
            {myProgressUpdatedAt ? `registrado: ${new Date(myProgressUpdatedAt).toLocaleString()}` : "sin registro"}
          </div>
        </div>

        <div
          style={{
            marginTop: 10,
            display: "grid",
            gridTemplateColumns: isDesktop ? "repeat(8, 34px)" : "repeat(4, 34px)",
            gap: 8,
            justifyContent: "start",
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => {
            const filled = i < myBadges;
            return (
              <button
                key={i}
                disabled={busy}
                onClick={() => {
                  const next = i + 1;
                  const final = next === myBadges ? i : next;
                  setMyBadges(final);
                }}
                style={{ all: "unset", cursor: busy ? "not-allowed" : "pointer" }}
              >
                <BadgeSprite index={i} filled={filled} />
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => saveBadges(myBadges)} disabled={busy}>
            Guardar medallas
          </button>
          <button onClick={() => setMyBadges(0)} disabled={busy}>
            Poner a 0
          </button>
        </div>
      </div>

      {/* ================== MI EQUIPO ================== */}
      <div style={{ marginTop: 18, ...cardStyle() }}>
        <h2 style={{ marginTop: 0 }}>Mi equipo</h2>
        <p style={{ marginTop: 0, color: "#666" }}>
          Solo puedes seleccionar Pokémon <b>capturados y VIVOS</b>. Cada Pokémon solo puede estar <b>una vez</b>.
        </p>

        <div style={{ display: "grid", gap: 10 }}>
          {[1, 2, 3, 4, 5, 6].map((n) => {
            const current = (teamInput[n] ?? "").trim();
            const datalistId = `alive-pokemon-slot-${n}`;

            const usedByOtherSlots = new Set(
              Object.entries(teamInput)
                .filter(([slotStr]) => Number(slotStr) !== n)
                .map(([, val]) => (val ?? "").trim().toLowerCase())
                .filter(Boolean)
            );

            const availableOptions = aliveCaptures.filter((c) => {
              const key = c.pokemon.trim().toLowerCase();
              return !usedByOtherSlots.has(key);
            });

            return (
              <div
                key={n}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  border: "1px solid #eee",
                  borderRadius: 12,
                  padding: "10px 10px",
                  minWidth: 0,
                }}
              >
                <div style={{ width: 40, height: 40, display: "grid", placeItems: "center", flexShrink: 0 }}>
                  {current ? <PokemonSprite name={current} size={38} /> : null}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <input
                    list={datalistId}
                    value={teamInput[n] ?? ""}
                    placeholder={`Slot ${n}: elige un Pokémon`}
                    disabled={busy}
                    onChange={(e) => {
                      const v = e.target.value;
                      const key = v.trim().toLowerCase();

                      if (key && usedByOtherSlots.has(key)) {
                        setMsg("Ese Pokémon ya está en tu equipo. Solo puede estar una vez.");
                        setTeamInput((prev) => ({ ...prev, [n]: "" }));
                        return;
                      }
                      setTeamInput((prev) => ({ ...prev, [n]: v }));
                    }}
                    onBlur={async () => {
                      const v = (teamInput[n] ?? "").trim();
                      if (!v) return;

                      const key = v.toLowerCase();

                      if (!alivePokemonSet.has(key)) {
                        setMsg("Solo puedes usar Pokémon capturados y VIVOS.");
                        setTeamInput((prev) => ({ ...prev, [n]: "" }));
                        return;
                      }
                      if (usedByOtherSlots.has(key)) {
                        setMsg("Ese Pokémon ya está en tu equipo. Solo puede estar una vez.");
                        setTeamInput((prev) => ({ ...prev, [n]: "" }));
                        return;
                      }

                      await setSlot(n, v);
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #ddd",
                      borderRadius: 12,
                      boxSizing: "border-box",
                    }}
                  />

                  <datalist id={datalistId}>
                    {availableOptions.map((c) => (
                      <option key={c.id} value={c.pokemon}>
                        {c.nickname}
                      </option>
                    ))}
                  </datalist>
                </div>

                <button onClick={() => clearSlot(n)} disabled={busy} style={{ flexShrink: 0 }}>
                  Vaciar
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================== MIS CAPTURAS (route_id + game_id) ================== */}
      <div style={{ marginTop: 18, ...cardStyle() }}>
        <h2 style={{ marginTop: 0 }}>Mis capturas</h2>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))" }}>
          <input
            required
            list="pokemon-list"
            value={pokemon}
            onChange={(e) => setPokemon(e.target.value)}
            placeholder={pokemonLoading ? "Cargando Pokémon..." : "Pokémon (obligatorio)"}
            disabled={busy}
            style={{ padding: 10, border: "1px solid #ddd", borderRadius: 12 }}
          />

          <input
            required
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Mote (obligatorio)"
            disabled={busy}
            style={{ padding: 10, border: "1px solid #ddd", borderRadius: 12 }}
          />

          <select
            required
            value={routeId}
            onChange={(e) => setRouteId(e.target.value ? Number(e.target.value) : "")}
            disabled={busy || !activeGameId}
            style={{ padding: 10, border: "1px solid #ddd", borderRadius: 12 }}
          >
            <option value="">{activeGameId ? "Ruta (obligatorio)" : "Sin juego activo (admin)"}</option>
            {routesForActiveGame.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          <select
            required
            value={status}
            onChange={(e) => setStatus(e.target.value as CaptureStatus)}
            disabled={busy}
            style={{ padding: 10, border: "1px solid #ddd", borderRadius: 12 }}
          >
            <option value="vivo">Vivo</option>
            <option value="muerto">Muerto</option>
            <option value="no_capturado">No capturado</option>
          </select>
        </div>

        <datalist id="pokemon-list">
          {allPokemon.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>

        <div style={{ marginTop: 10 }}>
          <button onClick={addCapture} disabled={busy}>
            Añadir captura
          </button>
        </div>

        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          {captures.length === 0 ? (
            <p style={{ color: "#666" }}>Aún no tienes capturas.</p>
          ) : (
            captures.map((c) => {
              const isMobile = !isDesktop;

              return (
                <div
                  key={c.id}
                  style={{
                    border: "1px solid #eee",
                    borderRadius: 14,
                    padding: 12,
                    background: "white",
                    minWidth: 0,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <PokemonSprite name={c.pokemon} size={46} />
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 900,
                          fontSize: 16,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {c.nickname?.trim() ? c.nickname : "—"}
                      </div>
                      <div style={{ color: "#666", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.route || "sin ruta"}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      marginTop: isMobile ? 12 : 0,
                      justifyContent: isMobile ? "flex-start" : "flex-end",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <select
                      value={c.status}
                      onChange={(e) => updateCaptureStatus(c.id, e.target.value as CaptureStatus)}
                      disabled={busy}
                      style={{
                        padding: 10,
                        border: "1px solid #ddd",
                        borderRadius: 12,
                        minWidth: isMobile ? "180px" : 0,
                      }}
                    >
                      <option value="vivo">Vivo</option>
                      <option value="muerto">Muerto</option>
                      <option value="no_capturado">No capturado</option>
                    </select>

                    <button onClick={() => deleteCapture(c.id)} disabled={busy} style={{ padding: "10px 12px" }}>
                      Borrar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
