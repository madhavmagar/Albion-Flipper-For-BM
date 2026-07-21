"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { useSettings } from "./Providers";
import { Segmented } from "./ui";
import { ATTRIBUTION } from "@/lib/constants";

const NAV = [
  { href: "/flips", label: "Black Market Flips", icon: FlipIcon },
  { href: "/craft", label: "Crafting Calculator", icon: CraftIcon },
  { href: "/materials", label: "Material Prices", icon: MaterialIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const { premium, setPremium } = useSettings();

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r bg-surface lg:w-64">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-fg">
          <BoltIcon />
        </div>
        <div className="leading-tight">
          <div className="text-[15px] font-bold">Albion Flipper</div>
          <div className="text-xs text-muted">Black Market tools</div>
        </div>
      </div>

      <nav className="flex flex-col gap-1 px-3 py-2">
        {NAV.map((item) => {
          const active = pathname === item.href || (pathname === "/" && item.href === "/flips");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:bg-surface-2 hover:text-fg"
              }`}
            >
              <Icon />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mx-3 my-3 border-t" />

      <div className="flex flex-col gap-4 px-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Account</span>
          <Segmented
            value={premium ? "premium" : "free"}
            onChange={(v) => setPremium(v === "premium")}
            options={[
              { value: "premium", label: "Premium" },
              { value: "free", label: "Non-prem" },
            ]}
          />
          <span className="text-xs text-muted">
            Sales tax {premium ? "4%" : "8%"} on Black Market sales.
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Theme</span>
          <ThemeToggle />
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2 px-4 pb-4 pt-6">
        <div className="flex items-center gap-2 rounded-lg border bg-surface-2 px-3 py-2 text-xs">
          <span className="h-2 w-2 rounded-full bg-profit" />
          <span className="text-muted">Server:</span>
          <span className="font-semibold">Asia (East)</span>
        </div>
        <p className="text-[11px] leading-relaxed text-muted">{ATTRIBUTION}. Prices are crowd-sourced and may be delayed.</p>
      </div>
    </aside>
  );
}

function BoltIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  );
}
function FlipIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7h13l-3-3M21 17H8l3 3" />
    </svg>
  );
}
function CraftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4l-6 6a1.4 1.4 0 0 0 2 2l6-6a4 4 0 0 0 5.4-5.4l-2.3 2.3-2-2 2.3-2.3z" />
    </svg>
  );
}
function MaterialIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
    </svg>
  );
}
