"use client";

import type { FlipResult } from "@/types";
import { fmtFull } from "@/lib/util";
import { ItemCell, ProfitText, Freshness } from "./bits";

export function FlipTable({ rows }: { rows: FlipResult[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-surface">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b bg-surface-2/60 text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-3 font-medium">Item</th>
            <th className="px-4 py-3 font-medium">Buy from</th>
            <th className="px-4 py-3 text-right font-medium">Buy price</th>
            <th className="px-4 py-3 text-right font-medium">Black Market</th>
            <th className="px-4 py-3 text-right font-medium">Profit</th>
            <th className="px-4 py-3 text-right font-medium">Margin</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b last:border-0 hover:bg-surface-2/40">
              <td className="px-4 py-2.5">
                <ItemCell id={r.id} name={r.name} tier={r.tier} enchant={r.enchant} sub={r.category} />
              </td>
              <td className="px-4 py-2.5">
                <span className="rounded-md bg-surface-2 px-2 py-1 text-xs font-medium">{r.sourceCity}</span>
              </td>
              <td className="px-4 py-2.5 text-right">
                <div className="tabular font-medium">{fmtFull(r.buyPrice)}</div>
                <div className="mt-0.5 flex justify-end">
                  <Freshness hours={r.buyAgeHours} />
                </div>
              </td>
              <td className="px-4 py-2.5 text-right">
                <div className="tabular font-medium">{fmtFull(r.bmPrice)}</div>
                <div className="mt-0.5 flex justify-end">
                  <Freshness hours={r.bmAgeHours} />
                </div>
              </td>
              <td className="px-4 py-2.5 text-right">
                <ProfitText value={r.profit} />
              </td>
              <td className="tabular px-4 py-2.5 text-right">
                <span className={r.marginPct >= 0 ? "text-profit" : "text-loss"}>
                  {r.marginPct.toFixed(0)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
