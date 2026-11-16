import { getBridge } from '@/extension/bridge';
import { isTauriDesktop } from '@/extension/useExtension';
import type { AddonManifest, AddonStream, AddonTrack } from './types';

/** Normalizes user typed or pasted addon URL (strips /manifest.json and trailing slashes). */
export function normalizeBaseUrl(raw: string): string {
  let url = raw.trim();
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  url = url.replace(/\/manifest\.json$/i, '');
  url = url.replace(/\/+$/, '');
  return url;
}

/** Fetches JSON via native desktop bridge (to bypass CORS) or direct fetch fallback. */
export async function fetchJson<T>(url: string): Promise<T> {
  // If running in Tauri desktop, native Rust bridge can fetch without CORS restrictions
  if (isTauriDesktop()) {
    const bridge = getBridge();
    if (bridge) {
      try {
        const resp = await bridge.call('addon.fetch', { url, method: 'GET', headers: {} });
        if (resp.status >= 200 && resp.status < 300) {
          return JSON.parse(resp.body) as T;
        }
      } catch (err) {
        // Fallback to browser fetch
      }
    }
  }

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`);
  }
  return (await response.json()) as T;
}

export async function fetchManifest(baseUrl: string): Promise<AddonManifest> {
  const norm = normalizeBaseUrl(baseUrl);
  const manifestUrl = `${norm}/manifest.json`;
  const manifest = await fetchJson<AddonManifest>(manifestUrl);
  if (!manifest || !manifest.id) {
    throw new Error('URL returned JSON but not a valid BitChord addon manifest');
  }
  return manifest;
}

export async function searchAddon(baseUrl: string, query: string, tier = 'LOSSLESS'): Promise<AddonTrack[]> {
  const norm = normalizeBaseUrl(baseUrl);
  const params = new URLSearchParams({
    q: query.trim(),
    quality: tier,
    atmos: 'auto',
  });
  const searchUrl = `${norm}/search?${params.toString()}`;
  try {
    const res = await fetchJson<{ tracks?: AddonTrack[] }>(searchUrl);
    return Array.isArray(res?.tracks) ? res.tracks : [];
  } catch (e) {
    return [];
  }
}

export async function streamAddon(baseUrl: string, trackId: string, tier = 'LOSSLESS'): Promise<AddonStream | null> {
  const norm = normalizeBaseUrl(baseUrl);
  const params = new URLSearchParams({
    quality: tier,
    atmos: 'auto',
  });
  const streamUrl = `${norm}/stream/${encodeURIComponent(trackId)}?${params.toString()}`;
  try {
    const res = await fetchJson<AddonStream>(streamUrl);
    return res ?? null;
  } catch (e) {
    return null;
  }
}
