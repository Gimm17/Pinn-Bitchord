import { useSyncExternalStore } from 'react';
import { getTheme, subscribeTheme } from './theme';

/**
 * Whether the app is currently dark, after the Light/Dark/System setting has
 * been applied (lib/theme.ts). Needed only where a colour has to be computed in
 * TypeScript and handed to an inline style, which cannot resolve a CSS custom
 * property sitting inside a theme block.
 */
export function useDarkScheme(): boolean {
  return useSyncExternalStore(
    subscribeTheme,
    () => getTheme() === 'dark',
    () => false,
  );
}
