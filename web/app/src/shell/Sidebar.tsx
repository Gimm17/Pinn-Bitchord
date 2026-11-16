import { ArrowUpRight, Compass, Disc3, Flame, ListMusic, Music2, Plus, Radio, Settings, Sparkles } from 'lucide-react';
import { MdOutlineExtension } from 'react-icons/md';
import { PrefetchLink, PrefetchNavLink } from '@/components/PrefetchLink';
import { LogoMark } from '@/components/icons/LogoMark';
import {
  AlbumsIcon,
  AllPlaylistsIcon,
  ArtistsIcon,
  HomeIcon,
  MadeForYouIcon,
  NewIcon,
  RecentlyAddedIcon,
  SearchIcon,
  SongsIcon,
  type NavIconProps,
} from '@/components/icons/NavIcons';
import { hrefFor } from '@/components/music/links';
import { config } from '@/config';
import { LIBRARY_SECTIONS, type LibrarySection } from '@/data/music/library';
import { useLocalPlaylists } from '@/data/music/localPlaylists';
import { useLibraryPlaylists, useSignedIn } from '@/data/music/queries';
import { useSpotifyPlaylists } from '@/data/spotify/queries';
import { useExtension } from '@/extension/useExtension';
import { useExtensionUpdate } from '@/extension/useExtensionUpdate';
import { useSpotifySignedIn } from '@/extension/useSpotifyAuth';
import { useSpotifyImportModal } from '@/components/music/SpotifyImportModal';
import { useUi } from '@/state/ui';
import { AccountButton } from './AccountButton';

interface NavItem {
  to: string;
  label: string;
  Icon: (props: NavIconProps) => React.ReactNode;
}

const PRIMARY: NavItem[] = [
  { to: '/home', label: 'Home', Icon: HomeIcon },
  { to: '/new', label: 'Explore / New', Icon: NewIcon },
  { to: '/browse', label: 'Moods & Moments', Icon: (props) => <Sparkles size={18} {...props} /> },
];

const LIBRARY_ICONS: Record<Exclude<LibrarySection, 'playlists'>, NavItem['Icon']> = {
  recent: RecentlyAddedIcon,
  artists: ArtistsIcon,
  albums: AlbumsIcon,
  songs: SongsIcon,
  'made-for-you': MadeForYouIcon,
};

const LIBRARY: NavItem[] = (Object.keys(LIBRARY_ICONS) as (keyof typeof LIBRARY_ICONS)[]).map((section) => ({
  to: `/library/${section}`,
  label: LIBRARY_SECTIONS[section].title,
  Icon: LIBRARY_ICONS[section],
}));

/*
 * Measured from the reference (Design_UI_UX/EXPORT_PNG, "Light Ceramic &
 * Frosted Sage"): 37px pill, 226px wide inside a 256px rail, 13px medium
 * labels, and only the icon and label of the active item go white.
 */
const item =
  'group mb-0.5 flex h-[37px] items-center gap-2.5 rounded-full px-3.5 text-[13px] font-medium text-primary transition-colors hover:bg-quaternary aria-[current=page]:bg-accent aria-[current=page]:text-on-accent aria-[current=page]:font-semibold [@media(max-height:860px)]:h-[32px]';
const icon =
  'inline-grid size-5 flex-none place-items-center text-secondary transition-colors group-hover:text-primary group-aria-[current=page]:text-on-accent';
const navLabel = 'min-w-0 truncate';
/* "DISCOVER", "LIBRARY": the artboards set these in #536B82, one step darker
   than the tertiary ink used for metadata. Shorter windows tighten the gaps so
   the whole rail fits without a scrollbar (it has none to show). */
const sectionHeader =
  'mt-5 mb-1.5 px-3.5 text-[10px] font-bold tracking-[0.12em] uppercase text-label [@media(max-height:860px)]:mt-2.5 [@media(max-height:860px)]:mb-1';
const list = 'flex flex-col';

