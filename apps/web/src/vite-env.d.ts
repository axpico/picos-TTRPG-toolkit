/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL of the offline Vosk model archive (.tar.gz) for Firefox voice search. */
  readonly VITE_VOSK_MODEL_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
