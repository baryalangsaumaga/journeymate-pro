import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { repo } from "@/lib/storage";

export type ThemeId = "light" | "dark" | "adventure" | "ocean" | "sunset";

// Each theme overrides CSS variables on :root. Light/dark are handled by .dark class.
const themeVars: Record<ThemeId, Record<string, string>> = {
  light: {},
  dark: {},
  adventure: {
    "--background": "240 30% 10%",
    "--foreground": "30 30% 95%",
    "--card": "240 25% 14%",
    "--card-foreground": "30 30% 95%",
    "--primary": "350 75% 55%",
    "--primary-foreground": "0 0% 100%",
    "--accent": "220 70% 35%",
    "--accent-foreground": "0 0% 100%",
    "--muted": "240 20% 18%",
    "--muted-foreground": "240 10% 65%",
    "--border": "240 20% 22%",
    "--input": "240 20% 22%",
  },
  ocean: {
    "--background": "215 60% 8%",
    "--foreground": "180 50% 92%",
    "--card": "215 50% 12%",
    "--card-foreground": "180 50% 92%",
    "--primary": "170 90% 60%",
    "--primary-foreground": "215 60% 10%",
    "--accent": "210 30% 60%",
    "--accent-foreground": "215 60% 10%",
    "--muted": "215 40% 16%",
    "--muted-foreground": "210 20% 70%",
    "--border": "215 40% 20%",
    "--input": "215 40% 20%",
  },
  sunset: {
    "--background": "265 50% 14%",
    "--foreground": "45 90% 95%",
    "--card": "265 40% 18%",
    "--card-foreground": "45 90% 95%",
    "--primary": "5 90% 65%",
    "--primary-foreground": "0 0% 100%",
    "--accent": "45 95% 60%",
    "--accent-foreground": "265 50% 14%",
    "--muted": "265 30% 22%",
    "--muted-foreground": "45 30% 75%",
    "--border": "265 30% 26%",
    "--input": "265 30% 26%",
  },
};

interface ThemeCtx {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => (repo.prefs.get().theme as ThemeId) || "light");

  useEffect(() => {
    const root = document.documentElement;
    // Clear any custom theme vars first.
    Object.keys({ ...themeVars.adventure, ...themeVars.ocean, ...themeVars.sunset }).forEach(v => root.style.removeProperty(v));
    // Toggle dark class.
    root.classList.toggle("dark", theme === "dark" || theme === "adventure" || theme === "ocean" || theme === "sunset");
    // Apply theme-specific overrides.
    Object.entries(themeVars[theme] || {}).forEach(([k, v]) => root.style.setProperty(k, v));
  }, [theme]);

  const setTheme = (t: ThemeId) => {
    setThemeState(t);
    repo.prefs.set({ ...repo.prefs.get(), theme: t });
  };

  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme outside ThemeProvider");
  return ctx;
}
