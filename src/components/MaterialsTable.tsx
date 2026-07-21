"use client";

import { useEffect, useState } from "react";
import type { MaterialRow } from "@/types";
import { fmtFull, fmtAge } from "@/lib/util";
import { ItemCell } from "./bits";

export function MaterialsTable({
  rows,
  cities,
  overrides,
  onEdit,
}: {
  rows: MaterialRow[];
  cities: string[];
  overrides: Record<string, number>;
  onEdit: (id: string, city: string, value: number | null) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-surface">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="border-b bg-surface-2/60 text-left text-xs uppercase tracking-wide text-muted">
            <th className="sticky left-0 z-10 bg-surface-2/60 px-4 py-3 font-medium">Material</th>
            {cities.map((c) => (
              <th key={c} className="px-2 py-3 text-right font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.id} className="border-b last:border-0 hover:bg-surface-2/30">
              <td className="sticky left-0 z-10 bg-surface px-4 py-2 group-hover:bg-surface-2/30">
                <ItemCell id={m.id} name={m.name} tier={m.tier} enchant={m.enchant} sub={m.type} />
              </td>
              {cities.map((c) => {
                const key = `${m.id}::${c}`;
                const p = m.prices[c];
                return (
                  <td key={c} className="px-1.5 py-2 align-middle">
                    <PriceCell
                      market={p?.price}
                      age={p?.age ?? null}
                      override={overrides[key]}
                      onCommit={(v) => onEdit(m.id, c, v)}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function freshnessDot(age: number | null): string | null {
  if (age == null) return null;
  if (age < 1) return "bg-profit";
  if (age < 8) return "bg-amber-500";
  return "bg-loss";
}

function PriceCell({
  market,
  age,
  override,
  onCommit,
}: {
  market: number | undefined;
  age: number | null;
  override: number | undefined;
  onCommit: (value: number | null) => void;
}) {
  const [text, setText] = useState(override != null ? String(override) : "");
  useEffect(() => {
    setText(override != null ? String(override) : "");
  }, [override]);

  const overridden = override != null;
  const dot = market != null ? freshnessDot(age) : null;

  return (
    <div className="relative w-[86px]">
      {dot && (
        <span
          className={`pointer-events-none absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full ${dot}`}
          title={`Market ${fmtFull(market as number)} · updated ${fmtAge(age)}`}
        />
      )}
      <input
        inputMode="numeric"
        value={text}
        placeholder={market != null ? fmtFull(market) : "—"}
        onChange={(e) => setText(e.target.value.replace(/[^0-9]/g, ""))}
        onBlur={() => {
          const t = text.trim();
          if (t === "") return onCommit(null);
          const n = Number(t);
          if (Number.isFinite(n)) onCommit(n);
        }}
        title={
          market != null
            ? `Market: ${fmtFull(market)} · updated ${fmtAge(age)}`
            : "No market data — enter your own"
        }
        className={`tabular w-full rounded-md border bg-surface py-1 pl-4 pr-2 text-right text-xs outline-none focus:border-accent ${
          overridden
            ? "border-accent font-semibold text-accent"
            : "border-transparent text-muted hover:border-border"
        }`}
      />
    </div>
  );
}
