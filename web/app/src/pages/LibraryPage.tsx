import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Disc3, LayoutGrid, List, Music2, Play, Plus, RefreshCw } from 'lucide-react';
import { PrefetchLink } from '@/components/PrefetchLink';
import { PlayIcon } from '@/components/icons/Transport';
import { Artwork } from '@/components/music/Artwork';
import { CircleLockup, SquareLockup, VideoLockup } from '@/components/music/Lockups';
import { Shelves } from '@/components/music/ShelfView';
import { TrackList } from '@/components/music/TrackList';
import { EmptyState, LoadError, LoadMoreError, NeedsExtension } from '@/components/music/States';
import { playList } from '@/components/music/play';
import { useSpotifyImportModal } from '@/components/music/SpotifyImportModal';
import { useLocalFavorites } from '@/data/music/localFavorites';
import { useLocalPlaylists, type LocalPlaylist } from '@/data/music/localPlaylists';
import { LIBRARY_SECTIONS, isLibrarySection, type LibrarySection } from '@/data/music/library';
import { useLibrary, useLibraryPlaylists, useSignedIn, useYouTubeReady } from '@/data/music/queries';
import { useSpotifySignedIn } from '@/extension/useSpotifyAuth';
import { showToast } from '@/components/Toast';
import { PlainSkeleton } from '@/skeletons/PageSkeletons';
import { InspectorFrame } from '@/shell/InspectorRail';
import { seeAllGrid, seeAllTracks } from './pageStyles';

const kicker = 'text-[11px] font-bold tracking-[0.14em] text-sky-ink uppercase';
const heading = 'mt-1 text-[32px] leading-[1.1] font-extrabold tracking-[-0.02em] text-primary';
const chip = 'h-[30px] rounded-full px-3.5 text-[12px] font-semibold transition-colors';

/** "2 hr 48 min", from the tracks themselves rather than a stored figure. */
function totalDuration(tracks: { durationSec: number | null }[]): string {
  const sec = tracks.reduce((sum, t) => sum + (t.durationSec ?? 0), 0);
  if (sec <= 0) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h ? `${h} hr ${m} min` : `${m} min`;
}

function playlistMeta(playlist: LocalPlaylist): string {
  const parts = [`${playlist.tracks.length} ${playlist.tracks.length === 1 ? 'song' : 'songs'}`];
  const length = totalDuration(playlist.tracks);
  if (length) parts.push(length);
  if (playlist.source === 'spotify') parts.push('Spotify');
  return parts.join(' • ');
}

export default function LibraryPage() {
  const raw = useParams().section ?? 'playlists';

  if (!isLibrarySection(raw)) {
    return <EmptyState title="This part of the library doesn’t exist" detail="Pick a section from the sidebar." />;
  }

  return raw === 'playlists' ? <PlaylistsView /> : <LibrarySectionView section={raw} />;
}

/**
 * Recently Played · Artists · Albums · Songs · Made for You: whatever the
 * signed-in YouTube Music library answers with for that section. The rows and
 * grids come straight from the response, so the counts are YouTube's own.
 */
function LibrarySectionView({ section }: { section: Exclude<LibrarySection, 'playlists'> }) {
  const signedIn = useSignedIn();
  const { missing } = useYouTubeReady();
  const library = useLibrary(section);
  const title = LIBRARY_SECTIONS[section].title;

  const loadMore = () => {
    if (library.hasNextPage && !library.isFetchingNextPage && !library.isFetchNextPageError) {
      void library.fetchNextPage();
    }
  };

  const pages = library.data?.pages ?? [];
  const shelves = pages.flatMap((page) => page.data.shelves);
  const grid = pages.flatMap((page) => page.data.grid);
  const tracks = pages.flatMap((page) => page.data.tracks);
  const empty = !!library.data && !shelves.length && !grid.length && !tracks.length;

  return (
    <InspectorFrame>
      <header className="pt-7">
        <p className={kicker}>Library</p>
        <h1 className={heading}>{title}</h1>
      </header>

      {missing ? (
        <NeedsExtension what="your YouTube Music library" />
      ) : !signedIn ? (
        <EmptyState
          title={`Sign in to see ${title}`}
          detail="BitChord reads the YouTube Music session in your browser through the extension."
        />
      ) : library.isError && !library.data ? (
        <LoadError error={library.error} onRetry={() => void library.refetch()} />
      ) : !library.data ? (
        <div className="pt-6">
          <PlainSkeleton />
        </div>
      ) : (
        <>
          {empty && (
            <EmptyState
              title={`Nothing in ${title} yet`}
              detail="Songs, albums and artists you save in YouTube Music show up here."
            />
          )}

          {grid.length > 0 && (
            <ul className={seeAllGrid} data-wide={grid.every((item) => item.wide) || undefined}>
              {grid.map((item, i) => (
                <li key={`${item.id}-${i}`}>
                  {item.kind === 'artist' ? (
                    <CircleLockup item={item} />
                  ) : item.wide ? (
                    <VideoLockup item={item} />
                  ) : (
                    <SquareLockup item={item} />
                  )}
                </li>
              ))}
            </ul>
          )}

          {tracks.length > 0 && (
            <div className={seeAllTracks}>
              <div className="rounded-2xl border border-border-subtle bg-porcelain p-2">
                <TrackList tracks={tracks} variant="playlist" onNearEnd={loadMore} source={{ title, type: 'other' }} />
              </div>
            </div>
          )}

          {grid.length === 0 && <Shelves shelves={shelves} />}

          {library.isFetchingNextPage && (
            <p className="py-5 text-center text-xs text-tertiary">Loading more…</p>
          )}
          {library.isFetchNextPageError && <LoadMoreError onRetry={loadMore} />}
        </>
      )}
    </InspectorFrame>
  );
}

