"use client";

import { ThemeProvider } from "next-themes";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface Settings {
  premium: boolean;
  setPremium: (v: boolean) => void;
}

const SettingsContext = createContext<Settings | null>(null);

export function useSettings(): Settings {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within Providers");
  return ctx;
}

function SettingsProvider({ children }: { children: ReactNode }) {
  const [premium, setPremiumState] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("af.premium");
    if (saved != null) setPremiumState(saved === "true");
  }, []);

  const setPremium = (v: boolean) => {
    setPremiumState(v);
    localStorage.setItem("af.premium", String(v));
  };

  return (
    <SettingsContext.Provider value={{ premium, setPremium }}>
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
