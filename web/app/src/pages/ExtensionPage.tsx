import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import type { YtAuthState, SpotifyAuthState } from '@bitchord/shared/bridge';
import {
  Activity,
  CheckCircle2,
  Copy,
  Cpu,
  Eye,
  EyeOff,
  Gauge,
  LogOut,
  RefreshCw,
  Settings,
  XCircle,
  Zap,
} from 'lucide-react';
import { FaChrome, FaFirefoxBrowser } from 'react-icons/fa';
import { SiDiscord, SiSpotify, SiYoutubemusic } from 'react-icons/si';
import { showToast } from '@/components/Toast';
import { isTauriDesktop, useExtension, extensionQueryKey } from '@/extension/useExtension';
import { useYtAuth } from '@/extension/useYtAuth';
import { useSpotifyAuth } from '@/extension/useSpotifyAuth';
import { useDiscordGateway } from '@/playback/discordGateway';
import { leaveParty, useParty } from '@/party/listenTogether';
import { usePlayer } from '@/state/player';
import { queryClient } from '@/lib/queryClient';
import { config } from '@/config';

/**
 * Extension & Desktop Bridge.
 *
 * Every figure on this page is read from live state, because the earlier build
 * printed a fixed "Port 48922", a fabricated "0.4 ms", an invented
 * `alex.rivers@bitchord.audio` account and a literal `bc_live_…` relay token
 * next to buttons that only showed a toast. What the sources actually are:
 *
 *   Engine status / transport / capabilities  ← the bridge's own `ping`
 *   Stream latency                            ← a timed round trip of that ping
 *   Browser cards                             ← `ping`'s browser family, or the
 *                                               native bridge when running in Tauri
 *   YouTube / Spotify rows                    ← useYtAuth, useSpotifyAuth
 *   Discord row                               ← the local gateway store
 *   Session token                             ← the party membership in sessionStorage
 *
 * The download links are drawn only where the zips are actually served (the
 * web build); the desktop app talks to Rust directly and needs no extension,
 * so it says so instead of offering a file that isn't there.
 */

const PILL_OK = 'rounded bg-success-soft px-2 py-0.5 text-[9px] font-bold whitespace-nowrap text-success';
const PILL_OFF = 'rounded bg-surface-muted px-2 py-0.5 text-[9px] font-bold whitespace-nowrap text-secondary';
const PILL_WARN = 'rounded bg-warning-soft px-2 py-0.5 text-[9px] font-bold whitespace-nowrap text-warning';
const CARD = 'rounded-2xl border border-border-subtle bg-porcelain shadow-2xs';
const ROW = 'flex flex-col gap-2.5 p-3.5 sm:flex-row sm:items-center sm:justify-between';
const ACTION =
  'flex h-8 items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-muted px-3 text-[11px] font-bold text-primary transition-colors hover:bg-chrome disabled:opacity-50';
/** The accent action is its own class, not ACTION with overrides: two `bg-*` utilities in one
 *  string resolve by stylesheet order, which put the pale fill under the white label. */
const ACTION_ACCENT =
  'flex h-8 items-center gap-1.5 rounded-lg border border-accent bg-accent px-3 text-[11px] font-bold text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50';
const KICKER = 'text-[10px] font-bold tracking-[0.1em] text-ink-muted uppercase';

function browserFamily(family: string | undefined): string {
  if (family === 'firefox') return 'Gecko / WebExtensions';
  if (family === 'chromium') return 'Chromium / MV3';
  return 'Unknown';
}

function transportLabel(transport: string): string {
  return transport === 'relay' ? 'Content-script relay' : 'Native IPC';
}

/** An in-process IPC round trip lands under 0.1 ms, so one decimal would read as a fake zero. */
function formatMs(ms: number): string {
  return ms < 10 ? `${ms.toFixed(2)} ms` : `${ms.toFixed(1)} ms`;
}

/** How this build reaches the network, in the words the page uses. */
function pipeLabel(desktop: boolean, transport: string | null): string {
  if (desktop) return 'Tauri IPC · reqwest';
  if (!transport) return 'No transport';
  return transport === 'relay' ? 'postMessage relay' : 'extension messaging';
}

/**
 * Median of a few timed `ping` round trips. This is the only latency the page
 * can honestly report: the webview can't see the OS mixer, and an earlier
 * build printed an invented "0.4 ms" audio figure here.
 */
