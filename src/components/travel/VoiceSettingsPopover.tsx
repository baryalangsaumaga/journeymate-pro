// Popover-style voice guidance controls: on/off, volume, rate, language, voice.
import { Volume2, VolumeX } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAvailableVoices, type VoicePrefs } from "@/hooks/useVoiceGuide";
import { useMemo } from "react";

interface Props { value: VoicePrefs; onChange: (p: VoicePrefs) => void; }

export function VoiceSettingsPopover({ value, onChange }: Props) {
  const voices = useAvailableVoices();
  const langs = useMemo(() => {
    const s = new Set<string>();
    voices.forEach(v => s.add(v.lang));
    if (s.size === 0) ["en-US","es-ES","fr-FR","de-DE","ja-JP","ko-KR","zh-CN","pt-BR"].forEach(l => s.add(l));
    return Array.from(s).sort();
  }, [voices]);
  const voicesForLang = voices.filter(v => v.lang === value.lang);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className={`h-9 w-9 bg-card/95 backdrop-blur-sm shadow-card-hover rounded-xl border-border/50 ${value.enabled ? "" : "text-muted-foreground"}`}>
          {value.enabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3 space-y-3 rounded-2xl z-[60]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold">Voice Guidance</span>
          <Switch checked={value.enabled} onCheckedChange={v => onChange({ ...value, enabled: v })} />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground"><span>Volume</span><span>{Math.round(value.volume * 100)}%</span></div>
          <Slider value={[value.volume]} min={0} max={1} step={0.05} onValueChange={([v]) => onChange({ ...value, volume: v })} disabled={!value.enabled} />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground"><span>Speech rate</span><span>{value.rate.toFixed(1)}×</span></div>
          <Slider value={[value.rate]} min={0.6} max={1.6} step={0.1} onValueChange={([v]) => onChange({ ...value, rate: v })} disabled={!value.enabled} />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-muted-foreground">Language</label>
          <Select value={value.lang} onValueChange={l => onChange({ ...value, lang: l, voiceURI: undefined })} disabled={!value.enabled}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="z-[70] max-h-60">
              {langs.map(l => <SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {voicesForLang.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground">Voice</label>
            <Select value={value.voiceURI ?? voicesForLang[0].voiceURI} onValueChange={u => onChange({ ...value, voiceURI: u })} disabled={!value.enabled}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="z-[70] max-h-60">
                {voicesForLang.map(v => <SelectItem key={v.voiceURI} value={v.voiceURI} className="text-xs">{v.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
