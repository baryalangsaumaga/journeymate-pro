// SpeechSynthesis helper for turn-by-turn voice prompts.
// Supports volume, rate, language, and explicit voice selection.
import { useCallback, useEffect, useRef, useState } from "react";

export interface VoicePrefs {
  enabled: boolean;
  volume: number;   // 0..1
  rate: number;     // 0.5..2
  lang: string;     // e.g. "en-US"
  voiceURI?: string;
}

const KEY = "Intellitravel:voicePrefs";

const defaultPrefs: VoicePrefs = {
  enabled: true, volume: 1, rate: 1, lang: "en-US", voiceURI: undefined,
};

export function loadVoicePrefs(): VoicePrefs {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...defaultPrefs, ...JSON.parse(raw) } : defaultPrefs;
  } catch { return defaultPrefs; }
}
export function saveVoicePrefs(p: VoicePrefs) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

export function useAvailableVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const refresh = () => setVoices(window.speechSynthesis.getVoices());
    refresh();
    window.speechSynthesis.addEventListener?.("voiceschanged", refresh);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", refresh);
  }, []);
  return voices;
}

export function useVoiceGuide(prefs: VoicePrefs) {
  const lastSaid = useRef<string>("");
  const voices = useAvailableVoices();

  const speak = useCallback((text: string) => {
    if (!prefs.enabled || !text || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (lastSaid.current === text) return;
    lastSaid.current = text;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = prefs.rate; u.pitch = 1.0; u.volume = prefs.volume; u.lang = prefs.lang;
      const v = voices.find(x => x.voiceURI === prefs.voiceURI) ?? voices.find(x => x.lang === prefs.lang);
      if (v) u.voice = v;
      window.speechSynthesis.speak(u);
    } catch { /* ignore */ }
  }, [prefs, voices]);

  const cancel = useCallback(() => {
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    lastSaid.current = "";
  }, []);

  return { speak, cancel };
}
