"use client";

import { useMemo, useState } from "react";
import { useSettings } from "@/components/Providers";
import { DEFAULT_FRESH_HOURS, type Category } from "@/lib/constants";
import { CategoryChips, TierChips, CityChips, SORT_OPTIONS } from "@/components/Filters";
import { Field, NumberInput, Select, TextInput, Button, Spinner } from "@/components/ui";
import { FlipTable } from "@/components/FlipTable";
import { EmptyState, LoadingState, ErrorState } from "@/components/bits";
import { useScan, buildQuery } from "@/components/useScan";
import type { FlipResponse } from "@/types";

type Sort = "profit" | "margin" | "tier" | "name";

export default function FlipsPage() {
  const { premium } = useSettings();
  const [categories, setCategories] = useState<Category[]>([]);
  const [tiers, setTiers] = useState<number[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [minProfit, setMinProfit] = useState(1000);
  const [minMargin, setMinMargin] = useState(0);
  const [sort, setSort] = useState<Sort>("profit");
  const [search, setSearch] = useState("");
  const [nonce, setNonce] = useState(0);

  const url = useMemo(
    () =>
      "/api/flips" +
      buildQuery({
        premium,
        categories: categories.join(","),
        tiers: tiers.join(","),
        cities: cities.join(","),
        minProfit,
        minMargin,
        sort,
        search,
        freshHours: DEFAULT_FRESH_HOURS,
        _: nonce,
      }),
    [premium, categories, tiers, cities, minProfit, minMargin, sort, search, nonce],
  );

  const { data, loading, error } = useScan<FlipResponse>(url);

  const toggleCategory = (c: Category) =>
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  const toggleTier = (t: number) =>
    setTiers((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  const toggleCity = (c: string) =>
    setCities((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="border-b bg-surface/80 px-6 py-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold">Black Market Flips</h1>
            <p className="text-sm text-muted">
              Buy in a Royal city, sell to the Black Market in Caerleon.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {data && (
              <span className="text-sm text-muted">
                <span className="font-semibold text-fg">{data.meta.matched.toLocaleString()}</span> flips ·{" "}
                {data.meta.scanned.toLocaleString()} scanned
              </span>
            )}
            <Button variant="ghost" onClick={() => setNonce((n) => n + 1)}>
              {loading ? <Spinner /> : <RefreshIcon />}
              Refresh
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <CategoryChips
            selected={categories}
            onToggle={toggleCategory}
            onClear={() => setCategories([])}
          />
          <CityChips selected={cities} onToggle={toggleCity} onClear={() => setCities([])} />
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
            {data.meta.priced.toLocaleString()} of {data.meta.scanned.toLocaleString()} items had price
            data · {premium ? "4%" : "8%"} sales tax applied · updated{" "}
            {new Date(data.meta.generatedAt).toLocaleTimeString()}
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
  data: FlipResponse | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (error && !data) return <ErrorState message={error} onRetry={onRetry} />;
  if (!data && loading) return <LoadingState label="Scanning the Black Market…" />;
  if (data && data.results.length === 0)
    return (
      <EmptyState
        title="No profitable flips found"
        hint="Try lowering the minimum profit, widening the tier/category filters, or increasing the freshness window. Crowd-sourced prices can be sparse for less-traded items."
      />
    );
  if (!data) return <LoadingState label="Loading…" />;
  return (
    <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
      <FlipTable rows={data.results} />
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
