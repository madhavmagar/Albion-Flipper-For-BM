// ---------------------------------------------------------------------------
// Private market store — holds prices captured LOCALLY from the user's own
// AODP client (albiondata-client -i http://127.0.0.1:3000/api/ingest).
// Nothing here is ever uploaded anywhere; data is persisted to a local,
// git-ignored file. Serves the same PriceMap shape as the public AODP client
// so the flip/craft math is identical.
// ---------------------------------------------------------------------------
import "server-only";
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { PriceMap, PricePoint } from "@/types";

/** Raw order as POSTed by albiondata-client on /ingest/marketorders.ingest. */
export interface RawOrder {
  ItemTypeId: string;
  LocationId: string | number;
  QualityLevel: number;
  EnchantmentLevel: number;
  UnitPriceSilver: number;
  Amount: number;
  AuctionType: string; // "offer" (selling) | "request" (buying)
  Expires?: string;
}

/** Market/location id -> city name. */
const LOCATIONS: Record<string, string> = {
  "7": "Thetford",
  "0007": "Thetford",
  "1002": "Lymhurst",
  "2004": "Bridgewatch",
  "3003": "Black Market",
  "3005": "Caerleon",
  "3008": "Martlock",
  "4002": "Fort Sterling",
  "4300": "Brecilien",
};

const FILE = join(process.cwd(), "private-market.json");

// itemKey (`${itemId}:${quality}`) -> city -> PricePoint
const store = new Map<string, Record<string, PricePoint>>();
let initialized = false;
let hasIngested = false; // true once THIS instance has captured data (the writer)
let loadedMtime = -1;
let lastIngest = 0;
let orderCount = 0;

function loadFile() {
  try {
    const raw = JSON.parse(readFileSync(FILE, "utf8")) as {
      data?: Record<string, Record<string, PricePoint>>;
      lastIngest?: number;
      orderCount?: number;
    };
    store.clear();
    for (const [k, v] of Object.entries(raw.data ?? {})) store.set(k, v);
    lastIngest = raw.lastIngest ?? lastIngest;
    orderCount = raw.orderCount ?? orderCount;
  } catch {
    /* no file yet */
  }
  try {
    loadedMtime = statSync(FILE).mtimeMs;
  } catch {
    loadedMtime = -1;
  }
}

/**
 * Keep the in-memory store current. The instance that ingests trusts its own
 * memory; pure readers (separate route bundles in dev) reload the file when it
 * changes, so newly-captured prices show up without a restart.
 */
function ensureFresh() {
  if (!initialized) {
    loadFile();
    initialized = true;
    return;
  }
  if (hasIngested) return; // writer: in-memory is authoritative
  let mtime = -1;
  try {
    mtime = statSync(FILE).mtimeMs;
  } catch {
    return;
  }
  if (mtime !== loadedMtime) loadFile();
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      writeFileSync(FILE, JSON.stringify({ data: Object.fromEntries(store), lastIngest, orderCount }));
      try {
        loadedMtime = statSync(FILE).mtimeMs;
      } catch {
        /* ignore */
      }
    } catch (e) {
      console.error("[private] save failed:", (e as Error).message);
    }
  }, 1000);
}

/** Normalize + upsert a batch of captured orders. Each market scan overwrites
 *  the relevant side (sell / buy) for the items+cities it touched. */
export function ingestOrders(orders: RawOrder[]): number {
  if (!initialized) {
    loadFile();
    initialized = true;
  }
  hasIngested = true;
  const now = new Date().toISOString();
  const nowMs = Date.now();

  // group by itemKey|city
  const groups = new Map<string, { city: string; itemKey: string; offers: number[]; requests: number[] }>();
  let accepted = 0;

  for (const o of orders) {
    const city = LOCATIONS[String(o.LocationId)];
    if (!city) continue;
    if (o.Expires && Date.parse(o.Expires) < nowMs) continue; // already expired
    const price = o.UnitPriceSilver / 10000;
    if (!(price > 0)) continue;

    const ench =
      o.EnchantmentLevel > 0 && !o.ItemTypeId.includes("@") ? `@${o.EnchantmentLevel}` : "";
    const itemId = `${o.ItemTypeId}${ench}`;
    const itemKey = `${itemId}:${o.QualityLevel}`;
    const gkey = `${itemKey}|${city}`;

    let g = groups.get(gkey);
    if (!g) {
      g = { city, itemKey, offers: [], requests: [] };
      groups.set(gkey, g);
    }
    if (o.AuctionType === "request") g.requests.push(price);
    else g.offers.push(price);
    accepted++;
  }

  for (const g of groups.values()) {
    const cities = store.get(g.itemKey) ?? {};
    const prev = cities[g.city] ?? { sellMin: 0, buyMax: 0, sellDate: null, buyDate: null };
    let { sellMin, buyMax, sellDate, buyDate } = prev;

    if (g.city === "Black Market") {
      const all = [...g.offers, ...g.requests];
      if (all.length) {
        buyMax = Math.max(...all);
        buyDate = now;
      }
    } else {
      if (g.offers.length) {
        sellMin = Math.min(...g.offers);
        sellDate = now;
      }
      if (g.requests.length) {
        buyMax = Math.max(...g.requests);
        buyDate = now;
      }
    }
    cities[g.city] = { sellMin, buyMax, sellDate, buyDate };
    store.set(g.itemKey, cities);
  }

  if (accepted) {
    lastIngest = nowMs;
    orderCount += accepted;
    scheduleSave();
  }
  return accepted;
}

/** Private prices for the given ids (Normal quality), in the standard PriceMap shape. */
export function getPrivatePrices(ids: string[]): PriceMap {
  ensureFresh();
  const map: PriceMap = {};
  for (const id of ids) {
    const cities = store.get(`${id}:1`);
    map[id] = cities ? { ...cities } : {};
  }
  return map;
}

export function privateStats() {
  ensureFresh();
  return {
    items: store.size,
    ordersIngested: orderCount,
    lastIngest: lastIngest ? new Date(lastIngest).toISOString() : null,
  };
}
