"use client";

import { useEffect, useState } from "react";
import { ageHours, fmtAge } from "@/lib/util";

interface Stats {
  items: number;
  ordersIngested: number;
  lastIngest: string | null;
}

/** Live indicator of whether the local private capture is flowing. */
export function CaptureStatus() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let alive = true;
    const poll = () =>
      fetch("/api/private/stats")
        .then((r) => r.json())
        .then((s: Stats) => {
          if (alive) setStats(s);
        })
        .catch(() => {});
    poll();
    const t = setInterval(poll, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const age = stats?.lastIngest ? ageHours(stats.lastIngest) : null;
  const live = age != null && age < 0.5 / 60; // < 30s
  const recent = age != null && age < 5 / 60; // < 5 min
  const has = !!stats && stats.items > 0;

  const dot = live ? "bg-profit" : recent ? "bg-amber-500" : has ? "bg-muted/60" : "bg-muted/40";
  const label = live ? "Capturing…" : recent ? "Capture idle" : has ? "Capture paused" : "Not capturing";

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-surface-2 px-3 py-2">
      <span className={`h-2 w-2 shrink-0 rounded-full ${dot} ${live ? "animate-pulse" : ""}`} />
      <div className="min-w-0 leading-tight">
        <div className="text-xs font-medium">{label}</div>
        <div className="truncate text-[11px] text-muted">
          {has
            ? `${stats!.items.toLocaleString()} items · ${age != null ? fmtAge(age) : "—"}`
            : "open a market in-game to start"}
        </div>
      </div>
    </div>
  );
}
