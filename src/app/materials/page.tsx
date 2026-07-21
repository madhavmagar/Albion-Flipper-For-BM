"use client";

import { useEffect, useMemo, useState } from "react";
import { DEFAULT_FRESH_HOURS } from "@/lib/constants";
import { MaterialTypeChips, TierChips } from "@/components/Filters";
import { Field, TextInput, Button, Spinner } from "@/components/ui";
import { MaterialsTable } from "@/components/MaterialsTable";
import { EmptyState, LoadingState, ErrorState } from "@/components/bits";
import { useScan, buildQuery } from "@/components/useScan";
import type { MaterialsResponse } from "@/types";

const STORAGE_KEY = "af.matprices";

export default function MaterialsPage() {
  const [types, setTypes] = useState<string[]>(["Refined"]);
  const [tiers, setTiers] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [nonce, setNonce] = useState(0);
  const [overrides, setOverrides] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) setOverrides(JSON.parse(s));
    } catch {
      /* ignore */
    }
  }, []);

  const url = useMemo(
    () =>
      "/api/materials" +
      buildQuery({
        types: types.join(","),
        tiers: tiers.join(","),
        search,
        freshHours: DEFAULT_FRESH_HOURS,
        _: nonce,
      }),
    [types, tiers, search, nonce],
  );
  const { data, loading, error } = useScan<MaterialsResponse>(url);

  const toggleType = (t: string) =>
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  const toggleTier = (t: number) =>
    setTiers((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const edit = (id: string, city: string, value: number | null) =>
    setOverrides((prev) => {
      const key = `${id}::${city}`;
      const next = { ...prev };
      if (value == null) delete next[key];
      else next[key] = value;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });

  const clearAll = () => {
    setOverrides({});
    localStorage.removeItem(STORAGE_KEY);
  };

  const overrideCount = Object.keys(overrides).length;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="border-b bg-surface/80 px-6 py-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold">Material Prices</h1>
            <p className="text-sm text-muted">
              Crafting-material buy prices across every city. Type a value to set your own.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {overrideCount > 0 && (
              <Button variant="ghost" onClick={clearAll}>
                Clear {overrideCount} manual{overrideCount === 1 ? " price" : " prices"}
              </Button>
            )}
            {data && (
              <span className="text-sm text-muted">
                <span className="font-semibold text-fg">{data.meta.scanned.toLocaleString()}</span> materials
              </span>
            )}
            <Button variant="ghost" onClick={() => setNonce((n) => n + 1)}>
              {loading ? <Spinner /> : <RefreshIcon />}
              Refresh
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <MaterialTypeChips selected={types} onToggle={toggleType} onClear={() => setTypes([])} />
          <div className="flex flex-wrap items-end justify-between gap-4">
            <TierChips selected={tiers} onToggle={toggleTier} onClear={() => setTiers([])} />
            <div className="w-56">
              <Field label="Search">
                <TextInput value={search} onChange={setSearch} placeholder="Material name…" />
              </Field>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <Content data={data} loading={loading} error={error} overrides={overrides} onEdit={edit} onRetry={() => setNonce((n) => n + 1)} />
        <p className="mt-4 text-center text-xs text-muted">
          Colored dot = market-price freshness (green &lt;1h, amber &lt;8h, red older). Manual prices are saved in
          this browser only.
        </p>
      </div>
    </div>
  );
}

function Content({
  data,
  loading,
  error,
  overrides,
  onEdit,
  onRetry,
}: {
  data: MaterialsResponse | null;
  loading: boolean;
  error: string | null;
  overrides: Record<string, number>;
  onEdit: (id: string, city: string, value: number | null) => void;
  onRetry: () => void;
}) {
  if (error && !data) return <ErrorState message={error} onRetry={onRetry} />;
  if (!data && loading) return <LoadingState label="Loading material prices…" />;
  if (data && data.results.length === 0)
    return <EmptyState title="No materials match" hint="Try a different type or tier filter." />;
  if (!data) return <LoadingState label="Loading…" />;
  return (
    <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
      <MaterialsTable rows={data.results} cities={data.meta.cities} overrides={overrides} onEdit={onEdit} />
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
