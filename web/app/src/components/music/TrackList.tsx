import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { PrefetchLink } from '@/components/PrefetchLink';
import { PauseIcon, PlayIcon } from '@/components/icons/Transport';
import type { ArtistRef, Track } from '@/data/music/types';
import { usePlayer } from '@/state/player';
import { Artwork } from './Artwork';
import { ExplicitBadge } from './ExplicitBadge';
import { albumHref, artistHref, formatDuration } from './links';
import { playList, playTrack, type ListContext } from './play';
import { TrackMenu } from './TrackMenu';

type Variant = 'album' | 'playlist';

const ROW_HEIGHT: Record<Variant, number> = { album: 48, playlist: 52 };
const VIRTUALIZE_FROM = 80;

interface TrackListProps {
  tracks: Track[];
  variant: Variant;
  fallbackArtwork?: string | null;
  fallbackArtists?: ArtistRef[];
  onNearEnd?: () => void;
  source?: ListContext['source'];
}

const cell = 'flex h-full min-w-0 items-center';
const playlistColumns = 'grid-cols-[44px_minmax(0,36fr)_minmax(0,24fr)_minmax(0,22fr)_100px_60px]';
const secondary = `${cell} pe-2.5 max-md:hidden text-xs text-secondary font-medium`;
const tertiary = `${cell} pe-4 max-md:hidden text-xs text-secondary/80`;
const dimmed = 'group-data-unavailable/row:opacity-40';
const link = 'text-inherit hover:underline group-data-current/row:text-primary';

const row = [
  'group/row relative grid items-center px-2 rounded-xl transition-colors cursor-pointer select-none',
  'hover:bg-surface-muted data-current:bg-accent-soft data-unavailable:cursor-default',
].join(' ');

const rowVariant: Record<Variant, string> = {
  album: 'h-[46px] grid-cols-[36px_minmax(0,1fr)_80px_60px]',
  playlist: `h-[52px] ${playlistColumns} max-md:grid-cols-[36px_minmax(0,1fr)_60px]`,
};

function Artists({ artists }: { artists: ArtistRef[] }) {
  return (
    <>
      {artists.map((artist, i) => {
        const href = artistHref(artist.id);
        return (
          <span key={`${artist.name}-${i}`}>
            {i > 0 && ', '}
            {href ? (
              <PrefetchLink to={href} className={link}>
                {artist.name}
              </PrefetchLink>
            ) : (
              artist.name
            )}
          </span>
        );
      })}
    </>
  );
}

/**
 * A row's quality tag, and only when it's known: the stream described by the
 * player for the track that is loaded. A row that hasn't played yet has no
 * measured format, and the reference's per-row FLAC/24-BIT badges there were
 * decoration. Nothing is better than a guess.
 */
function QualityBadge({ current }: { current: boolean }) {
  const stream = usePlayer((s) => (current ? (s.nowPlaying?.stream ?? null) : null));
  if (!stream) return null;
  const hiRes = (stream.bitrateKbps ?? 0) >= 900 || /flac|alac|dsd|pcm/i.test(stream.codec ?? '');
  if (!hiRes) return null;
  const text = stream.codec ? stream.codec.toUpperCase() : stream.sampleRateHz ? `${Math.round(stream.sampleRateHz / 1000)} kHz` : 'HI-RES';
  return (
    <span className="inline-block rounded-full bg-[var(--successBG)] px-2 py-0.5 text-[10px] font-bold tracking-wider text-[var(--successText)]">
      {text}
    </span>
  );
}

interface RowProps {
  track: Track;
  variant: Variant;
  position: number;
  fallbackArtwork: string | null | undefined;
  onPlayRow: () => void;
}

