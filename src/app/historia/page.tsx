"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Profile = {
  id: string;
  display_name: string;
};

type ProgressRow = {
  user_id: string;
  badges: number;
  updated_at: string | null;
};

type Row = {
  user_id: string;
  display_name: string;
  badges: number;
  updated_at: string | null;
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

export default function HistoriaPage() {
  const sb = useMemo(() => supabaseBrowser(), []);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [msg, setMsg] = useState("");

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

    const p = await sb.from("profiles").select("id, display_name");
    const pr = await sb.from("progress").select("user_id, badges, updated_at");

    if (p.error) return setMsg(p.error.message);
    if (pr.error) return setMsg(pr.error.message);

    setProfiles((p.data ?? []) as Profile[]);
    setProgress((pr.data ?? []) as ProgressRow[]);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows: Row[] = useMemo(() => {
    const progByUser = new Map<string, ProgressRow>();
    for (const r of progress) progByUser.set(r.user_id, r);

    const out: Row[] = profiles.map((p) => {
      const pr = progByUser.get(p.id) ?? null;
      return {
        user_id: p.id,
        display_name: p.display_name || `Jugador ${p.id.slice(0, 6)}`,
        badges: clampBadges(pr?.badges ?? 0),
        updated_at: pr?.updated_at ?? null,
      };
    });

    out.sort((a, b) => {
      if (b.badges !== a.badges) return b.badges - a.badges;

      const ta = a.updated_at ? new Date(a.updated_at).getTime() : Number.POSITIVE_INFINITY;
      const tb = b.updated_at ? new Date(b.updated_at).getTime() : Number.POSITIVE_INFINITY;

      if (ta !== tb) return ta - tb;

      return a.display_name.localeCompare(b.display_name);
    });

    return out;
  }, [profiles, progress]);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 16px" }}>
      <h1 style={{ marginBottom: 6 }}>Historia avanzada</h1>
      <p style={{ marginTop: 0, color: "#555" }}>
        <b>Coleccionador mítico de medallas</b> — ranking por medallas (si empatan, gana quien lo registró antes). Para
        actualizar las tuyas, ve a <a href="/mi-panel">Mi panel</a>.
      </p>

      {msg && (
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 10, marginTop: 10 }}>{msg}</div>
      )}

      {rows.length === 0 ? (
        <p>No hay jugadores aún.</p>
      ) : (
        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          {rows.map((r, idx) => {
            const crown = idx === 0 ? "👑" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "";

            return (
              <div
                key={r.user_id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 16,
                  padding: 14,
                  background: "white",
                  boxShadow: idx === 0 ? "0 14px 36px rgba(0,0,0,0.10)" : "none",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 900, fontSize: 18 }}>
                      #{idx + 1} — {r.display_name} {crown}
                    </div>
                    <div style={{ color: "#666", fontWeight: 800 }}>
                      {r.badges} {r.badges === 1 ? "medalla" : "medallas"}
                    </div>
                  </div>

                  <div style={{ color: "#888", fontSize: 12 }}>
                    {r.updated_at ? `registrado: ${new Date(r.updated_at).toLocaleString()}` : "sin registro"}
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
                  {Array.from({ length: 8 }).map((_, i) => (
                    <BadgeSprite key={i} index={i} filled={i < r.badges} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
