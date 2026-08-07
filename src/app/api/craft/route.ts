import { NextRequest, NextResponse } from "next/server";
import { getRecipes, getSpecialtyMap, getNameById, getItemName } from "@/lib/catalog";
import { getPricesForSource, normalizeSource } from "@/lib/prices";
import { computeCraft } from "@/lib/calc";
import { CITIES, CRAFT_CITIES, DEFAULT_FRESH_HOURS } from "@/lib/constants";
import type { CraftResult, CraftResponse } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Sort = "profit" | "margin" | "name" | "tier";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;

  const cityParam = q.get("city") || CRAFT_CITIES[0];
  const city = (CRAFT_CITIES as string[]).includes(cityParam) ? cityParam : CRAFT_CITIES[0];
  const premium = q.get("premium") !== "false";
  const source = normalizeSource(q.get("source"));
  const focus = q.get("focus") === "true";
  const resSourceParam = q.get("resSource") || "cheapest";
  const resourceSource =
    resSourceParam === "cheapest" || (CITIES as readonly string[]).includes(resSourceParam)
      ? resSourceParam
      : "cheapest";
  const stationFeePer100 = num(q.get("stationFee"), 0);
  const freshHours = num(q.get("freshHours"), DEFAULT_FRESH_HOURS);
  const minProfit = num(q.get("minProfit"), 0);
  const minMargin = num(q.get("minMargin"), 0);
  const limit = clamp(num(q.get("limit"), 300), 1, 2000);
  const sort = (q.get("sort") as Sort) || "profit";
  const categories = csv(q.get("categories"));
  const tiers = csv(q.get("tiers")).map(Number).filter((n) => !Number.isNaN(n));
  const search = (q.get("search") || "").trim().toLowerCase();

  const recipes = getRecipes();
  const nameById = getNameById();
  const specialtyMap = getSpecialtyMap();

  const filtered = recipes.filter((r) => {
    if (categories.length && !categories.includes(r.category)) return false;
    if (tiers.length && !tiers.includes(r.tier)) return false;
    if (search) {
      const name = (nameById.get(r.id) || r.id).toLowerCase();
      if (!name.includes(search) && !r.id.toLowerCase().includes(search)) return false;
    }
    return true;
  });

  // Price every recipe id (for BM sell) + every distinct resource id (for city buy).
  const ids = new Set<string>();
  for (const r of filtered) {
    ids.add(r.id);
    for (const res of r.resources) ids.add(res.id);
  }
  const prices = await getPricesForSource([...ids], source);

  const results: CraftResult[] = [];
  for (const r of filtered) {
    const res = computeCraft(r, nameById.get(r.id) || getItemName(r.id), prices, {
      city,
      premium,
      focus,
      stationFeePer100,
      freshHours,
      resourceSource,
      specialtyMap,
      resolveName: getItemName,
    });
    if (!res) continue;
    if (res.profit < minProfit) continue;
    if (res.marginPct < minMargin) continue;
    results.push(res);
  }

  sortResults(results, sort);
  const trimmed = results.slice(0, limit);

  const body: CraftResponse = {
    results: trimmed,
    meta: {
      scanned: filtered.length,
      matched: results.length,
      generatedAt: new Date().toISOString(),
      premium,
      focus,
      city,
      stationFee: stationFeePer100,
      resourceSource,
      source,
    },
  };
  return NextResponse.json(body);
}

function sortResults(results: CraftResult[], sort: Sort) {
  switch (sort) {
    case "margin":
      results.sort((a, b) => b.marginPct - a.marginPct);
      break;
    case "name":
      results.sort((a, b) => a.name.localeCompare(b.name) || a.tier - b.tier || a.enchant - b.enchant);
      break;
    case "tier":
      results.sort((a, b) => b.tier - a.tier || b.profit - a.profit);
      break;
    case "profit":
    default:
      results.sort((a, b) => b.profit - a.profit);
  }
}

function num(v: string | null, dflt: number): number {
  if (v == null || v === "") return dflt;
  const n = Number(v);
  return Number.isFinite(n) ? n : dflt;
}
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
function csv(v: string | null): string[] {
  return v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [];
}
