// ---------------------------------------------------------------------------
// Generates data/item-names.json: a flat { UniqueName: "English Name" } map for
// ALL Albion items, used to label crafting materials (cloth, crests, tokens…)
// in the UI. Source: ao-bin-dumps formatted/items.txt.
// Re-run after game patches:  node scripts/build-names.mjs
// ---------------------------------------------------------------------------
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const SRC = "https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/formatted/items.txt";
const OUT = join(process.cwd(), "data", "item-names.json");

// Lines look like:  "1049: T4_PLANKS                        : Pine Planks"
const LINE = /^\s*\d+:\s*([A-Za-z0-9_@]+)\s*:\s*(.*\S)\s*$/;

const res = await fetch(SRC, { headers: { "User-Agent": "AlbionFlipper/0.1" } });
if (!res.ok) throw new Error(`items.txt fetch failed: ${res.status}`);
const text = await res.text();

const names = {};
let matched = 0;
for (const raw of text.split("\n")) {
  const m = LINE.exec(raw);
  if (!m) continue;
  const [, id, name] = m;
  if (name === "?" || /^@/.test(name)) continue; // skip unlocalized placeholders
  names[id] = name;
  matched++;
}

mkdirSync(join(process.cwd(), "data"), { recursive: true });
writeFileSync(OUT, JSON.stringify(names), "utf8");
console.log(`Wrote ${matched} item names to ${OUT}`);
