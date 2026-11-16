import { useEffect, useReducer, useState } from 'react';
import { useParty } from '@/party/listenTogether';
import type { AutoDJSnapshot } from '@/playback/automix';
import type { analyzer as Analyzer } from '@/playback/automix/analysis/analyzer';
import type { NowPlaying } from '@/state/player';
import { usePlayer } from '@/state/player';
import { X, Check } from 'lucide-react';

/** Stats for nerds */
export function NerdStats() {
  const show = usePlayer((s) => s.showNerdStats);
  const nowPlaying = usePlayer((s) => s.nowPlaying);
  const automix = usePlayer((s) => s.automix);
  if (!show || !nowPlaying) return null;
  return (
    <div className="mt-1 flex min-w-0 flex-col gap-px text-[11px] font-mono tabular-nums">
      <span className="truncate text-ink-muted">{describeStream(nowPlaying) ?? 'Measuring the stream…'}</span>
      {automix && <AutomixLine videoId={nowPlaying.videoId} />}
    </div>
  );
}

function describeStream(np: NowPlaying): string | null {
  const s = np.stream;
  if (!s) return null;
  const parts = [
    s.codec,
    s.sampleRateHz ? `${+(s.sampleRateHz / 1000).toFixed(1)} kHz` : null,
    s.bitrateKbps ? `${s.bitrateKbps} kbps` : null,
    s.channels ? ({ 1: 'Mono', 2: 'Stereo' } as Record<number, string>)[s.channels] ?? `${s.channels} channels` : null,
    s.itag ? `itag ${s.itag}` : null,
    `${s.client} ${s.mode}`,
  ];
  return parts.filter(Boolean).join(' · ');
}

function AutomixLine({ videoId }: { videoId: string }) {
  const state = usePlayer((s) => s.automixState);
  const nextInQueue = usePlayer((s) => s.queue[s.index + 1]?.track.videoId ?? null);
  const inParty = useParty((s) => !!s.code);
  const analyzer = useAnalyzer();

  let text: string;
  if (inParty) text = 'Automix: stopped in Listen Together';
  else if (state?.state === 'scheduled' && state.plan) text = describeBlend(state);
  else if (state?.loop) text = `Automix · loop mix ready · ${describeLoop(state)}`;
  else {
    const label = (id: string | null, outgoing: boolean) => {
      if (!id || !analyzer) return 'waiting';
      const a = analyzer.get(id);
      if (a) {
        const g = outgoing && a.tailGrid !== undefined ? a.tailGrid : a.bpm ? { bpm: a.bpm, gridConfidence: a.gridConfidence } : null;
        const key = a.camelot ? ` ${a.camelot.num}${a.camelot.letter}` : '';
        const video = a.musicVideo ? ', music video: no loop' : '';
        if (!g) return `analysed (no beat${key}${video})`;
        const grid = g.gridConfidence >= 0.2 ? `grid ${g.gridConfidence.toFixed(2)}` : `weak grid ${g.gridConfidence.toFixed(2)}`;
        return `analysed (${Math.round(g.bpm)} BPM${key}, ${grid}${video})`;
      }
      const status = analyzer.statusOf(id);
      return status === 'analyzing' ? 'analysing…' : status === 'error' ? 'failed' : 'waiting';
    };
    const next = state?.nextKey ?? nextInQueue;
    text = `Automix · this song: ${label(videoId, true)} · next: ${next ? label(next, false) : 'none'}`;
  }
  return <span className="truncate text-ink-muted">{text}</span>;
}

function describeLoop(state: AutoDJSnapshot): string {
  const l = state.loop!;
  const from = Math.round(l.out.bpm);
  const to = Math.round(l.in.bpm / l.fold);
  return `${from} → ${to} BPM`;
}

function describeBlend(state: AutoDJSnapshot): string {
  const p = state.plan!;
  return `blend planned · ${p.durationSec.toFixed(1)}s`;
}

function useAnalyzer() {
  const [a, setA] = useState<typeof Analyzer | null>(null);
  useEffect(() => {
    void import('@/playback/automix/analysis/analyzer').then((m) => setA(m.analyzer));
  }, []);
  return a;
}

export function MixWindowHighlight() {
  return null;
}

/**
 * Audio Stream & DAC Specs: what the player is actually delivering. Every
 * row is read off the loaded stream (engine.ts reports codec, rate, bitrate,
 * channels, itag, and the client that served it). The webview cannot see the
 * OS mixer, so driver, DAC endpoint and hardware latency are not listed —
 * an earlier build printed a fixed "Realtek / WASAPI / 12 ms" here and a
 * "BIT-PERFECT OUTPUT VERIFIED" banner that verified nothing.
 */
export function FloatingNerdModal() {
  const show = usePlayer((s) => s.showNerdStats);
  const setShowNerdStats = usePlayer((s) => s.setShowNerdStats);
  const nowPlaying = usePlayer((s) => s.nowPlaying);

  if (!show) return null;
  const s = nowPlaying?.stream;

  const specs = [
    { label: 'Codec', value: s?.codec ? s.codec.toUpperCase() : null },
    {
      label: 'Sample Rate',
      value: s?.sampleRateHz ? `${+(s.sampleRateHz / 1000).toFixed(1)} kHz` : null,
    },
    { label: 'Bitrate', value: s?.bitrateKbps ? `${s.bitrateKbps} kbps` : null },
    {
      label: 'Channels',
      value: s?.channels ? (({ 1: 'Mono', 2: 'Stereo' } as Record<number, string>)[s.channels] ?? `${s.channels} channels`) : null,
    },
    { label: 'Format ID (itag)', value: s?.itag ? String(s.itag) : null },
    { label: 'InnerTube Client', value: s?.client ?? null },
    { label: 'Delivery', value: s?.mode ?? null },
  ].filter((row): row is { label: string; value: string } => !!row.value);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-4 backdrop-blur-xs select-none"
      onClick={() => setShowNerdStats(false)}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border-subtle bg-porcelain p-6 shadow-xl flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[9px] font-bold text-accent-ink tracking-wider uppercase">
              Measured from the loaded stream
            </span>
            <h3 className="mt-1.5 text-lg font-black text-primary">
              Audio Stream &amp; DAC Specs
            </h3>
          </div>
          <button
            onClick={() => setShowNerdStats(false)}
            className="size-7 rounded-full text-ink-muted hover:bg-chrome hover:text-primary flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {specs.length > 0 ? (
          <div className="rounded-xl border border-border-subtle/70 bg-surface-muted divide-y divide-border-subtle/50 overflow-hidden text-xs">
            {specs.map((row) => (
              <div key={row.label} className="flex items-center justify-between px-3.5 py-2.5">
                <span className="text-ink-muted font-medium">{row.label}</span>
                <span className="font-mono font-bold text-primary text-right">{row.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-border-subtle/70 bg-surface-muted px-3.5 py-6 text-center text-xs text-secondary">
            {nowPlaying ? 'Waiting for the stream to report its format…' : 'Nothing is playing.'}
          </p>
        )}

        {s && nowPlaying && (
          <p className="text-center text-[11px] text-tertiary">
            {nowPlaying.title}
            {nowPlaying.artist ? ` · ${nowPlaying.artist}` : ''}
          </p>
        )}
      </div>
    </div>
  );
}
