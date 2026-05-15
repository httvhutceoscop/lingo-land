/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_TAG?: string;
  readonly VITE_BGM_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
