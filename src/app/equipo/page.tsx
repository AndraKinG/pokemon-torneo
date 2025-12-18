"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import PokemonSprite from "@/components/PokemonSprite";
import { avatarSrcFromKey } from "@/lib/avatars";

type Slot = {
  id: number;
  user_id: string;
  slot: number;
  pokemon: string;
  nickname?: string | null;
};

type Profile = {
  id: string;
  display_name: string;
  avatar_key?: string | null;
};

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

export default function EquiposPage() {
  const sb = useMemo(() => supabaseBrowser(), []);

  const [slots, setSlots] = useState<Slot[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [msg, setMsg] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  // Desktop detection
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  async function load() {
    setMsg("");

    const p = await sb.from("profiles").select("id, display_name, avatar_key");
    const t = await sb.from("team_slots").select("*").order("slot");

    if (p.error) return setMsg(p.error.message);
    if (t.error) return setMsg(t.error.message);

    setProfiles(p.data ?? []);
    setSlots(t.data ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    profiles.forEach((p) => m.set(p.id, p.display_name));
    return m;
  }, [profiles]);

  const avatarById = useMemo(() => {
    const m = new Map<string, string | null>();
    profiles.forEach((p) => m.set(p.id, p.avatar_key ?? null));
    return m;
  }, [profiles]);

  const users = useMemo(() => {
    const ids = profiles.map((p) => p.id);
    const filledCount = new Map<string, number>();
    slots.forEach((s) =>
      filledCount.set(s.user_id, (filledCount.get(s.user_id) ?? 0) + 1)
    );
    return ids.sort((a, b) => (filledCount.get(b) ?? 0) - (filledCount.get(a) ?? 0));
  }, [profiles, slots]);

  useEffect(() => {
    if (users.length === 0) return;
    setActiveIndex((i) => mod(i, users.length));
  }, [users.length]);

  function getTeam(uid: string) {
    const team = new Map<number, { pokemon: string; nickname: string | null }>();
    slots.forEach((s) => {
      if (s.user_id === uid)
        team.set(s.slot, { pokemon: s.pokemon, nickname: s.nickname ?? null });
    });
    return team;
  }

  function prev() {
    if (users.length) setActiveIndex((i) => i - 1);
  }
  function next() {
    if (users.length) setActiveIndex((i) => i + 1);
  }

  const centerIndex = users.length ? mod(activeIndex, users.length) : 0;
  const leftIndex = users.length ? mod(activeIndex - 1, users.length) : 0;
  const rightIndex = users.length ? mod(activeIndex + 1, users.length) : 0;

  return (
    <div style={{ width: "100%", maxWidth: 1200, margin: "0 auto", padding: "0 16px" }}>
      <h1>Equipos</h1>
      <p>
        Vista pública. Para editar tu equipo ve a <a href="/mi-panel">Mi panel</a>.
      </p>

      {msg && <p>{msg}</p>}

      {users.length === 0 ? (
        <p>No hay jugadores aún.</p>
      ) : (
        <div style={{ display: "grid", placeItems: "center", marginTop: 16 }}>
          <div style={{ display: "flex", gap: 18 }}>
            {isDesktop && (
              <TrainerCard
                uid={users[leftIndex]}
                name={nameById.get(users[leftIndex])!}
                avatar={avatarSrcFromKey(avatarById.get(users[leftIndex]) ?? undefined)}
                team={getTeam(users[leftIndex])}
                variant="side"
                onClick={prev}
	        isDesktop={isDesktop}
              />
            )}

            <TrainerCard
              uid={users[centerIndex]}
              name={nameById.get(users[centerIndex])!}
              avatar={avatarSrcFromKey(avatarById.get(users[centerIndex]) ?? undefined)}
              team={getTeam(users[centerIndex])}
              variant="center"
              onClick={() => {}}
	      isDesktop={isDesktop}
            />

            {isDesktop && (
              <TrainerCard
                uid={users[rightIndex]}
                name={nameById.get(users[rightIndex])!}
                avatar={avatarSrcFromKey(avatarById.get(users[rightIndex]) ?? undefined)}
                team={getTeam(users[rightIndex])}
                variant="side"
                onClick={next}
	        isDesktop={isDesktop}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TrainerCard({
  uid,
  name,
  avatar,
  team,
  variant,
  onClick,
  isDesktop,
}: {
  uid: string;
  name: string;
  avatar: string;
  team: Map<number, { pokemon: string; nickname: string | null }>;
  variant: "center" | "side";
  onClick: () => void;
  isDesktop: boolean;
}) {
  const isCenter = variant === "center";

  return (
    <div
      onClick={onClick}
      style={{
        width: isDesktop
  ? isCenter
    ? 420
    : 340
  : "100%",
maxWidth: isDesktop ? undefined : 520,
        border: "1px solid #ddd",
        borderRadius: 16,
        padding: 14,
        background: "white",
        opacity: isCenter ? 1 : 0.45,
        cursor: isCenter ? "default" : "pointer",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <img
          src={avatar}
          alt="avatar"
          width={64}
          height={64}
          style={{ imageRendering: "pixelated", borderRadius: 12 }}
        />
        <div>
          <div style={{ fontSize: isCenter ? 22 : 16, fontWeight: 900 }}>
            {name}
          </div>
          <div style={{ fontSize: 13, color: "#666" }}>Equipo en uso</div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
        {[1, 2, 3, 4, 5, 6].map((n) => {
          const entry = team.get(n);
          return (
            <div
              key={n}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                border: "1px solid #eee",
                borderRadius: 12,
                padding: "8px 10px",
              }}
            >
              {entry?.pokemon ? (
                <PokemonSprite name={entry.pokemon} size={34} />
              ) : (
                <div style={{ width: 34, height: 34 }} />
              )}
              <span style={{ marginLeft: "auto", fontWeight: 800 }}>
                {entry?.nickname ?? "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
