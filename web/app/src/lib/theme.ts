/*
 * Appearance. The OS preference is the default; Settings can pin light or dark.
 * `index.html` resolves the stored choice before first paint so the window does
 * not flash; this module owns it from then on and keeps `data-theme` current
 * when the OS flips while "System" is selected.
 *
 * tokens.css keys its dark block off `:root[data-theme='dark']` rather than a
 * `prefers-color-scheme` media query precisely because a media query cannot be
 * overridden by a setting.
 */
export type ThemePref = 'system' | 'light' | 'dark';

const KEY = 'bitchord:theme';
const dark = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
const listeners = new Set<() => void>();

function read(): ThemePref {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    // Private window or blocked storage: fall through to the default.
  }
  // The reference artboards are the light ceramic; dark is an opt-in.
  return 'light';
}

let pref: ThemePref = read();
let resolved: 'light' | 'dark' = 'light';

function apply(): void {
  resolved = pref === 'system' ? (dark?.matches ? 'dark' : 'light') : pref;
  document.documentElement.dataset.theme = resolved;
}

export function themePref(): ThemePref {
  return pref;
}

export function getTheme(): 'light' | 'dark' {
  return resolved;
}

export function setThemePref(next: ThemePref): void {
  pref = next;
  try {
    if (next === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, next);
  } catch {
    // Not persisting is better than not switching.
  }
  apply();
  for (const fn of listeners) fn();
}

export function subscribeTheme(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

dark?.addEventListener('change', () => {
  if (pref !== 'system') return;
  apply();
  for (const fn of listeners) fn();
});

apply();
