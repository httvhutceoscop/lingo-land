/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_TAG?: string;
  readonly VITE_BGM_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Inject từ vite.config.ts (define) — version lấy từ package.json lúc build.
declare const __APP_VERSION__: string;
