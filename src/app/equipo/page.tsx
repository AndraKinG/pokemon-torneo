"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import PokemonSprite from "@/components/PokemonSprite";

type Slot = {
  id: number;
  user_id: string;
  slot: number;
  pokemon: string;
  nickname?: string | null; // 👈 mote (si existe en la tabla)
};

type Profile = { id: string; display_name: string };

function hashToIndex(str: string, mod: number) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % mod;
}

const TRAINER_AVATARS = [
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/red.png",
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/leaf.png",
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/ethan.png",
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/lyra.png",
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/brendan.png",
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/may.png",
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/lucas.png",
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/dawn.png",
];

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

export default function EquiposPage() {
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

  async function load() {
    setMsg("");

    const p = await supabase.from("profiles").select("id, display_name");

    // 👇 Usamos "*" para que si existe nickname en team_slots lo traiga
    // y si no existe, NO rompe (simplemente no vendrá y será undefined).
    const t = await supabase.from("team_slots").select("*").order("slot");

    if (p.error) return setMsg(p.error.message);
    if (t.error) return setMsg(t.error.message);

    setProfiles((p.data ?? []) as Profile[]);
    setSlots((t.data ?? []) as Slot[]);
  }

  useEffect(() => {
    load();
  }, []);

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const pr of profiles) m.set(pr.id, pr.display_name);
    return m;
  }, [profiles]);

  const users = useMemo(() => {
    const ids = profiles.map((p) => p.id);
    const filledCount = new Map<string, number>();
    for (const s of slots) filledCount.set(s.user_id, (filledCount.get(s.user_id) ?? 0) + 1);
    return ids.sort((a, b) => (filledCount.get(b) ?? 0) - (filledCount.get(a) ?? 0));
  }, [profiles, slots]);

  useEffect(() => {
    if (users.length === 0) return;
    setActiveIndex((i) => mod(i, users.length));
  }, [users.length]);

  function getTeam(uid: string) {
    const team = new Map<number, { pokemon: string; nickname: string | null }>();
    for (const s of slots) {
      if (s.user_id === uid) team.set(s.slot, { pokemon: s.pokemon, nickname: s.nickname ?? null });
    }
    return team;
  }

  function prev() {
    if (!users.length) return;
    setActiveIndex((i) => i - 1);
  }
  function next() {
    if (!users.length) return;
    setActiveIndex((i) => i + 1);
  }

  // swipe
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    setTouchStartX(e.touches[0]?.clientX ?? null);
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX == null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX;
    const dx = endX - touchStartX;
    setTouchStartX(null);
    if (Math.abs(dx) < 40) return;
    if (dx > 0) prev();
    else next();
  }

  const leftIndex = users.length ? mod(activeIndex - 1, users.length) : 0;
  const centerIndex = users.length ? mod(activeIndex, users.length) : 0;
  const rightIndex = users.length ? mod(activeIndex + 1, users.length) : 0;

  return (
    <div style={{ width: "100%", maxWidth: 1200, margin: "0 auto", padding: "0 16px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ marginBottom: 6 }}>Equipos</h1>
          <p style={{ marginTop: 0 }}>
            Vista pública. Para editar tu equipo ve a <a href="/mi-panel">Mi panel</a>.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={prev} disabled={users.length === 0}>
            ◀
          </button>
          <button onClick={next} disabled={users.length === 0}>
            ▶
          </button>
        </div>
      </div>

      {msg && <p>{msg}</p>}

      {users.length === 0 ? (
        <p>No hay jugadores aún.</p>
      ) : (
        <>
          {/* Slider infinito (Desktop=3, Mobile=1) */}
          <div
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            style={{ display: "grid", placeItems: "center", marginTop: 12, userSelect: "none" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 18,
                width: "100%",
                maxWidth: isDesktop ? 1180 : "100%",
                padding: isDesktop ? "8px 0 14px" : "8px 8px 14px",
                boxSizing: "border-box",
              }}
            >
              {isDesktop ? (
                <>
                  <TrainerCard
                    uid={users[leftIndex]}
                    name={nameById.get(users[leftIndex]) ?? `Jugador ${users[leftIndex].slice(0, 6)}`}
                    avatar={TRAINER_AVATARS[hashToIndex(users[leftIndex], TRAINER_AVATARS.length)]}
                    team={getTeam(users[leftIndex])}
                    variant="side"
                    onClick={prev}
                    isDesktop={isDesktop}
                  />

                  <TrainerCard
                    uid={users[centerIndex]}
                    name={nameById.get(users[centerIndex]) ?? `Jugador ${users[centerIndex].slice(0, 6)}`}
                    avatar={TRAINER_AVATARS[hashToIndex(users[centerIndex], TRAINER_AVATARS.length)]}
                    team={getTeam(users[centerIndex])}
                    variant="center"
                    onClick={() => {}}
                    isDesktop={isDesktop}
                  />

                  <TrainerCard
                    uid={users[rightIndex]}
                    name={nameById.get(users[rightIndex]) ?? `Jugador ${users[rightIndex].slice(0, 6)}`}
                    avatar={TRAINER_AVATARS[hashToIndex(users[rightIndex], TRAINER_AVATARS.length)]}
                    team={getTeam(users[rightIndex])}
                    variant="side"
                    onClick={next}
                    isDesktop={isDesktop}
                  />
                </>
              ) : (
                <TrainerCard
                  uid={users[centerIndex]}
                  name={nameById.get(users[centerIndex]) ?? `Jugador ${users[centerIndex].slice(0, 6)}`}
                  avatar={TRAINER_AVATARS[hashToIndex(users[centerIndex], TRAINER_AVATARS.length)]}
                  team={getTeam(users[centerIndex])}
                  variant="center"
                  onClick={() => {}}
                  isDesktop={isDesktop}
                />
              )}
            </div>

            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 14 }}>
              {users.map((_, i) => (
                <span
                  key={i}
                  style={{
                    width: i === mod(activeIndex, users.length) ? 26 : 8,
                    height: 8,
                    borderRadius: 999,
                    background: "#ddd",
                    transition: "width 160ms ease",
                  }}
                />
              ))}
            </div>
          </div>
        </>
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
  const scale = isCenter ? 1 : 0.86;
  const opacity = isCenter ? 1 : 0.45;

  return (
    <div
      key={uid}
      onClick={onClick}
      style={{
        width: isCenter ? (isDesktop ? 420 : "100%") : 340,
        maxWidth: isCenter ? (isDesktop ? 420 : 560) : 340,
        border: "1px solid #ddd",
        borderRadius: 16,
        padding: 14,
        background: "white",
        transform: `scale(${scale})`,
        opacity,
        transition: "transform 220ms ease, opacity 220ms ease",
        cursor: isCenter ? "default" : "pointer",
        boxShadow: isCenter ? "0 14px 36px rgba(0,0,0,0.12)" : "none",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
        <img
          src={avatar}
          alt="trainer"
          width={66}
          height={66}
          style={{ imageRendering: "pixelated", flexShrink: 0 }}
          onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
        />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: isCenter ? 22 : 16,
              fontWeight: 900,
              lineHeight: 1.1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {name}
          </div>
          <div style={{ color: "#666", fontSize: 13 }}>Equipo en uso (1–6)</div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
        {[1, 2, 3, 4, 5, 6].map((n) => {
          const entry = team.get(n);
          const pokemonName = entry?.pokemon;
          const nickname = entry?.nickname;

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
                minWidth: 0,
              }}
            >
              {/* sprite */}
              {pokemonName ? (
                <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
                  <PokemonSprite name={pokemonName} size={34} />
                </div>
              ) : (
                <div style={{ width: 34, height: 34 }} />
              )}

              {/* texto: SOLO mote */}
              <span
                style={{
                  marginLeft: "auto",
                  fontWeight: 800,
                  textAlign: "right",
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                }}
              >
                {nickname?.trim() ? nickname : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
