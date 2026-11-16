import { create } from 'zustand';
import { fetchManifest, normalizeBaseUrl } from './client';
import type { SourceConfig } from './types';

const SOURCES_STORAGE_KEY = 'bitchord:sources:v1';

export const DEFAULT_PRESET_SOURCES: SourceConfig[] = [
  {
    id: 'dev.bitperfect.qobuz.de.personal',
    kind: 'addon',
    name: 'Qobuz [Heisenbergg]',
    baseUrl: 'https://soundfean-musics.onrender.com/a',
    version: '1.0.0-de',
    enabled: true,
    tags: ['FLAC', 'Lossless', 'Hi-Res'],
    allowDownloads: true,
  },
  {
    id: 'com.bitchord.k',
    kind: 'addon',
    name: 'k',
    baseUrl: 'https://bit-chord-addon.vercel.app',
    version: '1.0.0',
    enabled: true,
    tags: ['FLAC', 'Lossless', 'Hi-Res'],
    allowDownloads: false,
  },
  {
    id: 'com.bitchord.addon.monochrome',
    kind: 'addon',
    name: 'Monochrome Lossless Provider',
    baseUrl: 'https://bitchord-monochrome-addon.onrender.com',
    version: '1.0.0',
    enabled: true,
    tags: ['FLAC', 'Lossless'],
    allowDownloads: true,
  },
  {
    id: 'builtin.youtube',
    kind: 'youtube',
    name: 'YouTube Music',
    baseUrl: '',
    enabled: true,
    tags: ['Lossy', 'Full catalogue', 'Radio'],
  },
];

function loadStoredSources(): SourceConfig[] {
  try {
    const raw = localStorage.getItem(SOURCES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure YouTube Music is always present at the end
        if (!parsed.some((s) => s.kind === 'youtube')) {
          parsed.push({
            id: 'builtin.youtube',
            kind: 'youtube',
            name: 'YouTube Music',
            baseUrl: '',
            enabled: true,
            tags: ['Lossy', 'Full catalogue', 'Radio'],
          });
        }
        return parsed;
      }
    }
  } catch (e) {
    // fallback
  }
  return DEFAULT_PRESET_SOURCES;
}

function persistSources(sources: SourceConfig[]) {
  try {
    localStorage.setItem(SOURCES_STORAGE_KEY, JSON.stringify(sources));
  } catch (e) {
    // ignore
  }
}

interface SourcesState {
  sources: SourceConfig[];
  preferLossless: boolean;
  toggleSource: (id: string, enabled: boolean) => void;
  moveSource: (id: string, direction: -1 | 1) => void;
  removeSource: (id: string) => void;
  addSourceByUrl: (rawUrl: string) => Promise<SourceConfig>;
  resetToDefaults: () => void;
  setPreferLossless: (prefer: boolean) => void;
}

export const useSources = create<SourcesState>((set, get) => ({
  sources: loadStoredSources(),
  preferLossless: true,

  toggleSource(id, enabled) {
    const updated = get().sources.map((s) => (s.id === id ? { ...s, enabled } : s));
    persistSources(updated);
    set({ sources: updated });
  },

  moveSource(id, direction) {
    const list = [...get().sources];
    const index = list.findIndex((s) => s.id === id);
    if (index === -1) return;
    const targetIndex = index + direction;
    // Don't move past bounds, and keep YouTube Music at the bottom
    if (targetIndex < 0 || targetIndex >= list.length) return;
    if (list[targetIndex]?.kind === 'youtube' && direction > 0) return;

    const [item] = list.splice(index, 1);
    list.splice(targetIndex, 0, item!);
    persistSources(list);
    set({ sources: list });
  },

  removeSource(id) {
    const list = get().sources.filter((s) => s.id !== id || s.kind === 'youtube');
    persistSources(list);
    set({ sources: list });
  },

  async addSourceByUrl(rawUrl: string) {
    const norm = normalizeBaseUrl(rawUrl);
    const manifest = await fetchManifest(norm);

    const existing = get().sources.find((s) => s.id === manifest.id || s.baseUrl === norm);
    if (existing) {
      // Re-enable existing
      get().toggleSource(existing.id, true);
      return existing;
    }

    const tags: string[] = ['FLAC', 'Lossless'];
    if (manifest.settings?.some((st) => st.options?.some((o) => /hi[-_]?res/i.test(o.value ?? '')))) {
      tags.push('Hi-Res');
    }

    const newSource: SourceConfig = {
      id: manifest.id,
      kind: 'addon',
      name: manifest.name || manifest.id,
      baseUrl: norm,
      version: manifest.version,
      enabled: true,
      tags,
      allowDownloads: manifest.allowDownloads !== 0 && manifest.allowDownloads !== false,
      checkValidLossless: !!manifest.checkValidLossless,
    };

    // Insert before YouTube Music
    const list = [...get().sources];
    const ytIndex = list.findIndex((s) => s.kind === 'youtube');
    if (ytIndex >= 0) {
      list.splice(ytIndex, 0, newSource);
    } else {
      list.push(newSource);
    }

    persistSources(list);
    set({ sources: list });
    return newSource;
  },

  resetToDefaults() {
    persistSources(DEFAULT_PRESET_SOURCES);
    set({ sources: DEFAULT_PRESET_SOURCES });
  },

  setPreferLossless(prefer) {
    set({ preferLossless: prefer });
  },
}));
