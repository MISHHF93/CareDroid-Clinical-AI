# Mobile Code Archive Report

## What Was Found

Mobile artifacts include:

- `android/` native Android/Kotlin source tree.
- Android Gradle files under `android/`.
- Capacitor configuration at `capacitor.config.json`.
- Capacitor dependencies in root `package.json`.
- Root scripts `android-debug` and `android-release`.
- `Dockerfile.android`.
- Android QA matrix/test artifacts under `src/data` and E2E scripts.

No active Emergency OS web route, shell, sidebar, header, or service import of Android, Kotlin, Java, React Native, Expo, or Capacitor runtime code was found. Vite explicitly excludes Capacitor packages from dependency optimization, and Android code remains outside the active React route tree.

## Classification

| Path | Classification | Recommendation |
|---|---|---|
| `android/` | `MOBILE_FUTURE_MODULE` | Keep isolated for now; consider moving to `archive/_review/android` only with package-script and CI updates |
| `capacitor.config.json` | `MOBILE_FUTURE_MODULE` | Keep only if mobile packaging remains a supported future module |
| `Dockerfile.android` | `MOBILE_FUTURE_MODULE` | Keep with Android future module or archive with Android tree |
| `src/data/androidDeviceQaMatrix.js` and tests | `MOBILE_FUTURE_MODULE` / `NEEDS_MANUAL_REVIEW` | Disconnect from active web validation if mobile is archived |
| `@capacitor/*` dependencies and scripts | `MOBILE_FUTURE_MODULE` | Keep out of active web imports; remove from primary package only after mobile archive decision |

## What Was Moved

No Android files were moved in this pass.

## What Was Merged

No mobile code was merged into active Emergency OS web.

## What Was Archived

Mobile archive decision is documented in `archive/_review/README.md`.

## What Was Removed

No mobile files were removed.

## Manual Review

- Decide whether mobile remains a supported future module.
- If yes, document Android build path separately and keep `android-*` scripts.
- If no, move `android/`, `capacitor.config.json`, `Dockerfile.android`, and Android QA artifacts under `archive/_review/`.
- Remove Capacitor dependencies from root package only after scripts and CI no longer need them.

## Risks

- Moving Android files without script/CI updates would break `android-debug`, `android-release`, and Android QA commands.
- Removing Capacitor dependencies could break future mobile packaging even though active web build excludes them.

## Commands Run

- Kotlin, Java, Swift, Gradle, Capacitor config, and Android script inventory.
- Active web import search for Android/Kotlin/Java/Capacitor/Expo/React Native terms.
- Frontend typecheck, lint, build, and focused route/navigation tests.

## Validation Result

No Android/mobile code is imported into the active Emergency OS web app. Mobile remains `MOBILE_FUTURE_MODULE`; archiving the physical Android tree still needs a package-script and CI decision.
