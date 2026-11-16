import { useState } from 'react';
import { Maximize2, MoreHorizontal, Music } from 'lucide-react';
import {
  BackwardIcon,
  ForwardIcon,
  LyricsActiveIcon,
  LyricsIcon,
  PauseIcon,
  PlayIcon,
  RepeatIcon,
  RepeatOneIcon,
  ShuffleIcon,
  UpNextIcon,
} from '@/components/icons/Transport';
import { FavoriteButton } from '@/components/music/FavoriteButton';
import { TrackMenu } from '@/components/music/TrackMenu';
import { sizedArtwork } from '@/lib/artwork';
import { usePlayer } from '@/state/player';
import { useUi } from '@/state/ui';
import { useScrubber } from './useScrubber';
import { StreamQuality } from './StreamQuality';
import { VolumeControl } from './VolumeControl';

/*
 * Measured from Design_UI_UX/EXPORT_PNG ("Light Ceramic & Frosted Sage"):
 * a 78px white footer, a 48px rounded-[14px] artwork tile, a blue 36px play
 * button, a 5px scrubber (#66A3BF fill, #3368A0 thumb, #E8E4DA track) and an
 * always-visible level beside the speaker.
 */
const time = 'w-10 flex-none text-[11px] font-semibold text-secondary tabular-nums select-none';
const util =
  'grid size-9 flex-none place-items-center rounded-full text-secondary transition-colors hover:bg-chrome hover:text-primary';

/**
 * Lossless sources report a bit depth (data/sources/resolver.ts); YouTube's own
 * delivery tops out well below this. So the pill states what was measured, and
 * nothing when the stream hasn't been described yet.
 */
export function isHiRes(stream: { bitrateKbps: number | null; codec: string | null } | null): boolean {
  if (!stream) return false;
  return (stream.bitrateKbps ?? 0) >= 900 || /flac|alac|dsd|pcm/i.test(stream.codec ?? '');
}

