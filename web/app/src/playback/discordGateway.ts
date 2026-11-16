import type { DiscordNowPlaying, DiscordPresenceOptions } from '@bitchord/shared/bridge';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const APPLICATION_ID = '1543679166967193620';
const GATEWAY_URL = 'wss://gateway.discord.gg/?v=9&encoding=json';
const API_URL = 'https://discord.com/api/v9';
const PROJECT_URL = 'https://github.com/kushagrasinghx/BitChord';
const DEFAULT_BUTTON_1 = 'Listen on YouTube Music';
const DEFAULT_BUTTON_2 = 'Visit BitChord';

export interface DiscordUser {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
}

interface DiscordGatewayStore {
  token: string | null;
  user: DiscordUser | null;
  enabled: boolean;
  gatewayStatus: 'off' | 'connecting' | 'ready' | 'error';
  problem: string | null;
  setToken: (token: string, user: DiscordUser) => void;
  setEnabled: (enabled: boolean) => void;
  clearAccount: () => void;
  setStatus: (status: 'off' | 'connecting' | 'ready' | 'error', problem?: string | null) => void;
}

export const useDiscordGateway = create<DiscordGatewayStore>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      enabled: true,
      gatewayStatus: 'off',
      problem: null,
      setToken: (token, user) => set({ token, user, enabled: true, problem: null }),
      setEnabled: (enabled) => set({ enabled }),
      clearAccount: () => set({ token: null, user: null, gatewayStatus: 'off', problem: null }),
      setStatus: (gatewayStatus, problem = null) => set({ gatewayStatus, problem }),
    }),
    {
      name: 'bitchord:discord_gateway_account',
      partialize: (s) => ({ token: s.token, user: s.user, enabled: s.enabled }),
    },
  ),
);

/** Validate Discord token against Discord REST API */
export async function verifyDiscordToken(token: string): Promise<DiscordUser> {
  const cleanToken = token.trim().replace(/^["']|["']$/g, '');
  const res = await fetch(`${API_URL}/users/@me`, {
    headers: {
      Authorization: cleanToken,
    },
  });

  if (res.status === 401) {
    throw new Error('Token Discord tidak valid atau sudah kadaluarsa.');
  }
  if (!res.ok) {
    throw new Error(`Gagal menghubungi server Discord (${res.status})`);
  }

  const me = (await res.json()) as { id: string; username: string; global_name?: string | null; avatar?: string | null };
  return {
    id: me.id,
    username: me.username,
    name: me.global_name || me.username,
    avatarUrl: me.avatar ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png` : null,
  };
}

let superProps: string | null = null;
function getSuperProperties(): string {
  if (!superProps) {
    superProps = btoa(
      JSON.stringify({
        os: 'Windows',
        browser: 'Discord Client',
        device: '',
        system_locale: 'en-US',
        browser_user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        browser_version: '120.0.0.0',
        os_version: '10',
        release_channel: 'stable',
        client_build_number: 352675,
      }),
    );
  }
  return superProps;
}

const artworkCache = new Map<string, string | null>();

/** ExternalAssets mirror: Discord CDN mirror of external image so Discord can draw it without broken dice fallback */
async function getExternalAsset(token: string, imageUrl: string): Promise<string | null> {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('mp:')) return imageUrl;
  if (artworkCache.has(imageUrl)) return artworkCache.get(imageUrl)!;

  try {
    const cleanToken = token.trim().replace(/^["']|["']$/g, '');
    const res = await fetch(`https://discord.com/api/v9/applications/${APPLICATION_ID}/external-assets`, {
      method: 'POST',
      headers: {
        Authorization: cleanToken,
        'X-Super-Properties': getSuperProperties(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ urls: [imageUrl] }),
    });

    if (res.ok) {
      const data = (await res.json()) as { url?: string; external_asset_path?: string }[];
      const path = data[0]?.external_asset_path;
      if (path) {
        const mpUrl = `mp:${path}`;
        artworkCache.set(imageUrl, mpUrl);
        if (artworkCache.size > 50) {
          const firstKey = artworkCache.keys().next().value;
          if (firstKey) artworkCache.delete(firstKey);
        }
        return mpUrl;
      }
    } else {
      console.warn('[Discord Gateway] External asset fetch returned status:', res.status);
    }
  } catch (err) {
    console.warn('[Discord Gateway] Failed to resolve external asset:', err);
  }

  return null;
}

