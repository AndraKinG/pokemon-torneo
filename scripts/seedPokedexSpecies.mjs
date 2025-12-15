import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SERVICE) {
  console.error("Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env / .env.local");
  process.exit(1);
}

const supabase = createClient(URL, SERVICE, {
  auth: { persistSession: false },
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return await res.json();
}

/**
 * Carga la lista de species y va rellenando:
 * - species_id
 * - name
 * - evo_chain_id
 * - is_legendary
 * - is_mythical
 */
async function main() {
  console.log("Seeding pokedex_species desde PokéAPI...");

  // Lista completa de species
  const list = await fetchJson("https://pokeapi.co/api/v2/pokemon-species?limit=200000&offset=0");
  const results = list?.results ?? [];
  console.log(`Total species: ${results.length}`);

  // Para ir en lotes y no petar
  const BATCH = 100;

  for (let i = 0; i < results.length; i += BATCH) {
    const slice = results.slice(i, i + BATCH);

    // fetch en paralelo, pero con control (100 a la vez)
    const rows = [];
    for (const it of slice) {
      try {
        const sp = await fetchJson(it.url);

        const species_id = sp.id;
        const name = sp.name;

        // evo_chain_id viene en una URL tipo .../evolution-chain/10/
        const evoUrl = sp.evolution_chain?.url ?? null;
        let evo_chain_id = null;
        if (evoUrl) {
          const m = evoUrl.match(/\/evolution-chain\/(\d+)\//);
          if (m) evo_chain_id = Number(m[1]);
        }

        const is_legendary = !!sp.is_legendary;
        const is_mythical = !!sp.is_mythical;

        rows.push({ species_id, name, evo_chain_id, is_legendary, is_mythical });
      } catch (e) {
        console.warn("Skip:", it?.name, e?.message ?? e);
      }

      // micro-pausa para no reventar la API
      await sleep(35);
    }

    if (rows.length) {
      const { error } = await supabase
        .from("pokedex_species")
        .upsert(rows, { onConflict: "species_id" });

      if (error) {
        console.error("Upsert error:", error.message);
        process.exit(1);
      }
    }

    console.log(`✅ ${Math.min(i + BATCH, results.length)}/${results.length} done`);
    await sleep(300);
  }

  console.log("✅ Listo. pokedex_species sembrada.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
