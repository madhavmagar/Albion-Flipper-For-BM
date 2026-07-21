"use client";

import { useEffect, useState } from "react";

export interface ScanState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/** Fetch `url` whenever it changes (debounced), with abort + error handling. */
export function useScan<T>(url: string | null): ScanState<T> {
  const [state, setState] = useState<ScanState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!url) return;
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));

    const timer = setTimeout(() => {
      fetch(url, { signal: ctrl.signal })
        .then(async (r) => {
          if (!r.ok) throw new Error(`Request failed (${r.status})`);
          return (await r.json()) as T;
        })
        .then((data) => setState({ data, loading: false, error: null }))
        .catch((e: unknown) => {
          if (e instanceof DOMException && e.name === "AbortError") return;
          setState((s) => ({
            data: s.data,
            loading: false,
            error: e instanceof Error ? e.message : "Unknown error",
          }));
        });
    }, 250);

    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [url]);

  return state;
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
