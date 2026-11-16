import {
  ChevronLeft,
  ChevronRight,
  Disc,
  Info,
  ListEnd,
  ListPlus,
  ListStart,
  Moon,
  MoreHorizontal,
  Radio,
  Share2,
  Star,
  User,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Menu, MenuHeader, MenuItem, MenuSeparator, type MenuPlacement } from '@/components/Menu';
import {
  useAddToPlaylist,
  useLikeStatus,
  usePlaylistOptions,
  useSetLiked,
  useSignedIn,
} from '@/data/music/queries';
import type { Track } from '@/data/music/types';
import { useLocalFavorites } from '@/data/music/localFavorites';
import { usePlayer } from '@/state/player';
import { showToast } from '@/components/Toast';
import { SleepTimerChoices } from '@/playback/SleepTimerPicker';
import { SongInfoModal } from './SongInfoModal';

function PlaylistChoices({ videoId, onDone, onBack }: { videoId: string; onDone: () => void; onBack: () => void }) {
  const options = usePlaylistOptions(videoId, true);
  const add = useAddToPlaylist();
  return (
    <>
      <MenuItem icon={<ChevronLeft size={14} />} onSelect={onBack}>
        Back
      </MenuItem>
      <MenuSeparator />
      <MenuHeader>Add to Playlist</MenuHeader>
      {options.isPending && (
        <MenuItem disabled onSelect={() => {}}>
          Loading…
        </MenuItem>
      )}
      {options.isError && (
        <MenuItem disabled onSelect={() => {}}>
          Couldn’t load your playlists
        </MenuItem>
      )}
      {options.data?.length === 0 && (
        <MenuItem disabled onSelect={() => {}}>
          No playlists yet
        </MenuItem>
      )}
      {options.data?.map((option) => (
        <MenuItem
          key={option.playlistId}
          onSelect={() => {
            add.mutate({ playlistId: option.playlistId, videoId });
            showToast(`Added to playlist: ${option.title}`);
            onDone();
          }}
        >
          {option.title}
        </MenuItem>
      ))}
    </>
  );
}

