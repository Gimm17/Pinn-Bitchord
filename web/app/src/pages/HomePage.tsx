import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Disc3, Play } from 'lucide-react';
import { Shelves, ShelfScroller } from '@/components/music/ShelfView';
import { LoadError, LoadMoreError, NeedsExtension } from '@/components/music/States';
import { browseQuery, useCategories, useHome, useLibrary, useYouTubeReady } from '@/data/music/queries';
import { usePlayer } from '@/state/player';
import type { Category, MusicItem, Track } from '@/data/music/types';
import { HomeSkeleton } from '@/skeletons/PageSkeletons';
import { ShelfSkeleton } from '@/skeletons/ShelfSkeleton';
import { playList, playTrack } from '@/components/music/play';
import { PrefetchLink } from '@/components/PrefetchLink';
import { browseHref } from '@/components/music/links';
import { Artwork } from '@/components/music/Artwork';
import { ExplicitBadge } from '@/components/music/ExplicitBadge';
import { moodGradient, moodTint } from '@/lib/moodTint';
import { useDarkScheme } from '@/lib/useColorScheme';
import { InspectorFrame } from '@/shell/InspectorRail';
import { isHiRes } from '@/shell/PlayerBar';

const RECENT_LIMIT = 20;

/** The reference's Quick picks grid is two rows of three. */
const QUICK_PICK_SLOTS = 6;

function useRecentlyPlayed(): Track[] {
  const history = useLibrary('recent');
  const first = history.data?.pages[0]?.data.tracks ?? [];
  const seen = new Set<string>();
  return first.filter((t) => !seen.has(t.videoId) && seen.add(t.videoId)).slice(0, RECENT_LIMIT);
}

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** A shelf item as a queue track, for the Quick picks row. */
function asTrack(item: MusicItem): Track {
  return {
    videoId: item.id,
    title: item.title,
    artists: item.artists,
    album: item.album,
    durationSec: item.durationSec,
    explicit: item.explicit,
    thumbnail: item.thumbnail,
    index: null,
    plays: null,
  };
}

/**
 * A mood tile, drawn the way the reference frames it: a borderless card whose
 * fill runs pale-to-deeper across the tile, the mood's own name as a small
 * saturated label at the top, and a larger name at the foot.
 *
 * YouTube sends one stripe colour per mood and no other field, so `moodTint`
 * keeps the hue and re-lights it at the tile family's own lightness and chroma
 * (lib/moodTint.ts). The foot line is the first titled shelf on the page the
 * tile opens — the reference's "featured playlist" — borrowed from that page
 * and cached by react-query, which the tile navigates to anyway.
 */
