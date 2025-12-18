"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import PokemonSprite from "@/components/PokemonSprite";
import { avatarSrcFromKey } from "@/lib/avatars";

type Profile = {
  id: string;
  display_name: string;
  avatar_key?: string | null;
};

type Status = "all" | "vivo" | "muerto" | "no_capturado";

type Capture = {
  id: number;
  user_id: string;
  pokemon: string;
  nickname: string | null;
  route: string | null;
  status: "vivo" | "muerto" | "no_capturado";
  captured_at: string;
};

function badgeStyle(status: Capture["status"]) {
  if (status === "vivo") return { background: "#e8fff0", border: "1px solid #b8f5cd", color: "#1f7a3a" };
  if (status === "muerto") return { background: "#ffecec", border: "1px solid #ffbcbc", color: "#a11616" };
  return { background: "#f3f3f3", border: "1px solid #ddd", color: "#555" };
}

function statusLabel(status: Capture["status"]) {
  if (status === "no_capturado") return "No capturado";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function pillStyle(active: boolean) {
  return {
    padding: "7px 12px",
    borderRadius: 999,
    border: "1px solid #ddd",
    background: active ? "#111" : "white",
    color: active ? "white" : "#111",
    fontWeight: 800 as const,
    cursor: "pointer",
    width: "100%",
  };
}

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

export default function CapturasPorJugadorPage() {
  const sb = useMemo(() => supabaseBrowser(), []);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [msg, setMsg] = useState("");

  const [activeIndex, setActiveIndex] = useState(0);
  const [statusFilter, setStatusFilter] = useState<Status>("all");

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
    const c = await sb.from("captures").select("*").order("captured_at", { ascending: false });

    if (p.error) return setMsg(p.error.message);
    if (c.error) return setMsg(c.error.message);

    setProfiles(p.data ?? []);
    setCaptures(c.data ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const users = useMemo(() => {
    const count = new Map<string, number>();
    for (const cap of captures) count.set(cap.user_id, (count.get(cap.user_id) ?? 0) + 1);
    return [...profiles].sort((a, b) => (count.get(b.id) ?? 0) - (count.get(a.id) ?? 0));
  }, [profiles, captures]);

  useEffect(() => {
    if (users.length === 0) return;
    setActiveIndex((i) => mod(i, users.length));
  }, [users.length]);

  const activeUser = users.length ? users[mod(activeIndex, users.length)] : null;
  const activeUserId = activeUser?.id ?? null;
  const activeUserName = activeUser?.display_name ?? "Jugador";

  const capturesOfActiveUser = useMemo(() => {
    if (!activeUserId) return [];
    return captures.filter((c) => c.user_id === activeUserId);
  }, [captures, activeUserId]);

  const filteredCaptures = useMemo(() => {
    if (statusFilter === "all") return capturesOfActiveUser;
    return capturesOfActiveUser.filter((c) => c.status === statusFilter);
  }, [capturesOfActiveUser, statusFilter]);

  function prev() {
    if (users.length) setActiveIndex((i) => i - 1);
  }
  function next() {
    if (users.length) setActiveIndex((i) => i + 1);
  }

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
    dx > 0 ? prev() : next();
  }

  const leftIndex = users.length ? mod(activeIndex - 1, users.length) : 0;
  const centerIndex = users.length ? mod(activeIndex, users.length) : 0;
  const rightIndex = users.length ? mod(activeIndex + 1, users.length) : 0;

  const countByUser = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of captures) m.set(c.user_id, (m.get(c.user_id) ?? 0) + 1);
    return m;
  }, [captures]);

  const isMobile = !isDesktop;

  return (
    <div style={{ width: "100%", maxWidth: 980, margin: "0 auto", padding: "0 16px" }}>
      <h1>Capturas</h1>
      <p>
        Selecciona un jugador para ver sus capturas. Para añadir/editar las tuyas:{" "}
        <a href="/mi-panel">Mi panel</a>.
      </p>

      {msg && <p>{msg}</p>}

      {users.length === 0 ? (
        <p>No hay jugadores aún.</p>
      ) : (
        <>
          {/* ===== SLIDER DE JUGADORES ===== */}
          <div
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            style={{ display: "grid", placeItems: "center", marginTop: 10, userSelect: "none" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 18,
                width: "100%",
                maxWidth: isDesktop ? 980 : 560,
                padding: "8px 0 14px",
                boxSizing: "border-box",
              }}
            >
              {isDesktop ? (
                <>
                  <UserCard
                    user={users[leftIndex]}
                    count={countByUser.get(users[leftIndex].id) ?? 0}
                    variant="side"
                    onClick={prev}
                    isDesktop={isDesktop}
                  />
                  <UserCard
                    user={users[centerIndex]}
                    count={countByUser.get(users[centerIndex].id) ?? 0}
                    variant="center"
                    onClick={() => {}}
                    isDesktop={isDesktop}
                  />
                  <UserCard
                    user={users[rightIndex]}
                    count={countByUser.get(users[rightIndex].id) ?? 0}
                    variant="side"
                    onClick={next}
                    isDesktop={isDesktop}
                  />
                </>
              ) : (
                <UserCard
                  user={users[centerIndex]}
                  count={countByUser.get(users[centerIndex].id) ?? 0}
                  variant="center"
                  onClick={() => {}}
                  isDesktop={isDesktop}
                />
              )}
            </div>

            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 18 }}>
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

          {/* ===== FILTROS ===== */}
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0 }}>{activeUserName}</h2>
              <span style={{ color: "#666" }}>{filteredCaptures.length} mostradas</span>
              <span style={{ color: "#aaa" }}>·</span>
              <span style={{ color: "#666" }}>{capturesOfActiveUser.length} total</span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isDesktop ? "repeat(4, max-content)" : "repeat(2, 1fr)",
                gap: 10,
              }}
            >
              <button style={pillStyle(statusFilter === "all")} onClick={() => setStatusFilter("all")}>
                Todos
              </button>
              <button style={pillStyle(statusFilter === "vivo")} onClick={() => setStatusFilter("vivo")}>
                Vivo
              </button>
              <button style={pillStyle(statusFilter === "muerto")} onClick={() => setStatusFilter("muerto")}>
                Muerto
              </button>
              <button
                style={pillStyle(statusFilter === "no_capturado")}
                onClick={() => setStatusFilter("no_capturado")}
              >
                No capturado
              </button>
            </div>
          </div>

          {/* ===== LISTADO ===== */}
          <div
            style={{
              marginTop: 12,
              display: "grid",
              gap: 12,
              gridTemplateColumns: isDesktop ? "repeat(auto-fit, minmax(420px, 1fr))" : "1fr",
            }}
          >
            {filteredCaptures.length === 0 ? (
              <p style={{ color: "#666" }}>No hay capturas para este filtro.</p>
            ) : (
              filteredCaptures.map((c) => {
                const chip = badgeStyle(c.status);

                return (
                  <div
                    key={c.id}
                    style={{
                      border: "1px solid #ddd",
                      borderRadius: 14,
                      padding: 14,
                      background: "white",
                      display: "flex",
                      flexDirection: isMobile ? "column" : "row",
                      justifyContent: "space-between",
                      alignItems: isMobile ? "stretch" : "center",
                      gap: 12,
                    }}
                  >
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <PokemonSprite name={c.pokemon} size={44} />
                      <div>
                        <div style={{ fontWeight: 900, fontSize: 18 }}>
                          {c.nickname?.trim() ? c.nickname : "—"}
                        </div>
                        <div style={{ color: "#666", fontSize: 13 }}>{c.route || "sin ruta"}</div>
                      </div>
                    </div>

                    <span
                      style={{
                        ...chip,
                        padding: "6px 12px",
                        borderRadius: 999,
                        fontWeight: 900,
                        fontSize: 13,
                      }}
                    >
                      {statusLabel(c.status)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

function UserCard({
  user,
  count,
  variant,
  onClick,
  isDesktop,
}: {
  user: Profile;
  count: number;
  variant: "center" | "side";
  onClick: () => void;
  isDesktop: boolean;
}) {
  const isCenter = variant === "center";

  return (
    <div
      onClick={onClick}
      style={{
        width: isDesktop ? (isCenter ? 340 : 280) : "100%",
        maxWidth: isDesktop ? (isCenter ? 340 : 280) : 520,
        minHeight: 96,
        borderRadius: 16,
        border: "1px solid #ddd",
        background: "white",
        padding: 16,
        textAlign: "center",
        boxSizing: "border-box",
        opacity: isCenter ? 1 : 0.45,
        cursor: isCenter ? "default" : "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <img
          src={avatarSrcFromKey(user.avatar_key)}
          alt="avatar"
          width={isDesktop ? 52 : 44}
          height={isDesktop ? 52 : 44}
          style={{
            imageRendering: "pixelated",
            borderRadius: 12,
            border: "1px solid #ddd",
            background: "#fff",
            flexShrink: 0,
          }}
        />
        <div style={{ fontSize: isCenter ? 22 : 16, fontWeight: 900, whiteSpace: "nowrap" }}>
          {user.display_name}
        </div>
      </div>
      <div style={{ color: "#666", fontSize: 13, marginTop: 6 }}>{count} capturas</div>
    </div>
  );
}
