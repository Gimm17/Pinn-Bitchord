import { useEffect, useState } from 'react';
import { getBridge } from './bridge';
import { isTauriDesktop } from './useExtension';

export type HostAccess = 'checking' | 'unavailable' | 'granted' | 'needed';

/** Opens the extension's permission page for [origins]. */
export function requestHostAccess(origins: readonly string[]): void {
  void getBridge()?.call('lyrics.requestPermissions', { origins: [...origins] });
}

/**
 * Whether the extension may reach every one of [origins] (its optional host
 * permissions), for Settings, with a request for the ones it may not. Asked
 * again whenever the tab comes back: the grant happens on the extension's
 * own page, in another tab.
 */
export function useHostAccess(origins: readonly string[]): { access: HostAccess; request: () => void } {
  const [granted, setGranted] = useState<string[] | null | 'unavailable'>(null);

  const isDesktop = isTauriDesktop();

  const key = origins.join(',');
  useEffect(() => {
    const list = key.split(',');
    const check = () => {
      const bridge = getBridge();
      if (!bridge) return setGranted('unavailable');
      bridge
        .call('lyrics.permissions', { origins: list })
        .then((r) => setGranted(Array.isArray(r?.granted) ? r.granted : []))
        .catch(() => setGranted('unavailable'));
    };
    check();
    const onVisible = () => document.visibilityState === 'visible' && check();
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [key]);

  if (isDesktop) return { access: 'granted', request: () => undefined };

  if (granted === null) return { access: 'checking', request: () => undefined };
  if (granted === 'unavailable') return { access: 'unavailable', request: () => undefined };
  const grantedList = Array.isArray(granted) ? granted : [];
  const missing = origins.filter((o) => !grantedList.includes(o));
  return { access: missing.length ? 'needed' : 'granted', request: () => requestHostAccess(missing) };
}
