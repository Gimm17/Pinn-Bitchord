import { useEffect } from 'react';
import type { DiscordNowPlaying } from '@bitchord/shared/bridge';
import { getBridge } from '@/extension/bridge';
import { useDiscordOptions } from '@/extension/useDiscord';
import { sizedArtwork } from '@/lib/artwork';
import { getAudio, usePlayer } from '@/state/player';
import { discordGatewayManager } from './discordGateway';

/** Discord draws the sleeve at about 96 dp; 480 px covers it on any density. */
const ART_PX = 480;

export function sendDesktopPresence(track: DiscordNowPlaying | null) {
  try {
    const w = typeof window !== 'undefined' ? (window as any) : null;
    if (!w) return;
    const invoke = w.__TAURI__?.core?.invoke || w.__TAURI_INTERNALS__?.invoke;
    if (invoke) {
      console.log('[Discord RPC] Directly invoking bridge_discord_presence:', track);
      const payload = track
        ? {
            title: track.title,
            artist: track.artist,
            album: track.album ?? null,
            quality: track.quality ?? null,
            artworkUrl: track.artworkUrl ?? null,
            videoId: track.videoId ?? null,
            positionMs: track.positionMs ?? null,
            durationMs: track.durationMs ?? null,
          }
        : null;
      invoke('bridge_discord_presence', { payload })
        .then(() => console.log('[Discord RPC] Presence update ACKed'))
        .catch((e: any) => console.error('[Discord RPC] Presence update error:', e));
    }
  } catch (e) {
    console.error('[Discord RPC] Failed to send desktop presence:', e);
  }
}

function cleanAudioQuality(): string {
  const { nowPlaying: np } = usePlayer.getState();
  if (!np) return 'FLAC · 44.1 kHz · 1411 kbps';

  const s = np.stream;
  if (!s) return 'FLAC · 44.1 kHz · 1411 kbps';

  const parts: string[] = [];

  // Codec: e.g. FLAC, Opus
  const codec = (s.codec || 'FLAC').toUpperCase();
  parts.push(codec);

  // Sample Rate: e.g. 44.1 kHz
  if (s.sampleRateHz) {
    const khz = +(s.sampleRateHz / 1000).toFixed(1);
    parts.push(`${khz} kHz`);
  }

  // Bit Depth if > 16 (e.g. 24-bit)
  if ((s as any).bitDepth && (s as any).bitDepth > 16) {
    parts.push(`${(s as any).bitDepth}-bit`);
  }

  // Bitrate: e.g. 1411 kbps
  if (s.bitrateKbps) {
    parts.push(`${s.bitrateKbps} kbps`);
  } else if (s.sampleRateHz) {
    const depth = (s as any).bitDepth || 16;
    const kbps = Math.round((s.sampleRateHz * depth * 2) / 1000);
    parts.push(`${kbps} kbps`);
  }

  return parts.join(' · ');
}

function nowPlaying(): DiscordNowPlaying | null {
  const { nowPlaying: np, queue, index } = usePlayer.getState();
  const audio = getAudio();
  if (!np) return null;
  const durationSec = audio && Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : np.durationSec;
  return {
    videoId: np.videoId,
    title: np.title,
    artist: np.artist,
    album: queue[index]?.track.album?.name ?? null,
    artworkUrl: np.artworkUrl ? sizedArtwork(np.artworkUrl, ART_PX) : null,
    positionMs: Math.round((audio?.currentTime ?? 0) * 1000),
    durationMs: Math.round(durationSec * 1000),
    playbackRate: audio?.playbackRate || 1,
    quality: cleanAudioQuality(),
  };
}

export function startPublisher(): () => void {
  let sent: string | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const publish = () => {
    const { status } = usePlayer.getState();
    const options = useDiscordOptions.getState().options;
    const bridge = getBridge();

    console.log('[Discord RPC] publish() running with status =', status);

    if (status === 'paused' || status === 'idle' || status === 'error') {
      if (sent === 'clear') return;
      sent = 'clear';
      console.log('[Discord RPC] Clearing presence...');
      sendDesktopPresence(null);
      discordGatewayManager.updateActivity(null, options);
      if (bridge) {
        void bridge.call('discord.presence', { track: null, options }).catch(() => (sent = null));
      }
      return;
    }

    if (status !== 'playing') return; // loading or buffering: wait for the music

    const track = nowPlaying();
    if (!track) return;

    const key = `${track.videoId}|${track.title}|${JSON.stringify(options)}`;
    sent = key;

    console.log('[Discord RPC] Publishing track presence:', track.title, 'by', track.artist);
    sendDesktopPresence(track);
    discordGatewayManager.updateActivity(track, options);
    if (bridge) {
      void bridge.call('discord.presence', { track, options }, { timeoutMs: 30_000 }).catch((err) => {
        console.error('[Discord RPC] bridge.call failed:', err);
        sent = null;
      });
    }
  };

  const soon = () => {
    clearTimeout(timer);
    timer = setTimeout(publish, 300);
  };

  let audio: HTMLMediaElement | null = null;
  const onSeeked = () => soon();
  const bindAudio = () => {
    audio?.removeEventListener('seeked', onSeeked);
    audio = getAudio();
    audio?.addEventListener('seeked', onSeeked);
  };
  bindAudio();

  const offPlayer = usePlayer.subscribe((state, before) => {
    if (getAudio() !== audio) bindAudio();
    if (
      state.nowPlaying?.videoId !== before.nowPlaying?.videoId ||
      state.nowPlaying?.title !== before.nowPlaying?.title ||
      state.status !== before.status
    ) {
      soon();
    }
  });

  const offOptions = useDiscordOptions.subscribe(() => soon());
  soon();

  return () => {
    clearTimeout(timer);
    offPlayer();
    offOptions();
    audio?.removeEventListener('seeked', onSeeked);
  };
}

/** Mounted once in the shell: publishes while an account is connected and presence is on. */
export function useDiscordPresence(): void {
  useEffect(() => {
    return startPublisher();
  }, []);
}
