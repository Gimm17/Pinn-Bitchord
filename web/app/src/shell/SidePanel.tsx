import { lazy, Suspense } from 'react';
import { X, Mic2, ListMusic } from 'lucide-react';
import { useUi } from '@/state/ui';
import { usePlayer } from '@/state/player';
import { UpNext } from './UpNext';

const LyricsPanel = lazy(() => import('./LyricsPanel').then((m) => ({ default: m.LyricsPanel })));

/**
 * Slide-in Side Panel for Live Synced Lyrics & Play Queue
 * Elegant, collapsible, and driven 100% by live playback data.
 */
export function SidePanel() {
  const panel = useUi((s) => s.sidePanel);
  const toggleSidePanel = useUi((s) => s.toggleSidePanel);
  const closeSidePanel = useUi((s) => s.closeSidePanel);
  const fullScreen = useUi((s) => s.fullScreen);
  const nowPlaying = usePlayer((s) => s.nowPlaying);

  if (!panel || fullScreen) return null;

  return (
    <aside
      /* Light Porcelain Ceramic material, giving high-contrast clarity to the
         lyrics text (#132230 and #536B82) with subtle frosted backdrop blur. */
      className="absolute top-0 right-0 bottom-0 z-40 flex w-[380px] max-w-full flex-col border-l border-border-subtle bg-[#FAF8F5]/98 backdrop-blur-xl shadow-[-10px_0_30px_rgba(19,34,48,0.06)] animate-in slide-in-from-right duration-300 max-sm:w-full select-none"
      aria-label={panel === 'up-next' ? 'Up Next' : 'Lyrics'}
    >
      {/* Top Header Bar */}
      <div className="flex h-14 flex-none items-center justify-between border-b border-border-subtle/60 px-5 pt-1">
        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-1.5 rounded-full border border-border-subtle bg-chrome p-1">
          <button
            type="button"
            onClick={() => toggleSidePanel('lyrics')}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold transition-all cursor-pointer ${
              panel === 'lyrics'
                ? 'bg-accent text-on-accent shadow-2xs'
                : 'text-secondary hover:text-primary'
            }`}
          >
            <Mic2 size={13} />
            <span>Lyrics</span>
          </button>
          <button
            type="button"
            onClick={() => toggleSidePanel('up-next')}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold transition-all cursor-pointer ${
              panel === 'up-next'
                ? 'bg-accent text-on-accent shadow-2xs'
                : 'text-secondary hover:text-primary'
            }`}
          >
            <ListMusic size={13} />
            <span>Queue</span>
          </button>
        </div>

        {/* Close Button */}
        <button
          onClick={closeSidePanel}
          className="size-8 rounded-full border border-border-subtle bg-porcelain text-secondary hover:text-primary hover:bg-chrome flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
          title="Close panel"
          aria-label="Close"
        >
          <X size={15} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="relative min-h-0 flex-1 overflow-y-auto">
        {panel === 'up-next' ? (
          <UpNext />
        ) : (
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-xs text-ink-muted">
                Loading lyrics engine…
              </div>
            }
          >
            {nowPlaying ? (
              <LyricsPanel />
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center text-ink-muted">
                <div className="size-16 rounded-full bg-chrome flex items-center justify-center text-accent-ink mb-4">
                  <Mic2 size={26} />
                </div>
                <h4 className="text-sm font-bold text-primary">No Track Playing</h4>
                <p className="mt-1.5 text-xs text-ink-muted max-w-xs leading-relaxed">
                  Select a song or album from your library or discovery to enjoy real-time synced lyrics.
                </p>
              </div>
            )}
          </Suspense>
        )}
      </div>
    </aside>
  );
}
