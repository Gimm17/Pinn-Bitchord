/*
 * Window full screen. Inside Tauri the browser's Fullscreen API only fills the
 * webview — the OS title bar stays on top. The window API takes the frame
 * away too, which is what "Full Screen Mode" is meant to do. In a plain
 * browser (dev server, audit harness) there is no window to ask, so fall back
 * to the page's own fullscreen. No `@tauri-apps/api` dependency: the app runs
 * with `withGlobalTauri`, which already exposes the window namespace.
 */
type TauriWindow = { setFullscreen(on: boolean): Promise<void> };

function tauriWindow(): TauriWindow | null {
  const api = (window as unknown as { __TAURI__?: { window?: { getCurrentWindow?: () => TauriWindow } } }).__TAURI__;
  return api?.window?.getCurrentWindow?.() ?? null;
}

export async function setWindowFullscreen(on: boolean): Promise<void> {
  const win = tauriWindow();
  if (win) {
    try {
      await win.setFullscreen(on);
      return;
    } catch {
      // Permission refused or the call failed: fall through to the page's own fullscreen.
    }
  }
  try {
    if (on) {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    } else if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  } catch {
    // Refused (no gesture, or a locked-down webview): the player still covers the page.
  }
}
