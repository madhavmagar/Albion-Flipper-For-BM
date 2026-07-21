// ---------------------------------------------------------------------------
// Profit math for Black-Market flips and craft-to-Black-Market.
// Pure functions: given catalog/recipe rows + a PriceMap, produce results.
// ---------------------------------------------------------------------------
import {
  BLACK_MARKET,
  CITIES,
  TAX,
  BONUS,
  NUTRITION_PER_ITEMVALUE,
  refinedItemValue,
  rrr,
} from "./constants";
import { ageHours } from "./util";
import type {
  CatalogItem,
  Recipe,
  PriceMap,
  PricePoint,
  FlipResult,
  CraftResult,
} from "@/types";

const taxRate = (premium: boolean) => (premium ? TAX.premium : TAX.nonPremium);

// A refined resource id is exactly T{tier}_{TYPE} with an optional enchant
// suffix. Anchored so armor ids like T6_ARMOR_CLOTH_SET1 (which merely CONTAIN
// "_CLOTH") are NOT mistaken for returnable refined materials.
const REFINED_RE = /^T\d+_(METALBAR|PLANKS|LEATHER|CLOTH|STONEBLOCK)(_LEVEL\d+)?(@\d+)?$/;

/** Item value contributed by one refined-resource id (0 for artifacts/tokens). */
function resourceItemValue(id: string): number {
  if (!REFINED_RE.test(id)) return 0;
  const tier = Number(id.match(/^T(\d)/)?.[1] ?? 4);
  const lvl = id.match(/_LEVEL(\d)/) ?? id.match(/@(\d)/);
  const enchant = lvl ? Number(lvl[1]) : 0;
  return refinedItemValue(tier, enchant);
}

/** Freshest sell_price_min at a city, respecting the freshness window. */
function freshSell(pp: PricePoint | undefined, freshHours: number): { price: number; age: number | null } | null {
  if (!pp || pp.sellMin <= 0) return null;
  const age = ageHours(pp.sellDate);
  if (age != null && age > freshHours) return null;
  return { price: pp.sellMin, age };
}

/** Cheapest fresh sell_price_min across all buy locations. */
function cheapestFreshSell(
  cities: Record<string, PricePoint> | undefined,
  freshHours: number,
): { price: number; age: number | null; city: string } | null {
  if (!cities) return null;
  let best: { price: number; age: number | null; city: string } | null = null;
  for (const city of CITIES) {
    const s = freshSell(cities[city], freshHours);
    if (!s) continue;
    if (!best || s.price < best.price) best = { price: s.price, age: s.age, city };
  }
  return best;
}

/** Freshest buy_price_max at a location, respecting the freshness window. */
function freshBuy(pp: PricePoint | undefined, freshHours: number): { price: number; age: number | null } | null {
  if (!pp || pp.buyMax <= 0) return null;
  const age = ageHours(pp.buyDate);
  if (age != null && age > freshHours) return null;
  return { price: pp.buyMax, age };
}

/** Compute a Black-Market flip for one catalog item, or null if not viable. */
export function computeFlip(
  item: CatalogItem,
  cities: Record<string, PricePoint>,
  premium: boolean,
  freshHours: number,
  sourceCities: readonly string[] = CITIES,
): FlipResult | null {
  const bm = freshBuy(cities[BLACK_MARKET], freshHours);
  if (!bm) return null;

  // Cheapest fresh buy source among the allowed cities.
  const pool = sourceCities.length ? sourceCities : CITIES;
  let best: { city: string; price: number; age: number | null } | null = null;
  for (const city of pool) {
    const s = freshSell(cities[city], freshHours);
    if (!s) continue;
    if (!best || s.price < best.price) best = { city, price: s.price, age: s.age };
  }
  if (!best) return null;

  const revenue = bm.price * (1 - taxRate(premium));
  const profit = revenue - best.price;
  const marginPct = (profit / best.price) * 100;

  return {
    id: item.id,
    name: item.name,
    tier: item.tier,
    enchant: item.enchant,
    category: item.category,
    sourceCity: best.city,
    buyPrice: best.price,
    bmPrice: bm.price,
    profit,
    marginPct,
    buyAgeHours: best.age,
    bmAgeHours: bm.age,
  };
}

