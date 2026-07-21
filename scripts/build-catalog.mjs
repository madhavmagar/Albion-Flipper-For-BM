// build-catalog.mjs
//
// Generates Black Market catalog + crafting recipes for Albion Flipper.
//
// Data sources (ao-data / ao-bin-dumps):
//   items.json : https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/items.json
//   items.txt  : https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/formatted/items.txt
//
// Outputs:
//   data/bm-catalog.json : one row per (item + enchant 0..3) of Black-Market-eligible combat gear
//   data/recipes.json    : crafting requirements for those items that have them
//
// Re-run after each Albion game patch (item ids / recipes / values change).
//   node scripts/build-catalog.mjs
//
// Node built-ins only (node:fs, node:path, global fetch). No external deps.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DATA_DIR = resolve(ROOT, "data");

const ITEMS_JSON_URL =
  "https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/items.json";
const ITEMS_TXT_URL =
  "https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/formatted/items.txt";

// ---------- helpers ----------

const asArray = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const toInt = (x) => {
  const n = parseInt(x, 10);
  return Number.isFinite(n) ? n : null;
};

// craftingrequirements may be an array; take the first meaningful one.
const firstCraftReq = (cr) => {
  const arr = asArray(cr);
  return arr.length ? arr[0] : null;
};

// Normalize craftresource -> [{id,count}]
function normResources(craftReq) {
  if (!craftReq) return [];
  const res = asArray(craftReq.craftresource);
  const out = [];
  for (const r of res) {
    if (!r || !r["@uniquename"]) continue;
    const id = r["@uniquename"];
    const count = toInt(r["@count"]) ?? 0;
    if (count <= 0) continue;
    out.push({ id, count });
  }
  return out;
}

// ---------- classification ----------

// Returns a top-level category string or null (not eligible).
function classify(item) {
  const un = item["@uniquename"] || "";
  const shopCat = (item["@shopcategory"] || "").toLowerCase();
  const shopSub = (item["@shopsubcategory1"] || "").toLowerCase();
  const slot = (item["@slottype"] || "").toLowerCase();

  const craftCat = (item["@craftingcategory"] || "").toLowerCase();

  // Hard exclusions by uniquename pattern.
  if (
    /UNIQUE/i.test(un) ||
    /_QUESTITEM/i.test(un) ||
    /TUTORIAL/i.test(un) ||
    /_TEST/i.test(un) ||
    /TREASURE/i.test(un) ||
    /_SKIN/i.test(un) ||
    /VANITY/i.test(un) ||
    /_TOKEN/i.test(un) ||
    /_TOOL/i.test(un) ||        // gathering/utility tools (pick, sickle, tracking toolkit, ...)
    /_GATHERER_/i.test(un) ||   // gathering gear (fisher/ore/hide/rock/wood/fiber sets)
    /_ARTEFACT/i.test(un)       // artifact materials (crafted from runes/souls/relics, not finished gear)
  ) {
    return null;
  }

  // Exclude tools & gathering gear by crafting category.
  if (craftCat === "tools" || craftCat === "gatherergear") return null;

  // Must be a real tiered gear id: T<number>_...
  if (!/^T\d_/.test(un)) return null;

  // Bags / Capes by uniquename.
  if (/_BAG(\b|@|_|$)/.test(un) || slot === "bag") return "Bags";
  if (/_CAPE(\b|@|_|$)/.test(un) || slot === "cape") return "Capes";

  // Armor pieces by uniquename token.
  if (/_HEAD_/.test(un) || slot === "head") return "Head Armor";
  if (/_ARMOR_/.test(un) || slot === "armor") return "Body Armor";
  if (/_SHOES_/.test(un) || slot === "shoes") return "Foot Armor";

  // Weapons: mainhand / twohanded slots.
  if (slot === "mainhand" || slot === "twohanded") return "Weapons";

  // Off-hands.
  if (slot === "offhand") return "Off-hands";

  // Fallbacks via shopcategory (in case slottype missing).
  if (["melee", "ranged", "magic"].includes(shopCat)) {
    if (shopSub === "shield" || shopSub === "torch" || shopSub === "book" || shopSub === "horn")
      return "Off-hands";
    return "Weapons";
  }
  if (shopCat === "offhand") return "Off-hands";

  return null;
}

// ---------- main ----------

