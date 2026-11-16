import { Maximize2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { LogoMark } from '@/components/icons/LogoMark';
import { ExplicitBadge } from '@/components/music/ExplicitBadge';
import { VideoSurface } from '@/components/music/VideoSurface';
import { albumHref, artistHref } from '@/components/music/links';
import { PrefetchLink } from '@/components/PrefetchLink';
import { artistCredits, creditSegments } from '@/lib/artistCredits';
import { sizedArtwork } from '@/lib/artwork';
import type { Track } from '@/data/music/types';
import { usePlayer } from '@/state/player';
import { useUi } from '@/state/ui';
import { useHasVideo } from '@/state/video';
import { albumPageFor, artistPageFor } from './nowPlayingLinks';
import { MixWindowHighlight } from './NerdStats';
import { useScrubber } from './useScrubber';

// The title and each artist: plain until hovered, then underlined on their own.
export const pageLink = 'cursor-pointer text-start hover:underline focus-visible:underline aria-busy:cursor-progress';

/**
 * A name in the LCD that opens a page
 */
interface PageLinkProps {
  href: string | null;
  resolve: () => Promise<string>;
  className: string;
  children: ReactNode;
}

export function PageLink({ href, resolve, className, children }: PageLinkProps) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  if (href) {
    return (
      <PrefetchLink to={href} className={className}>
        {children}
      </PrefetchLink>
    );
  }
  return (
    <button
      className={className}
      aria-busy={busy || undefined}
      onClick={() => {
        if (busy) return;
        setBusy(true);
        void resolve()
          .then((to) => navigate(to))
          .finally(() => setBusy(false));
      }}
    >
      {children}
    </button>
  );
}

/**
 * The artists, each its own link
 */
export function Credits({
  videoId,
  line,
  artists,
  className = pageLink,
}: {
  videoId: string;
  line: string;
  artists: Track['artists'];
  className?: string;
}) {
  const segments = creditSegments(line, artistCredits(line, artists));
  return segments.map((segment, i) =>
    segment.credit ? (
      <PageLink
        key={i}
        className={className}
        href={artistHref(segment.credit.id)}
        resolve={() => artistPageFor(videoId, segment.credit!)}
      >
        {segment.text}
      </PageLink>
    ) : (
      segment.text
    ),
  );
}

// As wide as the name, so only the name opens the album.
const titleClass = 'min-w-0 max-w-full self-start truncate text-xs font-bold text-primary';

