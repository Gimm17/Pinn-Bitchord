import { usePlayer } from '@/state/player';

/**
 * What the loaded stream is delivering — `FLAC · 44.1 kHz`. Read off
 * `nowPlaying.stream`, so it is the codec and rate the engine actually
 * selected, not the one the page hoped for. Nothing is drawn until the
 * engine has reported; the longer form stays behind "Show Stats for Nerds".
 */
export function streamQualityLabel(
  stream: { codec: string | null; sampleRateHz: number | null } | null | undefined,
): string | null {
  if (!stream) return null;
  const rate = stream.sampleRateHz ? `${+(stream.sampleRateHz / 1000).toFixed(1)} kHz` : null;
  const codec = stream.codec ? stream.codec.toUpperCase() : null;
  return [codec, rate].filter(Boolean).join(' · ') || null;
}

export function StreamQuality({ className }: { className?: string }) {
  const stream = usePlayer((s) => s.nowPlaying?.stream);
  const label = streamQualityLabel(stream);
  if (!label) return null;
  return <span className={className}>{label}</span>;
}
