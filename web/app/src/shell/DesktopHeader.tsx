import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useExtension } from '@/extension/useExtension';
import { usePlayer } from '@/state/player';

export function DesktopHeader() {
  const navigate = useNavigate();
  const extension = useExtension();
  const showNerdStats = usePlayer((s) => s.showNerdStats);
  const { setShowNerdStats } = usePlayer.getState();

  return (
    <header className="sticky top-0 z-[calc(var(--z-web-chrome)-3)] flex h-11 w-full items-center justify-between border-b border-border-subtle bg-chrome/95 px-6 backdrop-blur-md max-sm:hidden">
      {/* Navigation Arrows */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="grid size-7 place-items-center rounded-md text-secondary hover:bg-quaternary hover:text-primary transition-colors"
          title="Back"
          aria-label="Back"
        >
          <ChevronLeft size={18} strokeWidth={2.2} />
        </button>
        <button
          type="button"
          onClick={() => navigate(1)}
          className="grid size-7 place-items-center rounded-md text-secondary hover:bg-quaternary hover:text-primary transition-colors"
          title="Forward"
          aria-label="Forward"
        >
          <ChevronRight size={18} strokeWidth={2.2} />
        </button>
      </div>

      {/* Global Search Bar Pill */}
      <div className="flex max-w-[460px] flex-1 items-center px-4">
        <div
          role="search"
          onClick={() => {
            navigate('/search');
            setTimeout(() => {
              document.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
            }, 50);
          }}
          /* Recessed into the chrome, not lifted onto it: both artboards
             sample this pill at #F7F6F3-#FBFAF8, a step under the #FFFFFF
             cards, so it reads as a channel rather than another card. */
          className="flex h-8 w-full cursor-pointer items-center justify-between rounded-full border border-border-subtle bg-surface-muted px-3.5 shadow-2xs transition-all hover:border-accent/40 hover:shadow-sm"
        >
          <div className="flex items-center gap-2 text-xs text-tertiary">
            <Search size={14} strokeWidth={2} className="text-secondary" />
            <span className="truncate">Search songs, artists, high-res masters...</span>
          </div>
          <kbd className="rounded border border-border-subtle bg-chrome px-1.5 py-0.5 text-[10px] font-semibold text-label">
            Ctrl F
          </kbd>
        </div>
      </div>

      {/* What the player is delivering, measured from the loaded stream. */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setShowNerdStats(!showNerdStats)}
          className="flex h-7 items-center gap-2 rounded-full border border-border-subtle bg-porcelain px-3 text-[11px] font-semibold text-primary shadow-2xs transition-all hover:bg-chrome cursor-pointer"
          title="Click to view Audio Stream & DAC Nerd Specs"
        >
          <span
            className={`size-2 rounded-full ${extension.state === 'present' ? 'bg-success' : 'bg-tertiary'}`}
            aria-hidden="true"
          />
          <span>{extension.state === 'present' ? 'Extension Connected' : 'Extension Not Found'}</span>
          <StreamSpec />
        </button>
      </div>
    </header>
  );
}

/** Codec and rate of the stream that is actually playing, or nothing. */
function StreamSpec() {
  const stream = usePlayer((s) => s.nowPlaying?.stream ?? null);
  if (!stream) return null;
  const parts = [
    stream.codec?.toUpperCase(),
    stream.sampleRateHz ? `${Math.round(stream.sampleRateHz / 1000)} kHz` : null,
  ].filter(Boolean);
  if (!parts.length) return null;
  return (
    <>
      <span className="text-tertiary">•</span>
      <span className="font-mono text-[10px] font-bold text-secondary">{parts.join('/')}</span>
    </>
  );
}
