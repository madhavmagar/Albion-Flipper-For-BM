// ---------------------------------------------------------------------------
// Loads the generated item catalog, recipes, and crafting-specialty map.
// Data files are produced by scripts/build-catalog.mjs into /data.
// Read from disk once and memoized (server-only).
// ---------------------------------------------------------------------------
import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CatalogItem, Recipe, Material } from "@/types";

const DATA_DIR = join(process.cwd(), "data");

function loadJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(join(DATA_DIR, file), "utf8")) as T;
  } catch (err) {
    console.error(`[catalog] could not load ${file}:`, (err as Error).message);
    return fallback;
  }
}

let _catalog: CatalogItem[] | null = null;
let _recipes: Recipe[] | null = null;
let _specialty: Record<string, string> | null = null;
let _nameById: Map<string, string> | null = null;
let _itemNames: Record<string, string> | null = null;

export function getCatalog(): CatalogItem[] {
  if (!_catalog) _catalog = loadJson<CatalogItem[]>("bm-catalog.json", []);
  return _catalog;
}

/**
 * Enchanted refined resources are stored in the dump as `T4_METALBAR_LEVEL1`,
 * but the market id (and localization key) is `T4_METALBAR_LEVEL1@1`. Normalize
 * so price lookups and names resolve for enchanted crafts.
 */
export function normalizeItemId(id: string): string {
  const m = id.match(/_LEVEL(\d)$/);
  return m ? `${id}@${m[1]}` : id;
}

export function getRecipes(): Recipe[] {
  if (!_recipes) {
    const raw = loadJson<Recipe[]>("recipes.json", []);
    for (const r of raw) {
      for (const res of r.resources) res.id = normalizeItemId(res.id);
    }
    _recipes = raw;
  }
  return _recipes;
}

/** craftCategory -> city that grants the +15% crafting specialty bonus. */
export function getSpecialtyMap(): Record<string, string> {
  if (!_specialty) _specialty = loadJson<Record<string, string>>("cities.json", {});
  return _specialty;
}

const REFINED_MAT_RE = /^T\d+_(METALBAR|PLANKS|LEATHER|CLOTH|STONEBLOCK)(_LEVEL\d+)?(@\d+)?$/;

/** Classify a material id into a type + tier/enchant. */
function classifyMaterial(id: string): { type: string; tier: number; enchant: number } {
  const tier = Number(id.match(/^T(\d)/)?.[1] ?? 0);
  const lvl = id.match(/_LEVEL(\d)/) ?? id.match(/@(\d)/);
  const enchant = lvl ? Number(lvl[1]) : 0;
  let type = "Other";
  if (REFINED_MAT_RE.test(id)) type = "Refined";
  else if (/ARTEFACT/.test(id)) type = "Artifact";
  else if (/TOKEN|SIGIL/.test(id)) type = "Token";
  else if (/_BP$/.test(id)) type = "Crest";
  else if (/^T\d_/.test(id)) type = "Component";
  return { type, tier, enchant };
}

let _materials: Material[] | null = null;

/** All distinct crafting-input materials across every recipe. */
export function getMaterials(): Material[] {
  if (_materials) return _materials;
  const names = getItemNames();
  const seen = new Set<string>();
  const out: Material[] = [];
  for (const r of getRecipes()) {
    for (const res of r.resources) {
      if (seen.has(res.id)) continue;
      seen.add(res.id);
      // Skip phantom items with no real game name — e.g. enchanted T2/T3 refined
      // resources, which don't exist (resource enchantment is T4+ only).
      const name = names[res.id];
      if (!name) continue;
      out.push({ id: res.id, name, ...classifyMaterial(res.id) });
    }
  }
  out.sort(
    (a, b) => a.type.localeCompare(b.type) || a.tier - b.tier || a.enchant - b.enchant || a.name.localeCompare(b.name),
  );
  _materials = out;
  return out;
}

export function getNameById(): Map<string, string> {
  if (!_nameById) {
    _nameById = new Map(getCatalog().map((c) => [c.id, c.name]));
  }
  return _nameById;
}

/** Full id -> English name map for all items (materials, crests, tokens, gear). */
export function getItemNames(): Record<string, string> {
  if (!_itemNames) _itemNames = loadJson<Record<string, string>>("item-names.json", {});
  return _itemNames;
}

/** Human name for any item id, with a readable fallback derived from the id. */
export function getItemName(id: string): string {
  const map = getItemNames();
  if (map[id]) return map[id];
  // Fallback: strip enchant, prettify "T4_METALBAR" -> "T4 Metalbar".
  const base = id.split("@")[0];
  const enchant = id.includes("@") ? ` .${id.split("@")[1]}` : "";
  const tier = base.match(/^T(\d)_/)?.[1];
  const rest = base.replace(/^T\d_/, "").replace(/_/g, " ").toLowerCase();
  const pretty = rest.charAt(0).toUpperCase() + rest.slice(1);
  return `${tier ? `T${tier} ` : ""}${pretty}${enchant}`;
}
