// Pre-warms the browser tile cache (served through the service worker) for a
// route's bounding box so it stays browsable offline. Bounded per call.

export interface TilePrewarmOptions {
  minZoom?: number;
  maxZoom?: number;
  maxTiles?: number;
  urlTemplate?: string; // e.g. https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png
}

function lngLatToTile(lat: number, lng: number, z: number): [number, number] {
  const x = Math.floor(((lng + 180) / 360) * Math.pow(2, z));
  const y = Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) *
      Math.pow(2, z)
  );
  return [x, y];
}

function subdomainFor(x: number, y: number): string {
  const subs = ["a", "b", "c"];
  return subs[(x + y) % subs.length];
}

export async function prewarmRouteTiles(
  coords: [number, number][],
  opts: TilePrewarmOptions = {},
): Promise<{ requested: number; ok: number }> {
  if (!coords?.length) return { requested: 0, ok: 0 };
  const minZoom = opts.minZoom ?? 13;
  const maxZoom = opts.maxZoom ?? 16;
  const maxTiles = opts.maxTiles ?? 350;
  const tpl =
    opts.urlTemplate ??
    "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png";

  const lats = coords.map(c => c[0]);
  const lngs = coords.map(c => c[1]);
  const north = Math.max(...lats), south = Math.min(...lats);
  const east = Math.max(...lngs), west = Math.min(...lngs);

  const targets: string[] = [];
  outer: for (let z = minZoom; z <= maxZoom; z++) {
    const [x1, y1] = lngLatToTile(north, west, z);
    const [x2, y2] = lngLatToTile(south, east, z);
    const xMin = Math.min(x1, x2), xMax = Math.max(x1, x2);
    const yMin = Math.min(y1, y2), yMax = Math.max(y1, y2);
    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        const url = tpl
          .replace("{s}", subdomainFor(x, y))
          .replace("{z}", String(z))
          .replace("{x}", String(x))
          .replace("{y}", String(y));
        targets.push(url);
        if (targets.length >= maxTiles) break outer;
      }
    }
  }

  let ok = 0;
  // Limit concurrency so we don't hammer tile servers.
  const CONCURRENCY = 6;
  let i = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (i < targets.length) {
        const url = targets[i++];
        try {
          const res = await fetch(url, { mode: "no-cors" });
          if (res) ok++;
        } catch { /* ignore individual tile failures */ }
      }
    })
  );

  return { requested: targets.length, ok };
}
