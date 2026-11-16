import { useMutation } from '@tanstack/react-query';
import { Bookmark, BookmarkCheck, ListPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { DetailHeader, detailButton } from '@/components/music/DetailHeader';
import { playList, shuffleList } from '@/components/music/play';
import { LoadError } from '@/components/music/States';
import { TrackList } from '@/components/music/TrackList';
import { createPlaylist } from '@/data/music/api';
import { useLocalPlaylists } from '@/data/music/localPlaylists';
import { useSignedIn } from '@/data/music/queries';
import type { HeaderInfo } from '@/data/music/types';
import { useSpotifyPlaylistInfo, useSpotifyRows } from '@/data/spotify/queries';
import { useArtworkColor } from '@/lib/artworkColor';
import { usePageTint } from '@/lib/usePageTint';
import { PlaylistSkeleton } from '@/skeletons/PageSkeletons';
import { usePlayer } from '@/state/player';
import { detailFooter } from './pageStyles';

/**
 * A Spotify playlist as an ordinary playlist page:
 * Spotify's rows go up at once, each swapped for its YouTube Music song as the
 * match arrives.
 */
export default function SpotifyPlaylistPage() {
  const id = decodeURIComponent(useParams().id ?? '');
  const info = useSpotifyPlaylistInfo(id);
  const rows = useSpotifyRows(id);
  usePageTint(useArtworkColor(info.data?.imageUrl));

  useEffect(() => {
    if (!info.data || !rows.rows.length) return;
    const localId = `local:spotify:${id}`;
    const existing = useLocalPlaylists.getState().playlists[localId];
    if (existing) {
      useLocalPlaylists.getState().updatePlaylistTracks(localId, rows.rows);
    }
  }, [id, rows.rows, info.data]);

  if (rows.status === 'error' && !rows.rows.length) return <LoadError error={rows.error} onRetry={rows.retry} />;
  if (!info.data || (rows.status === 'loading' && !rows.rows.length)) return <PlaylistSkeleton />;

  const playable = rows.rows.filter((t) => !t.unavailable);
  const missing = rows.rows.filter((t) => t.unavailable === 'missing');
  const total = Math.max(rows.total, info.data.total);
  const meta = [
    `${total} ${total === 1 ? 'song' : 'songs'}`,
    rows.matching > 0 ? `finding on YouTube Music, ${rows.rows.length - rows.matching} of ${rows.rows.length}` : null,
    rows.matching === 0 && missing.length > 0 ? `${missing.length} not on YouTube Music` : null,
  ]
    .filter(Boolean)
    .join(' • ');

  const headerInfo: HeaderInfo = {
    title: info.data.name,
    subtitle: 'Spotify Playlist',
    meta,
    description: null,
    thumbnail: info.data.imageUrl,
    artists: info.data.owner ? [{ name: info.data.owner, id: null }] : [],
    explicit: false,
    library: null,
  };
  const context = { source: { title: info.data.name, type: 'playlist' as const, id: `spotify:${id}` } };

  return (
    <>
      <DetailHeader
        info={headerInfo}
        canPlay={playable.length > 0}
        onPlay={() => playList(playable, 0, context)}
        onShuffle={() => shuffleList(playable, context)}
        onRadio={() => {
          const first = playable[0];
          if (first) {
            void usePlayer.getState().startRadio(first);
          }
        }}
        extra={
          <div className="flex items-center gap-2">
            <SaveLocalButton
              playlistId={id}
              title={info.data.name}
              thumbnail={info.data.imageUrl}
              tracks={rows.rows.length > 0 ? rows.rows : playable}
            />
            <ImportButton title={info.data.name} videoIds={playable.map((t) => t.videoId)} ready={rows.matching === 0} />
          </div>
        }
      />

      <div className="mx-(--body-gutter) mb-4 flex items-center justify-between rounded-xl border border-border-subtle bg-porcelain px-5 py-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <span className="size-2 rounded-full bg-[#1DB954] animate-pulse" />
          <span className="text-xs font-semibold text-primary">
            Spotify Master Sync • {playable.length} of {rows.rows.length} Matched to High-Res Audio
          </span>
        </div>
        <span className="text-xs text-ink-muted font-medium max-sm:hidden">
          BitChord Streaming • Lossless Stream Routing
        </span>
      </div>

      <div className="mx-(--body-gutter) rounded-2xl border border-border-subtle bg-porcelain p-2 shadow-2xs overflow-hidden">
        <TrackList tracks={rows.rows} variant="playlist" source={context.source} />
      </div>

      <footer className={detailFooter}>
        <p>From Spotify. Songs are matched to YouTube Music / Lossless audio by title, artist, and length.</p>
      </footer>
    </>
  );
}

function SaveLocalButton({
  playlistId,
  title,
  thumbnail,
  tracks,
}: {
  playlistId: string;
  title: string;
  thumbnail: string | null;
  tracks: any[];
}) {
  const localId = `local:spotify:${playlistId}`;
  const localPlaylists = useLocalPlaylists();
  const isSaved = !!localPlaylists.playlists[localId];

  const handleToggle = () => {
    if (isSaved) {
      localPlaylists.deletePlaylist(localId);
    } else {
      localPlaylists.savePlaylist({
        id: localId,
        title,
        thumbnail,
        source: 'spotify',
        spotifyId: playlistId,
        tracks,
      });
    }
  };

  return (
    <button
      className={detailButton.circle}
      onClick={handleToggle}
      aria-label={isSaved ? 'Saved to BitChord Library' : 'Save to BitChord Library'}
      title={isSaved ? 'Saved to BitChord Library (Click to remove)' : 'Save to BitChord Library'}
    >
      {isSaved ? <BookmarkCheck size={18} className="text-success" strokeWidth={2.4} /> : <Bookmark size={18} strokeWidth={2} />}
    </button>
  );
}

function ImportButton({ title, videoIds, ready }: { title: string; videoIds: string[]; ready: boolean }) {
  const ytSignedIn = useSignedIn();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const create = useMutation({
    mutationFn: () => createPlaylist(title, videoIds, 'Imported from Spotify with BitChord'),
    onSuccess: (playlistId) => navigate(`/playlist/${encodeURIComponent(`VL${playlistId}`)}`),
  });
  if (!ytSignedIn) return null;
  const label = !ready
    ? 'Import to YouTube Music (matching…)'
    : create.isPending
      ? 'Importing…'
      : create.isError
        ? 'Import failed. Try again'
        : confirming
          ? `Make a private playlist of ${videoIds.length} songs?`
          : 'Import to YouTube Music';
  return (
    <button
      className={confirming ? detailButton.pill : detailButton.circle}
      aria-label={label}
      title={label}
      disabled={!ready || !videoIds.length || create.isPending}
      onClick={() => (confirming ? (setConfirming(false), create.mutate()) : setConfirming(true))}
      onBlur={() => setConfirming(false)}
    >
      <ListPlus size={18} strokeWidth={2.2} />
      {confirming && <span>Make Playlist</span>}
    </button>
  );
}
