import type { SpotifyTrack } from '@bitchord/shared/bridge';
import { matchToYouTube, pendingTrack } from './api';
import type { Track } from '@/data/music/types';

export interface SpotifyPublicEntity {
  type: 'playlist' | 'album';
  id: string;
  name: string;
  owner: string | null;
  coverArt: string | null;
  totalTracks: number;
  tracks: SpotifyTrack[];
}

/**
 * Parses user input into a Spotify type and ID.
 * Supports:
 * - https://open.spotify.com/playlist/{id}...
 * - https://open.spotify.com/album/{id}...
 * - https://open.spotify.com/intl-id/playlist/{id}...
 * - spotify:playlist:{id}
 * - spotify:album:{id}
 * - raw alphanumeric ID (defaults to playlist)
 */
export function parseSpotifyUrl(input: string): { type: 'playlist' | 'album'; id: string } | null {
  if (!input || typeof input !== 'string') return null;
  const cleaned = input.trim();

  // Match spotify URI: spotify:playlist:xxx or spotify:album:xxx
  const uriMatch = cleaned.match(/^spotify:(playlist|album):([a-zA-Z0-9]+)$/);
  if (uriMatch && uriMatch[1] && uriMatch[2]) {
    return { type: uriMatch[1] as 'playlist' | 'album', id: uriMatch[2] };
  }

  // Match web URL: https://open.spotify.com/[intl-.../](playlist|album)/[id]
  const urlMatch = cleaned.match(/open\.spotify\.com\/(?:[a-zA-Z\-]+\/)?(playlist|album)\/([a-zA-Z0-9]+)/);
  if (urlMatch && urlMatch[1] && urlMatch[2]) {
    return { type: urlMatch[1] as 'playlist' | 'album', id: urlMatch[2] };
  }

  // Raw alphanumeric Spotify ID
  if (/^[a-zA-Z0-9]{20,25}$/.test(cleaned)) {
    return { type: 'playlist', id: cleaned };
  }

  return null;
}

/**
 * Fetches HTML from open.spotify.com/embed/{type}/{id} without requiring any
 * tokens or cookies. Falls back to Tauri bridge_http if available.
 */
async function fetchEmbedHtml(type: 'playlist' | 'album', id: string): Promise<string> {
  const url = `https://open.spotify.com/embed/${type}/${id}`;
  const userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';

  // 1. Try native fetch first
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': userAgent,
      },
    });
    if (res.ok) {
      return await res.text();
    }
  } catch (nativeErr) {
    console.warn('Native fetch to Spotify embed failed, attempting Tauri bridge:', nativeErr);
  }

  // 2. Try Tauri IPC bridge_http if running in desktop app
  try {
    const w = typeof window !== 'undefined' ? (window as any) : null;
    const invoke = w?.__TAURI__?.core?.invoke || w?.__TAURI_INTERNALS__?.invoke;
    if (invoke) {
      const resp = await invoke('bridge_http', {
        request: {
          url,
          method: 'GET',
          headers: {
            'User-Agent': userAgent,
          },
        },
      });
      if (resp && resp.body) {
        return resp.body;
      }
    }
  } catch (bridgeErr) {
    console.error('Tauri bridge_http failed:', bridgeErr);
  }

  throw new Error('Gagal menghubungi server Spotify. Pastikan koneksi internet aktif.');
}

/**
 * Fetches public Spotify playlist or album metadata and tracklist.
 * Works without any Spotify login, tokens, or extension requirements.
 */
export async function fetchSpotifyPublicEntity(inputOrId: string): Promise<SpotifyPublicEntity> {
  const parsed = parseSpotifyUrl(inputOrId);
  if (!parsed) {
    throw new Error('Link Spotify tidak valid. Masukkan URL playlist atau album Spotify.');
  }

  const { type, id } = parsed;
  const html = await fetchEmbedHtml(type, id);

  const scriptMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!scriptMatch || !scriptMatch[1]) {
    throw new Error('Tidak dapat membaca data Spotify. Playlist mungkin private atau link sudah dihapus.');
  }

  let data: any;
  try {
    data = JSON.parse(scriptMatch[1]);
  } catch {
    throw new Error('Format data Spotify tidak valid.');
  }

  const entity = data.props?.pageProps?.state?.data?.entity;
  if (!entity) {
    const status = data.props?.pageProps?.status;
    if (status === 404) {
      throw new Error('Playlist atau album tidak ditemukan di Spotify (404).');
    }
    throw new Error('Data playlist tidak ditemukan atau bersifat private.');
  }

  const name = entity.name || entity.title || (type === 'album' ? 'Spotify Album' : 'Spotify Playlist');
  const owner = entity.subtitle || entity.authors?.[0]?.name || null;
  const coverArt =
    entity.coverArt?.sources?.[0]?.url ||
    entity.visualIdentity?.image?.[0]?.url ||
    entity.visualIdentity?.image?.find((img: any) => img.maxWidth >= 300)?.url ||
    null;

  const rawTracks = entity.trackList || [];
  const tracks: SpotifyTrack[] = rawTracks.map((t: any) => {
    const trackId = t.uri ? t.uri.replace(/^spotify:track:/, '') : t.uid || Math.random().toString(36).substring(2);
    return {
      id: trackId,
      title: t.title || 'Unknown Title',
      artist: t.subtitle || '',
      album: type === 'album' ? name : null,
      durationMs: typeof t.duration === 'number' ? t.duration : 0,
      imageUrl: coverArt,
    };
  });

  return {
    type,
    id,
    name,
    owner,
    coverArt,
    totalTracks: tracks.length,
    tracks,
  };
}

/**
 * Batches SpotifyTrack matching to YouTube Music with controlled parallelism.
 */
export async function batchMatchSpotifyTracks(
  tracks: SpotifyTrack[],
  onProgress?: (completed: number, total: number, track: Track | null) => void,
  parallelism = 4,
): Promise<Track[]> {
  const results: Track[] = new Array(tracks.length);
  let currentIndex = 0;
  let completed = 0;

  async function worker() {
    while (currentIndex < tracks.length) {
      const idx = currentIndex++;
      const sTrack = tracks[idx];
      if (!sTrack) break;

      let matchedTrack: Track | null = null;
      try {
        matchedTrack = await matchToYouTube(sTrack);
      } catch (err) {
        console.warn(`Failed to match track "${sTrack.title}":`, err);
      }

      const finalTrack = matchedTrack ?? pendingTrack(sTrack, 'missing');
      results[idx] = finalTrack;
      completed++;
      onProgress?.(completed, tracks.length, finalTrack);
    }
  }

  const workers = Array.from({ length: Math.min(parallelism, tracks.length) }, () => worker());
  await Promise.all(workers);

  return results;
}
