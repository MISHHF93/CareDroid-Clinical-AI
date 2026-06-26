# CareDroid TypeScript-Only Unification Plan

**Direct answer: YES.**

There is a **second application built inside this repository** — a native **Kotlin / Jetpack Compose** Android app under `android/`. It is **not** the same as the Vite React ED web app. It has its own UI, navigation, ViewModels, local database, and API client.

The unified CareDroid product should be **one TypeScript application** (frontend + backend). Kotlin business logic and screens should be **retired and reimplemented in TypeScript**, not maintained in parallel.

---

## 1. Current language landscape

| Layer | Location | Language | Role today |
|-------|----------|----------|------------|
| **ED web app (canonical)** | `src/`, `src/app/` | TypeScript + JavaScript (`.tsx` / `.jsx`) | Emergency department command center — **keep and finish migrating to TS** |
| **Backend API** | `backend/src/` | **TypeScript** (NestJS) | Auth, emergency OS, RBAC, audit — **keep** |
| **Shared libs** | `lib/` | TypeScript | Orchestration, AI routes — **keep** |
| **Native Android app** | `android/app/src/main/kotlin/` | **Kotlin** (~74 `.kt` files) | Separate Compose app (login, chat, settings, tools) — **remove / replace** |
| **Android packaging** | `capacitor.config.json`, `npm run android-debug` | Capacitor → `dist/` | Intended to wrap web app — **not wired to current `MainActivity`** |
| **Legacy JS** | Many `src/**/*.jsx`, `src/**/*.js` | JavaScript | Incremental TS migration — **converge to TS** |

### Evidence: Kotlin is a separate app, not a thin shell

`MainActivity.kt` explicitly states:

> *Uses Jetpack Compose for UI instead of WebView*

It launches `AppNavigation` with native screens (`LoginScreen`, `ChatScreen`, `SettingsScreen`, etc.) — **not** the Vite `dist/` bundle.

That is the classic **“app inside app”** problem at the mobile layer:

```
┌─────────────────────────────────────────────────────────────┐
│  Repo today                                                 │
│  ┌──────────────────────┐   ┌──────────────────────────┐  │
│  │ Vite React ED app    │   │ Kotlin Compose Android   │  │
│  │ (TypeScript/JS)      │   │ (separate product shell) │  │
│  │ whiteboard, triage…  │   │ login, chat, tools…      │  │
│  └──────────┬───────────┘   └────────────┬─────────────┘  │
│             │                            │                 │
│             └──────────┬─────────────────┘                 │
│                        ▼                                   │
│              NestJS backend (TypeScript)                     │
└─────────────────────────────────────────────────────────────┘
```

**Target:**

