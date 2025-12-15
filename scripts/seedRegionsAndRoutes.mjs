import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env/.env.local");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

const REGIONS = [
  { api: "kanto", name: "Kanto" },
  { api: "johto", name: "Johto" },
  { api: "hoenn", name: "Hoenn" },
  { api: "sinnoh", name: "Sinnoh" },
  { api: "unova", name: "Unova" },
  { api: "kalos", name: "Kalos" },
  { api: "alola", name: "Alola" },
  { api: "galar", name: "Galar" },
  { api: "hisui", name: "Hisui" },
  { api: "paldea", name: "Paldea" },
];

function prettyName(slug) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} @ ${url}`);
  return res.json();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getNameByLang(namesArr, lang) {
  const hit = (namesArr ?? []).find((n) => n?.language?.name === lang);
  return hit?.name ?? null;
}

async function main() {
  console.log("Seeding games + routes (EN/ES) desde PokéAPI...");

  for (const r of REGIONS) {
    // 1) upsert game
    const g = await admin
      .from("games")
      .upsert({ name: r.name }, { onConflict: "name" })
      .select("id")
      .single();
    if (g.error) throw g.error;
    const gameId = g.data.id;

    // 2) region -> locations (cada location trae { name, url })
    const region = await fetchJson(`https://pokeapi.co/api/v2/region/${r.api}`);
    const locations = region.locations ?? [];
    console.log(`${r.name}: ${locations.length} locations`);

    // 3) Para cada location, pedimos su detalle y sacamos name_es si existe
    const rows = [];
    for (let i = 0; i < locations.length; i++) {
      const loc = locations[i];

      let name_es = null;
      try {
        const locDetail = await fetchJson(loc.url); // <- location/{id}/
        name_es = getNameByLang(locDetail.names, "es");
      } catch {
        // si falla el fetch de una location, no paramos todo
      }

      rows.push({
        game_id: gameId,
        slug: loc.name,                      // estable (para futuro)
        name: prettyName(loc.name),          // fallback EN bonito
        name_es: name_es,                    // puede ser null
      });

      // pequeña pausa para no saturar PokéAPI
      if (i % 15 === 0) await sleep(120);
    }

    // 4) upsert en chunks
    const CHUNK = 400;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);

      // OJO: tu constraint actual es unique(game_id, name).
      // Con name_es/slug añadidos, puedes mantenerlo igual.
      const ins = await admin.from("routes").upsert(chunk, { onConflict: "game_id,name" });
      if (ins.error) throw ins.error;
    }
  }

  console.log("✅ Listo.");
}

main().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});