function useBridgeProbe() {
  const extension = useExtension();
  const present = extension.state === 'present' ? extension.extension : null;
  const [ms, setMs] = useState<number | null>(null);
  const [probing, setProbing] = useState(false);

  const probe = useCallback(async (): Promise<number | null> => {
    if (!present) {
      setMs(null);
      return null;
    }
    setProbing(true);
    const samples: number[] = [];
    try {
      for (let i = 0; i < 5; i++) {
        const started = performance.now();
        await present.bridge.call('ping', {}, { timeoutMs: 4000 });
        samples.push(performance.now() - started);
      }
      samples.sort((a, b) => a - b);
      const median = samples[Math.floor(samples.length / 2)] ?? null;
      setMs(median);
      return median;
    } catch {
      setMs(null);
      return null;
    } finally {
      setProbing(false);
    }
  }, [present]);

  useEffect(() => {
    void probe();
  }, [probe]);

  return { ms, probing, probe };
}

export default function ExtensionPage() {
  const navigate = useNavigate();
  const desktop = isTauriDesktop();

  const extension = useExtension();
  const yt = useYtAuth();
  const spotify = useSpotifyAuth();
  const discord = useDiscordGateway();
  const party = useParty();
  const nowPlaying = usePlayer((s) => s.nowPlaying);

  const { ms: latency, probing, probe } = useBridgeProbe();
  const [tokenHidden, setTokenHidden] = useState(true);
  const [leaving, setLeaving] = useState(false);

  const info = extension.state === 'present' ? extension.extension.info : null;
  const transport = extension.state === 'present' ? extension.extension.bridge.transport : null;
  const capabilities = info?.capabilities ?? [];

  const ytAuth = yt.state === 'ready' ? yt.auth : null;
  const spotifyAuth = spotify.state === 'ready' ? spotify.auth : null;
  const stream = nowPlaying?.stream ?? null;

  const partyToken = party.code ? readPartyToken() : null;
  const connected = [ytAuth?.signedIn, spotifyAuth?.signedIn, discord.gatewayStatus === 'ready'].filter(Boolean).length;

  const recheck = async () => {
    await queryClient.invalidateQueries({ queryKey: extensionQueryKey });
    const answered = await probe();
    showToast(
      answered === null
        ? 'The bridge did not answer'
        : `Bridge answered in ${formatMs(answered)}`,
    );
  };

  const copyDiagnostics = async () => {
    const report = {
      app: __APP_VERSION__,
      desktop,
      bridge: info,
      transport,
      latencyMs: latency === null ? null : +latency.toFixed(2),
      youtube: ytAuth,
      spotify: spotifyAuth,
      discord: { status: discord.gatewayStatus, user: discord.user?.name ?? null, problem: discord.problem },
      party: { code: party.code, connection: party.connection, roundTripMs: party.roundTripMs, members: party.members.length },
      stream,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      showToast('Diagnostics copied to the clipboard');
    } catch {
      showToast('The clipboard is not available');
    }
  };

  const leave = async () => {
    setLeaving(true);
    try {
      await leaveParty();
      setTokenHidden(true);
      showToast('Left the party');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not leave the party');
    } finally {
      setLeaving(false);
    }
  };

  return (
    <div className="mx-(--body-gutter) flex flex-col gap-6 py-6 pb-20 select-none">
      {/* Header, as the reference lays it out: state pill, title, then the actions. */}
      <header className="flex flex-col justify-between gap-4 border-b border-border-subtle/60 pb-5 md:flex-row md:items-end">
        <div className="min-w-0">
          <span
            className={`mb-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${
              info ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
            }`}
          >
            <span className={`size-1.5 rounded-full ${info ? 'bg-success' : 'bg-danger'}`} />
            {info ? `BRIDGE CORE v${info.version} • ACTIVE` : 'BRIDGE • OFFLINE'}
          </span>
          <h1 className="text-3xl font-extrabold tracking-[-0.02em] text-primary">Extension &amp; Desktop Bridge</h1>
          <p className="mt-1 max-w-xl text-xs leading-[1.6] text-ink-muted">
            {desktop
              ? 'The desktop build reaches YouTube and Spotify through its own native bridge — no browser extension required.'
              : 'How the page reaches YouTube, Spotify and Discord, and the accounts it uses to do it.'}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => void recheck()} disabled={probing} className={ACTION}>
            <RefreshCw size={13} className={probing ? 'animate-spin' : undefined} />
            <span>{probing ? 'Probing…' : 'Re-check Bridge'}</span>
          </button>
          <button type="button" onClick={() => navigate('/settings')} className={ACTION_ACCENT}>
            <Settings size={13} />
            <span>Settings</span>
          </button>
        </div>
      </header>

      {/* Three metrics, each read from the ping or a timed round trip. */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard
          icon={<Zap size={18} />}
          tint="bg-success-soft text-success"
          label="Engine Status"
          value={extension.state === 'checking' ? 'Checking…' : info ? 'Connected' : 'Offline'}
          detail={info ? `v${info.version} · protocol ${info.protocol}` : 'Nothing answered the ping'}
          tone={info ? 'ok' : 'bad'}
        />
        <MetricCard
          icon={<Cpu size={18} />}
          tint="bg-accent-soft text-accent-ink"
          label="I/O Pipe"
          value={pipeLabel(desktop, transport)}
          detail={
            transport
              ? `${capabilities.length} capabilities · ${browserFamily(info?.browser)}`
              : 'The bridge reported no transport'
          }
        />
        <MetricCard
          icon={<Gauge size={18} />}
          tint="bg-warning-soft text-warning"
          label="Round Trip"
          value={probing ? 'Measuring…' : latency === null ? '—' : formatMs(latency)}
          detail={latency === null ? 'No answer to time' : 'Median of five pings to the bridge'}
        />
      </div>

      {/* Browser extensions. Only the web build can use one, so only it offers the zips. */}
      <section className="flex flex-col gap-3" aria-label="Browser extensions">
        <div>
          <h2 className="text-sm font-extrabold text-primary">Browser Extensions</h2>
          <p className="text-[11px] text-ink-muted">
            {desktop
              ? 'Not used by this build: the desktop app makes its own requests through Rust.'
              : 'Carries the requests a web page cannot make itself.'}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <BrowserCard
            icon={<FaChrome size={20} />}
            name="Chrome / Brave / Edge / Opera"
            note="Manifest v3 · background service worker"
            family="chromium"
            desktop={desktop}
            reported={info?.browser}
            downloadHref={desktop ? null : config.extensionChromeUrl}
          />
          <BrowserCard
            icon={<FaFirefoxBrowser size={20} />}
            name="Firefox &amp; LibreWolf"
            note="WebExtensions API v2"
            family="firefox"
            desktop={desktop}
            reported={info?.browser}
            downloadHref={desktop ? null : config.extensionFirefoxUrl}
          />
        </div>
      </section>

      {/* The accounts, each bound to the hook that owns it. */}
      <section className="flex flex-col gap-3" aria-label="Integrations">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-primary">Streaming &amp; Social Integrations</h2>
          <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[10px] font-bold text-accent-ink">
            {connected} of 3 connected
          </span>
        </div>

        <div className={`${CARD} divide-y divide-border-subtle/50 px-2`}>
          <div className={ROW}>
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-9 flex-none items-center justify-center rounded-xl bg-[#E03131]/12 text-[#E03131]">
                <SiYoutubemusic size={17} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-primary">YouTube Music</span>
                  <span className={ytAuth?.signedIn ? PILL_OK : ytAuth?.browserSignedIn ? PILL_WARN : PILL_OFF}>
                    {yt.state === 'checking'
                      ? 'Checking'
                      : yt.state === 'unavailable'
                        ? 'No bridge'
                        : ytAuth?.signedIn
                          ? 'Connected'
                          : ytAuth?.browserSignedIn
                            ? 'Not linked'
                            : 'Signed out'}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-ink-muted">{youtubeDetail(ytAuth, yt.state)}</p>
              </div>
            </div>
            <button type="button" onClick={() => navigate('/settings')} className={ACTION}>
              Manage
            </button>
          </div>

          <div className={ROW}>
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-9 flex-none items-center justify-center rounded-xl bg-[#1DB954]/14 text-[#1DB954]">
                <SiSpotify size={17} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-primary">Spotify Web API</span>
                  <span className={spotifyAuth?.signedIn ? PILL_OK : spotifyAuth?.browserSignedIn ? PILL_WARN : PILL_OFF}>
                    {spotify.state === 'checking'
                      ? 'Checking'
                      : spotify.state === 'unavailable'
                        ? 'No bridge'
                        : spotifyAuth?.signedIn
                          ? 'Authorized'
                          : spotifyAuth?.browserSignedIn
                            ? 'Not authorized'
                            : 'Signed out'}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-ink-muted">{spotifyDetail(spotifyAuth, spotify.state)}</p>
              </div>
            </div>
            <button type="button" onClick={() => navigate('/settings')} className={ACTION}>
              Manage
            </button>
          </div>

          <div className={ROW}>
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-9 flex-none items-center justify-center rounded-xl bg-[#5865F2]/14 text-[#5865F2]">
                <SiDiscord size={17} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-primary">Discord Rich Presence</span>
                  <span className={statusPillClass(discord.gatewayStatus)}>{statusPillText(discord)}</span>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-ink-muted">{discordDetail(discord, nowPlaying)}</p>
              </div>
            </div>
            {discord.token ? (
              <label className="flex flex-none items-center gap-2 text-[11px] font-semibold text-secondary">
                <span>{discord.enabled ? 'On' : 'Off'}</span>
                <input
                  type="checkbox"
                  checked={discord.enabled}
                  onChange={(e) => discord.setEnabled(e.currentTarget.checked)}
                  className="size-4 accent-[var(--accentSlate)]"
                />
              </label>
            ) : (
              <button type="button" onClick={() => navigate('/settings/discord')} className={ACTION}>
                Connect
              </button>
            )}
          </div>
        </div>
      </section>

      {/* The session the party server issued, if there is one. */}
      <section className={`${CARD} flex flex-col gap-4 p-5`} aria-label="Listen Together session">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
            <h2 className="text-[10px] font-bold tracking-[0.1em] text-primary uppercase">Listen Together Session</h2>
          </div>
          <span className="font-mono text-[10px] text-ink-muted">
            {party.code ? `Room ${party.code} · ${party.members.length}/${party.maxMembers}` : 'No party'}
          </span>
        </div>

        {party.code && partyToken ? (
          <>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="min-w-0 flex-1 truncate rounded-xl border border-border-subtle bg-surface-muted px-3.5 py-2 font-mono text-[11px] text-primary select-all">
                {tokenHidden ? '•'.repeat(Math.min(partyToken.length, 44)) : partyToken}
              </div>
              <div className="flex flex-none gap-2">
                <button type="button" onClick={() => setTokenHidden((v) => !v)} className={ACTION}>
                  {tokenHidden ? <Eye size={13} /> : <EyeOff size={13} />}
                  <span>{tokenHidden ? 'Reveal' : 'Hide'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(partyToken)
                      .then(() => showToast('Session token copied'))
                      .catch(() => showToast('The clipboard is not available'));
                  }}
                  className={ACTION}
                >
                  <Copy size={13} />
                  <span>Copy</span>
                </button>
                <button type="button" onClick={() => void leave()} disabled={leaving} className={ACTION}>
                  <LogOut size={13} />
                  <span>{leaving ? 'Leaving…' : 'Leave'}</span>
                </button>
              </div>
            </div>
            <p className="text-[11px] leading-[1.5] text-ink-muted">
              Issued by the party server when you joined; the relay rejects any other. It expires with the session —
              there is nothing to regenerate.
            </p>
          </>
        ) : (
          <p className="rounded-xl border border-border-subtle bg-surface-muted px-3.5 py-3 text-[11px] text-secondary">
            {party.code
              ? 'The session record is missing its token, so requests to the party server will be refused. Leave and rejoin to get a new one.'
              : 'Join or host a party from Settings → Listen Together and the session token appears here.'}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle/60 pt-3">
          <span className="flex items-center gap-1.5 text-[11px] text-ink-muted">
            <Activity size={12} />
            {party.code
              ? party.connection === 'live'
                ? `Live · ${party.clockSynced ? `${Math.round(party.roundTripMs)} ms round trip` : 'clock syncing'}`
                : party.connection === 'connecting'
                  ? 'Connecting…'
                  : party.error ?? 'Offline'
              : stream
                ? `${stream.codec?.toUpperCase() ?? 'Audio'}${stream.bitrateKbps ? ` · ${stream.bitrateKbps} kbps` : ''}`
                : 'Nothing playing'}
          </span>
          <button type="button" onClick={() => void copyDiagnostics()} className={ACTION}>
            <Copy size={13} />
            <span>Copy Diagnostics</span>
          </button>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  icon,
  tint,
  label,
  value,
  detail,
  tone,
}: {
  icon: ReactNode;
  tint: string;
  label: string;
  value: string;
  detail: string;
  tone?: 'ok' | 'bad';
}) {
  return (
    <div className={`${CARD} flex items-start gap-3 p-4`}>
      <div className={`flex size-9 flex-none items-center justify-center rounded-xl ${tint}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <span className={KICKER}>{label}</span>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="truncate text-sm font-extrabold text-primary">{value}</span>
          {tone === 'ok' && <CheckCircle2 size={13} className="flex-none text-success" />}
          {tone === 'bad' && <XCircle size={13} className="flex-none text-danger" />}
        </div>
        <p className="mt-0.5 truncate text-[11px] text-ink-muted">{detail}</p>
      </div>
    </div>
  );
}

function BrowserCard({
  icon,
  name,
  note,
  family,
  desktop,
  reported,
  downloadHref,
}: {
  icon: ReactNode;
  name: string;
  note: string;
  family: 'chromium' | 'firefox';
  desktop: boolean;
  reported: string | undefined;
  downloadHref: string | null;
}) {
  const answering = !desktop && reported === family;
  const status = desktop ? 'Desktop bridge' : answering ? 'Answering' : reported ? 'Not this one' : 'Not detected';
  const tone = desktop ? PILL_OFF : answering ? PILL_OK : PILL_OFF;

  return (
    <div className={`${CARD} flex flex-col justify-between gap-4 p-4`}>
      <div className="flex items-start gap-3">
        <div className="flex size-9 flex-none items-center justify-center rounded-xl bg-chrome text-accent-ink">{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xs font-bold text-primary">{name}</h3>
            <span className={tone}>{status}</span>
          </div>
          <p className="mt-1 text-[11px] leading-[1.5] text-ink-muted">{note}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border-subtle/60 pt-3">
        <span className="text-[11px] font-semibold text-secondary">
          {desktop ? 'Not required here' : answering ? 'Connected' : 'Idle'}
        </span>
        {downloadHref ? (
          <a
            href={downloadHref}
            download
            className="flex h-8 items-center rounded-lg bg-accent px-3 text-[11px] font-bold text-on-accent shadow-2xs transition-colors hover:bg-accent-hover"
          >
            Download
          </a>
        ) : (
          <span className="text-[11px] text-ink-muted">Built in</span>
        )}
      </div>
    </div>
  );
}

function statusPillClass(status: string): string {
  if (status === 'ready') return PILL_OK;
  if (status === 'connecting' || status === 'error') return PILL_WARN;
  return PILL_OFF;
}

interface DiscordRow {
  token: string | null;
  enabled: boolean;
  gatewayStatus: string;
  problem: string | null;
  user: { name: string } | null;
}

function statusPillText(discord: DiscordRow): string {
  if (!discord.token) return 'Not set up';
  if (discord.gatewayStatus === 'ready') return 'Broadcasting';
  if (discord.gatewayStatus === 'connecting') return 'Connecting';
  if (discord.gatewayStatus === 'error') return 'Error';
  return discord.enabled ? 'Disconnected' : 'Paused';
}

function discordDetail(discord: DiscordRow, nowPlaying: { title: string; artist: string } | null): string {
  if (!discord.token) return 'Add a Discord token in Settings to show what you play';
  if (discord.problem) return discord.problem;
  const as = discord.user ? `as ${discord.user.name}` : 'signed in';
  return nowPlaying ? `${as} · ${nowPlaying.title} — ${nowPlaying.artist}` : `${as} · nothing playing`;
}

/** Words for the YouTube row, from the only state the bridge reports. */
function youtubeDetail(auth: YtAuthState | null, state: 'checking' | 'unavailable' | 'ready'): string {
  if (state === 'checking') return 'Reading the browser session';
  if (state === 'unavailable') return 'This build talks to YouTube through its own transport';
  if (!auth) return 'No session reported';
  if (auth.active) return `${auth.active.name}${auth.active.handle ? ` · ${auth.active.handle}` : ''}`;
  if (auth.problem) return auth.problem;
  if (auth.browserSignedIn) return `${auth.accounts.length} account${auth.accounts.length === 1 ? '' : 's'} found, none selected`;
  return 'No YouTube session in this browser';
}

function spotifyDetail(auth: SpotifyAuthState | null, state: 'checking' | 'unavailable' | 'ready'): string {
  if (state === 'checking') return 'Reading the browser session';
  if (state === 'unavailable') return 'The bridge reports no Spotify capability';
  if (!auth) return 'No session reported';
  if (auth.user?.name) return `Signed in as ${auth.user.name}`;
  if (auth.problem) return auth.problem;
  if (auth.browserSignedIn && !auth.connected) return 'Disconnected in Settings';
  if (auth.browserSignedIn) return 'Open Spotify in this browser to authorise';
  return 'No Spotify session in this browser';
}

/** The membership token party/listenTogether.ts writes with the rest of the session. */
function readPartyToken(): string | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem('bitchord:party-session') ?? 'null') as { token?: string } | null;
    return typeof saved?.token === 'string' && saved.token ? saved.token : null;
  } catch {
    return null;
  }
}
