import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { ArrowUpRight, Disc3, Play, Search as SearchIcon, X } from 'lucide-react';
import { PrefetchLink } from '@/components/PrefetchLink';
import { Artwork } from '@/components/music/Artwork';
import { browseHref, formatDuration, hrefFor } from '@/components/music/links';
import { playTrack } from '@/components/music/play';
import { Shelves } from '@/components/music/ShelfView';
import { EmptyState, NeedsExtension } from '@/components/music/States';
import { useCategories, useSearch, useYouTubeReady } from '@/data/music/queries';
import type { MusicItem, SearchResults, Shelf } from '@/data/music/types';
import { usePlayer } from '@/state/player';

type Kind = 'all' | 'songs' | 'artists' | 'albums' | 'playlists' | 'videos';

const KINDS: { key: Kind; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'songs', label: 'Songs' },
  { key: 'artists', label: 'Artists' },
  { key: 'albums', label: 'Albums' },
  { key: 'playlists', label: 'Playlists' },
  { key: 'videos', label: 'Videos' },
];

const HISTORY_KEY = 'bitchord:search-history';
const HISTORY_LIMIT = 6;

/** Recent queries, kept on this device only. */
function readHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((q): q is string => typeof q === 'string').slice(0, HISTORY_LIMIT) : [];
  } catch {
    return [];
  }
}

function writeHistory(next: string[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked: the list just doesn't persist.
  }
}

const chip = 'h-[30px] rounded-full px-3.5 text-[12px] font-semibold transition-colors';

function shelvesFor(results: SearchResults): Shelf[] {
  const shelf = (title: string, items: MusicItem[], layout: Shelf['layout']): Shelf | null =>
    items.length ? { title, strapline: null, layout, items, seeAll: null } : null;
  return [
    shelf('Artists', results.artists, 'circle'),
    shelf('Albums', results.albums, 'square'),
    shelf('Playlists', results.playlists, 'square'),
    shelf('Videos', results.videos, 'video'),
  ].filter((s): s is Shelf => !!s);
}

/** "1 hr 2 min", from the rows themselves. */
function sumDuration(items: { durationSec: number | null }[]): string {
  const sec = items.reduce((sum, item) => sum + (item.durationSec ?? 0), 0);
  if (sec <= 0) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h ? `${h} hr ${m} min` : `${m} min`;
}

