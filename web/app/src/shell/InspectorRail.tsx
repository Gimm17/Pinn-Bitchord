import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Disc3 } from 'lucide-react';
import { Artwork } from '@/components/music/Artwork';
import { ExplicitBadge } from '@/components/music/ExplicitBadge';
import { formatDuration } from '@/components/music/links';
import { usePlayer } from '@/state/player';
import { isHiRes } from './PlayerBar';

const UP_NEXT_ROWS = 4;

/**
 * The reference gives Home, Moods and the Library the same right-hand column,
 * in Frosted Sage (`--bgSage`): x 1117-1308 of its 1355-wide artboards, taller
 * than wide, and the only place the sage family appears.
 *
 * There it holds live synced lyrics. Mounting the lyrics engine here would cost
 * a second engine alongside the drawer's, for a panel that is only glanceable
 * at this width, so it carries what the player can prove about itself instead:
 * what is playing, at what quality, and what comes next. Every row is a real
 * queue entry and jumps to it; nothing is invented.
 */
export function InspectorRail() {
  const navigate = useNavigate();
  const nowPlaying = usePlayer((s) => s.nowPlaying);
  const queue = usePlayer((s) => s.queue);
  const index = usePlayer((s) => s.index);
  const jumpTo = usePlayer((s) => s.jumpTo);

  const playing = nowPlaying !== null;
  const hiRes = playing && isHiRes(nowPlaying.stream);
  const upNext = index >= 0 ? queue.slice(index + 1, index + 1 + UP_NEXT_ROWS) : [];

  return (
    <aside className="hidden min-h-[calc(100vh-9rem)] rounded-[16px] bg-sage xl:block" aria-label="Now playing">
      <div className="sticky top-4 flex flex-col gap-6 p-5">
        <p className="flex items-center gap-2 text-[10px] font-bold tracking-[0.16em] text-secondary uppercase">
          <span
            className={`size-1.5 flex-none rounded-full ${playing ? 'bg-success' : 'bg-tertiary'}`}
            aria-hidden="true"
          />
          {playing ? 'Now playing' : 'Nothing playing'}
        </p>

        {playing ? (
          <div className="flex flex-col gap-3">
            <Artwork src={nowPlaying.artworkUrl} displayWidth={370} radius="12px" className="w-full" />
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-[15px] font-bold text-primary" title={nowPlaying.title}>
                  {nowPlaying.title}
                </span>
                {hiRes && (
                  <span className="flex-none rounded-[4px] bg-[var(--badgeHiRes)] px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-on-danger uppercase">
                    HI-RES
                  </span>
                )}
              </div>
              <span className="mt-0.5 block truncate text-[12px] font-medium text-secondary" title={nowPlaying.artist}>
                {nowPlaying.artist}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3">
            <span className="grid size-12 place-items-center rounded-full bg-chrome text-accent-ink">
              <Disc3 size={20} />
            </span>
            <p className="text-[12px] leading-relaxed text-secondary">
              Play something and this panel follows what the player is delivering, with the queue behind it.
            </p>
            <button
              type="button"
              onClick={() => navigate('/library/recent')}
              className="h-8 rounded-full bg-accent px-3.5 text-[12px] font-semibold text-on-accent transition-colors hover:bg-accent-hover"
            >
              Recently played
            </button>
          </div>
        )}

        {upNext.length > 0 && (
          <div className="flex flex-col gap-1">
            <h2 className="mb-1 text-[10px] font-bold tracking-[0.16em] text-secondary uppercase">Up next</h2>
            <ul className="flex flex-col">
              {upNext.map((entry, offset) => {
                const at = index + 1 + offset;
                const { track } = entry;
                return (
                  <li key={entry.entryId}>
                    <button
                      type="button"
                      onClick={() => jumpTo(at)}
                      className="flex w-full items-center gap-2.5 rounded-[8px] px-1.5 py-1.5 text-left transition-colors hover:bg-porcelain/60"
                    >
                      <span className="size-8 flex-none">
                        <Artwork src={track.thumbnail} displayWidth={32} radius="6px" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-1">
                          <span className="truncate text-[12px] font-semibold text-primary">{track.title}</span>
                          {track.explicit && <ExplicitBadge />}
                        </span>
                        <span className="block truncate text-[11px] text-secondary">
                          {track.artists.map((a) => a.name).join(', ')}
                        </span>
                      </span>
                      <span className="flex-none text-[10px] font-medium text-ink-muted">
                        {formatDuration(track.durationSec)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
}

/**
 * A page beside the inspector. Column widths are the reference's inspector
 * share of the canvas (it takes ~24% beside a 240px rail), floored so the
 * column never crowds the content at 1280.
 */
export function InspectorFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="mx-(--body-gutter) grid pb-20 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-8 2xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className={`flex min-w-0 flex-col ${className ?? ''}`}>{children}</div>
      <InspectorRail />
    </div>
  );
}