export interface CraftOptions {
  city: string;
  premium: boolean;
  focus: boolean;
  stationFeePer100: number; // silver per 100 nutrition
  freshHours: number;
  /** Where to price resources: "cheapest" (any city) or a specific city name. */
  resourceSource: string;
  /** craftCategory -> city that grants the +15% specialty bonus. */
  specialtyMap: Record<string, string>;
  /** Resolve an item id to a display name (for the materials list). */
  resolveName?: (id: string) => string;
}

/** Compute a craft-to-Black-Market result for one recipe, or null if not priceable. */
export function computeCraft(
  recipe: Recipe,
  name: string,
  prices: PriceMap,
  opts: CraftOptions,
): CraftResult | null {
  const { city, premium, focus, stationFeePer100, freshHours, resourceSource, specialtyMap, resolveName } =
    opts;

  const bm = freshBuy(prices[recipe.id]?.[BLACK_MARKET], freshHours);
  if (!bm) return null;

  const resources: CraftResult["resources"] = [];
  let grossMaterialCost = 0;
  let returnableGross = 0; // refined resources — reduced by the return rate
  let nonReturnableGross = 0; // artifacts/tokens — never returned
  let itemValue = 0;
  let missingResource = false;

  for (const r of recipe.resources) {
    let unitPrice = 0;
    let sourceCity = resourceSource === "cheapest" ? city : resourceSource;
    if (resourceSource === "cheapest") {
      const s = cheapestFreshSell(prices[r.id], freshHours);
      if (s) {
        unitPrice = s.price;
        sourceCity = s.city;
      } else missingResource = true;
    } else {
      const s = freshSell(prices[r.id]?.[resourceSource], freshHours);
      if (s) unitPrice = s.price;
      else missingResource = true;
    }
    const line = unitPrice * r.count;
    grossMaterialCost += line;
    if (REFINED_RE.test(r.id)) returnableGross += line;
    else nonReturnableGross += line;
    itemValue += resourceItemValue(r.id) * r.count;
    resources.push({
      id: r.id,
      name: resolveName ? resolveName(r.id) : r.id,
      count: r.count,
      unitPrice,
      sourceCity,
    });
  }
  if (missingResource) return null; // can't trust a partial material cost

  const specialtyMatch =
    recipe.craftCategory != null && specialtyMap[recipe.craftCategory] === city;

  const totalBonus =
    BONUS.cityBase + (specialtyMatch ? BONUS.craftSpecialty : 0) + (focus ? BONUS.focus : 0);
  const returnRate = rrr(totalBonus);

  const returnApplies = returnableGross > 0;
  const materialCost = returnableGross * (1 - returnRate) + nonReturnableGross;
  const nutrition = itemValue * NUTRITION_PER_ITEMVALUE;
  const stationFee = nutrition * (stationFeePer100 / 100);
  const totalCost = materialCost + stationFee;

  const revenue = bm.price * (1 - taxRate(premium));
  const profit = revenue - totalCost;
  const marginPct = totalCost > 0 ? (profit / totalCost) * 100 : 0;

  return {
    id: recipe.id,
    name,
    tier: recipe.tier,
    enchant: recipe.enchant,
    category: recipe.category,
    craftCategory: recipe.craftCategory,
    city,
    returnRate,
    returnApplies,
    specialtyMatch,
    grossMaterialCost,
    materialCost,
    stationFee,
    totalCost,
    bmPrice: bm.price,
    bmAgeHours: bm.age,
    revenue,
    profit,
    marginPct,
    missingResource,
    resources,
  };
}
