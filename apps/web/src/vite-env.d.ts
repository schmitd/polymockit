/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONVEX_URL?: string;
  readonly CONVEX_URL?: string;
  readonly VITE_DEFAULT_USERNAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