export function PlayerBar() {
  const sidePanel = useUi((s) => s.sidePanel);
  const toggleSidePanel = useUi((s) => s.toggleSidePanel);
  const setFullScreen = useUi((s) => s.setFullScreen);

  const nowPlaying = usePlayer((s) => s.nowPlaying);
  const hasTrack = nowPlaying !== null;
  const videoId = nowPlaying?.videoId ?? null;
  const track = usePlayer((s) => {
    const entry = s.queue[s.index]?.track;
    return entry && entry.videoId === s.nowPlaying?.videoId ? entry : null;
  });
  const playing = usePlayer((s) => s.status === 'playing' || s.status === 'buffering');
  const hasNext = usePlayer((s) => s.index + 1 < s.queue.length || s.repeat !== 'off' || (s.autoplay && s.index >= 0));
  const shuffle = usePlayer((s) => s.shuffle);
  const repeat = usePlayer((s) => s.repeat);
  const hiRes = usePlayer((s) => isHiRes(s.nowPlaying?.stream ?? null));
  const { togglePlay, next, previous, toggleShuffle, cycleRepeat } = usePlayer.getState();

  const [volumeOpen, setVolumeOpen] = useState(false);
  const { bar, elapsed, total, handlers } = useScrubber();

  /*
   * Porcelain, with the reference's quieter #F9F8F6 band along the bottom
   * edge where the seek line and times sit. That band is a FLAT strip, not a
   * fade — sampled down the reference's footer the value holds #F9F8F6 for
   * its last third and changes over one row — so this is a hard stop at 72%
   * rather than a two-colour gradient.
   */
  const surface =
    'bg-[linear-gradient(to_bottom,var(--bgPorcelain)_0,var(--bgPorcelain)_72%,var(--playerBand)_72%,var(--playerBand)_100%)]';

  return (
    <footer
      className={`relative z-50 flex h-[78px] items-center gap-4 border-t border-border-subtle px-5 select-none max-sm:hidden ${surface}`}
      role="region"
      aria-label="Player"
    >
      {/* Now playing: tile, titles, favourite and menu. */}
      <div className="flex w-[300px] min-w-0 flex-none items-center gap-3">
        <button
          onClick={() => hasTrack && setFullScreen(true)}
          disabled={!hasTrack}
          className="group relative size-12 flex-none overflow-hidden rounded-[14px] border border-border-subtle/60 bg-accent-soft disabled:cursor-default"
          title={hasTrack ? 'Open Full Screen Player' : 'Nothing playing'}
        >
          {hasTrack && nowPlaying?.artworkUrl ? (
            <img
              src={sizedArtwork(nowPlaying.artworkUrl, 48)}
              alt=""
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="grid size-full place-items-center text-accent-ink">
              <Music size={20} />
            </span>
          )}
          {hasTrack && (
            <span className="absolute inset-0 grid place-items-center bg-slate-navy/25 text-white opacity-0 transition-opacity group-hover:opacity-100">
              <Maximize2 size={15} />
            </span>
          )}
        </button>

        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[13px] font-bold text-primary" title={nowPlaying?.title}>
              {hasTrack ? nowPlaying?.title : 'Nothing playing'}
            </span>
            {hasTrack && hiRes && (
              <span className="flex-none rounded-[4px] bg-[var(--badgeHiRes)] px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-on-danger uppercase">
                HI-RES
              </span>
            )}
          </div>
          <span className="mt-0.5 flex min-w-0 items-center gap-1.5">
            <span
              className="truncate text-[11px] font-medium text-secondary"
              title={hasTrack ? nowPlaying?.artist : undefined}
            >
              {hasTrack
                ? `${nowPlaying?.artist}${track?.album?.name ? ` • ${track.album.name}` : ''}`
                : 'Pick a song to start listening'}
            </span>
            <StreamQuality className="flex-none rounded-[3px] border border-border-subtle bg-porcelain px-1 py-px text-[9px] font-bold tracking-wide text-secondary uppercase" />
          </span>
        </div>

        {hasTrack && (
          <div className="flex flex-none items-center gap-1">
            <FavoriteButton
              videoId={videoId}
              size={16}
              className="grid size-7 place-items-center rounded-full text-tertiary transition-colors hover:bg-chrome hover:text-primary"
              activeClassName="text-[var(--favoriteText)] hover:bg-[var(--favoriteBG)]"
            />
            {track ? (
              <TrackMenu
                track={track}
                placement="above-start"
                className="grid size-7 place-items-center rounded-full text-tertiary transition-colors hover:bg-chrome hover:text-primary"
              />
            ) : (
              <span className={`${util} opacity-40`} aria-hidden="true">
                <MoreHorizontal size={16} />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Transport and the seek line. */}
      <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleShuffle}
            disabled={!hasTrack}
            className={`grid size-8 place-items-center rounded-full transition-colors disabled:opacity-30 ${
              shuffle ? 'text-accent-ink' : 'text-tertiary hover:text-primary'
            }`}
            aria-label="Shuffle"
            aria-pressed={shuffle}
          >
            <ShuffleIcon size={16} />
          </button>

          <button
            onClick={previous}
            disabled={!hasTrack}
            className="grid size-8 place-items-center rounded-full text-primary transition-colors hover:bg-chrome disabled:opacity-30"
            aria-label="Previous track"
          >
            <BackwardIcon size={18} />
          </button>

          <button
            onClick={togglePlay}
            disabled={!hasTrack}
            className="grid size-9 place-items-center rounded-full bg-accent text-on-accent transition-colors hover:bg-accent-hover active:opacity-90 disabled:opacity-40"
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? <PauseIcon size={16} /> : <PlayIcon size={16} className="translate-x-px" />}
          </button>

          <button
            onClick={next}
            disabled={!hasTrack || !hasNext}
            className="grid size-8 place-items-center rounded-full text-primary transition-colors hover:bg-chrome disabled:opacity-30"
            aria-label="Next track"
          >
            <ForwardIcon size={18} />
          </button>

          <button
            onClick={cycleRepeat}
            disabled={!hasTrack}
            className={`grid size-8 place-items-center rounded-full transition-colors disabled:opacity-30 ${
              repeat !== 'off' ? 'text-accent-ink' : 'text-tertiary hover:text-primary'
            }`}
            aria-label="Repeat"
            aria-pressed={repeat !== 'off'}
          >
            {repeat === 'one' ? <RepeatOneIcon size={16} /> : <RepeatIcon size={16} />}
          </button>
        </div>

        <div className="flex w-full max-w-[600px] items-center gap-3">
          <span ref={elapsed} className={`${time} text-right`}>
            0:00
          </span>
          <div
            ref={bar}
            className="group relative h-4 flex-1 cursor-pointer select-none"
            {...(hasTrack ? handlers : {})}
          >
            <div className="absolute inset-x-0 top-1/2 h-[5px] -translate-y-1/2 overflow-hidden rounded-full bg-[var(--scrubberTrack)]">
              <div
                className="h-full rounded-full bg-[var(--scrubberFill)] transition-[width] duration-75"
                style={{ width: hasTrack ? 'calc(var(--progress, 0) * 100%)' : '0%' }}
              />
            </div>
            {hasTrack && (
              <div
                className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--scrubberThumb)] shadow-[0_0_0_2px_var(--bgPorcelain)] transition-transform group-hover:scale-110"
                style={{ left: 'calc(var(--progress, 0) * 100%)' }}
              />
            )}
          </div>
          <span ref={total} className={time}>
            0:00
          </span>
        </div>
      </div>

      {/* Lyrics, queue, level and full screen. */}
      <div className="flex w-[300px] flex-none items-center justify-end gap-1.5" onPointerLeave={() => setVolumeOpen(false)}>
        <button
          onClick={() => toggleSidePanel('lyrics')}
          aria-label="Toggle Lyrics"
          aria-pressed={sidePanel === 'lyrics'}
          className={`grid size-9 flex-none place-items-center rounded-full border transition-colors ${
            sidePanel === 'lyrics'
              ? 'border-accent/30 bg-accent-soft text-accent-ink'
              : 'border-border-subtle text-secondary hover:border-border-subtle hover:text-primary'
          }`}
          title="Toggle Synced Lyrics"
        >
          {sidePanel === 'lyrics' ? <LyricsActiveIcon size={16} /> : <LyricsIcon size={16} />}
        </button>

        <button
          onClick={() => toggleSidePanel('up-next')}
          aria-label="Play Queue"
          aria-pressed={sidePanel === 'up-next'}
          className={`${util} ${sidePanel === 'up-next' ? 'bg-accent-soft text-accent-ink' : ''}`}
          title="Play Queue"
        >
          <UpNextIcon size={17} />
        </button>

        <VolumeControl
          inline
          open={volumeOpen}
          onOpen={() => setVolumeOpen(true)}
          className="grid size-8 flex-none place-items-center rounded-full text-secondary transition-colors hover:text-primary"
          iconSize={17}
        />

        <button
          onClick={() => hasTrack && setFullScreen(true)}
          disabled={!hasTrack}
          className={`${util} disabled:opacity-30`}
          title="Full Screen Mode"
          aria-label="Full screen"
        >
          <Maximize2 size={16} />
        </button>
      </div>
    </footer>
  );
}
