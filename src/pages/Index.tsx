import AppShell from "@/components/layout/AppShell";
import AuthScreen from "@/auth/AuthScreen";
import { useAuth } from "@/auth/AuthProvider";

const Index = () => {
  const { user, ready } = useAuth();
  if (!ready) return <div className="h-[100dvh] flex items-center justify-center bg-background"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  if (!user) return <AuthScreen />;
  return <AppShell />;
};

export default Index;