function TrackMenuItems({
  track,
  onClose,
  onOpenInfo,
}: {
  track: Track;
  onClose: () => void;
  onOpenInfo: () => void;
}) {
  const [view, setView] = useState<'main' | 'playlists' | 'sleep-timer'>('main');
  const signedIn = useSignedIn();
  const navigate = useNavigate();

  // Local Favorites fallback when not signed in
  const isLocalFav = useLocalFavorites((s) => s.isFavorite(track.videoId));
  const toggleLocalFav = useLocalFavorites((s) => s.toggleFavorite);

  // Google / YouTube Music like status
  const ytLikeStatus = useLikeStatus(track.videoId);
  const ytSetLiked = useSetLiked();

  const isLiked = signedIn ? ytLikeStatus.data === 'LIKE' : isLocalFav;

  const handleToggleFavorite = () => {
    if (signedIn) {
      ytSetLiked.mutate({ videoId: track.videoId, liked: !isLiked });
      showToast(isLiked ? `Unfavorited ${track.title}` : `Favorited ${track.title}`);
    } else {
      toggleLocalFav(track);
    }
    onClose();
  };

  const handleShare = () => {
    const url = `https://music.youtube.com/watch?v=${track.videoId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      showToast('Song link copied to clipboard');
    } else {
      showToast(url);
    }
    onClose();
  };

  const handleStartRadio = () => {
    showToast(`Starting radio: ${track.title}`);
    void usePlayer.getState().startRadio(track);
    onClose();
  };

  if (view === 'playlists') {
    return <PlaylistChoices videoId={track.videoId} onDone={onClose} onBack={() => setView('main')} />;
  }

  if (view === 'sleep-timer') {
    return <SleepTimerChoices onDone={onClose} onBack={() => setView('main')} />;
  }

  const { playNext, addToQueue } = usePlayer.getState();

  const primaryArtist = track.artists?.[0];
  const albumName = track.album?.name;

  return (
    <>
      {/* Radio & Queue Actions */}
      <MenuItem icon={<Radio size={15} className="text-accent-ink" />} onSelect={handleStartRadio}>
        Start Radio
      </MenuItem>
      <MenuItem icon={<ListStart size={15} />} onSelect={() => (onClose(), playNext([track]), showToast(`Playing next: ${track.title}`))}>
        Play Next
      </MenuItem>
      <MenuItem icon={<ListEnd size={15} />} onSelect={() => (onClose(), addToQueue([track]), showToast(`Added to queue: ${track.title}`))}>
        Add to Queue
      </MenuItem>

      <MenuSeparator />

      {/* Favorite & Playlist */}
      <MenuItem
        icon={<Star size={15} className={isLiked ? 'text-amber-400 fill-amber-400' : ''} />}
        onSelect={handleToggleFavorite}
      >
        {isLiked ? 'Unfavorite' : 'Favorite'}
      </MenuItem>

      {signedIn && (
        <MenuItem icon={<ListPlus size={15} />} trailing={<ChevronRight size={14} />} onSelect={() => setView('playlists')}>
          Add to Playlist
        </MenuItem>
      )}

      {/* Navigation: Artist & Album */}
      {(primaryArtist || track.album) && <MenuSeparator />}

      {primaryArtist && (
        <MenuItem
          icon={<User size={15} />}
          onSelect={() => {
            onClose();
            if (primaryArtist.id) {
              navigate(`/artist/${encodeURIComponent(primaryArtist.id)}`);
            } else {
              navigate(`/search?q=${encodeURIComponent(primaryArtist.name)}`);
            }
          }}
        >
          Go to Artist ({primaryArtist.name})
        </MenuItem>
      )}

      {albumName && (
        <MenuItem
          icon={<Disc size={15} />}
          onSelect={() => {
            onClose();
            if (track.album?.id) {
              navigate(`/album/${encodeURIComponent(track.album.id)}`);
            } else {
              navigate(`/search?q=${encodeURIComponent(albumName)}`);
            }
          }}
        >
          Go to Album ({albumName})
        </MenuItem>
      )}

      <MenuSeparator />

      {/* Extras: Share, Song Info, Sleep Timer */}
      <MenuItem icon={<Share2 size={15} />} onSelect={handleShare}>
        Share Song
      </MenuItem>

      <MenuItem
        icon={<Info size={15} />}
        onSelect={() => {
          onClose();
          onOpenInfo();
        }}
      >
        Song Info
      </MenuItem>

      <MenuItem icon={<Moon size={15} />} trailing={<ChevronRight size={14} />} onSelect={() => setView('sleep-timer')}>
        Sleep Timer
      </MenuItem>
    </>
  );
}

/**
 * The ⋯ button at the end of a track row:
 * Complete with Start Radio, Play Next, Add to Queue, Favorite, Go to Artist, Go to Album, Share, Song Info & Sleep Timer.
 */
export function TrackMenu({
  track,
  className,
  placement,
  onOpenChange,
}: {
  track: Track;
  className?: string;
  /** Where the menu opens from the button; the player's sit at the bottom of the window. */
  placement?: MenuPlacement;
  /** Told when the menu opens and closes; most mounts don't need to know. */
  onOpenChange?: (open: boolean) => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const close = useCallback(() => setAnchor(null), []);

  useEffect(() => {
    onOpenChange?.(anchor !== null);
  }, [anchor, onOpenChange]);

  return (
    <>
      <button
        className={className}
        aria-label={`More options for ${track.title}`}
        aria-haspopup="menu"
        aria-expanded={anchor !== null}
        data-open={anchor !== null || undefined}
        onClick={(event) => {
          event.stopPropagation();
          setAnchor(anchor ? null : event.currentTarget);
        }}
        onDoubleClick={(event) => event.stopPropagation()}
      >
        <MoreHorizontal size={18} strokeWidth={2} />
      </button>

      {anchor && (
        <Menu anchor={anchor} placement={placement} onClose={close} label={track.title}>
          <TrackMenuItems track={track} onClose={close} onOpenInfo={() => setInfoOpen(true)} />
        </Menu>
      )}

      {infoOpen && <SongInfoModal track={track} onClose={() => setInfoOpen(false)} />}
    </>
  );
}
