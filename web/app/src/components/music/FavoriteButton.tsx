import { Heart } from 'lucide-react';
import { useLikeStatus, useSetLiked, useSignedIn } from '@/data/music/queries';
import { useLocalFavorites } from '@/data/music/localFavorites';
import { usePlayer } from '@/state/player';
import { showToast } from '@/components/Toast';

interface FavoriteButtonProps {
  videoId: string | null;
  className?: string;
  /** Added while the track is a favourite, so the heart can fill in. */
  activeClassName?: string;
  size?: number;
}

/**
 * Favorite heart: backed by YouTube Music when signed in, and local favorites when signed out.
 */
export function FavoriteButton({
  videoId,
  className,
  activeClassName = 'text-[var(--favoriteText)]',
  size = 18,
}: FavoriteButtonProps) {
  const signedIn = useSignedIn();
  const status = useLikeStatus(videoId);
  const setLiked = useSetLiked();

  const isLocalFav = useLocalFavorites((s) => s.isFavorite(videoId));
  const toggleLocalFav = useLocalFavorites((s) => s.toggleFavorite);

  if (!videoId) return null;

  const liked = signedIn ? status.data === 'LIKE' : isLocalFav;

  const handleToggle = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (signedIn) {
      setLiked.mutate({ videoId, liked: !liked });
      showToast(liked ? 'Removed from YouTube favorites' : 'Added to YouTube favorites');
    } else {
      const { nowPlaying, queue, index } = usePlayer.getState();
      const currentTrack = queue[index]?.track;
      if (currentTrack && currentTrack.videoId === videoId) {
        toggleLocalFav(currentTrack);
      } else if (nowPlaying && nowPlaying.videoId === videoId) {
        toggleLocalFav({
          videoId,
          title: nowPlaying.title,
          artists: [{ name: nowPlaying.artist, id: null }],
          album: null,
          durationSec: nowPlaying.durationSec,
          explicit: false,
          thumbnail: nowPlaying.artworkUrl,
          index: null,
          plays: null,
        });
      }
    }
  };

  return (
    <button
      className={className ? `${className} ${liked ? activeClassName : ''}` : liked ? activeClassName : undefined}
      aria-label={liked ? 'Unfavorite' : 'Favorite'}
      aria-pressed={liked}
      disabled={signedIn && status.isPending}
      onClick={handleToggle}
    >
      <Heart size={size} className={liked ? 'fill-current' : undefined} />
    </button>
  );
}
