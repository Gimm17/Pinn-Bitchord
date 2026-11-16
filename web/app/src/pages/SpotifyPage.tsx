import React, { useMemo, useState } from 'react';
import { Clipboard, Disc3, Link as LinkIcon, Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { SquareLockup } from '@/components/music/Lockups';
import { EmptyState } from '@/components/music/States';
import type { MusicItem } from '@/data/music/types';
import { useLocalPlaylists } from '@/data/music/localPlaylists';
import { useSpotifyPlaylists } from '@/data/spotify/queries';
import { useSpotifyImportModal } from '@/components/music/SpotifyImportModal';
import { openSpotifySignIn, useSpotifyAuth } from '@/extension/useSpotifyAuth';
import { seeAllGrid } from './pageStyles';

export default function SpotifyPage() {
  const [quickInput, setQuickInput] = useState('');
  const openModal = useSpotifyImportModal((s) => s.open);
  const localList = useLocalPlaylists((s) => s.list);
  const localPlaylists = useMemo(() => localList.filter((p) => p.source === 'spotify'), [localList]);

  const auth = useSpotifyAuth();
  const playlists = useSpotifyPlaylists();

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setQuickInput(text.trim());
    } catch {}
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickInput.trim()) {
      openModal(quickInput.trim());
      setQuickInput('');
    } else {
      openModal();
    }
  };

  // Convert local playlists to lockup items
  const localItems: MusicItem[] = localPlaylists.map((p) => ({
    kind: 'playlist',
    id: p.id,
    title: p.title,
    subtitle: `${p.tracks.length} songs • Local`,
    artists: [],
    album: null,
    thumbnail: p.thumbnail ?? null,
    wide: false,
    durationSec: null,
    explicit: false,
  }));

  // Extension playlists if signed in
  const remoteItems: MusicItem[] = (playlists.data || []).map((p) => ({
    kind: 'spotify-playlist',
    id: p.id,
    title: p.name,
    subtitle: p.owner ?? 'Spotify',
    artists: [],
    album: null,
    thumbnail: p.imageUrl ?? null,
    wide: false,
    durationSec: null,
    explicit: false,
  }));

  const isAuthReady = auth.state === 'ready' && auth.auth.signedIn;

  return (
    <>
      <PageHeader title="Spotify" />

      {/*
        A porcelain card, not the deep gradient it used to be: this page sits
        on the light ceramic canvas, and a black slab with white text read as a
        foreign panel in both schemes. Spotify green stays, because it is the
        brand; everything else follows the theme tokens.
      */}
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-border-subtle bg-porcelain p-6 shadow-2xs">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[#1DB954]">
            <span className="grid size-7 place-items-center rounded-full bg-[#1DB954]/12">
              <Disc3 size={16} className="animate-spin-slow" />
            </span>
            <span className="text-[11px] font-bold tracking-[0.12em] uppercase">Instant playlist importer</span>
          </div>
          <h2 className="text-[19px] font-extrabold tracking-tight text-primary">Import any Spotify Playlist or Album</h2>
          <p className="max-w-xl text-[13px] leading-relaxed text-secondary">
            Paste any public Spotify link below. BitChord will automatically match every song to high-quality Lossless &amp; YouTube Music audio without requiring any Spotify login.
          </p>

          <form onSubmit={handleImportSubmit} className="mt-2 flex max-w-xl items-center gap-2">
            <div className="relative flex flex-1 items-center">
              <LinkIcon size={16} className="absolute left-3 text-tertiary" />
              <input
                type="text"
                placeholder="https://open.spotify.com/playlist/... or album/..."
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                className="w-full rounded-xl border border-border-subtle bg-surface-muted py-2.5 pr-20 pl-9 text-sm text-primary transition-colors placeholder:text-tertiary focus:border-[#1DB954] focus:outline-none"
              />
              <button
                type="button"
                onClick={handlePaste}
                className="absolute right-2 flex items-center gap-1 rounded-lg border border-border-subtle bg-porcelain px-2 py-1 text-xs text-secondary transition-colors hover:bg-chrome hover:text-primary"
                title="Paste from clipboard"
              >
                <Clipboard size={12} />
                <span>Paste</span>
              </button>
            </div>
            {/* Spotify's own green on black, as on their buttons: brand-fixed,
                so not `text-on-accent` (which would go near-black in dark). */}
            <button
              type="submit"
              className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#1DB954] px-4 py-2.5 text-sm font-semibold text-black transition-all hover:bg-[#1ed760]"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Import</span>
            </button>
          </form>
        </div>
      </div>

      {/* Section 1: Saved Imported Playlists */}
      {localItems.length > 0 && (
        <div className="mb-10">
          <h3 className="mb-4 text-[17px] font-bold text-primary">Saved Playlists ({localItems.length})</h3>
          <ul className={seeAllGrid}>
            {localItems.map((item) => (
              <li key={item.id}>
                <SquareLockup item={item} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Section 2: Account Playlists (from Extension) */}
      <div className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[17px] font-bold text-primary">Spotify Account Playlists</h3>
          {!isAuthReady && (
            <button
              onClick={() => openSpotifySignIn()}
              className="h-8 rounded-full border border-border-subtle bg-porcelain px-3.5 text-[11px] font-bold text-primary transition-colors hover:bg-chrome"
            >
              Connect Spotify Account
            </button>
          )}
        </div>

        {isAuthReady && remoteItems.length > 0 && (
          <ul className={seeAllGrid}>
            {remoteItems.map((item) => (
              <li key={item.id}>
                <SquareLockup item={item} />
              </li>
            ))}
          </ul>
        )}

        {isAuthReady && remoteItems.length === 0 && (
          <EmptyState title="No Spotify playlists found" detail="Create or follow playlists in your Spotify account to see them here." />
        )}

        {!isAuthReady && localItems.length === 0 && (
          <div className="rounded-2xl border border-border-subtle bg-porcelain px-5 py-8 text-center text-[12px] text-secondary">
            Paste a link above to import your first playlist, or connect your account to sync your Spotify library.
          </div>
        )}
      </div>
    </>
  );
}
