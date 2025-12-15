"use client";

import { useEffect, useMemo, useRef, useState } from "react";

let cachedNames: string[] | null = null;
let cachedPromise: Promise<string[]> | null = null;

async function loadPokemonNames(): Promise<string[]> {
  if (cachedNames) return cachedNames;
  if (cachedPromise) return cachedPromise;

  cachedPromise = (async () => {
    // 1302 aprox (puede variar). Pedimos “muchos” para incluir todas formas.
    const res = await fetch("https://pokeapi.co/api/v2/pokemon?limit=2000");
    if (!res.ok) throw new Error("No se pudo cargar la Pokédex");
    const data = await res.json();
    const names = (data.results ?? []).map((r: any) => r.name as string);
    cachedNames = names;
    return names;
  })();

  return cachedPromise;
}

function pretty(name: string) {
  // “mr-mime” -> “Mr Mime”, “iron-hands” -> “Iron Hands”
  return name
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export default function PokemonAutocomplete({
  value,
  onChange,
  onPick,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onPick: (canonicalName: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [names, setNames] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [active, setActive] = useState(0);

  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadPokemonNames()
      .then((n) => {
        if (!alive) return;
        setNames(n);
        setLoading(false);
      })
      .catch((e) => {
        if (!alive) return;
        setErr(e?.message ?? "Error cargando pokedex");
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const q = value.trim().toLowerCase();

  const results = useMemo(() => {
    if (!q) return [];
    // filtra rápido (top 10)
    const out: string[] = [];
    for (const n of names) {
      if (n.startsWith(q) || n.includes(q)) {
        out.push(n);
        if (out.length >= 10) break;
      }
    }
    return out;
  }, [names, q]);

  useEffect(() => {
    setActive(0);
  }, [q]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pick(name: string) {
    onPick(pretty(name)); // guardamos bonito en tu BD
    setOpen(false);
  }

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder ?? "Pokémon"}
        disabled={disabled}
        style={{ width: "100%", padding: 8 }}
        onKeyDown={(e) => {
          if (!open) return;

          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, Math.max(0, results.length - 1)));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            if (results[active]) {
              e.preventDefault();
              pick(results[active]);
            }
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />

      {open && (loading || err || results.length > 0) && (
        <div
          style={{
            position: "absolute",
            top: "110%",
            left: 0,
            right: 0,
            background: "white",
            border: "1px solid #ddd",
            borderRadius: 10,
            overflow: "hidden",
            zIndex: 50,
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          }}
        >
          {loading && <div style={{ padding: 10, color: "#666" }}>Cargando Pokédex…</div>}
          {err && <div style={{ padding: 10, color: "crimson" }}>{err}</div>}

          {!loading &&
            !err &&
            results.map((n, i) => (
              <div
                key={n}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault(); // evita blur antes de click
                  pick(n);
                }}
                style={{
                  padding: "10px 12px",
                  cursor: "pointer",
                  background: i === active ? "#f5f5f5" : "white",
                  fontWeight: 600,
                }}
              >
                {pretty(n)}
              </div>
            ))}

          {!loading && !err && q && results.length === 0 && (
            <div style={{ padding: 10, color: "#666" }}>Sin resultados</div>
          )}
        </div>
      )}
    </div>
  );
}