function Row({ track, variant, position, fallbackArtwork, onPlayRow }: RowProps) {
  const current = usePlayer((s) => s.nowPlaying?.videoId === track.videoId);
  const playing = usePlayer((s) => s.nowPlaying?.videoId === track.videoId && (s.status === 'playing' || s.status === 'buffering'));
  const togglePlay = usePlayer((s) => s.togglePlay);
  const unavailable = track.unavailable;
  const onPlay = () => (unavailable === 'missing' ? undefined : current ? togglePlay() : onPlayRow());

  return (
    <div
      className={`${row} ${rowVariant[variant]}`}
      data-variant={variant}
      data-current={current || undefined}
      data-unavailable={unavailable}
      title={unavailable === 'matching' ? 'Matching lossless stream…' : unavailable === 'missing' ? 'Not found' : undefined}
      onDoubleClick={onPlay}
      onClick={onPlay}
    >
      {/* Column 1: Index / Play / Speaker Icon */}
      <div className="flex h-full items-center justify-center">
        {current ? (
          <span className="text-success group-hover/row:hidden" title="Playing">
            <Volume2 size={16} className="animate-pulse" />
          </span>
        ) : (
          <span className="text-xs font-mono text-ink-muted group-hover/row:hidden">
            {String(track.index ?? position).padStart(2, '0')}
          </span>
        )}

        <button
          className="hidden group-hover/row:grid size-7 place-items-center rounded-full bg-accent text-on-accent hover:scale-105 active:scale-95 transition-transform"
          aria-label={playing ? 'Pause' : 'Play'}
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
          disabled={!!unavailable}
        >
          {playing ? <PauseIcon size={14} /> : <PlayIcon size={14} className="translate-x-0.5" />}
        </button>
      </div>

      {/* Column 2: Title & Explicit Badge */}
      <div className={`${cell} gap-3 pe-2`}>
        {variant === 'playlist' && (
          <div className="relative size-9 shrink-0 overflow-hidden rounded-lg border border-border-subtle/60 bg-chrome">
            <Artwork src={track.thumbnail ?? fallbackArtwork ?? null} displayWidth={36} radius="8px" />
          </div>
        )}
        <div className={`flex min-w-0 flex-col ${dimmed}`}>
          <div className="flex min-w-0 items-center gap-1.5">
            <span className={`truncate text-sm font-semibold ${current ? 'text-accent-ink font-bold' : 'text-primary'}`}>
              {track.title}
            </span>
            {track.explicit && <ExplicitBadge />}
          </div>
          {variant === 'album' && track.artists.length > 0 && (
            <div className="truncate text-xs text-secondary">
              <Artists artists={track.artists} />
            </div>
          )}
        </div>
      </div>

      {/* Column 3: Artist (Playlists) */}
      {variant === 'playlist' && (
        <div className={`${secondary} ${dimmed}`}>
          <span className="truncate font-medium">
            <Artists artists={track.artists} />
          </span>
        </div>
      )}

      {/* Column 4: Album (Playlists) */}
      {variant === 'playlist' && (
        <div className={`${tertiary} ${dimmed}`}>
          <span className="truncate">
            {track.album &&
              (albumHref(track.album.id) ? (
                <PrefetchLink to={albumHref(track.album.id)!} className={link}>
                  {track.album.name}
                </PrefetchLink>
              ) : (
                track.album.name
              ))}
          </span>
        </div>
      )}

      {/* Column 5: the format, once the player has actually described it */}
      <div className="flex h-full items-center max-md:hidden">
        <QualityBadge current={current} />
      </div>

      {/* Column 6: Duration / Menu Button */}
      <div className="flex h-full items-center justify-end pe-2 text-xs font-mono text-ink-muted tabular-nums relative">
        <span className="group-hover/row:hidden">
          {unavailable === 'missing' ? 'N/A' : formatDuration(track.durationSec)}
        </span>
        {!unavailable && (
          <div
            className="hidden group-hover/row:flex items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <TrackMenu track={track} placement="above-end" className="p-1 hover:text-primary text-ink-muted" />
          </div>
        )}
      </div>
    </div>
  );
}

function TableHeader({ variant }: { variant: Variant }) {
  if (variant === 'album') {
    return (
      <div className="grid h-9 items-center grid-cols-[36px_minmax(0,1fr)_80px_60px] px-2 text-[11px] font-bold tracking-wider text-ink-muted uppercase border-b border-border-subtle/60 mb-1" aria-hidden="true">
        <div className="text-center">#</div>
        <div>TITLE</div>
        <div className="max-md:hidden">QUALITY</div>
        <div className="text-right pe-3">TIME</div>
      </div>
    );
  }

  return (
    <div className={`grid h-9 items-center ${playlistColumns} px-2 text-[11px] font-bold tracking-wider text-ink-muted uppercase border-b border-border-subtle/60 mb-1 max-md:grid-cols-[36px_minmax(0,1fr)_60px]`} aria-hidden="true">
      <div className="text-center">#</div>
      <div>TITLE</div>
      <div className="max-md:hidden">ARTIST</div>
      <div className="max-md:hidden">ALBUM</div>
      <div className="max-md:hidden">QUALITY</div>
      <div className="text-right pe-3">TIME</div>
    </div>
  );
}

export function TrackList({ tracks, variant, fallbackArtwork, fallbackArtists, onNearEnd, source }: TrackListProps) {
  const playRow = (i: number) => {
    if (source) {
      const playable = tracks.filter((t) => !t.unavailable);
      return playList(playable, Math.max(0, playable.indexOf(tracks[i]!)), { source, fallbackArtwork, fallbackArtists });
    }
    const track = tracks[i]!;
    playTrack(track.artists.length || !fallbackArtists ? track : { ...track, artists: fallbackArtists }, fallbackArtwork);
  };

  const container = useRef<HTMLDivElement>(null);
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
  useEffect(() => setScrollElement(document.getElementById('scrollable-page')), []);
  const virtual = tracks.length >= VIRTUALIZE_FROM;

  const virtualizer = useVirtualizer({
    count: virtual ? tracks.length : 0,
    getScrollElement: () => scrollElement,
    estimateSize: () => ROW_HEIGHT[variant],
    overscan: 10,
    scrollMargin: container.current?.offsetTop ?? 0,
  });

  const items = virtual ? virtualizer.getVirtualItems() : [];
  const last = items[items.length - 1];
  useEffect(() => {
    if (last && last.index >= tracks.length - 15) onNearEnd?.();
  }, [last, tracks.length, onNearEnd]);

  return (
    <div ref={container} className="w-full flex flex-col">
      <TableHeader variant={variant} />
      {virtual ? (
        <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
          {items.map((virtualRow) => (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start - virtualizer.options.scrollMargin}px)`,
              }}
            >
              <Row
                track={tracks[virtualRow.index]!}
                variant={variant}
                position={virtualRow.index + 1}
                fallbackArtwork={fallbackArtwork}
                onPlayRow={() => playRow(virtualRow.index)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {tracks.map((track, i) => (
            <Row
              key={track.videoId || i}
              track={track}
              variant={variant}
              position={i + 1}
              fallbackArtwork={fallbackArtwork}
              onPlayRow={() => playRow(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
