import { best, queries, type MatchCandidate, type MatchTarget } from '@/data/match/trackMatcher';
import { trackLog } from '@/playback/trackLog';
import { searchAddon, streamAddon } from './client';
import { useSources } from './store';
import type { AddonTrack, ResolvedSourceStream } from './types';

interface CandidateWithTrack extends MatchCandidate {
  raw: AddonTrack;
}

/** Resolves the highest quality lossless stream available across configured addons in priority order. */
export async function resolveLosslessSource(
  target: MatchTarget,
  excludeSourceIds?: Set<string>,
): Promise<ResolvedSourceStream | null> {
  const { sources, preferLossless } = useSources.getState();
  if (!preferLossless) return null;

  // Active enabled addon sources in user order, filtering out any rejected sources
  const activeAddons = sources.filter(
    (s) => s.enabled && s.kind === 'addon' && s.baseUrl && (!excludeSourceIds || !excludeSourceIds.has(s.id)),
  );
  if (activeAddons.length === 0) return null;

  const searchQueries = queries(target);
  if (searchQueries.length === 0) return null;
  const primaryQuery = searchQueries[0]!;

  for (const source of activeAddons) {
    try {
      trackLog.d(`probing source "${source.name}" for "${primaryQuery}"`);
      const tracks = await searchAddon(source.baseUrl, primaryQuery, 'LOSSLESS');
      if (!tracks || tracks.length === 0) continue;

      const candidates: CandidateWithTrack[] = tracks.map((t) => ({
        raw: t,
        title: t.title,
        artist: t.artist ?? '',
        album: t.album ?? null,
        durationSec: t.durationSec ?? t.duration ?? null,
      }));

      const hit = best(candidates, target);
      if (!hit) {
        trackLog.d(`source "${source.name}" had ${tracks.length} tracks but none matched target`);
        continue;
      }

      // Reject candidates whose duration is an obvious 30s sample preview when target is a full track
      if (target.durationSec && target.durationSec > 60 && hit.durationSec && hit.durationSec <= 35) {
        trackLog.w(`source "${source.name}" candidate duration (${hit.durationSec}s) is a sample snippet, skipping`);
        continue;
      }

      trackLog.i(`matched track "${hit.title}" by "${hit.artist}" on source "${source.name}"`);

      // If track has direct streamURL already
      let streamUrl = hit.raw.streamURL;
      let format = hit.raw.format || 'flac';
      let qualityText = hit.raw.audioQuality || 'FLAC · Lossless';
      let sampleRate = 44100;
      let bitDepth = 16;
      let codec = 'FLAC';

      if (!streamUrl) {
        const stream = await streamAddon(source.baseUrl, hit.raw.id, 'LOSSLESS');
        if (stream) {
          streamUrl = stream.url || stream.streamURL;
          if (stream.format) format = stream.format;
          if (stream.codec) codec = stream.codec.toUpperCase();
          if (stream.quality) qualityText = stream.quality;
          if (stream.sampleRate) sampleRate = stream.sampleRate;
          if (stream.bitDepth) bitDepth = stream.bitDepth;
        }
      }

      // If stream explicitly indicates a sample or MP3 preview for a long song
      if (
        format.toLowerCase() === 'mp3' &&
        target.durationSec &&
        target.durationSec > 60 &&
        (qualityText.toLowerCase().includes('sample') || qualityText.toLowerCase().includes('preview'))
      ) {
        trackLog.w(`source "${source.name}" returned a sample preview, skipping`);
        continue;
      }

      if (streamUrl) {
        trackLog.i(`resolved lossless stream from "${source.name}": ${qualityText}`);
        return {
          sourceId: source.id,
          sourceName: source.name,
          streamUrl,
          isLossless: true,
          qualityText: qualityText || `${source.name} FLAC`,
          format: format || 'flac',
          codec,
          sampleRateHz: sampleRate,
          bitDepth,
          durationSec: hit.durationSec ?? undefined,
        };
      }
    } catch (err) {
      trackLog.w(`source "${source.name}" failed: ${String(err)}`);
    }
  }

  return null;
}
