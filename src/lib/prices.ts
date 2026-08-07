// ---------------------------------------------------------------------------
// Unified price source: public (AODP), private (local capture), or hybrid.
// Returns the same PriceMap shape regardless of source, so calc is unchanged.
// ---------------------------------------------------------------------------
import "server-only";
import { getPrices } from "./aodp";
import { getPrivatePrices } from "./privateStore";
import type { PriceMap } from "@/types";

export type Source = "public" | "private" | "hybrid";

export function normalizeSource(v: string | null | undefined): Source {
  return v === "private" || v === "hybrid" ? v : "public";
}

export async function getPricesForSource(ids: string[], source: Source): Promise<PriceMap> {
  if (source === "private") return getPrivatePrices(ids);
  if (source === "public") return getPrices(ids);
  // hybrid: private price wins per field, public fills the gaps.
  const [pub, priv] = await Promise.all([getPrices(ids), Promise.resolve(getPrivatePrices(ids))]);
  const out: PriceMap = {};
  for (const id of ids) {
    const pu = pub[id] || {};
    const pr = priv[id] || {};
    const cities = new Set([...Object.keys(pu), ...Object.keys(pr)]);
    out[id] = {};
    for (const city of cities) {
      const a = pu[city];
      const b = pr[city];
      const sellPriv = b && b.sellMin > 0;
      const buyPriv = b && b.buyMax > 0;
      out[id][city] = {
        sellMin: sellPriv ? b!.sellMin : a?.sellMin ?? 0,
        buyMax: buyPriv ? b!.buyMax : a?.buyMax ?? 0,
        sellDate: sellPriv ? b!.sellDate : a?.sellDate ?? null,
        buyDate: buyPriv ? b!.buyDate : a?.buyDate ?? null,
      };
    }
  }
  return out;
}