```
┌─────────────────────────────────────────────────────────────┐
│  One CareDroid application (TypeScript)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ src/app — React + TypeScript (all product UI/logic)  │   │
│  └──────────────────────────┬───────────────────────────┘   │
│                             ▼                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ backend/ — NestJS TypeScript (all server logic)      │   │
│  └──────────────────────────┬───────────────────────────┘   │
│                             ▼                               │
│  Android/iOS: Capacitor WebView shell only (no Kotlin UI)  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Kotlin inventory (what must move to TypeScript)

### 2.1 UI screens (delete — already exist or will exist in `src/`)

| Kotlin screen | Path | TypeScript replacement |
|---------------|------|------------------------|
| `LoginScreen` | `ui/screens/LoginScreen.kt` | `src/app/router` auth aliases → ED landing / future `/login` |
| `SignupScreen` | `ui/screens/SignupScreen.kt` | Web auth flow + `backend/modules/auth` |
| `ChatScreen` | `ui/screens/ChatScreen.kt` | `src/features/copilot/`, `CopilotPanel.tsx` |
| `HomeScreen` | `ui/screens/HomeScreen.kt` | `/whiteboard` — ED command center |
| `SettingsScreen` | `ui/screens/SettingsScreen.kt` | `/emergency/settings` |
| `ProfileScreen` | `ui/screens/ProfileScreen.kt` | `/profile`, `/profile/settings` |
| `TeamScreen` | `ui/screens/TeamScreen.kt` | `/admin/team` |
| `AuditLogsScreen` | `ui/screens/AuditLogsScreen.kt` | Admin audit surfaces + `backend/modules/audit` |

### 2.2 ViewModels (delete — replace with hooks + Zustand)

| Kotlin ViewModel | TypeScript replacement |
|------------------|------------------------|
| `AuthViewModel` | `src/services/apiClient.js` + auth session helpers → migrate to `src/services/api.ts` |
| `ChatViewModel` | `src/services/clinicalChatService.js`, `emergencyCopilotApi.js` |
| `ToolsViewModel` | `src/features/calculators/`, `src/services/careDroidToolLaunch.ts` |
| `SettingsViewModel` | `src/pages/emergency/EmergencySettings.jsx` → TS feature module |
| `ProfileViewModel` | `src/pages/Profile*` + `useEffectiveUserProfile` |

### 2.3 Data layer (delete — single API + store)

| Kotlin module | TypeScript replacement |
|---------------|------------------------|
| `CareDroidApiService` (Retrofit) | `src/services/emergencyOsApi.js` + `apiClient.js` → unified `src/services/api.ts` |
| `AuthRepositoryImpl` | NestJS `auth` module + frontend session |
| `ChatRepositoryImpl` | `emergencyCopilotApi.js` + backend `chat` module |
| `ToolsRepositoryImpl` | `clinicalToolsApi`, calculator persistence |
| `HealthRepositoryImpl` | `backend` health routes + `probeBackendReachability` |
| `CareDroidDatabase` (Room) | `dexie` / `emergencyStore.ts` + server as source of truth |
| `PreferencesManager` | `localStorage` / Capacitor Preferences plugin (TS wrapper) |
| `SyncManager` | `emergencyRealtimeService`, `emergencyOperationalSync.ts` |

### 2.4 Native device capabilities (reimplement as Capacitor + TypeScript)

These are **device APIs**, not product UI. Reimplement with **TypeScript** calling **Capacitor plugins** (thin native stubs only — no Kotlin business logic).

| Kotlin utility | TypeScript / Capacitor approach |
|----------------|----------------------------------|
| `BiometricAuthManager` | `@capacitor-community/biometric-auth` or custom plugin; TS service `src/services/native/biometric.ts` |
| `VoiceInputManager` | Web Speech API + Capacitor speech plugin fallback |
| `PermissionManager` | `@capacitor-community/permissions` + TS `src/services/native/permissions.ts` |
| `NetworkMonitor` | `@capacitor/network` + existing `OfflineProvider` |
| `ShareManager` | `@capacitor/share` |
| `CareDroidMessagingService` (FCM) | `@capacitor/push-notifications` + backend notification module |

### 2.5 DI / Gradle stack (remove)

| Remove | Reason |
|--------|--------|
| Hilt (`AppModule`, `NetworkModule`, `DatabaseModule`, `NativeFeaturesModule`) | No Kotlin app layer |
| Room + KAPT | No local Kotlin DB |
| Jetpack Navigation Compose | React Router in `src/app/router.tsx` |
| `package.android.json` “native-app” scripts | Replace with Capacitor-only `android-debug` |

---

## 3. Target architecture (TypeScript everywhere that matters)

### 3.1 Frontend — 100% TypeScript goal

```
src/
  app/
    App.tsx
    router.tsx          # single router (done)
    providers.tsx
  features/             # whiteboard, reception, copilot, calculators…
  domain/               # types, permissions, constants (started)
  services/
    api.ts              # single facade (migrate from emergencyOsApi.js)
    native/             # Capacitor bridges only
  layouts/
    AppShell.tsx
    DisplayShell.tsx
```

**Rules:**

- No new `.jsx` / `.js` product files — TypeScript only for new code.
- Migrate high-traffic `.jsx` → `.tsx` incrementally (router, whiteboard, reception first).
- One domain model: `src/domain/types.ts` (extend from `types/emergency.ts`).

### 3.2 Backend — already TypeScript

Keep `backend/` as the **only** server runtime. All Kotlin API calls in `CareDroidApiService.kt` must map to existing or new NestJS controllers — **no parallel Retrofit client in mobile**.

### 3.3 Android — Capacitor shell only

Replace `MainActivity.kt` (Compose) with standard **Capacitor `BridgeActivity`** loading `dist/`:

1. `npm run build` → `dist/`
2. `npx cap sync android`
3. `MainActivity extends BridgeActivity` — **~10 lines Java/Kotlin boilerplate, zero product logic**

> **Note:** Android OS requires a minimal Java/Kotlin **Activity** entry point. That is packaging, not application logic. All **functions** (auth, whiteboard, triage, copilot, calculators) live in **TypeScript**.

---

## 4. Kotlin → TypeScript function mapping (API)

| Kotlin (`CareDroidApiService`) | NestJS / frontend TS |
|----------------------------------|----------------------|
| `POST api/auth/login` | `backend/modules/auth` + `apiClient` |
| `POST api/auth/register` | same |
| `GET api/auth/me` | `user-profile` module |
| `POST api/chat` | `backend/modules/chat` + `clinicalChatService` |
| `GET api/chat/conversations` | chat module |
| Emergency / patient endpoints | `backend/modules/emergency-os` + `emergencyOsApi.js` |
| Clinical tools | `clinicalToolsApi`, `clinical-calculators/` |
| Health check | `/health` + `probeBackendReachability` |

**Policy:** If an endpoint exists in Kotlin Retrofit but not in NestJS, add it to **NestJS once**. If it exists in both, **delete the Kotlin client** and use the TS facade only.

---

## 5. Migration phases

### Phase A — Decision & freeze (week 1)

- [ ] Mark `android/app/src/main/kotlin/` as **deprecated** in repo docs.
- [ ] Stop adding features to Kotlin screens.
- [ ] Confirm `npm run android-debug` (Capacitor) is the **only** mobile ship path.
- [ ] Align `package.android.json` description with Capacitor — remove “native Kotlin app” positioning.

### Phase B — Capacitor takeover (week 1–2)

- [ ] Replace `MainActivity.kt` with Capacitor `BridgeActivity`.
- [ ] Remove Compose navigation graph (`AppNavigation.kt`) from startup path.
- [ ] Point Android manifest to WebView shell loading `https://localhost` / bundled `dist/`.
- [ ] Verify deep links: `caredroid://` → Capacitor app URL handler → React Router (`/whiteboard`, etc.).
- [ ] Run `npm run android-debug` and smoke-test ED whiteboard on device.

