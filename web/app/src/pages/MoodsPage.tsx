import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Music2, Play, Search, Sparkles } from 'lucide-react';
import { PrefetchLink } from '@/components/PrefetchLink';
import { browseHref } from '@/components/music/links';
import { playTrack } from '@/components/music/play';
import { EmptyState, LoadError, NeedsExtension } from '@/components/music/States';
import { showToast } from '@/components/Toast';
import { searchSongs } from '@/data/music/api';
import { firstBrowseArtwork } from '@/data/music/mappers';
import { browseQuery, useCategories, useYouTubeReady } from '@/data/music/queries';
import type { BrowsePage, Category, CategoryGroup } from '@/data/music/types';
import { sizedArtwork } from '@/lib/artwork';
import { PlainSkeleton } from '@/skeletons/PageSkeletons';
import { InspectorFrame } from '@/shell/InspectorRail';

const kicker = 'text-[11px] font-bold tracking-[0.14em] text-sky-ink uppercase';
const heading = 'mt-1 text-[32px] leading-[1.1] font-extrabold tracking-[-0.02em] text-primary';

/** Everything a mood's browse page actually lists, row or single. */
function itemsOnPage(page: BrowsePage): number {
  return page.tracks.length + page.grid.length + page.shelves.reduce((sum, shelf) => sum + shelf.items.length, 0);
}

/**
 * Near the viewport, so a category's artwork is borrowed only when the card
 * is about to be seen — the same rule CategoryTiles uses.
 */
function useNearViewport<T extends HTMLElement>(rootMargin = '600px') {
  const ref = useRef<T | null>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    if (!('IntersectionObserver' in window)) {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near, rootMargin]);
  return { ref, near };
}

/**
 * A mood card, drawn the way the reference frames it: a white card, the
 * artwork inset, then the caption underneath — title on the left, the count
 * of what the page actually lists on the right.
 *
 * The moods page itself carries no covers, so the artwork is the first real
 * one from the page this card opens, borrowed only once the card is near the
 * viewport. The category's stripe colour sits behind it until it decodes.
 */
function MoodCard({ category }: { category: Category }) {
  const { ready } = useYouTubeReady();
  const { ref, near } = useNearViewport<HTMLLIElement>();
  const browse = useQuery({ ...browseQuery(category.link), enabled: ready && near });
  const artwork = browse.data ? firstBrowseArtwork(browse.data) : null;
  const src = artwork ? (artwork.wide ? artwork.thumbnail : sizedArtwork(artwork.thumbnail, 480)) : null;
  const tracks = browse.data ? itemsOnPage(browse.data) : 0;
  const [loaded, setLoaded] = useState(false);

  return (
    <li ref={ref}>
      <PrefetchLink
        to={browseHref(category.link)}
        className="group block rounded-2xl border border-border-subtle bg-porcelain p-2 transition-shadow hover:shadow-md"
      >
        <div
          className="relative aspect-4/3 w-full overflow-hidden rounded-xl"
          style={{ backgroundColor: category.color }}
        >
          {src && (
            <img
              src={src}
              alt=""
              referrerPolicy="no-referrer"
              loading="lazy"
              decoding="async"
              draggable={false}
              onLoad={() => setLoaded(true)}
              className="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-300 ease-in data-loaded:opacity-100 group-hover:scale-[1.02]"
              data-loaded={loaded || undefined}
              // Square covers in a 4:3 frame: lean the crop up so faces survive.
              style={{ objectPosition: '50% 28%' }}
            />
          )}
        </div>
        <div className="flex items-baseline justify-between gap-2 px-1.5 pt-2.5 pb-1">
          <span className="truncate text-[15px] font-extrabold tracking-[-0.01em] text-primary">
            {category.title}
          </span>
          {tracks > 0 && (
            <span className="flex-none text-[11px] font-semibold text-tertiary">{tracks} tracks</span>
          )}
        </div>
      </PrefetchLink>
    </li>
  );
}

/** A genre tile: the reference's icon block, backed by a real category. */
function GenreTile({ category }: { category: Category }) {
  return (
    <PrefetchLink
      to={browseHref(category.link)}
      className="flex flex-col items-center justify-center gap-1.5 rounded-[10px] border border-border-subtle bg-porcelain px-2 py-3 text-center transition-colors hover:border-accent hover:bg-surface-muted"
    >
      {/* Plain ink on porcelain, as the reference draws it. The category's
          stripe colour is not painted: a card this size has nothing a hue
          would be helping to say, and 27 different ones would not read as a
          set. */}
      <span className="grid size-8 place-items-center rounded-full text-secondary">
        <Music2 size={15} />
      </span>
      <span className="line-clamp-2 text-[11px] font-bold leading-tight text-primary">{category.title}</span>
    </PrefetchLink>
  );
}

