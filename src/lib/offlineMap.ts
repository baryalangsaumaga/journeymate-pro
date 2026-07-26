import L from 'leaflet';
import { get, set } from 'idb-keyval';

export const OfflineTileLayer = L.TileLayer.extend({
  createTile(coords: L.Coords, done: L.DoneCallback) {
    const tile = document.createElement('img');
    const url = this.getTileUrl(coords);
    const key = `tile-${url}`;

    L.DomEvent.on(tile, 'load', L.Util.bind(this._tileOnLoad, this, done, tile));
    L.DomEvent.on(tile, 'error', L.Util.bind(this._tileOnError, this, done, tile));

    if (this.options.crossOrigin || this.options.crossOrigin === '') {
      tile.crossOrigin = this.options.crossOrigin === true ? '' : this.options.crossOrigin;
    }

    tile.alt = '';
    tile.setAttribute('role', 'presentation');

    get(key).then((cached) => {
      if (cached) {
        // Use cached blob
        const blobUrl = URL.createObjectURL(cached as Blob);
        tile.src = blobUrl;
      } else {
        // Fetch and cache
        fetch(url)
          .then(res => {
            if (!res.ok) throw new Error('Tile fetch failed');
            return res.blob();
          })
          .then(blob => {
            set(key, blob).catch(console.error); // Save to IndexedDB
            const blobUrl = URL.createObjectURL(blob);
            tile.src = blobUrl;
          })
          .catch(() => {
            tile.src = url; // Fallback to normal URL if fetch wrapper fails (e.g., CORS)
          });
      }
    }).catch(() => {
      tile.src = url; // Fallback if IndexedDB fails
    });

    return tile;
  }
});

// Helper function to create the layer
export function offlineTileLayer(url: string, options?: L.TileLayerOptions) {
  return new (OfflineTileLayer as any)(url, options);
}

// Convert LatLng to tile coordinates
function lon2tile(lon: number, zoom: number) { return Math.floor((lon + 180) / 360 * Math.pow(2, zoom)); }
function lat2tile(lat: number, zoom: number) { return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)); }

export async function downloadTiles(
  bounds: L.LatLngBounds,
  minZoom: number,
  maxZoom: number,
  tileUrlTemplate: string,
  onProgress?: (downloaded: number, total: number) => void
) {
  const urls: string[] = [];
  for (let z = minZoom; z <= maxZoom; z++) {
    const minX = lon2tile(bounds.getWest(), z);
    const maxX = lon2tile(bounds.getEast(), z);
    const minY = lat2tile(bounds.getNorth(), z);
    const maxY = lat2tile(bounds.getSouth(), z);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        // Simple sub-domain cycle for typical OSM {s} template. 
        // We'll just replace {s} with 'a', {z}, {x}, {y}, {r} if any.
        const url = tileUrlTemplate
          .replace('{s}', 'a')
          .replace('{z}', z.toString())
          .replace('{x}', x.toString())
          .replace('{y}', y.toString())
          .replace('{r}', '');
        urls.push(url);
      }
    }
  }

  let downloaded = 0;
  for (const url of urls) {
    const key = `tile-${url}`;
    try {
      const existing = await get(key);
      if (!existing) {
        const res = await fetch(url);
        if (res.ok) {
          const blob = await res.blob();
          await set(key, blob);
        }
      }
    } catch (e) {
      console.warn('Failed to download tile:', url, e);
    }
    downloaded++;
    if (onProgress) onProgress(downloaded, urls.length);
  }
}

