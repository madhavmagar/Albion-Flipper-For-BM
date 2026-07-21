"use client";

import { useMemo, useState } from "react";
import { useSettings } from "@/components/Providers";
import { CITIES, CRAFT_CITIES, DEFAULT_FRESH_HOURS, type Category } from "@/lib/constants";
import { CategoryChips, TierChips, SORT_OPTIONS } from "@/components/Filters";
import { Field, NumberInput, Select, TextInput, Button, Switch, Spinner } from "@/components/ui";
import { CraftTable } from "@/components/CraftTable";
import { EmptyState, LoadingState, ErrorState } from "@/components/bits";
import { useScan, buildQuery } from "@/components/useScan";
import type { CraftResponse } from "@/types";

type Sort = "profit" | "margin" | "tier" | "name";

const CITY_OPTIONS: { value: string; label: string }[] = CRAFT_CITIES.map((c) => ({
  value: c,
  label: c === "Caerleon" ? "Caerleon (no transport)" : c,
}));

const RESOURCE_SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: "cheapest", label: "Cheapest city" },
  ...CITIES.map((c) => ({ value: c, label: c })),
];

export default function CraftPage() {
  const { premium } = useSettings();
  const [city, setCity] = useState<string>(CRAFT_CITIES[0]);
  const [resSource, setResSource] = useState<string>("cheapest");
  const [focus, setFocus] = useState(false);
  const [stationFee, setStationFee] = useState(1000);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tiers, setTiers] = useState<number[]>([]);
  const [minProfit, setMinProfit] = useState(0);
  const [minMargin, setMinMargin] = useState(0);
  const [sort, setSort] = useState<Sort>("profit");
  const [search, setSearch] = useState("");
  const [nonce, setNonce] = useState(0);

  const url = useMemo(
    () =>
      "/api/craft" +
      buildQuery({
        city,
        premium,
        focus,
        resSource,
        stationFee,
        categories: categories.join(","),
        tiers: tiers.join(","),
        minProfit,
        minMargin,
        sort,
        search,
        freshHours: DEFAULT_FRESH_HOURS,
        _: nonce,
      }),
    [city, premium, focus, resSource, stationFee, categories, tiers, minProfit, minMargin, sort, search, nonce],
  );

  const { data, loading, error } = useScan<CraftResponse>(url);

  const toggleCategory = (c: Category) =>
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  const toggleTier = (t: number) =>
    setTiers((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="border-b bg-surface/80 px-6 py-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold">Crafting Calculator</h1>
            <p className="text-sm text-muted">
              Buy refined resources in a Royal city, craft, and sell to the Black Market.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {data && (
              <span className="text-sm text-muted">
                <span className="font-semibold text-fg">{data.meta.matched.toLocaleString()}</span> craftable ·{" "}
                {data.meta.scanned.toLocaleString()} scanned
              </span>
            )}
            <Button variant="ghost" onClick={() => setNonce((n) => n + 1)}>
              {loading ? <Spinner /> : <RefreshIcon />}
              Refresh
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div className="w-44">
            <Field label="Craft in city">
              <Select value={city} onChange={setCity} options={CITY_OPTIONS} />
            </Field>
          </div>
          <div className="w-32">
            <Field label="Station fee /100">
              <NumberInput value={stationFee} onChange={setStationFee} step={50} />
            </Field>
          </div>
          <div className="rounded-lg border bg-surface px-3 py-2">
            <Switch checked={focus} onChange={setFocus} label="Use focus" hint="+59% return rate" />
          </div>
          <div className="w-40">
            <Field label="Resource sourcing">
              <Select value={resSource} onChange={setResSource} options={RESOURCE_SOURCE_OPTIONS} />
            </Field>
          </div>
          <span className="max-w-xs pb-2 text-xs text-muted">
            {resSource === "cheapest"
              ? "Resources priced at the cheapest city; return rate uses the craft city."
              : `Resources priced in ${resSource}; return rate uses the craft city (${city}).`}
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <CategoryChips selected={categories} onToggle={toggleCategory} onClear={() => setCategories([])} />
          <div className="flex flex-wrap items-end justify-between gap-4">
            <TierChips selected={tiers} onToggle={toggleTier} onClear={() => setTiers([])} />
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-44">
                <Field label="Search">
                  <TextInput value={search} onChange={setSearch} placeholder="Item name…" />
                </Field>
              </div>
              <div className="w-32">
                <Field label="Min profit">
                  <NumberInput value={minProfit} onChange={setMinProfit} step={500} />
                </Field>
              </div>
              <div className="w-28">
                <Field label="Min margin %">
                  <NumberInput value={minMargin} onChange={setMinMargin} step={5} />
                </Field>
              </div>
              <div className="w-36">
                <Field label="Sort by">
                  <Select value={sort} onChange={(v) => setSort(v as Sort)} options={[...SORT_OPTIONS]} />
                </Field>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <Content data={data} loading={loading} error={error} onRetry={() => setNonce((n) => n + 1)} />
        {data && (
          <p className="mt-4 text-center text-xs text-muted">
            Crafted in {data.meta.city} ·{" "}
            {data.meta.resourceSource === "cheapest"
              ? "resources from cheapest city"
              : `resources from ${data.meta.resourceSource}`} ·{" "}
            {premium ? "4%" : "8%"} sales tax · {data.meta.focus ? "focus on" : "no focus"} · station fee{" "}
            {data.meta.stationFee}/100 · updated {new Date(data.meta.generatedAt).toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
}

function Content({
  data,
  loading,
  error,
  onRetry,
}: {
  data: CraftResponse | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (error && !data) return <ErrorState message={error} onRetry={onRetry} />;
  if (!data && loading) return <LoadingState label="Pricing recipes…" />;
  if (data && data.results.length === 0)
    return (
      <EmptyState
        title="No profitable crafts found"
        hint="Try a different city, enable focus, lower the minimum profit, or widen the filters. Items are skipped when a resource or the Black Market price is missing/stale."
      />
    );
  if (!data) return <LoadingState label="Loading…" />;
  return (
    <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
      <CraftTable rows={data.results} />
    </div>
  );
}

function RefreshIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
    </svg>
  );
}
