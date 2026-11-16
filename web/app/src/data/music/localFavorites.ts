import { create } from 'zustand';
import type { Track } from './types';
import { showToast } from '@/components/Toast';

const STORAGE_KEY = 'bitchord:local_favorites';

interface LocalFavoritesState {
  favorites: Record<string, Track>;
  list: Track[];
  isFavorite: (videoId: string | null) => boolean;
  toggleFavorite: (track: Track) => boolean; // returns new liked state
  getAll: () => Track[];
}

function loadInitialFavorites(): Record<string, Track> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveFavorites(favorites: Record<string, Track>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  } catch (err) {
    console.warn('Failed to save local favorites to storage', err);
  }
}

const initialFavorites = loadInitialFavorites();

export const useLocalFavorites = create<LocalFavoritesState>()((set, get) => ({
  favorites: initialFavorites,
  list: Object.values(initialFavorites),

  isFavorite: (videoId: string | null) => {
    if (!videoId) return false;
    return !!get().favorites[videoId];
  },

  toggleFavorite: (track: Track) => {
    const current = { ...get().favorites };
    const id = track.videoId;
    let nowLiked = false;

    if (current[id]) {
      delete current[id];
      nowLiked = false;
      showToast(`Removed from Favorites: ${track.title}`);
    } else {
      current[id] = track;
      nowLiked = true;
      showToast(`Added to Favorites: ${track.title}`);
    }

    saveFavorites(current);
    const updatedList = Object.values(current);
    set({ favorites: current, list: updatedList });
    return nowLiked;
  },

  getAll: () => get().list,
}));
