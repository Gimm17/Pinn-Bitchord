import React, { useRef, useState, useEffect } from 'react';
import { create } from 'zustand';
import {
  X,
  Link as LinkIcon,
  Clipboard,
  Play,
  Bookmark,
  ExternalLink,
  CheckCircle2,
  Loader2,
  Music,
  Disc3,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import {
  fetchSpotifyPublicEntity,
  parseSpotifyUrl,
  batchMatchSpotifyTracks,
  type SpotifyPublicEntity,
} from '@/data/spotify/importer';
import { useLocalPlaylists } from '@/data/music/localPlaylists';
import { pendingTrack } from '@/data/spotify/api';
import { playList } from '@/components/music/play';
import { showToast } from '@/components/Toast';
import type { Track } from '@/data/music/types';

interface SpotifyImportModalState {
  isOpen: boolean;
  initialUrl: string;
  open: (url?: string) => void;
  close: () => void;
}

export const useSpotifyImportModal = create<SpotifyImportModalState>()((set) => ({
  isOpen: false,
  initialUrl: '',
  open: (url = '') => set({ isOpen: true, initialUrl: url }),
  close: () => set({ isOpen: false, initialUrl: '' }),
}));

/** Spotify Playlist Importer Modal - Light Ceramic & Frosted Sage Edition */
export function SpotifyImportModal() {
  const { isOpen, initialUrl, close } = useSpotifyImportModal();
  const navigate = useNavigate();
  const localPlaylists = useLocalPlaylists();

  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entity, setEntity] = useState<SpotifyPublicEntity | null>(null);

  // Matching state
  const [matching, setMatching] = useState(false);
  const [matchedTracks, setMatchedTracks] = useState<Track[]>([]);
  const [matchProgress, setMatchProgress] = useState({ completed: 0, total: 0 });

  useEffect(() => {
    if (isOpen) {
      setUrlInput(initialUrl || '');
      setError(null);
      setEntity(null);
      setMatchedTracks([]);
      setMatching(false);
      setMatchProgress({ completed: 0, total: 0 });

      if (initialUrl) {
        void handleFetch(initialUrl);
      }
    }
  }, [isOpen, initialUrl]);

  // Leaving the panel it was opened from closes it: the modal is mounted at the
  // shell, so a route change used to leave it floating over the new page.
  const { pathname } = useLocation();
  const openedAt = useRef<string | null>(null);
  useEffect(() => {
    if (!isOpen) {
      openedAt.current = null;
      return;
    }
    if (openedAt.current === null) {
      openedAt.current = pathname;
      return;
    }
    if (openedAt.current !== pathname) close();
  }, [isOpen, pathname, close]);

  if (!isOpen) return null;

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrlInput(text.trim());
        setError(null);
      }
    } catch {
      showToast('Could not read clipboard. Please paste manually.');
    }
  };

  const handleFetch = async (inputToUse?: string) => {
    const raw = (inputToUse ?? urlInput).trim();
    if (!raw) {
      setError('Please enter a Spotify playlist or album URL');
      return;
    }

    const parsed = parseSpotifyUrl(raw);
    if (!parsed) {
      setError('Invalid Spotify URL. Example: https://open.spotify.com/playlist/...');
      return;
    }

    setLoading(true);
    setError(null);
    setEntity(null);
    setMatchedTracks([]);
    setMatching(false);

    try {
      const data = await fetchSpotifyPublicEntity(raw);
      setEntity(data);
      setMatchProgress({ completed: 0, total: data.tracks.length });

      // Start matching in background
      setMatching(true);
      void batchMatchSpotifyTracks(
        data.tracks,
        (completed, total, track) => {
          setMatchProgress({ completed, total });
          if (track) {
            setMatchedTracks((prev) => [...prev, track]);
          }
        },
        5,
      ).then((all) => {
        setMatchedTracks(all);
        setMatching(false);
        const existing = localPlaylists.playlists[`local:spotify:${data.id}`];
        if (existing) {
          localPlaylists.updatePlaylistTracks(`local:spotify:${data.id}`, all);
        }
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch playlist data from Spotify.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayNow = () => {
    if (!entity) return;
    const playable = matchedTracks.filter((t) => !t.unavailable);
    if (!playable.length) {
      showToast('Matching songs, please wait a moment...');
      return;
    }

    playList(playable, 0, {
      source: { title: entity.name, type: 'playlist', id: `spotify:${entity.id}` },
    });
    showToast(`Playing "${entity.name}"`);
    close();
  };

  const handleSaveToLibrary = () => {
    if (!entity) return;
    const localId = `local:spotify:${entity.id}`;
    const allTracks = entity.tracks.map((st, i) => {
      const found = matchedTracks.find((m) => m.title === st.title) || matchedTracks[i];
      return found ?? pendingTrack(st, 'matching');
    });

    localPlaylists.savePlaylist({
      id: localId,
      title: entity.name,
      thumbnail: entity.coverArt,
      source: 'spotify',
      spotifyId: entity.id,
      tracks: allTracks,
    });
  };

  const handleOpenFull = () => {
    if (!entity) return;
    close();
    navigate(`/spotify/playlist/${encodeURIComponent(entity.id)}`);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-scrim p-4 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border-subtle bg-porcelain p-6 text-primary shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full border border-success/30 bg-success-soft text-success">
              <Disc3 size={20} className="animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold tracking-tight text-primary">Import Spotify Playlist</h2>
                <span className="rounded-full border border-success/30 bg-success-soft px-2 py-0.5 text-[9px] font-bold text-success">
                  SYNC ENGINE
                </span>
              </div>
              <p className="text-xs text-secondary">Convert public Spotify playlists into YouTube Music lossless streams.</p>
            </div>
          </div>
          <button
            onClick={close}
            className="flex size-8 items-center justify-center rounded-full text-tertiary transition-colors hover:bg-quaternary hover:text-primary"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Input section */}
        <div className="mt-4 flex flex-col gap-2">
          <label className="text-xs font-bold text-primary">SPOTIFY PLAYLIST OR ALBUM URL</label>
          <div className="flex items-center gap-2">
            <div className="relative flex flex-1 items-center">
              <LinkIcon size={16} className="absolute left-3 text-tertiary" />
              <input
                type="text"
                placeholder="https://open.spotify.com/playlist/... or album/..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleFetch();
                }}
                className="w-full rounded-xl border border-border-subtle bg-chrome py-2.5 pr-20 pl-9 text-sm text-primary placeholder:text-tertiary transition-all focus:border-accent focus:bg-porcelain focus:outline-none"
              />
              <button
                type="button"
                onClick={handlePaste}
                className="absolute right-2 flex items-center gap-1 rounded-lg border border-border-subtle bg-porcelain px-2 py-1 text-xs font-semibold text-accent-ink hover:bg-accent-soft transition-colors shadow-2xs"
                title="Paste from clipboard"
              >
                <Clipboard size={12} />
                <span>Paste</span>
              </button>
            </div>
            <button
              onClick={() => void handleFetch()}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-slate-navy px-4 py-2.5 text-sm font-bold text-primary-on-dark transition-all hover:opacity-90 disabled:opacity-50 shadow-sm"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Fetch'}
            </button>
          </div>
          {error && <p className="text-xs font-semibold text-danger mt-1">{error}</p>}
        </div>

        {/* Entity Card & Matching Status */}
        {entity && (
          <div className="mt-4 flex flex-col gap-4 overflow-y-auto pr-1 [scrollbar-width:thin]">
            <div className="flex gap-4 rounded-xl border border-border-subtle bg-surface-muted p-4">
              {entity.coverArt ? (
                <img
                  src={entity.coverArt}
                  alt={entity.name}
                  className="size-20 rounded-lg object-cover shadow-sm flex-shrink-0"
                />
              ) : (
                <div className="flex size-20 items-center justify-center rounded-lg bg-chrome text-secondary flex-shrink-0">
                  <Music size={28} />
                </div>
              )}
              <div className="flex flex-col justify-center min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[9px] font-bold text-accent-ink uppercase tracking-wide">
                    Spotify {entity.type}
                  </span>
                  <span className="text-xs font-medium text-secondary">{entity.totalTracks} songs</span>
                </div>
                <h3 className="mt-1 text-base font-extrabold text-primary truncate">{entity.name}</h3>
                {entity.owner && <p className="text-xs text-secondary truncate">By {entity.owner}</p>}

                {/* Progress bar */}
                <div className="mt-2.5 flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[11px] font-medium text-secondary">
                    <span>
                      {matching
                        ? `Matching songs with YouTube Music (${matchProgress.completed}/${matchProgress.total})...`
                        : `Ready • ${matchedTracks.filter((t) => !t.unavailable).length} of ${entity.totalTracks} matched`}
                    </span>
                    {matching && <Loader2 size={12} className="animate-spin text-accent-ink" />}
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-chrome">
                    <div
                      className="h-full bg-accent transition-all duration-300"
                      style={{
                        width: `${entity.totalTracks ? (matchProgress.completed / entity.totalTracks) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Preview of first 5 tracks */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-tertiary uppercase tracking-wider">Preview Tracks</span>
              <div className="flex flex-col divide-y divide-border-subtle rounded-xl border border-border-subtle bg-porcelain p-2 text-xs">
                {entity.tracks.slice(0, 5).map((track, idx) => {
                  const isMatched = matchedTracks[idx] && !matchedTracks[idx].unavailable;
                  return (
                    <div key={track.id} className="flex items-center justify-between py-1.5 px-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-4 text-tertiary text-[10px] font-bold">{idx + 1}</span>
                        <div className="truncate">
                          <span className="text-primary font-semibold">{track.title}</span>
                          <span className="text-secondary ml-1.5">• {track.artist}</span>
                        </div>
                      </div>
                      <div>
                        {isMatched ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-accent-ink">
                            <CheckCircle2 size={12} className="text-accent-ink" /> FLAC
                          </span>
                        ) : matching ? (
                          <Loader2 size={12} className="animate-spin text-tertiary" />
                        ) : (
                          <span className="text-[10px] text-tertiary">Ready</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {entity.tracks.length > 5 && (
                  <p className="py-1 px-2 text-[11px] text-tertiary italic">
                    +{entity.tracks.length - 5} more songs
                  </p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePlayNow}
                disabled={matchedTracks.filter((t) => !t.unavailable).length === 0}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-navy px-4 py-2.5 text-xs font-bold text-primary-on-dark transition-all hover:opacity-90 disabled:opacity-50 shadow-sm"
              >
                <Play size={14} fill="currentColor" />
                <span>Play Now</span>
              </button>
              <button
                type="button"
                onClick={handleSaveToLibrary}
                className="flex items-center gap-2 rounded-xl border border-border-subtle bg-porcelain px-4 py-2.5 text-xs font-semibold text-primary transition-all hover:bg-chrome"
              >
                <Bookmark size={14} />
                <span>Save to Library</span>
              </button>
              <button
                type="button"
                onClick={handleOpenFull}
                className="flex items-center gap-2 rounded-xl border border-border-subtle bg-porcelain px-4 py-2.5 text-xs font-semibold text-primary transition-all hover:bg-chrome"
              >
                <ExternalLink size={14} />
                <span>Open Playlist</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
