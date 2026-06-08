// SpeechSynthesis helper for turn-by-turn voice prompts.
import { useCallback, useRef } from "react";

export function useVoiceGuide(enabled: boolean) {
  const lastSaid = useRef<string>("");

  const speak = useCallback((text: string) => {
    if (!enabled || !text || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (lastSaid.current === text) return;
    lastSaid.current = text;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.0; u.pitch = 1.0; u.volume = 1.0; u.lang = "en-US";
      window.speechSynthesis.speak(u);
    } catch { /* ignore */ }
  }, [enabled]);

  const cancel = useCallback(() => {
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    lastSaid.current = "";
  }, []);

  return { speak, cancel };
}
