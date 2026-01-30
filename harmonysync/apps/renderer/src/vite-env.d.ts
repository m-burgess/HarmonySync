/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUDIO_SERVICE_URL?: string;
  readonly VITE_IMAGE_SERVICE_URL?: string;
  readonly VITE_VIDEO_SERVICE_URL?: string;
  // Add other env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
