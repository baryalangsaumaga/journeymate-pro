// Storage abstraction layer — swap-ready for Lovable Cloud.
// All app data flows through this repository. Today it uses localStorage.
// Tomorrow: replace each method body with a Supabase/Cloud call. Same shape.

const NS = "trailsync:v1";
const k = (key: string) => `${NS}:${key}`;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(k(key));
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(k(key), JSON.stringify(value));
  } catch (e) {
    console.warn("storage.write failed", e);
  }
}

export const storage = {
  read,
  write,
  remove(key: string) {
    localStorage.removeItem(k(key));
  },
  // Dump everything under our namespace — used for backups.
  exportAll(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const fullKey = localStorage.key(i);
      if (fullKey?.startsWith(NS)) {
        try {
          out[fullKey.replace(`${NS}:`, "")] = JSON.parse(localStorage.getItem(fullKey)!);
        } catch {
          /* skip */
        }
      }
    }
    return out;
  },
  importAll(data: Record<string, unknown>) {
    Object.entries(data).forEach(([key, value]) => write(key, value));
  },
};

// Convenience repositories — same shape Cloud would expose.
export const repo = {
  auth: {
    get: () => read<{ name: string; email: string; avatar?: string; guest: boolean; provider?: string } | null>("auth", null),
    set: (u: any) => write("auth", u),
    clear: () => storage.remove("auth"),
  },
  prefs: {
    get: () => read<{ theme: string; lang: string; offline: boolean; notifications: boolean; locationSharing: boolean }>("prefs", {
      theme: "light", lang: "en", offline: true, notifications: true, locationSharing: true,
    }),
    set: (p: any) => write("prefs", p),
  },
  cms: {
    transitTypes: {
      list: () => read<Array<{ id: string; name: string; icon: string; speed: number }>>("cms:transit", [
        { id: "car", name: "Car", icon: "🚗", speed: 80 },
        { id: "bus", name: "Bus", icon: "🚌", speed: 60 },
        { id: "bike", name: "Bike", icon: "🚴", speed: 20 },
        { id: "walk", name: "Walk", icon: "🚶", speed: 5 },
        { id: "train", name: "Train", icon: "🚆", speed: 120 },
      ]),
      save: (items: any[]) => write("cms:transit", items),
    },
    locations: {
      list: () => read<Array<{ id: string; name: string; type: string; lat: number; lng: number; description: string }>>("cms:locations", []),
      save: (items: any[]) => write("cms:locations", items),
    },
    transitInfo: {
      list: () => read<Array<{ id: string; route: string; provider: string; fare: string; schedule: string }>>("cms:transitInfo", []),
      save: (items: any[]) => write("cms:transitInfo", items),
    },
  },
  offlineTrips: {
    list: () => read<string[]>("offline:trips", []),
    add: (id: string) => {
      const all = read<string[]>("offline:trips", []);
      if (!all.includes(id)) write("offline:trips", [...all, id]);
    },
    remove: (id: string) => {
      write("offline:trips", read<string[]>("offline:trips", []).filter(x => x !== id));
    },
  },
  backups: {
    list: () => read<Array<{ id: string; date: string; type: string; size: string; status: string; payload?: string }>>("backups", []),
    add: (entry: any) => write("backups", [entry, ...read<any[]>("backups", [])].slice(0, 20)),
  },
};
