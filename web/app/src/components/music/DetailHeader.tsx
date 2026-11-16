import { Check, Plus, Radio, Shuffle } from 'lucide-react';
import { useState } from 'react';
import { PrefetchLink } from '@/components/PrefetchLink';
import { PlayIcon } from '@/components/icons/Transport';
import { useSetListSaved, useSignedIn } from '@/data/music/queries';
import type { AppleMotion } from '@/data/apple/motionArt';
import type { HeaderInfo } from '@/data/music/types';
import { Artwork } from './Artwork';
import { ExplicitBadge } from './ExplicitBadge';
import { MotionArtwork } from './MotionArtwork';
import { artistHref } from './links';

interface DetailHeaderProps {
  info: HeaderInfo;
  onPlay: () => void;
  onShuffle: () => void;
  onRadio?: () => void;
  canPlay: boolean;
  extra?: React.ReactNode;
  motion?: AppleMotion | null;
}

export const detailButton = {
  pill: 'inline-flex h-9 min-w-[120px] items-center justify-center gap-2 rounded-full bg-key px-5 text-xs font-bold text-on-accent shadow-[0_4px_12px_rgba(19,34,48,0.15)] transition-all hover:bg-key-rollover hover:scale-102 active:scale-98 cursor-pointer disabled:opacity-40',
  circle:
    'grid size-9 place-items-center rounded-full border border-border-subtle bg-porcelain text-primary shadow-2xs transition-all hover:border-accent hover:bg-accent-soft hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-40',
};

export function DetailHeader({ info, onPlay, onShuffle, onRadio, canPlay, extra, motion }: DetailHeaderProps) {
  const [expanded, setExpanded] = useState(false);
  const signedIn = useSignedIn();
  const setSaved = useSetListSaved();
  const library = signedIn ? info.library : null;

  return (
    <div className="mx-(--body-gutter) mb-6 flex items-start gap-8 pt-8 max-md:flex-col max-md:items-center max-md:text-center">
      {/* Cover Artwork with Soft Drop Shadow */}
      <div className="relative size-[220px] shrink-0 overflow-hidden rounded-2xl border border-border-subtle bg-porcelain shadow-md max-lg:size-[180px] max-md:size-[200px]">
        {info.thumbnail && (
          <div className="absolute inset-0 -z-1 scale-90 opacity-20 blur-xl saturate-150" aria-hidden="true">
            <Artwork src={info.thumbnail} displayWidth={80} radius="16px" />
          </div>
        )}
        <Artwork src={info.thumbnail} displayWidth={220} radius="16px" eager />
        {motion && (
          <MotionArtwork
            key={motion.url}
            motion={motion}
            className="absolute inset-0 size-full rounded-2xl object-cover opacity-0 transition-opacity duration-600 ease-in data-ready:opacity-100"
          />
        )}
      </div>

      {/* Header Info */}
      <div className="flex flex-1 flex-col justify-end pt-2 min-w-0">
        <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-primary flex items-center gap-2 max-md:justify-center">
          {info.title}
          {info.explicit && <ExplicitBadge size={16} />}
        </h1>

        {info.artists.length > 0 && (
          <div className="mt-1 text-base font-semibold text-accent-ink">
            {info.artists.map((artist, i) => {
              const href = artistHref(artist.id);
              return (
                <span key={`${artist.name}-${i}`}>
                  {i > 0 && ', '}
                  {href ? (
                    <PrefetchLink to={href} className="hover:underline">
                      {artist.name}
                    </PrefetchLink>
                  ) : (
                    artist.name
                  )}
                </span>
              );
            })}
          </div>
        )}

        <div className="mt-1.5 text-[13px] text-secondary font-medium">
          {[info.subtitle, info.meta].filter(Boolean).join(' • ')}
        </div>

        {info.description && (
          <div className="mt-3 max-w-[500px] text-xs text-secondary line-clamp-2">
            <p className={expanded ? 'min-w-0' : 'min-w-0 line-clamp-2'}>{info.description}</p>
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="mt-5 flex items-center gap-3 max-md:justify-center">
          <button className={detailButton.circle} aria-label="Shuffle" onClick={onShuffle} disabled={!canPlay} title="Shuffle">
            <Shuffle size={16} strokeWidth={2.2} />
          </button>

          <button className={detailButton.pill} onClick={onPlay} disabled={!canPlay}>
            <PlayIcon size={16} className="text-on-accent fill-on-accent" />
            <span>Play</span>
          </button>

          {onRadio && (
            <button className={detailButton.circle} aria-label="Start Radio" onClick={onRadio} disabled={!canPlay} title="Start Radio">
              <Radio size={16} strokeWidth={2.2} />
            </button>
          )}

          {library && (
            <button
              className={detailButton.circle}
              aria-label={library.saved ? 'Remove from Library' : 'Add to Library'}
              aria-pressed={library.saved}
              title={library.saved ? 'In your library' : 'Add to Library'}
              disabled={setSaved.isPending}
              onClick={() => setSaved.mutate({ playlistId: library.playlistId, saved: !library.saved })}
            >
              {library.saved ? <Check size={16} strokeWidth={2.4} /> : <Plus size={16} strokeWidth={2.4} />}
            </button>
          )}

          {extra}
        </div>
      </div>
    </div>
  );
}
