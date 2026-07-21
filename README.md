# Albion Flipper

A Black Market toolkit for **Albion Online** (Asia / East server). Two tools:

- **Black Market Flips** — compares item prices in the Royal cities + Caerleon against the Black Market's buy orders and lists the most profitable "buy in city → sell to Black Market" splits.
- **Crafting Calculator** — prices refined resources in a selected Royal city, applies that city's crafting return rate (specialty + focus) and station fee, and lists the items most profitable to craft and sell to the Black Market.

Modern, minimal UI with a sidebar, two tabs, and light/dark themes.

## Getting started

```bash
npm install
npm run build:catalog   # generates data/bm-catalog.json + data/recipes.json (run once, re-run after game patches)
npm run dev             # http://localhost:3000
```

For a production build:

```bash
npm run build
npm start
```

## How it works

- **Market data** comes from the community [Albion Online Data Project](https://www.albion-online-data.com/) (AODP), Asia endpoint `east.albion-online-data.com`. Data is crowd-sourced and can be delayed — the UI shows freshness ages and ignores prices older than 24h by default.
- The browser never calls AODP directly. Next.js **API routes** (`/api/flips`, `/api/craft`) act as a caching proxy: they batch item ids (100/request), fetch all cities + Black Market, cache results in memory for 5 minutes, drop zero/stale prices, and compute the profit math server-side.
- The **item catalog** (Black-Market-eligible gear) and **crafting recipes** are generated from [ao-bin-dumps](https://github.com/ao-data/ao-bin-dumps) by `scripts/build-catalog.mjs` into `/data`.

## Formulas

**Black Market flip** (instant-buy in city → instant-sell to Black Market buy order):

```
profit = bmBuyMax × (1 − tax) − cheapestCitySellMin
tax = 4% (Premium) | 8% (non-Premium)
```

**Craft → Black Market:**

```
returnRate = totalBonus / (1 + totalBonus)
totalBonus = 0.18 (city base) + 0.15 (matching specialty) + 0.59 (focus)
materialCost = returnableRefined × (1 − returnRate) + nonReturnable(artifacts)
itemValue = Σ refinedUnits × 16 × 2^(tier−4) × 2^enchant
stationFee = itemValue × 0.1125 × (feePer100 / 100)
profit = bmBuyMax × (1 − tax) − (materialCost + stationFee)
```

City crafting specialties (+15% return) are in `data/cities.json`.

## Filters

Both tabs filter by **top-level category** (Weapons, Off-hands, Head/Body/Foot Armor, Bags, Capes), **tier**, **min profit**, **min margin %**, **sort**, and **search**, plus a global **Premium/Non-premium** toggle. The Crafting tab adds a **city** selector, **focus** toggle, and **station fee** input.

## Notes

- Market data is crowd-sourced; treat results as guidance, not guarantees. Transport risk to Caerleon is not modeled — keep a margin buffer.
- Item value is reconstructed from recipe inputs because the current game dump no longer ships `@itemvalue`.
- Please credit the Albion Online Data Project if you share this.
