/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_EXTENSION_ID_CHROMIUM?: string;
  readonly VITE_ANDROID_APP_URL?: string;
  readonly VITE_EXTENSION_CHROME_URL?: string;
  readonly VITE_EXTENSION_FIREFOX_URL?: string;
  readonly VITE_EXTENSION_MANIFEST_URL?: string;
  readonly VITE_PARTY_SERVER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Injected by vite.config.ts from web/extension/dev-key/extension-id.txt. */
declare const DEV_EXTENSION_ID: string;

/** Injected by vite.config.ts from web/src-tauri/tauri.conf.json's `version`. */
declare const __APP_VERSION__: string;
