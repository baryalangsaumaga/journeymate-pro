import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      // Save the token from Google OAuth
      localStorage.setItem("auth_token", token);
      
      // We force a full page reload so that AuthProvider's mount effect 
      // picks up the token and fetches the user from the backend
      window.location.replace("/");
    } else {
      navigate("/");
    }
  }, [searchParams, navigate]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm font-medium text-muted-foreground">Authenticating...</p>
      </div>
    </div>
  );
}
