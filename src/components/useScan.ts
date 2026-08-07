"use client";

import { useCallback, useEffect, useState } from "react";

export interface ScanState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Module-level caches persist across route changes (tab switches) for the
// lifetime of the page session, so navigating back to a tab is instant.
const responseCache = new Map<string, { data: unknown; ts: number }>();
const stateStore = new Map<string, unknown>();

/** Skip a background refetch if cached data is younger than this. */
const REVALIDATE_MS = 60_000;

/**
 * Fetch `url` with stale-while-revalidate caching. If the URL was fetched
 * before, cached data shows immediately (no loading flash) and is silently
 * revalidated in the background when older than REVALIDATE_MS.
 */
export function useScan<T>(url: string | null): ScanState<T> {
  const [state, setState] = useState<ScanState<T>>(() => {
    const c = url ? responseCache.get(url) : undefined;
    return c
      ? { data: c.data as T, loading: false, error: null }
      : { data: null, loading: false, error: null };
  });

  useEffect(() => {
    if (!url) return;
    const entry = responseCache.get(url);

    if (entry) {
      // Show cached data instantly; only refetch if it's gone stale.
      setState({ data: entry.data as T, loading: false, error: null });
      if (Date.now() - entry.ts < REVALIDATE_MS) return;
    } else {
      setState((s) => ({ data: s.data, loading: true, error: null }));
    }

    const ctrl = new AbortController();
    const timer = setTimeout(
      () => {
        fetch(url, { signal: ctrl.signal })
          .then(async (r) => {
            if (!r.ok) throw new Error(`Request failed (${r.status})`);
            return (await r.json()) as T;
          })
          .then((data) => {
            responseCache.set(url, { data, ts: Date.now() });
            setState({ data, loading: false, error: null });
          })
          .catch((e: unknown) => {
            if (e instanceof DOMException && e.name === "AbortError") return;
            setState((s) => ({
              data: s.data,
              loading: false,
              error: e instanceof Error ? e.message : "Unknown error",
            }));
          });
      },
      // Revalidating cached data is immediate; a fresh query (typing) debounces.
      entry ? 0 : 250,
    );

    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [url]);

  return state;
}

/**
 * Like useState, but the value is retained across unmounts (tab switches)
 * under `key`, so filters persist when navigating between tabs.
 */
export function usePersistentState<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [val, setVal] = useState<T>(() => (stateStore.has(key) ? (stateStore.get(key) as T) : initial));
  const set = useCallback(
    (v: T | ((prev: T) => T)) => {
      setVal((prev) => {
        const next = typeof v === "function" ? (v as (prev: T) => T)(prev) : v;
        stateStore.set(key, next);
        return next;
      });
    },
    [key],
  );
  return [val, set];
}

/** Build a query string, skipping empty values. */
export function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
