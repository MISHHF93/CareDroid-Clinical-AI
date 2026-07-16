/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_ALLOW_SAME_ORIGIN_API?: string;
  readonly VITE_SAME_ORIGIN_API_PROXY_VERIFIED?: string;
  readonly VITE_WS_URL?: string;
  readonly VITE_API_PROXY_TARGET?: string;
  readonly VITE_API_TIMEOUT_MS?: string;
  readonly VITE_ED_REALTIME_SSE_PATH?: string;
  readonly VITE_ED_REALTIME_WS_PATH?: string;
  readonly VITE_ED_REALTIME_POLL_MS?: string;
  readonly VITE_APP_NAME?: string;
  readonly VITE_APP_VERSION?: string;
  readonly VITE_APP_ENVIRONMENT?: string;
  readonly VITE_APP_BUILD_DATE?: string;
  readonly VITE_GIT_COMMIT?: string;
  readonly VITE_GIT_COMMIT_SHA?: string;
  readonly VITE_DEV_PORT?: string;
  /** Architect Mode: enable experimental AppShell engines in production when "true". */
  readonly VITE_ENABLE_EXPERIMENTAL_SHELL_ENGINES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
