import { NextRequest, NextResponse } from "next/server";
import { getMaterials } from "@/lib/catalog";
import { ageHours } from "@/lib/aodp";
import { getPricesForSource, normalizeSource } from "@/lib/prices";
import { CITIES } from "@/lib/constants";
import type { MaterialRow, MaterialsResponse } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const types = csv(q.get("types"));
  const tiers = csv(q.get("tiers")).map(Number).filter((n) => !Number.isNaN(n));
  const search = (q.get("search") || "").trim().toLowerCase();
  const source = normalizeSource(q.get("source"));

  const filtered = getMaterials().filter((m) => {
    if (types.length && !types.includes(m.type)) return false;
    if (tiers.length && !tiers.includes(m.tier)) return false;
    if (search && !m.name.toLowerCase().includes(search) && !m.id.toLowerCase().includes(search))
      return false;
    return true;
  });

  const prices = await getPricesForSource(filtered.map((m) => m.id), source);

  const results: MaterialRow[] = filtered.map((m) => {
    const row: MaterialRow = { ...m, prices: {} };
    const cityPrices = prices[m.id] || {};
    for (const city of CITIES) {
      const pp = cityPrices[city];
      if (pp && pp.sellMin > 0) {
        row.prices[city] = { price: pp.sellMin, age: ageHours(pp.sellDate) };
      }
    }
    return row;
  });

  const body: MaterialsResponse = {
    results,
    meta: {
      scanned: filtered.length,
      generatedAt: new Date().toISOString(),
      cities: [...CITIES],
      source,
    },
  };
  return NextResponse.json(body);
}

function csv(v: string | null): string[] {
  return v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [];
}
