// ---------------------------------------------------------------------------
// Server-only client for the Albion Online Data Project (AODP) prices API.
// Caches per-item price rows in memory (TTL) and batches requests to respect
// the ~180 req/min rate limit. All locations are fetched per item so both the
// flip scanner and the crafting calculator share the same cache.
// ---------------------------------------------------------------------------
import "server-only";
import { AODP_BASE, FLIP_LOCATIONS, CACHE_TTL_MS } from "./constants";
import type { PriceMap, PricePoint } from "@/types";

export { ageHours } from "./util";

interface CacheEntry {
  expires: number;
  cities: Record<string, PricePoint>;
}

const cache = new Map<string, CacheEntry>();

const CHUNK_SIZE = 100;
const CONCURRENCY = 5;
const NEGATIVE_TTL_MS = 30 * 1000; // brief backoff after a failed fetch
const LOCATIONS_PARAM = encodeURIComponent(FLIP_LOCATIONS.join(","));

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchChunk(ids: string[]): Promise<void> {
  const url =
    `${AODP_BASE}/prices/${ids.join(",")}.json` +
    `?locations=${LOCATIONS_PARAM}&qualities=1`;

  let rows: AodpRow[] = [];
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "AlbionFlipper/0.1 (personal tool)" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`AODP responded ${res.status}`);
    rows = (await res.json()) as AodpRow[];
  } catch (err) {
    // Negative-cache the failed ids so we don't hammer a struggling API.
    const expires = Date.now() + NEGATIVE_TTL_MS;
    for (const id of ids) {
      if (!cache.has(id)) cache.set(id, { expires, cities: {} });
    }
    console.error("[aodp] chunk fetch failed:", (err as Error).message);
    return;
  }

  const now = Date.now();
  const byItem = new Map<string, Record<string, PricePoint>>();
  for (const id of ids) byItem.set(id, {});

  for (const row of rows) {
    const bucket = byItem.get(row.item_id);
    if (!bucket) continue;
    const sellMin = row.sell_price_min > 0 ? row.sell_price_min : 0;
    const buyMax = row.buy_price_max > 0 ? row.buy_price_max : 0;
    bucket[row.city] = {
      sellMin,
      buyMax,
      sellDate: sellMin ? row.sell_price_min_date : null,
      buyDate: buyMax ? row.buy_price_max_date : null,
    };
  }

  for (const [id, cities] of byItem) {
    cache.set(id, { expires: now + CACHE_TTL_MS, cities });
  }
}

/** Run async tasks with a bounded concurrency pool. */
async function pool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let idx = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (idx < items.length) {
      const current = items[idx++];
      await worker(current);
    }
  });
  await Promise.all(runners);
}

/**
 * Get current prices for the given item ids across all flip locations.
 * Uses the in-memory cache; only fetches ids that are missing or expired.
 */
export async function getPrices(ids: string[]): Promise<PriceMap> {
  const now = Date.now();
  const unique = [...new Set(ids)];
  const stale = unique.filter((id) => {
    const e = cache.get(id);
    return !e || e.expires <= now;
  });

  if (stale.length) {
    const chunks = chunk(stale, CHUNK_SIZE);
    await pool(chunks, CONCURRENCY, fetchChunk);
  }

  const map: PriceMap = {};
  for (const id of unique) {
    const e = cache.get(id);
    map[id] = e ? e.cities : {};
  }
  return map;
}

export function cacheStats() {
  const now = Date.now();
  let fresh = 0;
  for (const e of cache.values()) if (e.expires > now) fresh++;
  return { entries: cache.size, fresh, ttlMs: CACHE_TTL_MS };
}

interface AodpRow {
  item_id: string;
  city: string;
  quality: number;
  sell_price_min: number;
  sell_price_min_date: string;
  sell_price_max: number;
  sell_price_max_date: string;
  buy_price_min: number;
  buy_price_min_date: string;
  buy_price_max: number;
  buy_price_max_date: string;
}