function resolveVariables(text: string, track: DiscordNowPlaying): string {
  return text
    .replaceAll('{song_name}', track.title)
    .replaceAll('{artist_name}', track.artist)
    .replaceAll('{album_name}', track.album ?? '');
}

class DiscordGatewayManager {
  private socket: WebSocket | null = null;
  private heartbeatTimer: ReturnType<typeof setTimeout> | undefined;
  private sequence: number | null = null;
  private sessionId: string | null = null;
  private isConnected = false;
  private lastPresence: any = null;
  private currentTrackKey = '';

  init() {
    const { token, enabled } = useDiscordGateway.getState();
    if (token && enabled) {
      this.connect();
    }

    useDiscordGateway.subscribe((state, prev) => {
      if (state.token !== prev.token || state.enabled !== prev.enabled) {
        if (state.token && state.enabled) {
          this.connect();
        } else {
          this.disconnect();
        }
      }
    });
  }

  connect() {
    const { token, enabled } = useDiscordGateway.getState();
    if (!token || !enabled) return;

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    useDiscordGateway.getState().setStatus('connecting');
    console.log('[Discord Gateway] Connecting to Discord Gateway...');

    try {
      this.socket = new WebSocket(GATEWAY_URL);

      this.socket.onopen = () => {
        console.log('[Discord Gateway] WebSocket connection opened');
      };

      this.socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          this.handlePayload(payload);
        } catch (e) {
          console.warn('[Discord Gateway] Error parsing payload:', e);
        }
      };

      this.socket.onerror = (e) => {
        console.error('[Discord Gateway] WebSocket error:', e);
        useDiscordGateway.getState().setStatus('error', 'Koneksi ke gateway Discord gagal.');
      };

