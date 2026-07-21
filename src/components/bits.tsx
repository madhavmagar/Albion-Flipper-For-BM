"use client";

import { useState } from "react";
import { itemIcon } from "@/lib/constants";
import { fmtAge } from "@/lib/util";
import { Spinner } from "./ui";

export function ItemCell({
  id,
  name,
  tier,
  enchant,
  sub,
}: {
  id: string;
  name: string;
  tier: number;
  enchant: number;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-surface-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={itemIcon(id)}
          alt={name}
          width={40}
          height={40}
          loading="lazy"
          className="h-10 w-10 object-contain"
        />
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium">{name}</span>
          <TierBadge tier={tier} enchant={enchant} />
        </div>
        <div className="flex items-center gap-2">
          <span className="truncate text-xs text-muted">{sub ?? id}</span>
          <CopyButton text={name} tier={tier} enchant={enchant} />
        </div>
      </div>
    </div>
  );
}

/**
 * Copies an item reference like `Expert's Warbow [5.4]` (name + [tier.enchant])
 * to the clipboard. When tier/enchant are omitted, copies the plain text.
 */
export function CopyButton({
  text,
  tier,
  enchant,
  label = "Copy",
}: {
  text: string;
  tier?: number;
  enchant?: number;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const value = tier != null && enchant != null ? `${text} [${tier}.${enchant}]` : text;
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation();
        e.preventDefault();
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {
          /* clipboard unavailable */
        }
      }}
      title={`Copy "${value}"`}
      className={`inline-flex shrink-0 items-center gap-1 rounded px-1 py-0.5 text-[11px] font-medium transition-colors ${
        copied ? "text-profit" : "text-muted hover:bg-surface-2 hover:text-accent"
      }`}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      <span>{copied ? "Copied" : label}</span>
    </button>
  );
}

function CopyIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function TierBadge({ tier, enchant }: { tier: number; enchant: number }) {
  return (
    <span className="tabular inline-flex items-center rounded border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[11px] font-semibold text-accent">
      T{tier}
      {enchant > 0 && <span className="opacity-80">.{enchant}</span>}
    </span>
  );
}

export function Freshness({ hours }: { hours: number | null }) {
  let color = "text-muted";
  if (hours != null) {
    if (hours < 1) color = "text-profit";
    else if (hours < 8) color = "text-amber-500";
    else color = "text-loss";
  }
  return (
    <span className={`tabular inline-flex items-center gap-1 text-xs ${color}`}>
      <ClockIcon />
      {fmtAge(hours)}
    </span>
  );
}

function ClockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function ProfitText({ value, className = "" }: { value: number; className?: string }) {
  const color = value > 0 ? "text-profit" : value < 0 ? "text-loss" : "text-muted";
  return <span className={`tabular font-semibold ${color} ${className}`}>{value > 0 ? "+" : ""}{fmt(value)}</span>;
}

function fmt(n: number) {
  return Math.round(n).toLocaleString("en-US");
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-surface/50 px-6 py-16 text-center">
      <div className="text-sm font-medium">{title}</div>
      {hint && <div className="max-w-md text-sm text-muted">{hint}</div>}
    </div>
  );
}

export function LoadingState({ label = "Scanning the market…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-surface/50 px-6 py-16 text-center">
      <Spinner className="h-6 w-6" />
      <div className="text-sm text-muted">{label}</div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-loss/30 bg-loss/5 px-6 py-16 text-center">
      <div className="text-sm font-medium text-loss">Something went wrong</div>
      <div className="max-w-md text-sm text-muted">{message}</div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border bg-surface px-3 py-1.5 text-sm font-medium hover:bg-surface-2"
        >
          Retry
        </button>
      )}
    </div>
  );
}
