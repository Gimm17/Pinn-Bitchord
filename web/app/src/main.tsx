import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { getBridge } from '@/extension/bridge';
import { queryClient } from '@/lib/queryClient';
import '@/lib/theme';
import { routes } from '@/routes';
import '@/styles/global.css';

// In desktop (Tauri WebView2), intercept googlevideo and YouTube calls so they route
// cleanly through Rust native reqwest with correct headers and without browser CORS blocks.
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const urlStr = input instanceof Request ? input.url : input.toString();
    if (urlStr.includes('googlevideo.com')) {
      const bridge = getBridge();
      if (bridge) {
        try {
          const request = input instanceof Request ? input : null;
          const method = (init?.method ?? request?.method ?? 'GET').toUpperCase() as 'GET' | 'POST' | 'HEAD';
          const headers: Record<string, string> = {};
          new Headers(init?.headers ?? request?.headers).forEach((value, key) => (headers[key] = value));
          let body = init?.body ?? undefined;
          if (body === undefined && request && method !== 'GET' && method !== 'HEAD') {
            body = await request.text();
          }
          if (body != null && typeof body !== 'string') {
            body = await new Response(body).text();
          }

          const response = await bridge.call(
            'yt.fetch',
            { url: urlStr, method, headers, ...(typeof body === 'string' && { body }), auth: false },
            { ...(init?.signal && { signal: init.signal }) },
          );
          const payload =
            response.bodyEncoding === 'base64'
              ? Uint8Array.from(atob(response.body), (c) => c.charCodeAt(0))
              : response.body;
          return new Response(response.status === 204 || response.status === 304 ? null : payload, {
            status: response.status,
            headers: response.headers,
          });
        } catch (e) {
          console.warn('Googlevideo bridge fetch error, falling back:', e);
        }
      }
    }
    return originalFetch(input, init);
  };
}

const router = createBrowserRouter(routes);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