      this.socket.onclose = (event) => {
        console.log('[Discord Gateway] WebSocket closed:', event.code, event.reason);
        this.cleanup();
        if (event.code === 4004) {
          useDiscordGateway.getState().setStatus('error', 'Token Discord ditolak. Silakan login kembali.');
          return;
        }
        // Auto-reconnect after 5s if still enabled
        const { token, enabled } = useDiscordGateway.getState();
        if (token && enabled) {
          useDiscordGateway.getState().setStatus('connecting');
          setTimeout(() => this.connect(), 5000);
        } else {
          useDiscordGateway.getState().setStatus('off');
        }
      };
    } catch (e) {
      console.error('[Discord Gateway] Failed to open socket:', e);
      useDiscordGateway.getState().setStatus('error', String(e));
    }
  }

  disconnect() {
    this.cleanup();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    useDiscordGateway.getState().setStatus('off');
  }

  private cleanup() {
    this.isConnected = false;
    clearTimeout(this.heartbeatTimer);
  }

  private send(op: number, d: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ op, d }));
    }
  }

  private handlePayload(payload: { op: number; d: any; s?: number; t?: string }) {
    if (typeof payload.s === 'number') {
      this.sequence = payload.s;
    }

    switch (payload.op) {
      case 10: {
        // HELLO: start heartbeats & identify
        const interval = payload.d.heartbeat_interval;
        this.startHeartbeat(interval);
        this.identify();
        break;
      }
      case 11: {
        // HEARTBEAT ACK
        break;
      }
      case 0: {
        // DISPATCH
        if (payload.t === 'READY') {
          console.log('[Discord Gateway] Ready! User authenticated:', payload.d?.user?.username);
          this.sessionId = payload.d?.session_id;
          this.isConnected = true;
          useDiscordGateway.getState().setStatus('ready');
          if (this.lastPresence) {
            this.send(3, this.lastPresence);
          }
        }
        break;
      }
      case 7: {
        // RECONNECT
        this.socket?.close();
        break;
      }
      case 9: {
        // INVALID SESSION
        setTimeout(() => this.identify(), 200);
        break;
      }
    }
  }

  private startHeartbeat(interval: number) {
    clearTimeout(this.heartbeatTimer);
    const beat = () => {
      this.send(1, this.sequence);
      this.heartbeatTimer = setTimeout(beat, interval);
    };
    this.heartbeatTimer = setTimeout(beat, interval * Math.random());
  }

  private identify() {
    const { token } = useDiscordGateway.getState();
    if (!token) return;

    console.log('[Discord Gateway] Identifying with Discord...');
    this.send(2, {
      token: token.trim().replace(/^["']|["']$/g, ''),
      capabilities: 16381,
      properties: {
        os: 'Windows',
        browser: 'Discord Client',
        device: '',
        system_locale: 'en-US',
        browser_user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        browser_version: '120.0.0.0',
        os_version: '10',
        release_channel: 'stable',
        client_build_number: 352675,
      },
      presence: {
        status: 'online',
        since: 0,
        activities: [],
        afk: false,
      },
      compress: false,
      client_state: {
        guild_versions: {},
        highest_last_message_id: '0',
        read_state_version: 0,
        user_guild_settings_version: -1,
        user_settings_version: -1,
        private_channels_version: '0',
        api_code_version: 0,
      },
    });
  }

  async updateActivity(track: DiscordNowPlaying | null, options: DiscordPresenceOptions) {
    if (!track) {
      this.currentTrackKey = '';
      this.lastPresence = {
        since: 0,
        activities: [],
        status: options.status || 'online',
        afk: false,
      };
      if (this.isConnected) {
        this.send(3, this.lastPresence);
      }
      return;
    }

    const trackKey = `${track.videoId}|${track.title}|${track.positionMs}`;
    this.currentTrackKey = trackKey;

    const { token } = useDiscordGateway.getState();
    let largeImage: string | undefined = undefined;

    // Resolve artwork to Discord media proxy so it renders the true cover instead of fallback dice
    if (token && track.artworkUrl) {
      const resolved = await getExternalAsset(token, track.artworkUrl);
      if (resolved) {
        largeImage = resolved;
      }
    }

    // Check if another song or pause occurred while awaiting asset
    if (this.currentTrackKey !== trackKey) return;

    const now = Date.now();
    const rate = track.playbackRate > 0 ? track.playbackRate : 1;
    const start = Math.round(now - track.positionMs / rate);
    const end = Math.round(now + Math.max(0, track.durationMs - track.positionMs) / rate);

    const rawName = options.activityName?.trim();
    const name = !rawName || rawName.toLowerCase() === 'chamomile' ? 'BitChord' : rawName;

    const watchUrl = track.videoId ? `https://music.youtube.com/watch?v=${track.videoId}` : PROJECT_URL;
    const buttons: string[] = [];
    const buttonUrls: string[] = [];

    if (options.button1Visible) {
      buttons.push(resolveVariables(options.button1Text || DEFAULT_BUTTON_1, track));
      buttonUrls.push(watchUrl);
    }
    if (options.button2Visible) {
      buttons.push(resolveVariables(options.button2Text || DEFAULT_BUTTON_2, track));
      buttonUrls.push(PROJECT_URL);
    }

    const qualityText = track.quality || 'FLAC · 44.1 kHz · 1411 kbps';
    const largeText = qualityText;

    const activity: any = {
      name,
      type: options.activityType === 'playing' ? 0 : options.activityType === 'watching' ? 3 : options.activityType === 'competing' ? 5 : 2,
      details: rate !== 1 ? `${track.title} [${rate.toFixed(2)}x]` : track.title,
      state: track.artist,
      status_display_type: options.useDetails ? 2 : 1,
      timestamps: {
        start,
        ...(track.durationMs > 0 && { end }),
      },
      assets: {
        ...(largeImage && { large_image: largeImage }),
        large_text: largeText.slice(0, 128),
      },
      application_id: APPLICATION_ID,
    };

    if (buttons.length > 0) {
      activity.buttons = buttons;
      activity.metadata = { button_urls: buttonUrls };
    }

    this.lastPresence = {
      since: 0,
      activities: [activity],
      status: options.status || 'online',
      afk: false,
    };

    if (this.isConnected) {
      console.log('[Discord Gateway] Sending PRESENCE_UPDATE:', track.title, 'artwork:', largeImage ? 'resolved' : 'none');
      this.send(3, this.lastPresence);
    }
  }
}

export const discordGatewayManager = new DiscordGatewayManager();
