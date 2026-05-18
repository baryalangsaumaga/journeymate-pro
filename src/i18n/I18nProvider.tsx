import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { dict, type Lang } from "./translations";
import { repo } from "@/lib/storage";

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (repo.prefs.get().lang as Lang) || "en");

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    repo.prefs.set({ ...repo.prefs.get(), lang: l });
  };

  const t = useMemo(() => {
    return (key: string) => dict[lang]?.[key] ?? dict.en[key] ?? key;
  }, [lang]);

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useT() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useT outside I18nProvider");
  return ctx;
}
