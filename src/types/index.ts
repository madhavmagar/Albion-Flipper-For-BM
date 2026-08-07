import type { Category } from "@/lib/constants";

/** One Black-Market-eligible item variant (base + enchant level). */
export interface CatalogItem {
  id: string; // e.g. "T4_BAG" or "T5_2H_AXE@1"
  name: string; // English display name (base name, enchant shown separately)
  tier: number; // 1..8
  enchant: number; // 0..3
  category: Category;
  craftCategory: string | null; // for crafting-city specialty matching
}

/** A craftable item's recipe (returnable refined-resource inputs). */
export interface Recipe {
  id: string;
  enchant: number;
  tier: number;
  category: Category;
  craftCategory: string | null;
  itemValue: number;
  resources: { id: string; count: number }[];
}

/** Normalized price for one item at one location. */
export interface PricePoint {
  sellMin: number; // cheapest sell order (what you pay to buy instantly)
  buyMax: number; // highest buy order (what you receive selling instantly)
  sellDate: string | null;
  buyDate: string | null;
}

/** item_id -> city -> price point. */
export type PriceMap = Record<string, Record<string, PricePoint>>;

/** A computed Black-Market flip opportunity. */
export interface FlipResult {
  id: string;
  name: string;
  tier: number;
  enchant: number;
  category: Category;
  sourceCity: string; // cheapest buy location
  buyPrice: number; // city sell_price_min
  bmPrice: number; // Black Market buy_price_max
  profit: number; // after tax
  marginPct: number;
  buyAgeHours: number | null;
  bmAgeHours: number | null;
}

/** A computed craft-to-Black-Market opportunity. */
export interface CraftResult {
  id: string;
  name: string;
  tier: number;
  enchant: number;
  category: Category;
  craftCategory: string | null;
  city: string;
  returnRate: number; // station RRR
  returnApplies: boolean; // true only if there are refined inputs to return
  specialtyMatch: boolean;
  grossMaterialCost: number;
  materialCost: number; // after returns
  stationFee: number;
  totalCost: number;
  bmPrice: number; // Black Market buy_price_max
  bmAgeHours: number | null;
  revenue: number; // after tax
  profit: number;
  marginPct: number;
  missingResource: boolean; // true if any resource lacked a price
  resources: {
    id: string;
    name: string;
    count: number;
    unitPrice: number;
    sourceCity: string; // where this material was priced
  }[];
}

/** A distinct crafting-input material. */
export interface Material {
  id: string;
  name: string;
  type: string; // Refined | Component | Crest | Artifact | Token | Other
  tier: number;
  enchant: number;
}

/** A material row with per-city buy prices. */
export interface MaterialRow extends Material {
  prices: Record<string, { price: number; age: number | null }>;
}

export interface MaterialsResponse {
  results: MaterialRow[];
  meta: { scanned: number; generatedAt: string; cities: string[]; source: string };
}

export interface FlipResponse {
  results: FlipResult[];
  meta: {
    scanned: number;
    matched: number;
    generatedAt: string;
    premium: boolean;
    source: string;
    freshHours: number;
    priced: number; // items with any price data
  };
}

export interface CraftResponse {
  results: CraftResult[];
  meta: {
    scanned: number;
    matched: number;
    generatedAt: string;
    premium: boolean;
    focus: boolean;
    city: string;
    stationFee: number;
    resourceSource: string;
    source: string;
  };
}
