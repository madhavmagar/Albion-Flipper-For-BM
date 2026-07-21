// ---------------------------------------------------------------------------
// Core constants & game formulas for Albion Flipper.
// Market data: Albion Online Data Project (AODP). Server: Asia / East.
// ---------------------------------------------------------------------------

/** AODP stats base for the Asia (East) server. */
export const AODP_BASE = "https://east.albion-online-data.com/api/v2/stats";

/** Royal cities + Caerleon — valid buy sources for flipping / resource pricing. */
export const CITIES = [
  "Bridgewatch",
  "Lymhurst",
  "Martlock",
  "Fort Sterling",
  "Thetford",
  "Caerleon",
] as const;

export type City = (typeof CITIES)[number];

/** Royal cities only. */
export const ROYAL_CITIES: City[] = [
  "Bridgewatch",
  "Lymhurst",
  "Martlock",
  "Fort Sterling",
  "Thetford",
];

/**
 * Crafting-station locations offered in the calculator. Caerleon is first
 * because it sits next to the Black Market (no transport risk) — it grants the
 * base +18% return but no gear specialty bonus. The Royal cities add +15% on
 * their specialty items but require carrying goods to Caerleon to sell.
 */
export const CRAFT_CITIES: City[] = ["Caerleon", ...ROYAL_CITIES];

/** The Black Market location string (buys finished combat gear). */
export const BLACK_MARKET = "Black Market";

/** All locations we query for the flip scanner. */
export const FLIP_LOCATIONS = [...CITIES, BLACK_MARKET];

/** Marketplace sales tax: 4% with Premium, 8% without. */
export const TAX = { premium: 0.04, nonPremium: 0.08 } as const;

/** Setup / order fee, charged only when placing a buy/sell order (not on instant deals). */
export const SETUP_FEE = 0.025;

/** Nutrition consumed per point of item value (drives the crafting station fee). */
export const NUTRITION_PER_ITEMVALUE = 0.1125;

/**
 * Item value of ONE refined-resource unit (bar/planks/leather/cloth/block).
 * Anchored at 16 for T4/enchant 0 (identical across all refined types), doubling
 * per tier and per enchantment level. Verified: T4 item using 16 bars + 8 leather
 * → item value 384 → 43.2 nutrition. The ao-bin-dumps dump no longer ships
 * @itemvalue, so we reconstruct the crafted item's value from its refined inputs.
 */
export const ITEM_VALUE_T4_REFINED = 16;

export const refinedItemValue = (tier: number, enchant: number): number =>
  ITEM_VALUE_T4_REFINED * 2 ** (tier - 4) * 2 ** enchant;

/** Additive production-bonus fractions (summed before the RRR conversion). */
export const BONUS = {
  cityBase: 0.18, // any royal city / Caerleon station
  craftSpecialty: 0.15, // crafting the city's specialty item
  focus: 0.59, // spending focus on the craft
} as const;

/**
 * Resource Return Rate from a summed production bonus.
 *   rrr(0.18) ≈ 0.152   (base, no focus)
 *   rrr(0.77) ≈ 0.435   (focus, base city)
 *   rrr(0.92) ≈ 0.479   (focus, matching craft city)
 */
export const rrr = (bonus: number): number => bonus / (1 + bonus);

/** Item icon renderer (official Albion render service). */
export const itemIcon = (id: string, quality = 1): string =>
  `https://render.albiononline.com/v1/item/${encodeURIComponent(id)}.png?quality=${quality}`;

/** Top-level Black-Market categories exposed as filters. */
export const CATEGORIES = [
  "Weapons",
  "Off-hands",
  "Head Armor",
  "Body Armor",
  "Foot Armor",
  "Bags",
  "Capes",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const TIERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

/** Material classes shown on the Material Prices tab. */
export const MATERIAL_TYPES = ["Refined", "Component", "Crest", "Artifact", "Token"] as const;

export type MaterialType = (typeof MATERIAL_TYPES)[number];

/** Default freshness window: ignore prices older than this many hours. */
export const DEFAULT_FRESH_HOURS = 24;

/** In-memory price cache TTL (ms). */
export const CACHE_TTL_MS = 5 * 60 * 1000;

/** Attribution shown in the UI (AODP asks that we credit the data source). */
export const ATTRIBUTION = "Market data by the Albion Online Data Project";
