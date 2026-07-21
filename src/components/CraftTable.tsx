"use client";

import { useState } from "react";
import type { CraftResult } from "@/types";
import { fmtFull } from "@/lib/util";
import { ItemCell, ProfitText, Freshness } from "./bits";
import { CraftDetailModal } from "./CraftDetailModal";

export function CraftTable({ rows }: { rows: CraftResult[] }) {
  const [selected, setSelected] = useState<CraftResult | null>(null);
  return (
    <>
    <div className="overflow-x-auto rounded-xl border bg-surface">
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="border-b bg-surface-2/60 text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-3 font-medium">Item</th>
            <th className="px-4 py-3 text-right font-medium">Materials</th>
            <th className="px-4 py-3 text-right font-medium">Return</th>
            <th className="px-4 py-3 text-right font-medium">Station fee</th>
            <th className="px-4 py-3 text-right font-medium">Total cost</th>
            <th className="px-4 py-3 text-right font-medium">Black Market</th>
            <th className="px-4 py-3 text-right font-medium">Profit</th>
            <th className="px-4 py-3 text-right font-medium">Margin</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              onClick={() => setSelected(r)}
              title="Click for the full crafting breakdown"
              className="cursor-pointer border-b last:border-0 hover:bg-surface-2/40"
            >
              <td className="px-4 py-2.5">
                <ItemCell
                  id={r.id}
                  name={r.name}
                  tier={r.tier}
                  enchant={r.enchant}
                  sub={r.category}
                />
              </td>
              <td className="tabular px-4 py-2.5 text-right">{fmtFull(r.materialCost)}</td>
              <td className="px-4 py-2.5 text-right">
                {r.returnApplies ? (
                  <span className="tabular inline-flex items-center gap-1">
                    {(r.returnRate * 100).toFixed(1)}%
                    {r.specialtyMatch && (
                      <span title="City specialty bonus" className="text-amber-500">★</span>
                    )}
                  </span>
                ) : (
                  <span className="text-muted" title="No refined materials to return (assembled from finished components)">
                    —
                  </span>
                )}
              </td>
              <td className="tabular px-4 py-2.5 text-right">{fmtFull(r.stationFee)}</td>
              <td className="tabular px-4 py-2.5 text-right">{fmtFull(r.totalCost)}</td>
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
    {selected && <CraftDetailModal row={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
