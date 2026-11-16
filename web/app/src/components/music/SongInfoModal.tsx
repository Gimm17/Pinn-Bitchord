import { Copy, ExternalLink, Info, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { Track } from '@/data/music/types';
import { usePlayer } from '@/state/player';
import { showToast } from '@/components/Toast';
import { Artwork } from './Artwork';

interface SongInfoModalProps {
  track: Track;
  onClose: () => void;
}

function formatDuration(sec: number | null): string {
  if (!sec || sec <= 0) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function SongInfoModal({ track, onClose }: SongInfoModalProps) {
  const { nowPlaying } = usePlayer();
  const isCurrent = nowPlaying?.videoId === track.videoId;
  const stream = isCurrent ? nowPlaying?.stream : null;

  /*
   * Only what the engine actually measured for the loaded stream. This row is
   * opened for any track, so when it is not the one playing there is nothing
   * to report — an invented "FLAC / 44.1 kHz / Lossless" card would be fiction.
   */
  const audioSpecs = [
    { label: 'Codec', value: stream?.codec?.toUpperCase() },
    { label: 'Sample Rate', value: stream?.sampleRateHz ? `${(stream.sampleRateHz / 1000).toFixed(1)} kHz` : undefined },
    { label: 'Bitrate', value: stream?.bitrateKbps ? `${stream.bitrateKbps} kbps` : undefined },
    { label: 'Channels', value: stream?.channels ? String(stream.channels) : undefined },
    { label: 'Client', value: stream?.client },
  ].filter((spec): spec is { label: string; value: string } => Boolean(spec.value));

  const copyDetails = () => {
    const text = `${track.title} - ${track.artists.map((a) => a.name).join(', ')}\nAlbum: ${track.album?.name ?? 'Single'}\nVideo ID: ${track.videoId}\nLink: https://music.youtube.com/watch?v=${track.videoId}`;
    navigator.clipboard.writeText(text);
    showToast('Song info copied to clipboard');
  };

  return createPortal(
    <div className="fixed inset-0 z-[calc(var(--z-contextual-menus)+20)] grid place-items-center bg-scrim p-4 [backdrop-filter:blur(16px)] animate-enter">
      <div
        className="fixed inset-0 -z-1"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-[420px] rounded-[18px] border border-border-subtle bg-thick-material p-6 shadow-2xl [backdrop-filter:blur(36px)_saturate(2)] text-primary">
        <button
          className="absolute top-4 right-4 grid size-8 place-items-center rounded-full text-secondary hover:bg-quinary hover:text-primary transition-colors"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-4 mb-5">
          <div className="size-16 flex-none rounded-[10px] overflow-hidden shadow-md">
            <Artwork src={track.thumbnail} displayWidth={64} eager />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="type-title-3-emphasized truncate">{track.title}</h2>
            <p className="type-callout text-secondary truncate">
              {track.artists.map((a) => a.name).join(', ') || 'Unknown Artist'}
            </p>
            {track.album?.name && (
              <p className="type-caption-1 text-tertiary truncate">{track.album.name}</p>
            )}
          </div>
        </div>

        <div className="mb-4 space-y-2 rounded-[12px] border border-border-subtle bg-surface-muted p-3.5">
          <div className="flex justify-between type-caption-1 text-secondary">
            <span>Duration</span>
            <span className="text-primary font-mono">{formatDuration(track.durationSec)}</span>
          </div>
          <div className="flex justify-between type-caption-1 text-secondary">
            <span>Track ID</span>
            <span className="text-primary font-mono">{track.videoId}</span>
          </div>
          <div className="mt-2 border-t border-border-subtle pt-2" />
          <div className="type-caption-2 uppercase tracking-wider text-secondary font-semibold">Audio Specifications</div>
          {audioSpecs.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 pt-1">
              {audioSpecs.map((spec) => (
                <div key={spec.label} className="rounded-[8px] bg-porcelain p-2">
                  <div className="type-caption-2 text-secondary">{spec.label}</div>
                  <div className="type-callout-emphasized text-primary">{spec.value}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="type-caption-1 pt-1 text-tertiary">
              Nothing measured yet — the stream reports its format once this track starts.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            className="flex-1 flex items-center justify-center gap-2 rounded-[10px] bg-quinary py-2.5 px-3 type-callout-emphasized text-primary hover:bg-quaternary transition-colors"
            onClick={copyDetails}
          >
            <Copy size={15} />
            <span>Copy Info</span>
          </button>
          <a
            href={`https://music.youtube.com/watch?v=${track.videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-[10px] bg-key/20 text-accent-ink py-2.5 px-3.5 type-callout-emphasized hover:bg-key/30 transition-colors"
            title="Open on YouTube Music"
          >
            <ExternalLink size={15} />
            <span>YT Music</span>
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
}
