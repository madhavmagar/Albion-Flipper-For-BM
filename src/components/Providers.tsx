"use client";

import { ThemeProvider } from "next-themes";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { PriceSource } from "@/lib/constants";

interface Settings {
  premium: boolean;
  setPremium: (v: boolean) => void;
  source: PriceSource;
  setSource: (v: PriceSource) => void;
}

const SettingsContext = createContext<Settings | null>(null);

export function useSettings(): Settings {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within Providers");
  return ctx;
}

function SettingsProvider({ children }: { children: ReactNode }) {
  const [premium, setPremiumState] = useState(true);
  const [source, setSourceState] = useState<PriceSource>("public");

  useEffect(() => {
    const p = localStorage.getItem("af.premium");
    if (p != null) setPremiumState(p === "true");
    const s = localStorage.getItem("af.source");
    if (s === "public" || s === "private" || s === "hybrid") setSourceState(s);
  }, []);

  const setPremium = (v: boolean) => {
    setPremiumState(v);
    localStorage.setItem("af.premium", String(v));
  };
  const setSource = (v: PriceSource) => {
    setSourceState(v);
    localStorage.setItem("af.source", v);
  };

  return (
    <SettingsContext.Provider value={{ premium, setPremium, source, setSource }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <SettingsProvider>{children}</SettingsProvider>
    </ThemeProvider>
  );
}
