import { create } from 'zustand';
import type { Track } from './types';
import { showToast } from '@/components/Toast';

export interface LocalPlaylist {
  id: string; // e.g. "local:spotify:37i9dQZF1DXcBWIGoYBM5M" or "local:pl-1741123456"
  title: string;
  description?: string;
  thumbnail?: string | null;
  source: 'spotify' | 'custom' | 'import';
  spotifyId?: string;
  spotifyUrl?: string;
  tracks: Track[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'bitchord:local_playlists';

function loadInitialPlaylists(): Record<string, LocalPlaylist> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistPlaylists(playlists: Record<string, LocalPlaylist>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(playlists));
  } catch (err) {
    console.warn('Failed to save local playlists to storage', err);
  }
}

function sortedPlaylistList(dict: Record<string, LocalPlaylist>): LocalPlaylist[] {
  return Object.values(dict).sort((a, b) => b.updatedAt - a.updatedAt);
}

const initialPlaylists = loadInitialPlaylists();

interface LocalPlaylistsState {
  playlists: Record<string, LocalPlaylist>;
  list: LocalPlaylist[];
  savePlaylist: (data: {
    id?: string;
    title: string;
    description?: string;
    thumbnail?: string | null;
    source?: 'spotify' | 'custom' | 'import';
    spotifyId?: string;
    spotifyUrl?: string;
    tracks: Track[];
  }) => LocalPlaylist;
  deletePlaylist: (id: string) => void;
  getPlaylist: (id: string) => LocalPlaylist | undefined;
  getAll: () => LocalPlaylist[];
  addTracks: (id: string, newTracks: Track[]) => void;
  removeTrack: (id: string, videoId: string) => void;
  updatePlaylistTracks: (id: string, tracks: Track[]) => void;
}

export const useLocalPlaylists = create<LocalPlaylistsState>()((set, get) => ({
  playlists: initialPlaylists,
  list: sortedPlaylistList(initialPlaylists),

  savePlaylist: (data) => {
    const id = data.id || `local:pl-${Date.now()}`;
    const now = Date.now();
    const existing = get().playlists[id];

    const playlist: LocalPlaylist = {
      id,
      title: data.title,
      description: data.description,
      thumbnail: data.thumbnail ?? existing?.thumbnail ?? null,
      source: data.source ?? 'spotify',
      spotifyId: data.spotifyId,
      spotifyUrl: data.spotifyUrl,
      tracks: data.tracks,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    const current = { ...get().playlists, [id]: playlist };
    persistPlaylists(current);
    set({ playlists: current, list: sortedPlaylistList(current) });
    showToast(`Saved playlist "${playlist.title}" (${playlist.tracks.length} songs)`);
    return playlist;
  },

  deletePlaylist: (id: string) => {
    const current = { ...get().playlists };
    const title = current[id]?.title;
    if (current[id]) {
      delete current[id];
      persistPlaylists(current);
      set({ playlists: current, list: sortedPlaylistList(current) });
      if (title) showToast(`Deleted playlist "${title}"`);
    }
  },

  getPlaylist: (id: string) => {
    return get().playlists[id];
  },

  getAll: () => get().list,

  addTracks: (id: string, newTracks: Track[]) => {
    const current = { ...get().playlists };
    const pl = current[id];
    if (!pl) return;

    const existingIds = new Set(pl.tracks.map((t) => t.videoId));
    const toAdd = newTracks.filter((t) => !existingIds.has(t.videoId));

    pl.tracks = [...pl.tracks, ...toAdd];
    pl.updatedAt = Date.now();

    persistPlaylists(current);
    set({ playlists: current, list: sortedPlaylistList(current) });
    showToast(`Added ${toAdd.length} songs to "${pl.title}"`);
  },

  removeTrack: (id: string, videoId: string) => {
    const current = { ...get().playlists };
    const pl = current[id];
    if (!pl) return;

    pl.tracks = pl.tracks.filter((t) => t.videoId !== videoId);
    pl.updatedAt = Date.now();

    persistPlaylists(current);
    set({ playlists: current, list: sortedPlaylistList(current) });
  },

  updatePlaylistTracks: (id: string, tracks: Track[]) => {
    const current = { ...get().playlists };
    const pl = current[id];
    if (!pl) return;

    pl.tracks = tracks;
    pl.updatedAt = Date.now();

    persistPlaylists(current);
    set({ playlists: current, list: sortedPlaylistList(current) });
  },
}));