export default function MoodsPage() {
  const navigate = useNavigate();
  const { missing } = useYouTubeReady();
  const categories = useCategories();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);

  const launch = async (q: string) => {
    setLaunching(true);
    showToast(`Tuning into “${q}”…`);
    try {
      const hits = await searchSongs(q);
      if (hits[0]) playTrack(hits[0]);
      else navigate(`/search?q=${encodeURIComponent(q)}`);
    } catch {
      navigate(`/search?q=${encodeURIComponent(q)}`);
    } finally {
      setLaunching(false);
    }
  };

  if (missing) return <NeedsExtension what="Moods & Genres" />;
  if (categories.isError && !categories.data) {
    return <LoadError error={categories.error} onRetry={() => void categories.refetch()} />;
  }
  if (!categories.data) return <PlainSkeleton />;

  const groups: CategoryGroup[] = categories.data.filter((g) => g.categories.length > 0);
  const total = groups.reduce((sum, g) => sum + g.categories.length, 0);
  if (!total) {
    return (
      <div className="mx-(--body-gutter) pb-20">
        <header className="pt-7">
          <p className={kicker}>Curated catalog</p>
          <h1 className={heading}>Moods &amp; Moments</h1>
        </header>
        <EmptyState
          title="No moods are listed right now"
          detail="YouTube Music didn’t return any mood or genre categories. Try again in a moment."
        />
      </div>
    );
  }

  const visible = group ? groups.filter((g) => g.title === group) : groups;
  const moods = (visible.find((g) => /mood/i.test(g.title)) ?? visible[0])?.categories ?? [];
  const genres = visible.find((g) => /genre/i.test(g.title))?.categories ?? [];
  const featured = visible[0]?.categories[0] ?? null;

  const randomPick = () => {
    const all = groups.flatMap((g) => g.categories);
    const pick = all[Math.floor(Math.random() * all.length)];
    if (pick) void launch(pick.title);
  };

  return (
    <InspectorFrame className="gap-6">
      <header className="flex flex-col justify-between gap-4 pt-7 md:flex-row md:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <p className={kicker}>Curated catalog</p>
            <span className="text-[12px] font-medium text-tertiary">
              {total} {total === 1 ? 'category' : 'categories'} from YouTube Music
            </span>
          </div>
          <h1 className={heading}>Moods &amp; Moments</h1>
          <p className="mt-1.5 max-w-xl text-[13px] leading-[1.5] text-secondary">
            Every mood and genre YouTube Music curates, grouped the way it lists them — pick one to browse its mixes.
          </p>
        </div>

        <div className="flex flex-none items-center gap-2.5">
          <div className="flex h-9 items-center gap-2 rounded-full border border-border-subtle bg-porcelain px-3.5">
            <Search size={14} className="flex-none text-tertiary" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && query.trim()) void launch(query.trim());
              }}
              placeholder="Search a vibe or genre…"
              aria-label="Search a vibe or genre"
              className="w-44 bg-transparent text-[12px] text-primary outline-none placeholder:text-tertiary"
            />
          </div>

          <button
            onClick={randomPick}
            disabled={launching}
            className="flex h-9 items-center gap-1.5 rounded-full border border-border-subtle bg-porcelain px-3.5 text-[12px] font-bold text-primary transition-colors hover:bg-chrome disabled:opacity-50"
          >
            <Sparkles size={14} className="text-accent-ink" />
            Surprise Vibe
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter categories">
        {[{ title: null as string | null, count: total }, ...groups.map((g) => ({ title: g.title, count: g.categories.length }))].map(
          ({ title, count }) => {
            const active = group === title;
            return (
              <button
                key={title ?? 'all'}
                onClick={() => setGroup(title)}
                aria-pressed={active}
                className={`h-[30px] rounded-full px-3.5 text-[12px] font-semibold transition-colors ${
                  active
                    ? 'bg-accent font-bold text-on-accent'
                    : 'border border-border-subtle bg-porcelain text-secondary hover:bg-chrome'
                }`}
              >
                {title ?? 'All'} <span className={active ? 'opacity-70' : 'opacity-60'}>({count})</span>
              </button>
            );
          },
        )}
      </div>

      {featured && <CuratorPick category={featured} launch={launch} />}

      {moods.length > 0 && (
        <section aria-label="Moods">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-[17px] font-bold text-primary">Moods</h2>
            <span className="text-[10px] font-bold tracking-[0.12em] text-tertiary uppercase">
              {moods.length} {moods.length === 1 ? 'channel' : 'channels'}
            </span>
          </div>
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {moods.map((category) => (
              <MoodCard
                key={`${category.title}-${category.link.params}`}
                category={category}
              />
            ))}
          </ul>
        </section>
      )}

      {genres.length > 0 && (
        <section aria-label="Genres">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="text-[17px] font-bold text-primary">Genres &amp; Regional Origins</h2>
              <p className="mt-0.5 text-[12px] font-medium text-tertiary">
                Curated geographic signatures, as YouTube Music sorts them.
              </p>
            </div>
            <span className="text-[10px] font-bold tracking-[0.12em] text-tertiary uppercase">
              {genres.length} {genres.length === 1 ? 'root' : 'roots'}
            </span>
          </div>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {genres.map((category) => (
              <li key={`${category.title}-${category.link.params}`}>
                <GenreTile category={category} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </InspectorFrame>
  );
}

/**
 * The reference's editorial hero, bound to a real category: the first one
 * YouTube lists. Its artwork and its "listen" both come from the page it
 * opens, so nothing here is written by hand.
 */
function CuratorPick({ category, launch }: { category: Category; launch: (q: string) => Promise<void> }) {
  const { ready } = useYouTubeReady();
  const browse = useQuery({ ...browseQuery(category.link), enabled: ready });
  const artwork = browse.data ? firstBrowseArtwork(browse.data) : null;
  const track = browse.data?.tracks.find((t) => !t.unavailable) ?? null;
  const [loaded, setLoaded] = useState(false);
  const src = artwork ? (artwork.wide ? artwork.thumbnail : sizedArtwork(artwork.thumbnail, 320)) : null;

  return (
    <section
      aria-label="Featured category"
      className="flex flex-col justify-between gap-6 rounded-2xl border border-border-subtle bg-porcelain p-6 md:flex-row md:items-center"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-accent-ink uppercase">
            Featured
          </span>
          <span className="text-[11px] font-medium text-tertiary">
            {browse.data
              ? `${itemsOnPage(browse.data)} items on this page`
              : 'Reading the page…'}
          </span>
        </div>

        <h2 className="mt-2 text-[24px] font-extrabold tracking-[-0.01em] text-primary">{category.title}</h2>
        <p className="mt-1.5 max-w-lg text-[13px] leading-[1.55] text-secondary">
          YouTube Music’s own mix for this mood. Open it to browse every playlist it lists, or start the first track
          right here.
        </p>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={() => {
              if (track) playTrack(track);
              else void launch(category.title);
            }}
            disabled={browse.isPending}
            className="flex h-9 items-center gap-2 rounded-full bg-accent px-5 text-[12px] font-bold text-on-accent transition-colors hover:bg-accent-hover active:bg-accent active:opacity-90 disabled:opacity-50"
          >
            <Play size={14} className="fill-current" />
            {track ? 'Play' : 'Open'}
          </button>
          <PrefetchLink
            to={browseHref(category.link)}
            className="flex h-9 items-center rounded-full border border-border-subtle bg-surface-muted px-4 text-[12px] font-bold text-primary transition-colors hover:bg-chrome"
          >
            Browse all
          </PrefetchLink>
        </div>
      </div>

      <div
        className="relative aspect-4/3 w-full max-w-[260px] flex-none self-stretch overflow-hidden rounded-xl border border-border-subtle/60"
        /*
         * Darkened rather than the raw stripe: the label below is white, and
         * YouTube's stripes include #A4C5FF, on which white is 1.75:1. The
         * image covers this as soon as it decodes; this is the frame that
         * shows while it loads or if it never arrives.
         */
        style={{ backgroundColor: `color-mix(in srgb, ${category.color} 42%, #0A1524)` }}
      >
        {src && (
          <img
            src={src}
            alt=""
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
            draggable={false}
            onLoad={() => setLoaded(true)}
            className="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-300 ease-in data-loaded:opacity-100"
            data-loaded={loaded || undefined}
          />
        )}
        <span
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: `linear-gradient(to top, color-mix(in srgb, ${category.color} 70%, #000), transparent 70%)` }}
        />
        <span className="absolute inset-x-4 bottom-3 truncate text-[13px] font-extrabold text-white">{category.title}</span>
      </div>
    </section>
  );
}
