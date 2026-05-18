import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { repo } from "@/lib/storage";

export interface AuthUser {
  name: string;
  email: string;
  avatar?: string;
  guest: boolean;
  provider?: "email" | "google" | "apple";
}

interface AuthCtx {
  user: AuthUser | null;
  ready: boolean;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (name: string, email: string, password: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signInApple: () => Promise<void>;
  signInGuest: () => void;
  signOut: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(repo.auth.get());
    setReady(true);
  }, []);

  const persist = (u: AuthUser) => {
    repo.auth.set(u);
    setUser(u);
  };

  const signInEmail = async (email: string, _password: string) => {
    await new Promise(r => setTimeout(r, 400));
    persist({ name: email.split("@")[0], email, guest: false, provider: "email" });
  };
  const signUpEmail = async (name: string, email: string, _password: string) => {
    await new Promise(r => setTimeout(r, 500));
    persist({ name, email, guest: false, provider: "email" });
  };
  const signInGoogle = async () => {
    await new Promise(r => setTimeout(r, 600));
    persist({ name: "Alex Rivera", email: "alex.rivera@gmail.com", guest: false, provider: "google", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" });
  };
  const signInApple = async () => {
    await new Promise(r => setTimeout(r, 600));
    persist({ name: "Alex Rivera", email: "alex@privaterelay.appleid.com", guest: false, provider: "apple" });
  };
  const signInGuest = () => persist({ name: "Guest", email: "", guest: true });
  const signOut = () => { repo.auth.clear(); setUser(null); };

  return (
    <Ctx.Provider value={{ user, ready, signInEmail, signUpEmail, signInGoogle, signInApple, signInGuest, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
