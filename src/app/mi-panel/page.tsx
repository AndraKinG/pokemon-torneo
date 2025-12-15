"use client";

import React, { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
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
  // ✅ Cliente SOLO en browser
  const sb = useMemo(() => {
    try {
      return getSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  if (!sb) return <div style={{ padding: 16 }}>Supabase no configurado.</div>;

  const [msg, setMsg] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [activeGameId, setActiveGameId] = useState<number | null>(null);
  const [games, setGames] = useState<{ id: number; name: string }[]>([]);
  const [routes, setRoutes] = useState<{ id: number; game_id: number; name: string; name_es?: string | null }[]>([]);

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
      } finally {
        if (!cancelled) setPokemonLoading(false);
      }
    }

    loadPokemonList();
    return () => {
      cancelled = true;
    };
  }, []);

  const [captures, setCaptures] = useState<Capture[]>([]);
  const [pokemon, setPokemon] = useState("");
  const [nickname, setNickname] = useState("");
  const [routeId, setRouteId] = useState<number | "">("");
  const [status, setStatus] = useState<CaptureStatus>("vivo");

  const [teamSlots, setTeamSlots] = useState<TeamSlot[]>([]);
  const [teamInput, setTeamInput] = useState<Record<number, string>>({ 1: "", 2: "", 3: "", 4: "", 5: "", 6: "" });

  const [myBadges, setMyBadges] = useState<number>(0);
  const [myProgressUpdatedAt, setMyProgressUpdatedAt] = useState<string | null>(null);

  const aliveCaptures = useMemo(() => captures.filter((c) => c.status === "vivo"), [captures]);

  const alivePokemonSet = useMemo(() => {
    return new Set(aliveCaptures.map((c) => c.pokemon.trim().toLowerCase()));
  }, [aliveCaptures]);

  const nicknameByPokemon = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of aliveCaptures) m.set(c.pokemon.trim().toLowerCase(), c.nickname);
    return m;
  }, [aliveCaptures]);

  const routesForActiveGame = useMemo(() => {
    if (!activeGameId) return [];
    return routes.filter((r) => r.game_id === activeGameId).sort((a, b) => a.name.localeCompare(b.name));
  }, [routes, activeGameId]);

  useEffect(() => {
    setRouteId("");
  }, [activeGameId]);

  function cardStyle() {
    return {
      border: "1px solid #ddd",
      borderRadius: 16,
      background: "white",
      padding: 14,
    } as const;
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

    const { data: auth } = await sb.auth.getUser();
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

    const p = await sb.from("profiles").select("id, display_name, role").eq("id", uid).single();
    if (!p.error && p.data) setProfile(p.data as Profile);

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

    const { data: sub } = sb.auth.onAuthStateChange(() => {
      loadAll();
    });

    return () => {
      sub?.subscription?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setActiveGameAsAdmin(nextGameId: number) {
    setMsg("");
    if (profile?.role !== "admin") return;

    setBusy(true);
    const up = await sb.from("runs").update({ active_game_id: nextGameId, updated_at: new Date().toISOString() }).eq("id", 1);
    setBusy(false);

    if (up.error) return setMsg(up.error.message);

    setActiveGameId(nextGameId);
    setMsg("Región/juego activo actualizado ✅");
  }

  function selectedRouteName(): string | null {
    if (routeId === "" || !activeGameId) return null;
    const r = routesForActiveGame.find((x) => x.id === routeId);
    return r?.name ?? null;
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

  async function removeFromTeamIfNotAlive(pokemonName: string) {
    if (!userId) return;
    const p = pokemonName.trim();
    if (!p) return;

    setBusy(true);
    const del = await sb.from("team_slots").delete().eq("user_id", userId).eq("pokemon", p);
    setBusy(false);

    if (del.error) setMsg(del.error.message);
  }

  async function updateCaptureStatus(id: number, newStatus: CaptureStatus) {
    setMsg("");
    if (!userId) return;

    const cap = captures.find((c) => c.id === id);

    setBusy(true);
    const up = await sb.from("captures").update({ status: newStatus }).eq("id", id);
    setBusy(false);

    if (up.error) return setMsg(up.error.message);

    if (cap && newStatus !== "vivo") await removeFromTeamIfNotAlive(cap.pokemon);
    await loadAll();
  }

  async function deleteCapture(id: number) {
    setMsg("");
    if (!userId) return;

    const cap = captures.find((c) => c.id === id);

    setBusy(true);
    const del = await sb.from("captures").delete().eq("id", id);
    setBusy(false);

    if (del.error) return setMsg(del.error.message);

    if (cap?.pokemon) await removeFromTeamIfNotAlive(cap.pokemon);
    await loadAll();
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
    const up = await sb.from("team_slots").upsert({ user_id: userId, slot, pokemon: p, nickname: nick }, { onConflict: "user_id,slot" });
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

  if (!userId) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px" }}>
        <h1>Mi panel</h1>
        <p>
          No estás logueado. Ve a <a href="/login">Login</a>.
        </p>
      </div>
    );
  }

  const isAdmin = profile?.role === "admin";

  // --- A PARTIR DE AQUÍ TU JSX ES EL MISMO ---
  // (no lo recorto porque ya lo tienes; sólo cambia supabase -> sb en handlers)
  return (
    <div style={{ width: "100%", maxWidth: 1100, margin: "0 auto", padding: "0 16px" }}>
      {/* ...tu JSX igual... */}
    </div>
  );
}