/** The now-playing tile inside the pill */
export function Lcd() {
  const nowPlaying = usePlayer((s) => s.nowPlaying);
  const status = usePlayer((s) => s.status);
  const error = usePlayer((s) => s.error);
  const openFullScreen = useUi((s) => s.setFullScreen);
  // The queue's row for what's playing: it carries the album and each artist's channel.
  const track = usePlayer((s) => {
    const entry = s.queue[s.index]?.track;
    return entry && entry.videoId === s.nowPlaying?.videoId ? entry : null;
  });
  const video = useHasVideo(nowPlaying?.videoId);

  if (!nowPlaying) {
    return (
      <div className="grid h-full place-items-center text-tertiary">
        <LogoMark size={24} className="text-tertiary" />
      </div>
    );
  }

  const { videoId, title, artist } = nowPlaying;
  const album = track?.album ?? null;
  return (
    <div
      className={`group/lcd relative grid h-full items-center gap-x-2.5 pb-1 ${video ? 'grid-cols-[60px_minmax(0,1fr)]' : 'grid-cols-[38px_minmax(0,1fr)]'}`}
    >
      {/* Artwork opens the full-screen player */}
      <button
        className={`group/art relative block h-[38px] overflow-hidden rounded-lg border border-border-subtle bg-chrome p-0 transition-transform hover:scale-105 ${video ? 'w-[60px] bg-black' : 'w-[38px]'}`}
        aria-label="Open full screen player"
        onClick={() => openFullScreen(true)}
      >
        {nowPlaying.artworkUrl && (
          <img
            key={nowPlaying.artworkUrl}
            src={sizedArtwork(nowPlaying.artworkUrl, 38)}
            alt=""
            referrerPolicy="no-referrer"
            decoding="async"
            className="size-full object-cover opacity-0 transition-opacity duration-200 ease-in data-loaded:opacity-100"
            onLoad={(e) => e.currentTarget.setAttribute('data-loaded', '')}
          />
        )}
        <VideoSurface
          className={`absolute inset-0 transition-opacity duration-300 ${video ? 'opacity-100' : 'opacity-0'}`}
        />
        {/* Hovering dims the artwork and shows the expand glyph */}
        <span
          className="absolute inset-0 grid place-items-center bg-scrim text-white opacity-0 transition-opacity duration-200 group-hover/pill:opacity-100 group-focus-visible/art:opacity-100"
          aria-hidden="true"
        >
          <Maximize2 size={14} strokeWidth={2.2} />
        </span>
      </button>

      {/* Track details & title */}
      <div className="flex min-w-0 flex-col justify-center transition-[filter,opacity] group-has-[[data-scrubber]:hover]/lcd:opacity-30 group-has-[[data-scrubber]:hover]/lcd:blur-[3px] group-has-[[data-dragging]]/lcd:opacity-30 group-has-[[data-dragging]]/lcd:blur-[3px]">
        {title ? (
          <div className="flex min-w-0 items-center gap-1.5">
            <PageLink
              className={`${titleClass} ${pageLink}`}
              href={albumHref(album?.id ?? null)}
              resolve={() => albumPageFor(videoId, album, [title, artist].filter(Boolean).join(' '))}
            >
              {title}
            </PageLink>
            <span className="rounded-full bg-danger px-1.5 py-0.2 text-[9px] font-bold tracking-wider text-on-danger uppercase shadow-2xs">
              HI-RES
            </span>
            {track?.explicit && <ExplicitBadge size={11} />}
          </div>
        ) : (
          <span className={titleClass}>{status === 'loading' ? 'Loading…' : ''}</span>
        )}
        {status === 'error' ? (
          <span className="truncate text-[11px] font-semibold text-danger">{error}</span>
        ) : (
          <span className="truncate text-[11px] font-medium text-secondary">
            {artist ? <Credits videoId={videoId} line={artist} artists={track?.artists ?? []} /> : status === 'loading' ? 'Loading…' : ''}
          </span>
        )}
      </div>
      <Progress />
    </div>
  );
}

// Elapsed and remaining time
const time =
  'pointer-events-none absolute bottom-[10px] text-[10px] font-bold tabular-nums text-primary opacity-0 transition-opacity group-hover/scrub:opacity-100 group-data-dragging/scrub:opacity-100';

/**
 * Elapsed time as a clean line along the LCD's bottom
 */
function Progress() {
  const { bar, elapsed, remaining, dragging, handlers } = useScrubber();
  return (
    <div
      className="group/scrub absolute inset-x-0 bottom-0 h-3 cursor-pointer touch-none"
      data-scrubber
      data-dragging={dragging || undefined}
      {...handlers}
    >
      <span ref={elapsed} className={`${time} left-0`} />
      <span ref={remaining} className={`${time} right-0`} />
      <div
        className="absolute inset-x-0 bottom-1 h-0.5 overflow-hidden rounded-full bg-chrome transition-[height,left,right] duration-100 ease-in group-hover/scrub:bottom-[3px] group-hover/scrub:h-1 group-data-dragging/scrub:bottom-[3px] group-data-dragging/scrub:h-1"
        aria-hidden="true"
      >
        <MixWindowHighlight />
        <div ref={bar} className="relative size-full origin-left scale-x-(--progress) bg-accent [--progress:0]" />
      </div>
    </div>
  );
}
