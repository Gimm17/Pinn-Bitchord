import { lazy, Suspense, useEffect } from 'react';
import { resumeSession } from '@/party/listenTogether';
import { startPartySync } from '@/party/partySync';
import { useDiscordPresence } from '@/playback/discordPresence';
import { startHistoryReporting } from '@/playback/historyReporting';
import { startLivePresence } from '@/playback/livePresence';
import { discordGatewayManager } from '@/playback/discordGateway';
import { Outlet } from 'react-router';
import { PrefetchLink } from '@/components/PrefetchLink';
import { config } from '@/config';
import { useExtension } from '@/extension/useExtension';
import { isMobileBrowser } from '@/lib/platform';
import { useUi } from '@/state/ui';
import { ToastContainer } from '@/components/Toast';
import { SpotifyImportModal } from '@/components/music/SpotifyImportModal';
import { FloatingNerdModal } from './NerdStats';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { Banner, bannerButtonClass } from './Banner';
import { DesktopHeader } from './DesktopHeader';
import { MobileTopBar } from './MobileTopBar';
import { PlayerBar } from './PlayerBar';
import { SidePanel } from './SidePanel';
import { Sidebar } from './Sidebar';

const mobile = isMobileBrowser();

const FullScreenPlayer = lazy(() => import('./FullScreenPlayer').then((m) => ({ default: m.FullScreenPlayer })));

/**
 * The app frame: Light Ceramic & Frosted Sage Edition
 * Spacious, organic, non-boxy architecture
 */
export function AppShell() {
  useKeyboardShortcuts();
  useDiscordPresence();
  useEffect(() => {
    discordGatewayManager.init();
  }, []);
  useEffect(() => {
    resumeSession();
    return startPartySync();
  }, []);
  useEffect(() => startHistoryReporting(), []);
  useEffect(() => startLivePresence(), []);

  const extension = useExtension();
  const bannerDismissed = useUi((s) => s.installBannerDismissed);
  const dismissBanner = useUi((s) => s.dismissInstallBanner);
  const fullScreen = useUi((s) => s.fullScreen);
  const sidePanelOpen = useUi((s) => s.sidePanel !== null);

  let banner = null;
  if (mobile) {
    banner = (
      <Banner
        title="BitChord is better in the app."
        detail="Phone browsers can’t run the BitChord extension. The Android app has everything."
        action={
          <a className={bannerButtonClass} href={config.androidAppUrl} target="_blank" rel="noreferrer">
            Get the App
          </a>
        }
      />
    );
  } else if (extension.state === 'missing' && !bannerDismissed) {
    banner = (
      <Banner
        title="Play YouTube Music with the BitChord extension."
        detail="Playback, YouTube Music sign-in, Spotify and Discord need the extension. Addons and lyrics work without it."
        action={
          <PrefetchLink className={bannerButtonClass} to="/extension">
            Get the Extension
          </PrefetchLink>
        }
        onDismiss={dismissBanner}
      />
    );
  }

  return (
    <div className="grid h-full grid-rows-[minmax(0,1fr)_auto] bg-page text-primary select-none overflow-hidden font-sans">
      <div className="relative min-h-0 overflow-hidden bg-page">
        <Sidebar />
        <MobileTopBar />

        {/* Desktop Top Header Frame */}
        <div className="absolute inset-x-0 top-0 left-(--web-navigation-width) z-[calc(var(--z-web-chrome)-2)] max-sm:hidden">
          <DesktopHeader />
        </div>

        {/* The page scrolls under the fixed sidebar and the top header. */}
        <main
          id="scrollable-page"
          className={`absolute inset-0 overflow-x-hidden overflow-y-auto pl-(--web-navigation-width) pt-12 [scrollbar-gutter:stable] bg-page transition-[padding] duration-300 ease-out max-sm:pt-(--mobile-top-bar-height) max-sm:pl-0 ${
            sidePanelOpen ? 'xl:pr-[380px]' : 'pr-0'
          }`}
        >
          <div className="min-h-full pb-16">
            <Outlet />
          </div>
        </main>

        {/* Dynamic Slide-in Side Panel for Lyrics & Queue */}
        <SidePanel />

        <ToastContainer />
        <SpotifyImportModal />
        <FloatingNerdModal />
      </div>
      {/* Its own grid row, not a fixed overlay: an overlay would sit under the
          sidebar (z-web-chrome) and lose the artwork and titles on the left. */}
      <PlayerBar />
      {banner}
      {fullScreen && (
        <Suspense fallback={null}>
          <FullScreenPlayer />
        </Suspense>
      )}
    </div>
  );
}
