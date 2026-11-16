import { detectExtension, getStaticTauriBridge, type DetectedExtension } from '@bitchord/shared/bridge';
import { useQuery } from '@tanstack/react-query';
import { config } from '@/config';
import { queryClient } from '@/lib/queryClient';

export type ExtensionStatus =
  | { state: 'checking' }
  | { state: 'missing' }
  | { state: 'present'; extension: DetectedExtension };

export const extensionQueryKey = ['extension', 'detect'] as const;

export const DESKTOP_EXTENSION: DetectedExtension = {
  bridge: getStaticTauriBridge() ?? {
    transport: 'external',
    async call(method, params) {
      return {} as any;
    },
    subscribe() {
      return () => {};
    },
  },
  info: {
    version: '1.9.0',
    protocol: 1,
    browser: 'chromium',
    capabilities: ['yt', 'yt.auth', 'yt.stats', 'addon', 'lyrics', 'spotify', 'discord'],
  },
};

export function isTauriDesktop(): boolean {
  return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
}

// Seed query cache immediately so code outside React finds it synchronously
if (isTauriDesktop()) {
  queryClient.setQueryData(extensionQueryKey, DESKTOP_EXTENSION);
}

const RECHECKS = 4;
const RECHECK_MS = 1500;
const SLOW_RECHECK_MS = 5000;

async function detect(): Promise<DetectedExtension | null> {
  if (isTauriDesktop()) {
    const tauri = getStaticTauriBridge();
    if (tauri) {
      try {
        const info = await tauri.call('ping', {});
        return { bridge: tauri, info };
      } catch {
        return DESKTOP_EXTENSION;
      }
    }
    return DESKTOP_EXTENSION;
  }

  const known = queryClient.getQueryData<DetectedExtension | null>(extensionQueryKey) ?? null;
  const found = await detectExtension({ chromiumExtensionId: config.chromiumExtensionId });
  if (found || !known) return found;
  return (await detectExtension({ chromiumExtensionId: config.chromiumExtensionId, timeoutMs: 4000 })) ?? known;
}

export function useExtension(): ExtensionStatus {
  if (isTauriDesktop()) {
    return { state: 'present', extension: DESKTOP_EXTENSION };
  }

  const query = useQuery({
    queryKey: extensionQueryKey,
    queryFn: detect,
    staleTime: 30_000,
    gcTime: Infinity,
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: (q) =>
      q.state.data === null ? (q.state.dataUpdateCount <= RECHECKS ? RECHECK_MS : SLOW_RECHECK_MS) : false,
  });
  if (query.isPending) return { state: 'checking' };
  if (!query.data) return { state: 'missing' };
  return { state: 'present', extension: query.data };
}
