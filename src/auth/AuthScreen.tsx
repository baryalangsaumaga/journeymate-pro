import { useState } from "react";
import { motion } from "framer-motion";
import { Map, Mail, Lock, User as UserIcon, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "./AuthProvider";
import { useT } from "@/i18n/I18nProvider";
import { toast } from "@/hooks/use-toast";

export default function AuthScreen() {
  const { signInEmail, signUpEmail, signInGoogle, signInApple, signInGuest } = useAuth();
  const { t } = useT();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !pass) return toast({ title: "Missing fields", description: "Enter email and password." });
    if (mode === "up" && !name) return toast({ title: "Missing name", description: "Enter your full name." });
    setLoading("email");
    try {
      if (mode === "in") await signInEmail(email, pass);
      else await signUpEmail(name, email, pass);
      toast({ title: "👋 Welcome!", description: "Signed in successfully." });
    } finally { setLoading(null); }
  };

  const handleSocial = async (provider: "google" | "apple") => {
    setLoading(provider);
    try {
      if (provider === "google") await signInGoogle();
      else await signInApple();
      toast({ title: "👋 Welcome!", description: `Signed in with ${provider}.` });
    } finally { setLoading(null); }
  };

  return (
    <div className="h-[100dvh] overflow-y-auto bg-gradient-to-br from-background via-background to-primary/5">
      <div className="min-h-full flex flex-col items-center justify-center px-6 py-10 safe-top safe-bottom">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-travel mb-4">
              <Map className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="font-display font-bold text-2xl tracking-tight">{t("auth.welcome")}</h1>
            <p className="text-xs text-muted-foreground mt-1">{t("auth.subtitle")}</p>
          </div>

          <div className="space-y-2 mb-4">
            <Button variant="outline" className="w-full h-11 rounded-xl font-semibold gap-2.5" onClick={() => handleSocial("google")} disabled={!!loading}>
              {loading === "google" ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <svg className="w-4 h-4" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>
              )}
              {t("auth.continueGoogle")}
            </Button>
            <Button variant="outline" className="w-full h-11 rounded-xl font-semibold gap-2.5" onClick={() => handleSocial("apple")} disabled={!!loading}>
              {loading === "apple" ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="text-base">🍎</span>}
              {t("auth.continueApple")}
            </Button>
          </div>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">{t("auth.or")}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-2.5">
            {mode === "up" && (
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={name} onChange={e => setName(e.target.value)} placeholder={t("auth.name")} className="pl-9 h-11 rounded-xl" />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder={t("auth.email")} className="pl-9 h-11 rounded-xl" />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={pass} onChange={e => setPass(e.target.value)} type={showPass ? "text" : "password"} placeholder={t("auth.password")} className="pl-9 pr-9 h-11 rounded-xl" />
              <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button type="submit" className="w-full h-11 rounded-xl font-display font-bold shadow-travel" disabled={!!loading}>
              {loading === "email" ? <Loader2 className="w-4 h-4 animate-spin" /> : (mode === "in" ? t("auth.signIn") : t("auth.signUp"))}
            </Button>
          </form>

          <div className="text-center mt-4">
            <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="text-xs text-muted-foreground">
              {mode === "in" ? t("auth.noAccount") : t("auth.haveAccount")}{" "}
              <span className="text-primary font-semibold">{mode === "in" ? t("auth.signUp") : t("auth.signIn")}</span>
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-border/50">
            <Button variant="ghost" className="w-full h-10 rounded-xl text-xs font-semibold text-muted-foreground" onClick={signInGuest}>
              {t("auth.guest")} →
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