async function main() {
  console.log("Fetching items.txt (names)...");
  const txt = await (await fetch(ITEMS_TXT_URL)).text();
  const nameMap = new Map(); // uniquename -> english name
  for (const line of txt.split(/\r?\n/)) {
    if (!line.trim()) continue;
    // format: "1049: T4_PLANKS : Pine Planks" ; split on LAST " : "
    const idx = line.lastIndexOf(" : ");
    if (idx === -1) continue;
    const left = line.slice(0, idx);
    const english = line.slice(idx + 3).trim();
    // left = "1049: T4_PLANKS                 "
    const colon = left.indexOf(":");
    if (colon === -1) continue;
    const unique = left.slice(colon + 1).trim();
    if (unique) nameMap.set(unique, english);
  }
  console.log(`  parsed ${nameMap.size} names`);

  console.log("Fetching items.json (this is large)...");
  const data = await (await fetch(ITEMS_JSON_URL)).json();
  const items = data.items || data;

  // Gather all item element arrays.
  const elementKeys = Object.keys(items).filter((k) => Array.isArray(items[k]));
  console.log(`  item element arrays: ${elementKeys.join(", ")}`);

  const catalog = [];
  const recipes = [];
  const catCounts = {};
  const craftCatSet = new Set();

  const ENCHANTS = [0, 1, 2, 3];

  const baseNameFor = (uniquename) => {
    const base = uniquename.split("@")[0];
    return nameMap.get(base) || nameMap.get(uniquename) || base;
  };

  let eligibleBase = 0;

  for (const key of elementKeys) {
    for (const item of items[key]) {
      if (!item || typeof item !== "object") continue;
      const un = item["@uniquename"];
      if (!un) continue;

      const category = classify(item);
      if (!category) continue;
      eligibleBase++;

      const tier = toInt(item["@tier"]);
      const craftCategory = item["@craftingcategory"]
        ? String(item["@craftingcategory"]).toLowerCase()
        : null;
      if (craftCategory) craftCatSet.add(craftCategory);

      const name = baseNameFor(un);

      // Base crafting req + itemvalue.
      const baseCraftReq = firstCraftReq(item.craftingrequirements);
      const baseItemValue = toInt(item["@itemvalue"]);

      // Enchantment map: level -> { craftReq, itemValue }
      const enchMap = new Map();
      for (const e of asArray(item.enchantments?.enchantment)) {
        const lvl = toInt(e["@enchantmentlevel"]);
        if (lvl == null) continue;
        enchMap.set(lvl, {
          craftReq: firstCraftReq(e.craftingrequirements),
          itemValue: toInt(e["@itemvalue"]),
        });
      }

      for (const e of ENCHANTS) {
        const id = e === 0 ? un : `${un}@${e}`;

        // catalog row
        catalog.push({
          id,
          name,
          tier,
          enchant: e,
          category,
          craftCategory,
        });

        // recipe row (only if we have crafting requirements)
        let craftReq = null;
        let itemValue = baseItemValue;
        if (e === 0) {
          craftReq = baseCraftReq;
        } else if (enchMap.has(e)) {
          craftReq = enchMap.get(e).craftReq;
          if (enchMap.get(e).itemValue != null) itemValue = enchMap.get(e).itemValue;
        } else {
          // No distinct enchant requirements: reuse base recipe with enchanted
          // refined-resource ids substituted (T*_METALBAR -> T*_METALBAR_LEVEL{e}@{e}).
          craftReq = baseCraftReq;
        }

        if (!craftReq) continue;
        let resources = normResources(craftReq);
        if (!resources.length) continue;

        // For enchant>0 fallback (no distinct req), substitute enchanted resource ids.
        if (e > 0 && !enchMap.has(e)) {
          resources = resources.map((r) => {
            // refined resources become _LEVEL{e}@{e}; leave artifacts/others alone
            if (/^T\d_(METALBAR|PLANKS|LEATHER|CLOTH|STONEBLOCK)$/.test(r.id)) {
              return { id: `${r.id}_LEVEL${e}@${e}`, count: r.count };
            }
            return r;
          });
        }

        recipes.push({
          id,
          enchant: e,
          tier,
          category,
          craftCategory,
          itemValue: itemValue ?? 0,
          resources,
        });
      }

      catCounts[category] = (catCounts[category] || 0) + ENCHANTS.length;
    }
  }

  mkdirSync(DATA_DIR, { recursive: true });
  const catalogPath = resolve(DATA_DIR, "bm-catalog.json");
  const recipesPath = resolve(DATA_DIR, "recipes.json");
  writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
  writeFileSync(recipesPath, JSON.stringify(recipes, null, 2));

  // ---------- summary ----------
  console.log("\n===== SUMMARY =====");
  console.log(`Eligible base items: ${eligibleBase}`);
  console.log(`Catalog rows (incl. enchants): ${catalog.length}`);
  console.log(`Recipe rows: ${recipes.length}`);
  console.log("Per-category counts (catalog rows):");
  for (const c of Object.keys(catCounts).sort())
    console.log(`  ${c}: ${catCounts[c]}`);

  const craftCats = [...craftCatSet].sort();
  console.log(`\nDistinct craftCategory values (${craftCats.length}):`);
  console.log("  " + JSON.stringify(craftCats));

  console.log("\n3 sample catalog entries:");
  for (const s of catalog.slice(0, 3)) console.log("  " + JSON.stringify(s));
  console.log("2 sample recipe entries:");
  for (const s of recipes.slice(0, 2)) console.log("  " + JSON.stringify(s));

  console.log(`\nWrote:\n  ${catalogPath}\n  ${recipesPath}`);
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
