import { useParams } from 'react-router';
import { Play, Shuffle } from 'lucide-react';
import { PlayIcon } from '@/components/icons/Transport';
import { PrefetchLink } from '@/components/PrefetchLink';
import { TrackList } from '@/components/music/TrackList';
import { Shelves } from '@/components/music/ShelfView';
import { browseHref } from '@/components/music/links';
import { LoadError, NeedsExtension } from '@/components/music/States';
import { playList, shuffleList, toTrack } from '@/components/music/play';
import { useArtist, useYouTubeReady } from '@/data/music/queries';
import { usePlayer } from '@/state/player';
import { ArtistSkeleton } from '@/skeletons/PageSkeletons';

const kicker = 'text-[11px] font-bold tracking-[0.14em] text-sky-ink uppercase';

export default function ArtistPage() {
  const id = decodeURIComponent(useParams().id ?? '');
  const { missing } = useYouTubeReady();
  const artist = useArtist(id);

  if (missing) return <NeedsExtension what="this artist" />;
  if (artist.isError) return <LoadError error={artist.error} onRetry={() => void artist.refetch()} />;
  if (!artist.data) return <ArtistSkeleton />;

  const data = artist.data;
  const songs = data.topSongs.slice(0, 10);
  const context = { source: { title: `${data.name}: Top Tracks`, type: 'artist' as const, id: data.id } };
  const empty = !songs.length && !data.shelves.length;

  return (
    <div className="mx-(--body-gutter) flex flex-col gap-7 pb-20">
      <header className="flex flex-col items-center gap-6 pt-7 md:flex-row md:items-end">
        <div className="size-[168px] flex-none overflow-hidden rounded-full border border-border-subtle bg-accent-soft shadow-[0_10px_28px_rgba(19,34,48,0.10)]">
          {data.heroImage ? (
            <img src={data.heroImage} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="grid size-full place-items-center text-[52px] font-black text-accent-ink">
              {data.name[0] ?? 'A'}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 text-center md:text-left">
          <p className={kicker}>Artist</p>
          <h1 className="mt-1 text-[38px] leading-[1.05] font-extrabold tracking-[-0.02em] text-primary">{data.name}</h1>

          {data.audience && <p className="mt-1.5 text-[12px] font-medium text-secondary">{data.audience}</p>}

          {data.description && (
            <p className="mx-auto mt-3 line-clamp-2 max-w-[640px] text-[12px] leading-[1.55] text-secondary md:mx-0">
              {data.description}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 md:justify-start">
            <button
              onClick={() => {
                const first = songs[0];
                if (first) void usePlayer.getState().startRadio(toTrack(first));
              }}
              disabled={!songs.length}
              className="flex h-9 items-center gap-2 rounded-full bg-accent px-5 text-[12px] font-bold text-on-accent transition-colors hover:bg-accent-hover active:opacity-90 disabled:opacity-40"
            >
              <Play size={14} className="fill-current" />
              Start Radio
            </button>

            <button
              onClick={() => songs.length && playList(songs, 0, context)}
              disabled={!songs.length}
              className="flex h-9 items-center gap-2 rounded-full border border-border-subtle bg-porcelain px-4 text-[12px] font-bold text-primary transition-colors hover:bg-chrome disabled:opacity-40"
            >
              <PlayIcon size={13} />
              Play
            </button>

            <button
              onClick={() => shuffleList(songs, context)}
              disabled={!songs.length}
              className="flex h-9 items-center gap-2 rounded-full border border-border-subtle bg-porcelain px-4 text-[12px] font-bold text-primary transition-colors hover:bg-chrome disabled:opacity-40"
            >
              <Shuffle size={13} />
              Shuffle
            </button>
          </div>
        </div>
      </header>

      {songs.length > 0 && (
        <section aria-label="Top tracks" className="flex flex-col gap-2.5">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-[17px] font-bold text-primary">Top tracks</h2>
              <p className="mt-0.5 text-[12px] font-medium text-tertiary">
                What this artist is played for most, as YouTube Music ranks it.
              </p>
            </div>
            {data.topSongsSeeAll && (
              <PrefetchLink
                to={browseHref(data.topSongsSeeAll)}
                className="text-[11px] font-semibold text-accent-ink hover:underline"
              >
                See all
              </PrefetchLink>
            )}
          </div>
          <div className="rounded-2xl border border-border-subtle bg-porcelain p-2">
            <TrackList tracks={songs} variant="playlist" source={context.source} />
          </div>
        </section>
      )}

      <Shelves shelves={data.shelves} />

      {empty && (
        <p className="py-10 text-center text-[12px] text-tertiary">
          YouTube Music has no releases listed for this artist.
        </p>
      )}
    </div>
  );
}