export default function SearchPage() {
  const { missing } = useYouTubeReady();
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const [inputVal, setInputVal] = useState(query);
  const [kind, setKind] = useState<Kind>('all');
  const [sort, setSort] = useState<'relevance' | 'duration'>('relevance');
  const [history, setHistory] = useState<string[]>(readHistory);

  const search = useSearch(query);
  const categories = useCategories();

  const submit = (value: string) => {
    const q = value.trim();
    setInputVal(q);
    setParams(q ? { q } : {});
    if (q) {
      const next = [q, ...history.filter((h) => h.toLowerCase() !== q.toLowerCase())].slice(0, HISTORY_LIMIT);
      writeHistory(next);
      setHistory(next);
    }
  };

  if (missing) return <NeedsExtension what="and search YouTube Music" />;

  const results = search.data;
  const songs = results ? [...results.songs] : [];
  if (sort === 'duration') songs.sort((a, b) => (a.durationSec ?? 0) - (b.durationSec ?? 0));

  const topItem = results?.top?.[0] ?? results?.songs?.[0] ?? null;
  const shelves = results ? shelvesFor(results) : [];
  const categoriesToShow = (categories.data ?? []).flatMap((group) => group.categories).slice(0, 6);
  const total = results
    ? results.songs.length + results.artists.length + results.albums.length + results.playlists.length + results.videos.length
    : 0;

  return (
    <div className="mx-(--body-gutter) flex flex-col gap-5 pb-20">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle/60 pt-6 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold tracking-[0.14em] text-sky-ink uppercase">Search</span>
          <span className="text-xs text-tertiary">/</span>
          <h2 className="text-sm font-extrabold text-primary">Explore &amp; Discover</h2>
        </div>
        <StreamChip />
      </header>

      <div className="flex items-center gap-3">
        <form
          className="flex h-11 flex-1 items-center gap-2 rounded-2xl border border-border-subtle bg-porcelain px-4 transition-colors focus-within:border-accent"
          onSubmit={(e) => {
            e.preventDefault();
            submit(inputVal);
          }}
          role="search"
        >
          <SearchIcon size={17} className="flex-none text-tertiary" />
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Search songs, artists, albums…"
            aria-label="Search YouTube Music"
            className="flex-1 bg-transparent text-sm font-medium text-primary outline-none placeholder:text-tertiary"
          />
          {inputVal && (
            <button
              type="button"
              onClick={() => {
                setInputVal('');
                setParams({});
              }}
              className="grid size-6 flex-none place-items-center rounded-full text-tertiary hover:bg-chrome hover:text-primary"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
          <span className="flex-none rounded-md border border-border-subtle bg-chrome px-1.5 py-0.5 text-[10px] font-semibold text-tertiary">
            Ctrl F
          </span>
        </form>

        <button
          onClick={() => submit(inputVal)}
          disabled={!inputVal.trim()}
          className="flex h-11 flex-none items-center gap-2 rounded-2xl bg-accent px-5 text-[12px] font-bold text-on-accent transition-colors hover:bg-accent-hover active:opacity-90 disabled:opacity-40"
        >
          <SearchIcon size={14} />
          Search
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter results">
        {KINDS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setKind(key)}
            aria-pressed={kind === key}
            className={`${chip} ${
              kind === key
                ? 'bg-accent font-bold text-on-accent'
                : 'border border-border-subtle bg-porcelain text-secondary hover:bg-chrome'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {history.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold tracking-[0.12em] text-tertiary uppercase">Recent</span>
          {history.map((entry) => (
            <button
              key={entry}
              onClick={() => submit(entry)}
              className="flex h-7 items-center gap-1 rounded-full border border-border-subtle bg-porcelain px-3 text-[11px] font-medium text-secondary transition-colors hover:border-accent hover:text-accent-ink"
            >
              {entry}
              <ArrowUpRight size={11} className="text-tertiary" />
            </button>
          ))}
          <button
            onClick={() => {
              writeHistory([]);
              setHistory([]);
            }}
            className="text-[11px] font-semibold text-tertiary hover:text-primary hover:underline"
          >
            Clear
          </button>
        </div>
      )}

      {!query && (
        <div className="rounded-2xl border border-border-subtle bg-porcelain px-5 py-10 text-center">
          <p className="text-[15px] font-bold text-primary">Search YouTube Music</p>
          <p className="mt-1 text-[12px] text-secondary">
            Songs, albums, artists, playlists and videos — whatever your account can reach.
          </p>
        </div>
      )}

      {query && search.isError && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-border-subtle bg-porcelain px-5 py-6 text-[12px] text-secondary">
          Couldn’t run that search.
          <button className="font-bold text-accent-ink hover:underline" onClick={() => void search.refetch()}>
            Try again
          </button>
        </div>
      )}

      {query && search.isPending && (
        <p className="py-6 text-center text-[12px] text-tertiary">Searching…</p>
      )}

      {results && total === 0 && (
        <EmptyState title={`Nothing for “${query}”`} detail="Try a shorter title, or the artist’s name." />
      )}

      {results && total > 0 && (kind === 'all' ? (
        <>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {topItem && <TopResult item={topItem} />}
            <StreamCard />
          </div>

          {songs.length > 0 && (
            <section aria-label="Songs">
              <div className="mb-2.5 flex items-end justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-[16px] font-bold text-primary">Songs</h3>
                  <span className="rounded-full bg-chrome px-2 py-0.5 text-[10px] font-bold text-secondary">
                    {songs.length}
                  </span>
                  {sumDuration(songs) && (
                    <span className="text-[11px] font-medium text-tertiary">{sumDuration(songs)}</span>
                  )}
                </div>
                <button
                  onClick={() => setSort((s) => (s === 'duration' ? 'relevance' : 'duration'))}
                  aria-pressed={sort === 'duration'}
                  className="text-[11px] font-semibold text-accent-ink hover:underline"
                >
                  {sort === 'duration' ? 'Sort: Duration' : 'Sort: Relevance'}
                </button>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border-subtle bg-porcelain p-2">
                <div className="grid grid-cols-[36px_minmax(0,1fr)_minmax(0,0.7fr)_64px] gap-x-3 border-b border-border-subtle/60 px-3 py-2 text-[10px] font-bold tracking-[0.1em] text-tertiary uppercase">
                  <div>#</div>
                  <div>Title</div>
                  <div className="max-md:hidden">Album</div>
                  <div className="text-right">Time</div>
                </div>
                {songs.map((song, i) => (
                  <SongRow key={song.id} song={song} position={i + 1} />
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <FilteredResults results={results} kind={kind} />
      ))}

      {results && shelves.length > 0 && kind === 'all' && <Shelves shelves={shelves} />}

      {categoriesToShow.length > 0 && (
        <section aria-label="Browse categories" className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-bold text-primary">Browse moods &amp; genres</h3>
            <PrefetchLink to="/browse" className="text-[11px] font-semibold text-accent-ink hover:underline">
              See all
            </PrefetchLink>
          </div>
          <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            {categoriesToShow.map((category) => (
              <li key={`${category.title}-${category.link.params}`}>
                <PrefetchLink
                  to={browseHref(category.link)}
                  className="group block overflow-hidden rounded-xl border border-border-subtle bg-porcelain transition-colors hover:border-accent"
                >
                  <span className="block h-1" style={{ backgroundColor: category.color }} aria-hidden="true" />
                  <span className="block px-3 py-2.5 text-[12px] font-bold text-primary group-hover:text-accent-ink">
                    {category.title}
                  </span>
                </PrefetchLink>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** The player's own measure of what it is delivering, when something is playing. */
function StreamChip() {
  const stream = usePlayer((s) => s.nowPlaying?.stream ?? null);
  if (!stream) return null;
  const parts = [
    stream.codec?.toUpperCase(),
    stream.sampleRateHz ? `${Math.round(stream.sampleRateHz / 1000)} kHz` : null,
    stream.bitrateKbps ? `${stream.bitrateKbps} kbps` : null,
  ].filter(Boolean);
  return (
    <div className="flex max-sm:hidden items-center gap-2 rounded-full border border-border-subtle bg-porcelain px-3 py-1 text-[11px] font-medium text-secondary">
      <span className="size-1.5 rounded-full bg-[var(--successText)]" aria-hidden="true" />
      <span>{parts.join(' • ') || 'Playing'}</span>
    </div>
  );
}

function TopResult({ item }: { item: MusicItem }) {
  const href = hrefFor(item);
  return (
    <section
      aria-label="Top result"
      className="flex flex-col justify-between gap-4 rounded-2xl border border-border-subtle bg-porcelain p-5"
    >
      <div className="flex items-start gap-4">
        <div className="size-24 flex-none overflow-hidden rounded-xl border border-border-subtle/60 bg-accent-soft">
          <Artwork src={item.thumbnail} displayWidth={96} radius="12px" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold tracking-wide text-accent-ink uppercase">
            {item.kind}
          </span>
          <h3 className="mt-1.5 truncate text-[22px] font-extrabold tracking-[-0.01em] text-primary">{item.title}</h3>
          <p className="truncate text-[12px] font-medium text-secondary">{item.subtitle}</p>
          {item.album && (
            <p className="mt-1 truncate text-[11px] text-tertiary">{item.album.name}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          onClick={() => playTrack(item)}
          className="flex h-9 items-center gap-2 rounded-full bg-accent px-4 text-[12px] font-bold text-on-accent transition-colors hover:bg-accent-hover active:opacity-90"
        >
          <Play size={13} className="fill-current" />
          Play
        </button>
        {href && (
          <PrefetchLink
            to={href}
            className="flex h-9 items-center rounded-full border border-border-subtle bg-surface-muted px-4 text-[12px] font-bold text-primary transition-colors hover:bg-chrome"
          >
            Open
          </PrefetchLink>
        )}
      </div>
    </section>
  );
}

/**
 * What the player is actually delivering: codec, bitrate, rate and channels,
 * read from the loaded stream. Nothing is shown until a track describes
 * itself, rather than printing a spec the app can't verify.
 */
function StreamCard() {
  const nowPlaying = usePlayer((s) => s.nowPlaying);
  const stream = nowPlaying?.stream ?? null;
  const rows = stream
    ? [
        ['Codec', stream.codec?.toUpperCase() ?? '—'],
        ['Bitrate', stream.bitrateKbps ? `${stream.bitrateKbps} kbps` : '—'],
        ['Sample rate', stream.sampleRateHz ? `${(stream.sampleRateHz / 1000).toFixed(1)} kHz` : '—'],
        ['Channels', stream.channels ? String(stream.channels) : '—'],
        ['Delivery', stream.mode === 'SABR' ? 'SABR' : 'Direct'],
        ['Client', stream.client],
      ]
    : [];

  return (
    <section
      aria-label="Stream"
      className="flex flex-col justify-between gap-4 rounded-2xl border border-border-subtle bg-porcelain p-5"
    >
      <div className="flex items-center gap-2">
        <Disc3 size={15} className="text-accent-ink" />
        <h3 className="text-[12px] font-bold tracking-[0.08em] text-primary uppercase">Now streaming</h3>
      </div>

      {stream ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-2 border-b border-border-subtle/40 pb-1">
              <dt className="text-[10px] font-semibold tracking-wide text-tertiary uppercase">{label}</dt>
              <dd className="truncate text-[12px] font-semibold text-primary tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-[12px] leading-[1.5] text-secondary">
          Play a track and this card reports the audio the player is actually delivering — codec, bitrate, sample rate
          and channels, measured from the loaded stream.
        </p>
      )}

      {nowPlaying && <p className="truncate text-[11px] font-medium text-tertiary">{nowPlaying.title}</p>}
    </section>
  );
}

function SongRow({ song, position }: { song: MusicItem; position: number }) {
  return (
    <div
      onClick={() => playTrack(song)}
      className="group grid cursor-pointer grid-cols-[36px_minmax(0,1fr)_minmax(0,0.7fr)_64px] items-center gap-x-3 rounded-xl px-3 py-2 transition-colors hover:bg-surface-muted"
    >
      <div className="text-[11px] font-mono text-tertiary">
        <span className="group-hover:hidden">{String(position).padStart(2, '0')}</span>
        <Play size={13} className="hidden fill-accent text-accent-ink group-hover:block" />
      </div>
      <div className="flex min-w-0 items-center gap-3">
        <div className="size-9 flex-none overflow-hidden rounded-lg border border-border-subtle/60 bg-chrome">
          <Artwork src={song.thumbnail} displayWidth={36} radius="8px" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-primary group-hover:text-accent-ink">{song.title}</p>
          <p className="truncate text-[11px] text-secondary">{song.artists.map((a) => a.name).join(', ')}</p>
        </div>
      </div>
      <div className="truncate text-[11px] text-tertiary max-md:hidden">{song.album?.name ?? ''}</div>
      <div className="text-right text-[11px] font-mono text-tertiary tabular-nums">
        {song.durationSec ? formatDuration(song.durationSec) : ''}
      </div>
    </div>
  );
}

/** One result kind at a time, from the same response the shelves use. */
function FilteredResults({ results, kind }: { results: SearchResults; kind: Kind }) {
  const items =
    kind === 'songs'
      ? results.songs
      : kind === 'artists'
        ? results.artists
        : kind === 'albums'
          ? results.albums
          : kind === 'playlists'
            ? results.playlists
            : results.videos;

  if (!items.length) return <EmptyState title={`No ${kind} for this search`} />;

  if (kind === 'songs') {
    return (
      <div className="overflow-hidden rounded-2xl border border-border-subtle bg-porcelain p-2">
        {items.map((song, i) => (
          <SongRow key={song.id} song={song} position={i + 1} />
        ))}
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-x-5 gap-y-6">
      {items.map((item) => {
        const href = hrefFor(item);
        return (
          <li key={item.id} className="min-w-0">
            <div className="group">
              <div className="relative mb-2 aspect-square overflow-hidden rounded-xl border border-border-subtle/60 bg-chrome">
                <Artwork src={item.thumbnail} displayWidth={200} radius="12px" />
                {href && (
                  <PrefetchLink to={href} className="absolute inset-0 z-1 rounded-[inherit]" aria-label={item.title} />
                )}
              </div>
              <p className="truncate text-[13px] font-semibold text-primary">{item.title}</p>
              <p className="truncate text-[11px] text-tertiary">{item.subtitle}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
