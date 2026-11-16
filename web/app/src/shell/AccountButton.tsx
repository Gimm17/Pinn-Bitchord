import { ArrowUpRight, ChevronsUpDown, Settings } from 'lucide-react';
import { useCallback, useState } from 'react';
import { PrefetchNavLink } from '@/components/PrefetchLink';
import { Menu, MenuHeader, MenuItem, MenuSeparator } from '@/components/Menu';
import { useRefreshYtAuth, useSelectChannel, useSetConnected, useYtAuth } from '@/extension/useYtAuth';
import { useExtension } from '@/extension/useExtension';

const SIGN_IN_URL = 'https://accounts.google.com/ServiceLogin?service=youtube&continue=https://music.youtube.com/';

/* The sidebar footer's row, sized to the reference's account card. */
const row =
  'flex h-[52px] w-full min-w-0 items-center gap-2.5 rounded-2xl bg-porcelain px-2.5 text-start transition-colors hover:bg-surface-muted aria-expanded:bg-surface-muted';
const avatar = 'inline-grid flex-none place-items-center overflow-hidden rounded-full bg-accent-soft object-cover text-[11px] font-bold text-accent-ink';
const action =
  'grid size-7 flex-none place-items-center rounded-full text-tertiary transition-colors hover:bg-chrome hover:text-primary';

function Avatar({ src, name, size }: { src: string | null; name: string; size: number }) {
  return src ? (
    <img className={avatar} src={src} alt="" width={size} height={size} referrerPolicy="no-referrer" />
  ) : (
    <span className={avatar} style={{ width: size, height: size }} aria-hidden="true">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

/** "Piano" — the second line under the name, as YouTube Music words the channel. */
function channelKind(brand: boolean): string {
  return brand ? 'Brand channel' : 'YouTube Music';
}

/**
 * The sidebar's account control (reference: the card at the foot of the rail).
 *
 * There is no sign-in form (prompt §5.3): BitChord uses the YouTube session
 * this browser already has, through the extension. "Sign In" opens Google's
 * own sign-in; the extension notices the new session and this updates itself.
 */
export function AccountButton() {
  const status = useYtAuth();
  const select = useSelectChannel();
  const connect = useSetConnected();
  const refresh = useRefreshYtAuth();
  const extension = useExtension();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = useCallback(() => setAnchor(null), []);

  const settings = (
    <PrefetchNavLink to="/settings" className={action} aria-label="Settings" title="Settings">
      <Settings size={15} strokeWidth={2} />
    </PrefetchNavLink>
  );

  // No usable session (no extension, or signed out): say so, and offer the
  // one action that can change it. Never invent a name or a tier.
  if (status.state !== 'ready') {
    const label =
      status.state === 'checking' ? 'Checking account…' : extension.state === 'missing' ? 'Extension not found' : 'Not signed in';
    return (
      <div className={row}>
        <span className={avatar} style={{ width: 30, height: 30 }} aria-hidden="true">
          ?
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-bold text-primary">{label}</span>
          <span className="block truncate text-[10px] font-medium text-tertiary">
            {extension.state === 'missing' ? 'Install to sign in' : 'YouTube Music'}
          </span>
        </span>
        {settings}
      </div>
    );
  }

  const { auth } = status;

  if (!auth.browserSignedIn || !auth.connected) {
    const action = auth.browserSignedIn ? 'Connect YouTube Music' : 'Sign In';
    const card = (
      <>
        <span className={avatar} style={{ width: 30, height: 30 }} aria-hidden="true">
          {action.slice(0, 1)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-bold text-primary">{action}</span>
          <span className="block truncate text-[10px] font-medium text-tertiary">
            {auth.browserSignedIn ? 'Use this browser’s session' : 'Opens Google'}
          </span>
        </span>
      </>
    );
    return (
      <div className="flex items-center gap-1">
        {auth.browserSignedIn ? (
          <button className={row} onClick={() => connect.mutate(true)} disabled={connect.isPending}>
            {card}
          </button>
        ) : (
          <a className={row} href={SIGN_IN_URL} target="_blank" rel="noreferrer">
            {card}
            <ArrowUpRight size={13} className="flex-none text-tertiary" />
          </a>
        )}
        {settings}
      </div>
    );
  }

  if (!auth.active) {
    // Signed in to the browser, but the account couldn't be read (the reason is on the Extension page).
    return (
      <div className="flex items-center gap-1">
        <button className={row} title={auth.problem ?? undefined} onClick={() => refresh.mutate()} disabled={refresh.isPending}>
          <span className={avatar} style={{ width: 30, height: 30 }} aria-hidden="true">
            !
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-bold text-primary">
              {refresh.isPending ? 'Reading account…' : 'Retry sign-in'}
            </span>
            <span className="block truncate text-[10px] font-medium text-tertiary">YouTube didn’t answer</span>
          </span>
        </button>
        {settings}
      </div>
    );
  }

  const active = auth.active;
  const multiple = auth.accounts.flatMap((a) => a.channels).length > 1;

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          className={row}
          aria-haspopup="menu"
          aria-expanded={anchor !== null}
          onClick={(event) => setAnchor(anchor ? null : event.currentTarget)}
        >
          <Avatar src={active.avatarUrl} name={active.name} size={30} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-bold text-primary">{active.name}</span>
            <span className="block truncate text-[10px] font-medium text-tertiary">{channelKind(active.brand)}</span>
          </span>
          {multiple && <ChevronsUpDown size={13} strokeWidth={2} className="flex-none text-tertiary" />}
        </button>
        {settings}
      </div>
      {anchor && (
        <Menu anchor={anchor} placement="above-start" onClose={close} label="Account">
          {auth.accounts.map((account) => (
            <div key={account.authUser} role="group" aria-label={account.email ?? account.name}>
              <MenuHeader>{account.email ?? account.name}</MenuHeader>
              {account.channels.map((channel) => (
                <MenuItem
                  key={channel.id}
                  checked={channel.id === active.id}
                  icon={<Avatar src={channel.avatarUrl} name={channel.name} size={20} />}
                  trailing={channel.brand ? 'Brand' : undefined}
                  onSelect={() => {
                    close();
                    if (channel.id !== active.id) select.mutate(channel.id);
                  }}
                >
                  {channel.name}
                </MenuItem>
              ))}
            </div>
          ))}
          <MenuSeparator />
          <MenuItem
            onSelect={() => {
              close();
              window.open(SIGN_IN_URL.replace('ServiceLogin', 'AddSession'), '_blank', 'noreferrer');
            }}
            trailing={<ArrowUpRight size={13} />}
          >
            Add Account
          </MenuItem>
          <MenuItem
            destructive
            onSelect={() => {
              close();
              connect.mutate(false);
            }}
          >
            Disconnect from BitChord
          </MenuItem>
        </Menu>
      )}
    </>
  );
}