function MoodTile({ mood }: { mood: Category }) {
  const navigate = useNavigate();
  const { ready } = useYouTubeReady();
  const dark = useDarkScheme();
  const browse = useQuery({ ...browseQuery(mood.link), enabled: ready });
  const tint = moodTint(mood.color);
  const feature = browse.data?.shelves.find((shelf) => shelf.title.trim())?.title ?? null;

  return (
    <button
      type="button"
      onClick={() => navigate(browseHref(mood.link))}
      className="flex h-[104px] w-full flex-col justify-between rounded-[10px] px-4 py-3 text-left transition-transform hover:-translate-y-0.5"
      style={{ backgroundImage: moodGradient(tint, dark) }}
    >
      <span
        className="w-full truncate text-[11px] font-bold tracking-[0.02em]"
        style={{ color: dark ? tint.inkDark : tint.inkLight }}
      >
        {mood.title}
      </span>
      {feature && (
        <span className="line-clamp-2 w-full text-[19px] leading-[1.15] font-extrabold tracking-[-0.01em] text-primary">
          {feature}
        </span>
      )}
    </button>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { missing } = useYouTubeReady();
  const home = useHome();
  const recent = useRecentlyPlayed();
  const categories = useCategories();
  const sentinel = useRef<HTMLDivElement>(null);
  const nowPlaying = usePlayer((s) => s.nowPlaying);
  const dark = useDarkScheme();

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !home.hasNextPage || home.isFetchNextPageError) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !home.isFetchingNextPage) void home.fetchNextPage();
      },
      { root: document.getElementById('scrollable-page'), rootMargin: '600px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [home.hasNextPage, home.isFetchingNextPage, home.isFetchNextPageError, home.fetchNextPage]);

  if (missing) {
    return (
      <div className="mx-(--body-gutter) py-10">
        <NeedsExtension />
      </div>
    );
  }

  if (home.isError && !home.data) {
    return (
      <div className="mx-(--body-gutter) py-10">
        <LoadError error={home.error} onRetry={() => void home.refetch()} />
      </div>
    );
  }

  if (!home.data) return <HomeSkeleton />;

  const shelves = home.data.pages.flatMap((page) => page.data);

  /*
   * Quick picks is YouTube Music's own first shelf (it titles one exactly
   * that). Any empty slots come from the listen history, most recent first.
   * If the account has neither, the row is not drawn: an earlier build
   * invented six tracks with fake artwork URLs here.
   */
  const quickShelf = shelves.find((s) => /quick picks/i.test(s.title));
  const quickPicks: MusicItem[] = (quickShelf?.items ?? [])
    .filter((item) => item.kind === 'song' || item.kind === 'video')
    .slice(0, QUICK_PICK_SLOTS);
  for (const track of recent) {
    if (quickPicks.length >= QUICK_PICK_SLOTS) break;
    if (quickPicks.some((item) => item.id === track.videoId)) continue;
    quickPicks.push({
      kind: 'song',
      id: track.videoId,
      title: track.title,
      subtitle: track.album?.name ?? track.artists.map((a) => a.name).join(', '),
      artists: track.artists,
      album: track.album,
      thumbnail: track.thumbnail,
      wide: false,
      durationSec: track.durationSec,
      explicit: track.explicit,
    });
  }

  // Everything else the feed gave, in its own shelf layouts.
  const feedShelves = shelves.filter((shelf) => shelf !== quickShelf);

  // Moods & genres, from YouTube's own grid — including the colours it uses.
  const moodGroups = categories.data ?? [];
  const moods: Category[] = moodGroups.find((g) => /mood/i.test(g.title))?.categories.slice(0, 4) ?? [];
  const genres: Category[] = moodGroups.find((g) => /genre/i.test(g.title))?.categories.slice(0, 10) ?? [];

  const playQuickPick = (item: MusicItem, index: number) => {
    const source = { title: 'Quick picks', type: 'other' as const };
    playList(quickPicks.map(asTrack), index, { source });
  };

  return (
    <InspectorFrame>
      {/* Greeting, title and the filter row share one band, as in the reference. */}
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 pt-7">
        <div className="min-w-0">
          <p className="text-[11px] font-bold tracking-[0.14em] text-sky-ink uppercase">
            {greetingFor(new Date().getHours())}
          </p>
          <h1 className="mt-1 text-[34px] leading-[1.1] font-extrabold tracking-[-0.02em] text-primary">
            Explore &amp; Listen
          </h1>
        </div>
        <nav className="flex flex-wrap items-center gap-2" aria-label="Home filters">
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="h-[34px] rounded-full bg-accent px-4 text-[12px] font-semibold text-on-accent transition-colors hover:bg-accent-hover"
          >
            All Content
          </button>
          <button
            type="button"
            onClick={() => navigate('/new')}
            className="h-[34px] rounded-full border border-border-subtle bg-porcelain px-4 text-[12px] font-semibold text-primary transition-colors hover:border-accent/40"
          >
            Music
          </button>
          <button
            type="button"
            onClick={() => navigate('/browse')}
            className="h-[34px] rounded-full border border-border-subtle bg-porcelain px-4 text-[12px] font-semibold text-primary transition-colors hover:border-accent/40"
          >
            Moods &amp; Genres
          </button>
          <button
            type="button"
            onClick={() => navigate('/library/playlists')}
            className="h-[34px] rounded-full border border-border-subtle bg-porcelain px-4 text-[12px] font-semibold text-primary transition-colors hover:border-accent/40"
          >
            Lossless Masters
          </button>
        </nav>
      </header>

      {quickPicks.length > 0 && (
        <section className="mt-8" aria-label="Quick picks">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[17px] font-bold text-primary">
              Quick picks
              <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
            </h2>
            <PrefetchLink to="/library/recent" className="text-[12px] font-semibold text-accent-ink hover:underline">
              See all
            </PrefetchLink>
          </div>

          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {quickPicks.map((item, index) => {
              const playing = nowPlaying?.videoId === item.id;
              const hiRes = playing && isHiRes(nowPlaying.stream);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => playQuickPick(item, index)}
                    aria-current={playing ? 'true' : undefined}
                    className={`group relative flex h-[60px] w-full items-center gap-3 rounded-2xl border bg-porcelain p-2 pr-3.5 text-left transition-colors ${
                      playing
                        ? 'border-accent shadow-[inset_0_0_0_1px_var(--accentSlate)]'
                        : 'border-border-subtle/70 hover:border-border-subtle hover:bg-surface-muted'
                    }`}
                  >
                    {/* The reference marks the playing card with a key-colour
                        corner dot as well as the border. */}
                    {playing && (
                      <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-accent" aria-hidden="true" />
                    )}
                    <span className="size-11 flex-none">
                      <Artwork src={item.thumbnail} displayWidth={44} radius="12px" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-[13px] font-bold text-primary">{item.title}</span>
                        {item.explicit && <ExplicitBadge />}
                        {hiRes && (
                          <span className="flex-none rounded-[3px] bg-[var(--badgeHiRes)] px-1 py-px text-[8px] font-bold tracking-wide text-on-danger uppercase">
                            HI-RES
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] font-medium text-secondary">
                        {item.artists.map((a) => a.name).join(', ') || item.subtitle}
                      </span>
                    </span>
                    <Play
                      size={14}
                      className={`flex-none fill-current text-primary transition-opacity ${
                        playing ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {moods.length > 0 && (
        <section className="mt-9" aria-label="Moods and moments">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[17px] font-bold text-primary">Moods &amp; moments</h2>
            <PrefetchLink to="/browse" className="text-[12px] font-semibold text-accent-ink hover:underline">
              See all
            </PrefetchLink>
          </div>
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {moods.map((mood) => (
              <li key={`${mood.title}-${mood.link.browseId}`}>
                <MoodTile mood={mood} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-9 flex flex-col gap-2">
        <Shelves shelves={feedShelves} />
      </div>

      {genres.length > 0 && (
        <section className="mt-9" aria-label="Genres">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[17px] font-bold text-primary">Genres &amp; regional origins</h2>
            <PrefetchLink to="/browse" className="text-[12px] font-semibold text-accent-ink hover:underline">
              Explore all
            </PrefetchLink>
          </div>
          <ShelfScroller kind="horizontal">
            {genres.map((genre) => (
              <li key={`${genre.title}-${genre.link.browseId}`}>
                {/* The reference's genre cards carry no colour at all: a white
                    card, the glyph in plain ink, the name under it. The stripe
                    colour YouTube sends is deliberately not painted here —
                    `Category.color` is still the data, there is simply nothing
                    in the card that a hue would be helping to say. */}
                <button
                  type="button"
                  onClick={() => navigate(browseHref(genre.link))}
                  className="flex h-[92px] w-full flex-col items-center justify-center gap-2 rounded-[10px] border border-border-subtle bg-porcelain px-3 text-center transition-colors hover:border-accent/40"
                >
                  <span className="grid size-7 place-items-center rounded-full text-secondary" aria-hidden="true">
                    <Disc3 size={15} />
                  </span>
                  <span className="w-full truncate text-[12px] font-semibold text-primary">{genre.title}</span>
                </button>
              </li>
            ))}
          </ShelfScroller>
        </section>
      )}

      <div ref={sentinel} />
      {home.isFetchingNextPage && <ShelfSkeleton kind="square" />}
      {home.isFetchNextPageError && <LoadMoreError onRetry={() => void home.fetchNextPage()} />}
    </InspectorFrame>
  );
}
