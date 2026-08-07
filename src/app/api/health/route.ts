import { NextResponse } from "next/server";
import { cacheStats } from "@/lib/aodp";
import { privateStats } from "@/lib/privateStore";
import { getCatalog, getRecipes } from "@/lib/catalog";
import { AODP_BASE } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let aodpOk = false;
  let aodpStatus = 0;
  try {
    const res = await fetch(`${AODP_BASE}/prices/T4_BAG.json?locations=Caerleon&qualities=1`, {
      cache: "no-store",
    });
    aodpOk = res.ok;
    aodpStatus = res.status;
  } catch {
    aodpOk = false;
  }

  return NextResponse.json({
    ok: true,
    catalogItems: getCatalog().length,
    recipes: getRecipes().length,
    cache: cacheStats(),
    aodp: { ok: aodpOk, status: aodpStatus },
    private: privateStats(),
    time: new Date().toISOString(),
  });
}
