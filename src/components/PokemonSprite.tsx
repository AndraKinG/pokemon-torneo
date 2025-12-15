"use client";

import { useEffect, useState } from "react";

// 1 fetch global (name->id). Cero rate-limit por slot.
let cachedNameToId: Record<string, number> | null = null;
let cachedDexPromise: Promise<Record<string, number>> | null = null;

function normalizePokemonName(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

async function loadDexMap(): Promise<Record<string, number>> {
  if (cachedNameToId) return cachedNameToId;
  if (cachedDexPromise) return cachedDexPromise;

  cachedDexPromise = (async () => {
    const res = await fetch("https://pokeapi.co/api/v2/pokemon?limit=2000");
    if (!res.ok) throw new Error("No se pudo cargar la Pokédex");
    const data = await res.json();

    const map: Record<string, number> = {};
    for (const r of data.results ?? []) {
      const name = r.name as string; // "mr-mime"
      const url = r.url as string;   // .../pokemon/122/
      const m = url.match(/\/pokemon\/(\d+)\//);
      if (!m) continue;
      map[name] = Number(m[1]);
    }

    cachedNameToId = map;
    return map;
  })();

  return cachedDexPromise;
}

function artworkUrl(id: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}
function classicUrl(id: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

export default function PokemonSprite({
  name,
  size = 34,
}: {
  name: string;
  size?: number;
}) {
  const [dexMap, setDexMap] = useState<Record<string, number> | null>(null);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    let alive = true;
    loadDexMap()
      .then((m) => alive && setDexMap(m))
      .catch(() => alive && setDexMap(null));
    return () => {
      alive = false;
    };
  }, []);

  const key = normalizePokemonName(name);
  const id = dexMap ? dexMap[key] : undefined;

  if (!id) {
    const letter = name?.trim()?.[0]?.toUpperCase() ?? "?";
    return (
      <div
        title="Sin sprite"
        style={{
          width: size,
          height: size,
          borderRadius: 10,
          border: "1px solid #eee",
          display: "grid",
          placeItems: "center",
          color: "#777",
          fontWeight: 800,
          background: "#fafafa",
          flex: "0 0 auto",
        }}
      >
        {letter}
      </div>
    );
  }

  const src = useFallback ? classicUrl(id) : artworkUrl(id);

  return (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      style={{ objectFit: "contain", flex: "0 0 auto" }}
      loading="lazy"
      onError={() => setUseFallback(true)}
    />
  );
}
