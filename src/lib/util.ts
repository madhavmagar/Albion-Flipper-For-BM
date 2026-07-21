// Pure helpers shared by client and server (no server-only imports).

/** Age in hours of an AODP UTC timestamp (no zone suffix), or null. */
export function ageHours(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const iso = /[zZ]|[+-]\d\d:?\d\d$/.test(dateStr) ? dateStr : `${dateStr}Z`;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const age = (Date.now() - t) / 3_600_000;
  return age < 0 ? 0 : age;
}

/** Compact silver formatting: 12.3k / 1.24m. */
export function fmtSilver(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}m`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return Math.round(n).toLocaleString("en-US");
}

/** Full silver with thousands separators. */
export function fmtFull(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function fmtAge(hours: number | null): string {
  if (hours == null) return "no data";
  const mins = hours * 60;
  if (mins < 1) return `${Math.max(1, Math.round(mins * 60))}s ago`;
  if (mins < 60) return `${Math.round(mins)}m ago`;
  if (hours < 24) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