/**
 * Playlists & Collections: the playlists this browser holds (created here or
 * imported from Spotify) and the ones YouTube Music reports for the account.
 * Every figure on the page is counted from one of those two lists.
 */
function PlaylistsView() {
  const navigate = useNavigate();
  const local = useLocalPlaylists((s) => s.list);
  const favorites = useLocalFavorites((s) => s.list);
  const remote = useLibraryPlaylists();
  const spotifyConnected = useSpotifySignedIn();
  const importModal = useSpotifyImportModal();
  const [filter, setFilter] = useState<'all' | 'local' | 'spotify' | 'youtube'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const spotify = local.filter((pl) => pl.source === 'spotify');
  const own = local.filter((pl) => pl.source !== 'spotify');
  const remotePlaylists = remote.data ?? [];

  const counts = {
    all: local.length + remotePlaylists.length,
    local: own.length,
    spotify: spotify.length,
    youtube: remotePlaylists.length,
  };

  const recent = local.slice(0, 3);
  const localSongs = local.reduce((sum, pl) => sum + pl.tracks.length, 0);

  const createPlaylist = () => {
    // A prompt, not a modal: this is the one field a new playlist needs.
    const title = window.prompt('Name the playlist');
    const trimmed = title?.trim();
    if (!trimmed) return;
    const id = `local:${Date.now()}`;
    useLocalPlaylists.getState().savePlaylist({ id, title: trimmed, source: 'custom', tracks: [] });
    showToast(`Created “${trimmed}”`);
    navigate(`/playlist/${encodeURIComponent(id)}`);
  };

  const playPlaylist = (playlist: LocalPlaylist) => {
    if (!playlist.tracks.length) return;
    playList(playlist.tracks, 0, {
      source: { title: playlist.title, type: 'playlist', id: playlist.id },
    });
  };

  return (
    <InspectorFrame className="gap-7">
      <header className="flex flex-col justify-between gap-4 pt-7 md:flex-row md:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <p className={kicker}>Sound Vault</p>
            <span className="text-[12px] font-medium text-tertiary">
              {counts.all} {counts.all === 1 ? 'compilation' : 'compilations'}
              {localSongs > 0 && ` • ${localSongs} saved ${localSongs === 1 ? 'song' : 'songs'}`}
            </span>
          </div>
          <h1 className={heading}>Playlists &amp; Collections</h1>
          <p className="mt-1.5 max-w-xl text-[13px] leading-[1.5] text-secondary">
            Playlists kept on this device, Spotify imports, and the lists YouTube Music has for your account.
          </p>
        </div>

        <div className="flex flex-none items-center gap-2.5">
          <button
            onClick={createPlaylist}
            className="flex h-9 items-center gap-1.5 rounded-full border border-border-subtle bg-porcelain px-4 text-[12px] font-bold text-primary transition-colors hover:bg-chrome"
          >
            <Plus size={15} />
            New Playlist
          </button>
          <button
            onClick={() => importModal.open()}
            className="flex h-9 items-center gap-2 rounded-full bg-[#1DB954] px-4 text-[12px] font-bold text-black transition-colors hover:bg-[#1AA34A]"
          >
            <Disc3 size={15} />
            Import Spotify
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter playlists">
        {(
          [
            ['all', `All (${counts.all})`],
            ['local', `Local (${counts.local})`],
            ['spotify', `Spotify (${counts.spotify})`],
            ['youtube', `YouTube Music (${counts.youtube})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            aria-pressed={filter === key}
            className={`${chip} ${
              filter === key
                ? 'bg-accent font-bold text-on-accent'
                : 'border border-border-subtle bg-porcelain text-secondary hover:bg-chrome'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {recent.length > 0 && filter === 'all' && (
        <section aria-label="Recently updated">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[17px] font-bold text-primary">Recently updated</h2>
            <span className="text-[10px] font-bold tracking-[0.12em] text-tertiary uppercase">
              {recent.length} {recent.length === 1 ? 'collection' : 'collections'}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {recent.map((playlist) => (
              <div
                key={playlist.id}
                className="group flex items-center gap-3 rounded-2xl border border-border-subtle bg-porcelain p-3 transition-colors hover:border-accent/50"
              >
                <PrefetchLink
                  to={`/playlist/${encodeURIComponent(playlist.id)}`}
                  className="size-16 flex-none overflow-hidden rounded-xl border border-border-subtle/60 bg-chrome"
                  aria-label={playlist.title}
                >
                  {playlist.thumbnail ? (
                    <Artwork src={playlist.thumbnail} displayWidth={64} radius="12px" />
                  ) : (
                    <span className="grid size-full place-items-center text-accent-ink">
                      <Music2 size={20} />
                    </span>
                  )}
                </PrefetchLink>
                <div className="min-w-0 flex-1">
                  <PrefetchLink
                    to={`/playlist/${encodeURIComponent(playlist.id)}`}
                    className="block truncate text-[14px] font-bold text-primary hover:underline"
                  >
                    {playlist.title}
                  </PrefetchLink>
                  <p className="mt-0.5 truncate text-[11px] font-medium text-tertiary">{playlistMeta(playlist)}</p>
                </div>
                {playlist.tracks.length > 0 && (
                  <button
                    onClick={() => playPlaylist(playlist)}
                    className="grid size-8 flex-none place-items-center rounded-full bg-accent text-on-accent opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    aria-label={`Play ${playlist.title}`}
                  >
                    <PlayIcon size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section aria-label="Playlists">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-[17px] font-bold text-primary">All playlists</h2>
            <p className="mt-0.5 text-[12px] font-medium text-tertiary">
              {filter === 'youtube' ? 'From your YouTube Music account' : 'On this device, and on your account'}
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border-subtle bg-porcelain p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              aria-pressed={viewMode === 'grid'}
              className={`grid size-7 place-items-center rounded-md ${
                viewMode === 'grid' ? 'bg-chrome text-primary' : 'text-tertiary hover:text-primary'
              }`}
              title="Grid view"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
              className={`grid size-7 place-items-center rounded-md ${
                viewMode === 'list' ? 'bg-chrome text-primary' : 'text-tertiary hover:text-primary'
              }`}
              title="List view"
            >
              <List size={14} />
            </button>
          </div>
        </div>

        <ul
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
              : 'flex flex-col gap-1'
          }
        >
          {filter !== 'youtube' && (
            <li>
              <button
                onClick={createPlaylist}
                className={
                  viewMode === 'grid'
                    ? 'group flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-border-subtle bg-surface-muted p-4 text-center transition-colors hover:border-accent hover:bg-porcelain'
                    : 'flex w-full items-center gap-3 rounded-xl border border-dashed border-border-subtle px-3 py-2.5 text-left transition-colors hover:border-accent hover:bg-porcelain'
                }
              >
                <span className="grid size-10 place-items-center rounded-full border border-border-subtle bg-porcelain text-secondary transition-colors group-hover:bg-accent group-hover:text-on-accent">
                  <Plus size={18} />
                </span>
                <span className={viewMode === 'grid' ? 'text-[12px] font-bold text-primary' : 'text-[13px] font-semibold text-primary'}>
                  Create Playlist
                </span>
              </button>
            </li>
          )}

          {(filter === 'all' || filter === 'local' || filter === 'spotify' ? local : []).map((playlist) => (
            <PlaylistCard key={playlist.id} playlist={playlist} view={viewMode} onPlay={() => playPlaylist(playlist)} />
          ))}

          {filter !== 'spotify' &&
            filter !== 'local' &&
            remotePlaylists.map((item) => (
              <li key={item.id}>
                {viewMode === 'grid' ? <SquareLockup item={item} /> : <RemoteRow item={item} />}
              </li>
            ))}

          {remote.isPending && filter !== 'local' && filter !== 'spotify' && (
            <li className="col-span-full py-6 text-center text-xs text-tertiary">Loading your YouTube Music playlists…</li>
          )}
          {remote.isError && filter !== 'local' && filter !== 'spotify' && (
            <li className="col-span-full flex items-center justify-center gap-2 py-4 text-xs text-secondary">
              Couldn’t read your YouTube Music playlists.
              <button className="font-bold text-accent-ink hover:underline" onClick={() => void remote.refetch()}>
                Try again
              </button>
            </li>
          )}
        </ul>

        {counts.all === 0 && !remote.isPending && (
          <EmptyState
            title="No playlists yet"
            detail="Create one here, import a Spotify playlist, or save a list in YouTube Music."
          />
        )}
      </section>

      <section
        aria-label="Spotify"
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-porcelain p-4"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-9 flex-none place-items-center rounded-full bg-[#1DB954]/15 text-[#1DB954]">
            <Disc3 size={19} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] font-bold text-primary">
                Spotify {spotifyConnected ? 'connected' : 'not connected'}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                  spotifyConnected
                    ? 'bg-success-soft text-success'
                    : 'bg-chrome text-tertiary'
                }`}
              >
                {spotifyConnected ? 'Active' : 'Offline'}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-tertiary">
              {spotify.length
                ? `${spotify.length} imported ${spotify.length === 1 ? 'playlist' : 'playlists'} • ${favorites.length} local favourites`
                : 'Import a public Spotify link to keep it here.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => importModal.open()}
          className="flex items-center gap-1.5 rounded-xl border border-border-subtle bg-surface-muted px-3 py-1.5 text-[12px] font-semibold text-primary transition-colors hover:bg-chrome"
        >
          <RefreshCw size={13} />
          Import or re-sync
        </button>
      </section>
    </InspectorFrame>
  );
}

function PlaylistCard({ playlist, view, onPlay }: { playlist: LocalPlaylist; view: 'grid' | 'list'; onPlay: () => void }) {
  const href = `/playlist/${encodeURIComponent(playlist.id)}`;
  const cover = (
    <div
      className={
        view === 'grid'
          ? 'relative mb-2.5 aspect-square w-full overflow-hidden rounded-xl border border-border-subtle/60 bg-chrome'
          : 'relative size-10 flex-none overflow-hidden rounded-lg border border-border-subtle/60 bg-chrome'
      }
    >
      {playlist.thumbnail ? (
        <Artwork src={playlist.thumbnail} displayWidth={view === 'grid' ? 160 : 40} radius={view === 'grid' ? '12px' : '8px'} />
      ) : (
        <span className="grid size-full place-items-center text-accent-ink">
          <Music2 size={view === 'grid' ? 22 : 16} />
        </span>
      )}
      {playlist.source === 'spotify' && view === 'grid' && (
        <span className="absolute top-2 left-2 rounded-full bg-[#1DB954] px-2 py-0.5 text-[9px] font-bold text-black uppercase">
          Spotify
        </span>
      )}
      {view === 'grid' && playlist.tracks.length > 0 && (
        <span className="pointer-events-none absolute right-2 bottom-2 grid size-8 place-items-center rounded-full bg-accent text-on-accent opacity-0 transition-opacity group-hover:opacity-100">
          <Play size={14} className="fill-current" />
        </span>
      )}
    </div>
  );

  const body = (
    <>
      <p className="truncate text-[12px] font-bold text-primary group-hover:text-accent-ink">{playlist.title}</p>
      <p className="mt-0.5 truncate text-[10px] font-medium text-tertiary">{playlistMeta(playlist)}</p>
    </>
  );

  if (view === 'list') {
    return (
      <li>
        <div className="group flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-surface-muted">
          <PrefetchLink to={href} className="flex min-w-0 flex-1 items-center gap-3">
            {cover}
            <div className="min-w-0 flex-1">{body}</div>
          </PrefetchLink>
          {playlist.tracks.length > 0 && (
            <button
              onClick={onPlay}
              className="grid size-8 flex-none place-items-center rounded-full text-accent-ink transition-colors hover:bg-accent-soft"
              aria-label={`Play ${playlist.title}`}
            >
              <PlayIcon size={14} />
            </button>
          )}
        </div>
      </li>
    );
  }

  return (
    <li>
      <div className="group">
        <PrefetchLink to={href} className="block">
          {cover}
          {body}
        </PrefetchLink>
      </div>
    </li>
  );
}

/** A YouTube Music playlist in list view: square art, title, second line. */
function RemoteRow({ item }: { item: import('@/data/music/types').MusicItem }) {
  const href = item.kind === 'playlist' ? `/playlist/${encodeURIComponent(item.id)}` : null;
  return (
    <PrefetchLink
      to={href ?? '/library/playlists'}
      className="group flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-surface-muted"
    >
      <div className="size-10 flex-none overflow-hidden rounded-lg border border-border-subtle/60 bg-chrome">
        <Artwork src={item.thumbnail} displayWidth={40} radius="8px" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-bold text-primary group-hover:text-accent-ink">{item.title}</p>
        <p className="mt-0.5 truncate text-[10px] font-medium text-tertiary">{item.subtitle}</p>
      </div>
    </PrefetchLink>
  );
}
