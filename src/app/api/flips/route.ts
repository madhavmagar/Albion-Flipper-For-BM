import { NextRequest, NextResponse } from "next/server";
import { getCatalog } from "@/lib/catalog";
import { getPrices } from "@/lib/aodp";
import { computeFlip } from "@/lib/calc";
import { CITIES, DEFAULT_FRESH_HOURS } from "@/lib/constants";
import type { FlipResult, FlipResponse } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Sort = "profit" | "margin" | "name" | "tier";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;

  const premium = q.get("premium") !== "false"; // default true
  const freshHours = num(q.get("freshHours"), DEFAULT_FRESH_HOURS);
  const minProfit = num(q.get("minProfit"), 0);
  const minMargin = num(q.get("minMargin"), 0);
  const limit = clamp(num(q.get("limit"), 300), 1, 2000);
  const sort = (q.get("sort") as Sort) || "profit";
  const categories = csv(q.get("categories"));
  const tiers = csv(q.get("tiers")).map(Number).filter((n) => !Number.isNaN(n));
  const cities = csv(q.get("cities")).filter((c) => (CITIES as readonly string[]).includes(c));
  const search = (q.get("search") || "").trim().toLowerCase();

  const catalog = getCatalog();

  // Pre-filter before fetching prices to limit API load.
  const filtered = catalog.filter((it) => {
    if (categories.length && !categories.includes(it.category)) return false;
    if (tiers.length && !tiers.includes(it.tier)) return false;
    if (search && !it.name.toLowerCase().includes(search) && !it.id.toLowerCase().includes(search))
      return false;
    return true;
  });

  const prices = await getPrices(filtered.map((it) => it.id));

  let priced = 0;
  const results: FlipResult[] = [];
  for (const it of filtered) {
    const priceRow = prices[it.id];
    if (priceRow && Object.keys(priceRow).length) priced++;
    const r = computeFlip(it, priceRow || {}, premium, freshHours, cities);
    if (!r) continue;
    if (r.profit < minProfit) continue;
    if (r.marginPct < minMargin) continue;
    results.push(r);
  }

  sortResults(results, sort);
  const trimmed = results.slice(0, limit);

  const body: FlipResponse = {
    results: trimmed,
    meta: {
      scanned: filtered.length,
      matched: results.length,
      generatedAt: new Date().toISOString(),
      premium,
      freshHours,
      priced,
    },
  };
  return NextResponse.json(body);
}

function sortResults(results: FlipResult[], sort: Sort) {
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
