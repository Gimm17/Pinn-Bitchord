import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Trash2 } from 'lucide-react';
import { DetailHeader, detailButton } from '@/components/music/DetailHeader';
import { playList, shuffleList } from '@/components/music/play';
import { usePlayer } from '@/state/player';
import { EmptyState, LoadError, LoadMoreError, NeedsExtension } from '@/components/music/States';
import { TrackList } from '@/components/music/TrackList';
import { useLocalPlaylists } from '@/data/music/localPlaylists';
import { usePlaylist, useYouTubeReady } from '@/data/music/queries';
import type { HeaderInfo, Track } from '@/data/music/types';
import { useArtworkColor } from '@/lib/artworkColor';
import { usePageTint } from '@/lib/usePageTint';
import { PlaylistSkeleton } from '@/skeletons/PageSkeletons';
import { detailFooter } from './pageStyles';

/** A playlist: Light Ceramic & Frosted Sage Edition matching FigCraft reference */
export default function PlaylistPage() {
  const id = decodeURIComponent(useParams().id ?? '');
  const isLocal = id.startsWith('local:');

  if (isLocal) {
    return <LocalPlaylistDetail id={id} />;
  }

  return <RemotePlaylistDetail id={id} />;
}

function LocalPlaylistDetail({ id }: { id: string }) {
  const navigate = useNavigate();
  const playlist = useLocalPlaylists((s) => s.playlists[id]);
  const deletePlaylist = useLocalPlaylists((s) => s.deletePlaylist);
  const [confirmDelete, setConfirmDelete] = useState(false);

  usePageTint(useArtworkColor(playlist?.thumbnail));

  if (!playlist) {
    return (
      <EmptyState
        title="Playlist not found"
        detail="This playlist may have been deleted or is not stored locally."
      />
    );
  }

  const header: HeaderInfo = {
    title: playlist.title,
    subtitle: playlist.source === 'spotify' ? 'Imported from Spotify' : 'Local Playlist',
    meta: `${playlist.tracks.length} songs`,
    description: playlist.description ?? null,
    thumbnail: playlist.thumbnail ?? null,
    artists: [],
    explicit: false,
    library: null,
  };

  // Auto-resolve any pending Spotify tracks quietly in the background
  useEffect(() => {
    if (!playlist) return;
    const unresolved = playlist.tracks.filter((t) => t.videoId.startsWith('spotify:'));
    if (unresolved.length === 0) return;

    let cancelled = false;
    (async () => {
      const { searchSongs } = await import('@/data/music/api');
      const { best } = await import('@/data/match/trackMatcher');
      const { candidateOf } = await import('@/data/spotify/api');

      for (const track of unresolved) {
        if (cancelled) break;
        try {
          const artist = track.artists?.map((a) => a.name).join(' ') ?? '';
          const hits = await searchSongs(`${track.title} ${artist}`.trim());
          if (hits.length > 0) {
            const scored = best(
              hits.map((c) => ({ ...candidateOf(c), track: c })),
              { title: track.title, artist, album: track.album?.name ?? null, durationSec: track.durationSec },
            );
            const pick = scored?.track ?? hits[0];
            if (pick?.videoId) {
              const current = useLocalPlaylists.getState().playlists[id];
              if (!current || cancelled) break;
              const updatedTracks = current.tracks.map((t) =>
                t.videoId === track.videoId
                  ? {
                      ...t,
                      videoId: pick.videoId,
                      thumbnail: t.thumbnail || pick.thumbnail,
                      durationSec: t.durationSec || pick.durationSec,
                      unavailable: undefined,
                    }
                  : t,
              );
              useLocalPlaylists.getState().updatePlaylistTracks(id, updatedTracks);
            }
          }
        } catch (err) {
          console.warn('Background playlist track match failed:', track.title, err);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, playlist?.tracks.length]);

  const context = { source: { title: playlist.title, type: 'playlist' as const, id } };

  const handleDelete = () => {
    deletePlaylist(id);
    navigate('/library/playlists');
  };

  return (
    <>
      <DetailHeader
        info={header}
        canPlay={playlist.tracks.length > 0}
        onPlay={() => playList(playlist.tracks, 0, context)}
        onShuffle={() => shuffleList(playlist.tracks, context)}
        onRadio={() => {
          const first = playlist.tracks[0];
          if (first) {
            void usePlayer.getState().startRadio(first);
          }
        }}
        extra={
          <button
            className={confirmDelete ? detailButton.pill : detailButton.circle}
            onClick={() => {
              if (confirmDelete) handleDelete();
              else setConfirmDelete(true);
            }}
            onBlur={() => setConfirmDelete(false)}
            title={confirmDelete ? 'Click again to confirm delete' : 'Delete playlist'}
            aria-label="Delete playlist"
          >
            <Trash2 size={16} strokeWidth={2} className="text-ink-muted hover:text-red-500 transition-colors" />
            {confirmDelete && <span className="text-red-500 font-bold ml-1">Confirm?</span>}
          </button>
        }
      />

      {/* What the list actually holds: resolved rows play, the rest are still being matched. */}
      <PlaylistStatus tracks={playlist.tracks} note="Stored on this device" />

      {/* Porcelain Tracklist Container */}
      <div className="mx-(--body-gutter) rounded-2xl border border-border-subtle bg-porcelain p-2 shadow-2xs overflow-hidden">
        <TrackList tracks={playlist.tracks} variant="playlist" source={context.source} />
      </div>

      <footer className={detailFooter}>
        <p>Saved in BitChord Local Library • {playlist.tracks.length} songs</p>
      </footer>
    </>
  );
}

function RemotePlaylistDetail({ id }: { id: string }) {
  const { missing } = useYouTubeReady();
  const playlist = usePlaylist(id);
  const header = playlist.data?.pages[0]?.header ?? null;
  usePageTint(useArtworkColor(header?.thumbnail));

  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = playlist;
  const onNearEnd = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  if (missing) return <NeedsExtension />;
  if (playlist.isError && !playlist.data) return <LoadError error={playlist.error} onRetry={() => void playlist.refetch()} />;
  if (!playlist.data || !header) return <PlaylistSkeleton />;

  const tracks = playlist.data.pages.flatMap((page) => page.tracks);
  const context = { source: { title: header.title, type: 'playlist' as const, id } };
  return (
    <>
      <DetailHeader
        info={header}
        canPlay={tracks.length > 0}
        onPlay={() => playList(tracks, 0, context)}
        onShuffle={() => shuffleList(tracks, context)}
        onRadio={() => {
          const first = tracks[0];
          if (first) {
            void usePlayer.getState().startRadio(first);
          }
        }}
      />

      <PlaylistStatus tracks={tracks} note="YouTube Music" />

      <div className="mx-(--body-gutter) rounded-2xl border border-border-subtle bg-porcelain p-2 shadow-2xs overflow-hidden">
        <TrackList tracks={tracks} variant="playlist" onNearEnd={onNearEnd} source={context.source} />
      </div>

      {isFetchingNextPage && <div className="flex justify-center py-5 text-xs text-ink-muted">Loading more songs…</div>}
      {playlist.isFetchNextPageError && <LoadMoreError onRetry={() => void fetchNextPage()} />}
      <footer className={detailFooter}>
        <p>{header.meta}</p>
      </footer>
    </>
  );
}

/**
 * A status line stating only what the list can prove: how many rows play,
 * how many are still being matched to a YouTube Music stream, and how many
 * were not found. It used to claim every song was "matched & ready" and on a
 * "lossless" path regardless of what had actually been resolved.
 */
function PlaylistStatus({ tracks, note }: { tracks: Track[]; note: string }) {
  const matching = tracks.filter((t) => t.unavailable === 'matching').length;
  const missing = tracks.filter((t) => t.unavailable === 'missing').length;
  const ready = tracks.length - matching - missing;

  const tone =
    missing > 0
      ? 'bg-[var(--dangerBG)] text-[var(--dangerText)]'
      : matching > 0
        ? 'bg-chrome text-secondary'
        : 'bg-[var(--successBG)] text-[var(--successText)]';

  return (
    <div className="mx-(--body-gutter) mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle bg-porcelain px-5 py-3 shadow-2xs">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${tone}`}>
          {ready} of {tracks.length} ready
        </span>
        {matching > 0 && <span className="text-[11px] font-medium text-secondary">{matching} still matching</span>}
        {missing > 0 && <span className="text-[11px] font-medium text-danger">{missing} not found</span>}
      </div>
      <span className="text-[11px] font-medium text-secondary">{note}</span>
    </div>
  );
}