function NavList({ items, onNavigate }: { items: NavItem[]; onNavigate: () => void }) {
  return (
    <ul className={list}>
      {items.map(({ to, label, Icon }) => (
        <li key={to}>
          <PrefetchNavLink to={to} className={item} onClick={onNavigate}>
            <Icon size={18} className={icon} />
            <span className={navLabel}>{label}</span>
          </PrefetchNavLink>
        </li>
      ))}
    </ul>
  );
}

/** Library and Playlists, including local / imported Spotify playlists. */
function LibraryNav({ onNavigate }: { onNavigate: () => void }) {
  const playlists = useLibraryPlaylists();
  const localPlaylists = useLocalPlaylists((s) => s.list);

  return (
    <>
      <div className="mt-5 mb-1.5 flex items-center justify-between pr-2 pl-3.5 [@media(max-height:860px)]:mt-2.5 [@media(max-height:860px)]:mb-1">
        <h2 className="text-[10px] font-bold tracking-[0.12em] uppercase text-label">Library</h2>
        <button
          type="button"
          onClick={() => useSpotifyImportModal.getState().open()}
          className="grid size-5 place-items-center rounded-full text-tertiary transition-colors hover:bg-porcelain hover:text-primary"
          title="Import or create"
          aria-label="Import or create a playlist"
        >
          <Plus size={14} strokeWidth={2.4} />
        </button>
      </div>
      <NavList items={LIBRARY} onNavigate={onNavigate} />
      <ul className={list}>
        <li>
          <button
            type="button"
            onClick={() => {
              onNavigate();
              useSpotifyImportModal.getState().open();
            }}
            className={`${item} w-full text-left cursor-pointer`}
          >
            <span className={icon}>
              <Disc3 size={17} strokeWidth={2.2} className="text-[#1DB954] group-aria-[current=page]:text-on-accent" />
            </span>
            <span className={navLabel}>Import Spotify</span>
          </button>
        </li>
      </ul>

      <h2 className={sectionHeader}>Playlists</h2>
      <ul className={list}>
        <li>
          <PrefetchNavLink to="/library/playlists" className={item} onClick={onNavigate}>
            <AllPlaylistsIcon size={18} className={icon} />
            <span className={navLabel}>{LIBRARY_SECTIONS.playlists.title}</span>
          </PrefetchNavLink>
        </li>

        {/* Local / Imported playlists */}
        {localPlaylists.map((pl) => (
          <li key={pl.id}>
            <PrefetchNavLink to={`/playlist/${encodeURIComponent(pl.id)}`} className={item} onClick={onNavigate}>
              <span className={icon}>
                <ListMusic size={16} strokeWidth={1.8} className={pl.source === 'spotify' ? 'text-[#1DB954] group-aria-[current=page]:text-on-accent' : undefined} />
              </span>
              <span className={navLabel}>{pl.title}</span>
            </PrefetchNavLink>
          </li>
        ))}

        {/* Remote YouTube Music playlists */}
        {playlists.data?.map((playlist) => (
          <li key={playlist.id}>
            <PrefetchNavLink to={hrefFor(playlist) ?? '/library/playlists'} className={item} onClick={onNavigate}>
              <span className={icon}>
                <ListMusic size={16} strokeWidth={1.8} />
              </span>
              <span className={navLabel}>{playlist.title}</span>
            </PrefetchNavLink>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Spotify playlists navigation, or link to Spotify importer. */
function SpotifyNav({ onNavigate }: { onNavigate: () => void }) {
  const playlists = useSpotifyPlaylists();
  const spotifySignedIn = useSpotifySignedIn();

  return (
    <>
      <h2 className={sectionHeader}>Spotify</h2>
      <ul className={list}>
        <li>
          <PrefetchNavLink to="/spotify" end className={item} onClick={onNavigate}>
            <AllPlaylistsIcon size={18} className={icon} />
            <span className={navLabel}>Spotify Importer</span>
          </PrefetchNavLink>
        </li>
        {spotifySignedIn &&
          playlists.data?.map((playlist) => (
            <li key={playlist.id}>
              <PrefetchNavLink to={`/spotify/playlist/${encodeURIComponent(playlist.id)}`} className={item} onClick={onNavigate}>
                <span className={icon}>
                  <ListMusic size={16} strokeWidth={1.8} />
                </span>
                <span className={navLabel}>{playlist.name}</span>
              </PrefetchNavLink>
            </li>
          ))}
      </ul>
    </>
  );
}

/** The Left Sidebar - Light Ceramic & Frosted Sage Edition */
export function Sidebar() {
  const drawerOpen = useUi((s) => s.drawerOpen);
  const setDrawerOpen = useUi((s) => s.setDrawerOpen);
  const close = () => setDrawerOpen(false);

  return (
    <>
      {/* Below 484px the sidebar is a drawer opened from the top bar's menu button. */}
      <nav
        className="absolute inset-y-0 left-0 z-(--z-web-chrome) flex w-(--web-navigation-width) flex-col border-r border-border-subtle bg-chrome/95 backdrop-blur-md max-sm:w-[min(300px,82vw)] max-sm:-translate-x-full max-sm:shadow-glass max-sm:transition-transform max-sm:duration-(--duration-panel) max-sm:ease-panel max-sm:data-[open=true]:translate-none"
        data-open={drawerOpen}
        aria-label="Main"
      >
        {/* Brand Header */}
        <div className="flex h-14 items-center justify-between px-5 pt-1 [@media(max-height:860px)]:h-12">
          <PrefetchLink to="/home" className="inline-flex items-center gap-2" aria-label="BitChord, Home" onClick={close}>
            <LogoMark size={22} className="text-accent-ink" />
            <span className="text-[17px] font-extrabold tracking-tight text-primary">BitChord</span>
            <span className="rounded-full border border-border-subtle bg-porcelain/60 px-2 py-0.5 text-[9px] font-bold tracking-wider text-secondary">
              PRO
            </span>
          </PrefetchLink>
        </div>

        {/* Scrollable Navigation: a fallback for long library lists, not for the
            default rail — at every height the built-in sections fit. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 [scrollbar-width:none]">
          <div className="mt-2">
            <span className={sectionHeader}>Discover</span>
            <NavList items={PRIMARY} onNavigate={close} />
          </div>
          <LibraryNav onNavigate={close} />
          <SpotifyNav onNavigate={close} />
        </div>

        {/* Footer: the running version's health, then whoever is signed in. */}
        <div className="flex flex-col gap-2 px-3 pb-3 [@media(max-height:860px)]:gap-1.5 [@media(max-height:860px)]:pb-2">
          <StatusPill />
          <AccountButton />
        </div>
      </nav>
      {drawerOpen && <div className="absolute inset-0 z-[calc(var(--z-web-chrome)-1)] hidden bg-scrim max-sm:block" onClick={close} aria-hidden="true" />}
    </>
  );
}

/**
 * "BitChord v1.9.0 · Ready": the version comes from the Tauri config at build
 * time, the state from the bridge ping the extension query already made.
 */
function StatusPill() {
  const extension = useExtension();
  const update = useExtensionUpdate();

  const state =
    extension.state === 'checking'
      ? { label: 'Checking', tone: 'text-tertiary', dot: 'bg-tertiary' }
      : extension.state === 'missing'
        ? { label: 'Offline', tone: 'text-danger', dot: 'bg-danger' }
        : update.state === 'available'
          ? { label: 'Update', tone: 'text-warning', dot: 'bg-warning' }
          : { label: 'Ready', tone: 'text-accent-ink', dot: 'bg-success' };

  return (
    <div className="flex items-center gap-2 rounded-full border border-border-subtle bg-porcelain/70 px-3 py-1.5">
      <span className={`size-[7px] flex-none rounded-full ${state.dot}`} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-primary">
        BitChord v{__APP_VERSION__}
      </span>
      <span className={`flex-none text-[11px] font-bold ${state.tone}`}>{state.label}</span>
    </div>
  );
}