### Phase C — Quarantine Kotlin product code (week 2–3)

- [ ] Move `android/app/src/main/kotlin/com/caredroid/clinical/ui/**` → `android/_deprecated-kotlin/` (or delete after B passes).
- [ ] Move `data/repository`, `viewmodel`, `Room` → deprecated folder.
- [ ] Remove Hilt, Room, Retrofit, Compose dependencies from `android/app/build.gradle` except Capacitor baseline.
- [ ] Delete `package.android.json` standalone native scripts OR merge into root `package.json` Capacitor scripts only.

### Phase D — Port native capabilities to TypeScript (week 3–4)

- [ ] `src/services/native/biometric.ts`
- [ ] `src/services/native/pushNotifications.ts`
- [ ] `src/services/native/voiceInput.ts`
- [ ] Wire into existing `OfflineProvider`, copilot, reception flows.
- [ ] Backend push token registration via existing `notifications` module.

### Phase E — Frontend TypeScript convergence (ongoing)

- [ ] `emergencyOsApi.js` → `services/api.ts` (typed)
- [ ] `router.jsx` → `router.tsx`
- [ ] Migrate `pages/emergency/*` → `features/*` as `.tsx`
- [ ] Enable stricter `tsconfig` (`allowJs: false` when migration complete)

### Phase F — Verification & cleanup

- [ ] No `.kt` files under `ui/`, `viewmodel/`, `data/repository` (only Capacitor stubs if any).
- [ ] CI: `typecheck:frontend`, `backend` tests, `cap sync`, `assembleDebug`.
- [ ] Remove `android/_deprecated-kotlin/` after one release cycle.

---

## 6. What we are NOT trying to do

| Misconception | Reality |
|---------------|---------|
| “Zero Kotlin files on disk” | Android APK needs a tiny Activity class; Capacitor provides it. **No Kotlin product code.** |
| “Rewrite NestJS” | Backend is already TypeScript — keep it. |
| “Delete Android folder” | Keep `android/` for Capacitor packaging; **delete Kotlin application layer** inside it. |
| “TypeScript in the browser runs on device without WebView” | Mobile ships the **same TS bundle** inside Capacitor WebView — one codebase. |

---

## 7. Success criteria

1. **One product UI codebase:** `src/app` (TypeScript/React).
2. **One API codebase:** `backend/` (TypeScript/NestJS).
3. **One mobile shell:** Capacitor loading `dist/` — no Compose screens.
4. **No duplicate auth/chat/tools flows** in Kotlin.
5. **All ED functions** (whiteboard, reception, triage, copilot, calculators, display mode) reachable on Android via the same routes as web.
6. `npm.cmd run typecheck:frontend` and `npm.cmd run build` pass; `npm.cmd run android-debug` launches the **ED whiteboard**, not `LoginScreen.kt`.

---

## 8. Immediate next actions (recommended order)

1. Swap `MainActivity` to Capacitor `BridgeActivity` (highest impact, proves single app).
2. Deprecate / quarantine `android/app/src/main/kotlin/com/caredroid/clinical/ui/**`.
3. Map remaining Kotlin API methods to `emergencyOsApi` / NestJS — delete Retrofit interface.
4. Continue `src/` normalization (features folder, `api.ts`, TS migration).
5. Update CI to build Capacitor Android, not standalone Compose APK.

---

## 9. Related documents

- `README.md` — One application architecture (web)
- `src/config/edApplication.config.ts` — Single-app manifest + route redirects
- `capacitor.config.json` — `webDir: "dist"` (canonical mobile bundle)

---

*Last updated: 2026-06-25 — CareDroid lead architecture normalization.*