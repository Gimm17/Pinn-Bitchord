import { PageHeader } from '@/components/PageHeader';
import { useDiscord } from '@/extension/useDiscord';
import { DiscordSettings } from './IntegrationSettings';
import { settingsUi } from './settingsStyles';

/**
 * Discord rich presence, for the desktop build. There is no Discord account to
 * log into: BitChord writes its presence straight to the running Discord client
 * over Discord's local IPC pipe (`src-tauri/src/discord.rs`), which is the same
 * route the official SDKs use. The only requirement is the Discord desktop app.
 */
export default function DiscordSettingsPage() {
  const discord = useDiscord();
  const state = discord.state === 'ready' ? discord.discord : null;
  const connected = state?.connected ?? false;

  return (
    <div className={settingsUi.centered}>
      <PageHeader title="Discord" />
      <div className={settingsUi.body}>
        <section className={settingsUi.group}>
          <div className="flex flex-col gap-1 px-4 py-[11px]">
            <span className="flex items-center gap-2 type-title-3 text-primary">
              <span
                className={`size-[7px] flex-none rounded-full ${connected ? 'bg-success' : 'bg-warning'}`}
                aria-hidden="true"
              />
              {connected ? 'Discord desktop detected' : 'Discord desktop not running'}
            </span>
            <span className="type-callout text-secondary">
              {connected
                ? 'Presence is sent automatically — play a song and it shows on your Discord profile.'
                : 'Rich Presence goes straight to the Discord app on this PC. Open the Discord desktop app (not Discord in a browser), then play a song. No login or token needed.'}
            </span>
            {connected && !state?.enabled && (
              <span className="type-callout text-warning">Presence is turned off below.</span>
            )}
          </div>
        </section>

        <h2 className={settingsUi.sectionHeader}>Presence</h2>
        <DiscordSettings />

        <p className={settingsUi.footer}>
          Sent over Discord’s local RPC pipe, so it needs the Discord desktop app running. Button text can use{' '}
          {'{song_name}'}, {'{artist_name}'} and {'{album_name}'}.
        </p>
      </div>
    </div>
  );
}
