"use client";

import { useEffect } from "react";
import type { CraftResult } from "@/types";
import { itemIcon } from "@/lib/constants";
import { fmtFull } from "@/lib/util";
import { TierBadge, Freshness, ProfitText, CopyButton } from "./bits";

export function CraftDetailModal({ row, onClose }: { row: CraftResult; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const taxPct = row.bmPrice > 0 ? Math.round((1 - row.revenue / row.bmPrice) * 100) : 0;
  const returnCredit = row.grossMaterialCost - row.materialCost;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-h-[86vh] w-full max-w-2xl overflow-y-auto rounded-xl border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-start gap-3 border-b bg-surface/95 px-5 py-4 backdrop-blur">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border bg-surface-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={itemIcon(row.id)} alt={row.name} width={48} height={48} className="h-12 w-12 object-contain" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-lg font-bold">{row.name}</h2>
              <TierBadge tier={row.tier} enchant={row.enchant} />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted">
              <span>
                {row.category} · {row.id}
              </span>
              <CopyButton text={row.name} tier={row.tier} enchant={row.enchant} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-fg"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Profit banner */}
        <div className="grid grid-cols-3 gap-px border-b bg-border/60">
          <Stat label="Profit / craft">
            <ProfitText value={row.profit} />
          </Stat>
          <Stat label="Margin">
            <span className={`tabular font-semibold ${row.marginPct >= 0 ? "text-profit" : "text-loss"}`}>
              {row.marginPct.toFixed(0)}%
            </span>
          </Stat>
          <Stat label="Total cost">
            <span className="tabular font-semibold">{fmtFull(row.totalCost)}</span>
          </Stat>
        </div>

        {/* Craft setup */}
        <Section title="Where to craft">
          <KV k="Craft in" v={<span className="font-medium">{row.city}</span>} />
          <KV
            k="Resource return"
            v={
              row.returnApplies ? (
                <span className="tabular">
                  {(row.returnRate * 100).toFixed(1)}%
                  {row.specialtyMatch && <span className="ml-1 text-amber-500" title="City specialty bonus">★ specialty</span>}
                </span>
              ) : (
                <span className="text-muted">— (assembled from finished components)</span>
              )
            }
          />
          {row.returnApplies && (
            <KV k="Return credit" v={<span className="tabular text-profit">−{fmtFull(returnCredit)}</span>} />
          )}
        </Section>

        {/* Materials */}
        <Section title={`Materials (${row.resources.length})`}>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-surface-2/60 text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-3 py-2 font-medium">Material</th>
                  <th className="px-3 py-2 font-medium">From</th>
                  <th className="px-3 py-2 text-right font-medium">Qty</th>
                  <th className="px-3 py-2 text-right font-medium">Unit</th>
                  <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {row.resources.map((m, i) => (
                  <tr key={`${m.id}-${i}`} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded border bg-surface-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={itemIcon(m.id)} alt={m.name} width={26} height={26} className="h-6 w-6 object-contain" />
                        </span>
                        <span className="truncate">{m.name}</span>
                        <CopyButton text={m.name} label="" />
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">{m.sourceCity}</span>
                    </td>
                    <td className="tabular px-3 py-2 text-right">{m.count}</td>
                    <td className="tabular px-3 py-2 text-right">{fmtFull(m.unitPrice)}</td>
                    <td className="tabular px-3 py-2 text-right font-medium">{fmtFull(m.unitPrice * m.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Cost & sale breakdown */}
        <Section title="Cost & sale">
          <KV k="Gross materials" v={<span className="tabular">{fmtFull(row.grossMaterialCost)}</span>} />
          {row.returnApplies && (
            <KV k="After returns" v={<span className="tabular">{fmtFull(row.materialCost)}</span>} />
          )}
          <KV k="Station fee" v={<span className="tabular">{fmtFull(row.stationFee)}</span>} />
          <KV k="Total cost" v={<span className="tabular font-medium">{fmtFull(row.totalCost)}</span>} />
          <div className="my-1 border-t" />
          <KV
            k="Black Market pays"
            v={
              <span className="inline-flex items-center gap-2">
                <span className="tabular">{fmtFull(row.bmPrice)}</span>
                <Freshness hours={row.bmAgeHours} />
              </span>
            }
          />
          <KV k={`Sales tax (${taxPct}%)`} v={<span className="tabular text-loss">−{fmtFull(row.bmPrice - row.revenue)}</span>} />
          <KV k="Revenue after tax" v={<span className="tabular font-medium">{fmtFull(row.revenue)}</span>} />
          <div className="my-1 border-t" />
          <KV k="Profit" v={<ProfitText value={row.profit} />} />
        </Section>

        <p className="px-5 pb-5 text-xs text-muted">
          Prices are crowd-sourced (Albion Online Data Project) and may be delayed. Station fee assumes the
          fee-per-100 set in the toolbar; returns apply only to refined resources.
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b px-5 py-4 last:border-0">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface px-4 py-3 text-center">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-0.5 text-base">{children}</div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
