# Reem — AI Agent for Android

**Reem** is an Expo / React Native AI assistant that runs directly on your Android phone. It combines cloud AI providers with on-device execution, a persistent memory system, background scheduling, notification triggers, a floating assistant button, and a home-screen widget — all packaged as a single APK built via GitHub Actions.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Getting the APK](#getting-the-apk)
- [Manual Setup After Install](#manual-setup-after-install)
- [Development Setup](#development-setup)
- [Building the APK](#building-the-apk)
- [CI/CD (GitHub Actions)](#cicd-github-actions)
- [Native Modules](#native-modules)
- [Configuration Plugins](#configuration-plugins)
- [TTS Fallback Chain](#tts-fallback-chain)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Overview

Reem is an AI agent built specifically for mobile devices. It can run agentic tasks in the background, respond to notifications from other apps, schedule recurring runs, float an assistant button over any screen, and speak responses aloud — all without requiring a dedicated server.

- **App ID:** `com.reem.ai`
- **Version:** `2.1.7` (see `package.json`)
- **Min SDK:** 26 (Android 8.0)
- **Target SDK:** 36
- **Framework:** Expo SDK 57 + React Native + Expo Router
- **Package manager:** pnpm 12.16.1
- **Android builds:** GitHub Actions (`expo prebuild` + `./gradlew assembleRelease`), not EAS

## Key Features

| Feature | Description |
|---|---|
| **Agentic execution** | Runs AI agent runs locally or via configured LLM providers (Gemini, OpenRouter, Anthropic, OpenAI, xAI, etc.) |
| **Persistent memory** | Multi-entry memory repository backed by SQLite (via `expo-sqlite`) |
| **Background scheduler** | Exact-alarm + foreground-service scheduling for recurring agent runs, even when the app is killed |
| **Notification triggers** | Listens to notifications from other apps and dispatches agent runs on matching packages |
| **Floating button** | Special-use foreground service with an overlay button that stays on top of other apps |
| **Home-screen widget** | App widget for quick launch, with `APPWIDGET_UPDATE` broadcast support |
| **Default assistant** | Can be set as the device's default assist app (`AssistEntryActivity`) |
| **Device automation** | Accessibility-service-driven UI automation (clicks, gestures, text entry, hierarchy dump) |
| **TTS chain** | Gemini TTS → OpenRouter TTS → on-device local TTS, with real audio playback via `expo-audio` |
| **Wake word** | Local wake-word detection for hands-free activation |
| **Cloud storage** | Backblaze B2 bucket (`reemai`) for model and asset sync |
| **Share target** | Android share-sheet integration (`ShareTargetModule`) |
| **Process text** | Android "Process text" text-selection integration |
| **Saf file operations** | Storage Access Framework (SAF) file operations |
| **HTML video export** | Client-side video encoding/export from HTML canvas frames |

---

## Architecture

```
src/
├── app/                 # Expo Router routes (_layout.tsx, screens, etc.)
├── core/                # Database, repositories, services, app-state
├── modules/             # Feature modules (tts, notifications, scheduler, ai, chat, ...)
│   ├── tts/             # TTS providers + service (gemini, openrouter, local)
│   ├── notifications/   # Announcements, tts-service integration
│   ├── trigger-dispatch/# Headless task + registration for notification triggers
│   └── ...
├── plugins/             # Expo config plugins (native manifest/gradle injection)
└── ...

modules/                 # Autolinked Expo modules with native Android (Kotlin) code
├── default-assistant/
├── device-automation/
├── floating-button/
├── home-screen-widget/
├── html-video-export/
├── notification-trigger/
├── scheduler-alarm/
├── trigger-dispatch/
├── wake-word/
├── background-agent-service/
├── persistent-model-download/
├── termux-stream/
├── saf-file-operations/
├── share-target/
├── process-text/
└── quote-selection/

.plugins/                # Config plugins wired into app.json
.github/workflows/       # android.yml — APK build + GitHub Release
```

Native modules are written in Kotlin and compiled as part of the app's `assembleRelease` Gradle task. Expo config plugins inject permissions, services, receivers, and `packagingOptions` into the generated `AndroidManifest.xml` and `build.gradle` during `expo prebuild`.

---

## Getting the APK

Prebuilt APKs are published as GitHub Release assets:

1. Go to the **Releases** page of this repository:  
   `https://github.com/NabinSharmaitgithub/Reem/releases`
2. Download the latest `mobile-agent-<version>.apk` asset.
3. Transfer the APK to your Android device and install it.
4. Grant the required permissions (see below).

If no release is available yet, you can build locally (see [Building the APK](#building-the-apk)) or trigger the GitHub Actions workflow manually.

---

## Manual Setup After Install

After installing the APK, you must manually grant several Android permissions — Android does not allow apps to self-grant most of these:

| Permission | Where to grant | Required for |
|---|---|---|
| **Accessibility service** | Settings → Accessibility → Reem Automation | Device automation (clicks, gestures, text entry) |
| **Display over other apps** | Settings → Apps → Special app access → Display over other apps → Reem | Floating assistant button overlay |
| **Notifications** | Settings → Apps → Reem → Notifications | Notification triggers + announcements |
| **Microphone** | App prompt / Settings → Apps → Reem → Permissions | Voice input, wake word, speech recognition |
| **Camera** | App prompt / Settings → Apps → Reem → Permissions | QR code scanning, photo attachment |
| **Exact alarm & schedule** | Settings → Apps → Special app access → Alarms & reminders → Reem | Background scheduler |
| **Ignore battery optimizations** | Settings → Battery → Battery optimization → Reem | Reliable background execution |
| **Write settings** | Settings → Apps → Special app access → Modify system settings → Reem | System setting changes via automation |
| **Install unknown apps** | Settings → Apps → Special app access → Install unknown apps | `REQUEST_INSTALL_PACKAGES` for APK updates |

The floating button requires **Display over other apps**; device automation requires the **Accessibility service** to be toggled on in system settings.

---

## Development Setup

### Prerequisites

- Node.js 22+
- pnpm 12.16.1 (pinned in `packageManager`)
- No local Android SDK is required for typechecking/linting, but building the APK locally needs the Android SDK (cmdline-tools, platform-tools, android-36, build-tools-36.0.0).

### Install dependencies

```bash
pnpm install
```

### Lint and typecheck

```bash
pnpm dlx expo lint        # lint (0 errors expected)
pnpm dlx tsc --noEmit     # typecheck (note: may OOM on low-RAM devices; rely on CI if needed)
```

### Run tests

```bash
pnpm dlx vitest run
```

### Prebuild (regenerate native directories)

`android/` and `ios/` are gitignored and regenerated by `expo prebuild`. Never edit them by hand — configure native behavior in `app.json` and config plugins under `plugins/`.

```bash
pnpm dlx expo prebuild --platform android --clean --no-install
```

---

## Building the APK

### Via GitHub Actions (recommended)

Android APK builds run on GitHub Actions `ubuntu-latest`:

1. Push to `main` (or run `gh workflow run "Android APK Release" --ref main` manually).
2. The workflow:
   - Checks out the repo
   - Runs `pnpm install --frozen-lockfile` (pnpm 12.16.1, Node 22)
   - Sets up JDK 17 + Android SDK 36
   - Runs `npx expo prebuild --platform android`
   - Runs `./gradlew assembleRelease -x lint -x lintVitalRelease --continue --console=plain`
   - Uploads the APK as a workflow artifact
   - Publishes a GitHub Release (if `package.json` version differs from the latest `v*` tag)

3. Download the APK from the **Actions** run summary or the **Releases** page.

**Note:** Push builds are skipped when `package.json` version equals the latest `v*` tag (unless triggered via `workflow_dispatch`). Bump the version in `package.json`/`app.json` to force a new build.

### Locally

```bash
pnpm dlx expo prebuild --platform android --clean --no-install
cd android
./gradlew assembleRelease -x lint -x lintVitalRelease
```

The output APK will be at `android/app/build/outputs/apk/release/app-release.apk`.

---

## CI/CD (GitHub Actions)

Workflow: `.github/workflows/android.yml` — **"Android APK Release"**

Triggers: `push` to `main` and `workflow_dispatch`.

Key characteristics:

- **pnpm 12.16.1** pinned via `packageManager` and the workflow `version` input.
- **Node 22**, **JDK 17**, **Android SDK 36** (`platforms;android-36`, `build-tools;36.0.0`).
- `--continue` added to Gradle so all Kotlin compile errors surface in a single run.
- EAS builds were abandoned (all 14 prior attempts failed with `EAS_BUILD_UNKNOWN_GRADLE_ERROR`); GitHub Actions is now the build path.
- `android/` and `ios/` are gitignored; `expo prebuild` regenerates them on every run.

To trigger manually:

```bash
gh workflow run "Android APK Release" --ref main
```

To check status:

```bash
gh run list --workflow "Android APK Release" --limit 5
gh run view <run-id> --json status,conclusion
gh run view <run-id> --log
```

---

## Native Modules

The following autolinked Expo modules ship native Android (Kotlin) code under `modules/`:

| Module | Native responsibilities |
|---|---|
| `default-assistant` | `DefaultAssistantModule` + `AssistEntryActivity` — set Reem as the default assist app; voice-assistant invocation from the home button |
| `device-automation` | `DeviceAutomationModule` + `DeviceAccessibilityService` — accessibility-driven clicks, gestures, text entry, hierarchy dump, screenshots |
| `floating-button` | `FloatingButtonModule` + `FloatingButtonService` — special-use foreground service; overlay button; visibility state on service companion |
| `home-screen-widget` | `HomeScreenWidgetModule` + `HomeScreenWidgetProvider` — app widget; `R.id.widget_root` layout fix; `APPWIDGET_UPDATE` |
| `html-video-export` | `HtmlVideoExportModule` — client-side H.264 video encoding from HTML frames |
| `notification-trigger` | `NotificationTriggerModule` + `NotificationTriggerListener` — notification listener service; broadcasts `NOTIFICATION_POSTED` to trigger dispatch |
| `scheduler-alarm` | `SchedulerAlarmManager`, `SchedulerWakeService`, `SchedulerHeadless` — exact alarms, boot receiver, foreground `dataSync` service, headless JS scheduler task |
| `trigger-dispatch` | `TriggerDispatchModule`, `TriggerBroadcastReceiver` — manifest-declared broadcast receiver; `TriggerDispatchTask` headless handler; `isAllowedInForeground = true` |
| `wake-word` | `WakeWordModule` — local wake-word detection; `OnDestroy` lifecycle |
| `background-agent-service` | `BackgroundAgentService` + `BackgroundAgentModule` — background FGS (`dataSync`) for long-running agent work |
| `persistent-model-download` | `ModelDownloadWorker` — WorkManager-based model downloads with foreground notification |
| `termux-stream` | `TermuxStreamModule` + `SseClient` — Termux SSE streaming |
| `saf-file-operations` | `SafFileOperationsModule` — Storage Access Framework file ops |
| `share-target` | `ShareTargetModule` + `ShareInbox` — Android share-sheet target |
| `process-text` | `ProcessTextModule` + `ProcessTextActivity` — Android "Process text" selection |
| `quote-selection` | `QuoteSelectionModule` — text selection quotes |

---

## Configuration Plugins

Config plugins under `plugins/` are wired into `app.json` and run during `expo prebuild` to inject manifest entries, permissions, and Gradle options:

| Plugin | Purpose |
|---|---|
| `with-firebase-resolution.js` | `packagingOptions` excludes to fix duplicate `com.google.firebase.Timestamp` class |
| `with-litert-lm.js` | LiteRT LM (on-device model) native config |
| `with-background-agent.js` | Background agent service + `FOREGROUND_SERVICE_DATA_SYNC` |
| `with-android-system-bars.js` | System bars / edge-to-edge handling |
| `with-gradle-build-settings.js` | Gradle build settings injection |
| `with-scheduler-alarm.js` | Scheduler permissions + `SchedulerWakeService` (`dataSync` FGS) |
| `with-whisper.js` | Whisper speech-to-text native config |
| `with-share-target.js` | Share target provider |
| `with-device-automation.js` | Accessibility service declaration (`BIND_ACCESSIBILITY_SERVICE`, exported) |
| `with-floating-button.js` | Floating button FGS (`specialUse`), `SYSTEM_ALERT_WINDOW` permission, `PROPERTY_SPECIAL_USE_FGS_SUBTYPE` |
| `with-default-assistant.js` | Default assist activity declaration |
| `with-notification-trigger.js` | Notification listener service (`BIND_NOTIFICATION_LISTENER_SERVICE`, exported) |
| `with-wake-word.js` | `RECORD_AUDIO` permission (no bogus service declaration) |
| `with-home-screen-widget.js` | App widget receiver (exported) + mirrored widget resources |
| `with-trigger-dispatch.js` | `TriggerBroadcastReceiver` declaration + intent filter |

Key manifest behaviors:

- Accessibility and notification-listener services are `android:exported="true"` (required for system binding) but guarded by `BIND_ACCESSIBILITY_SERVICE` / `BIND_NOTIFICATION_LISTENER_SERVICE` permissions.
- The app widget receiver is `android:exported="true"` so the system can deliver `APPWIDGET_UPDATE`.
- Widget resources are mirrored under `widget_*` prefixed filenames so the app's own `values/strings.xml` is never clobbered.

---

## TTS Fallback Chain

Reem uses a provider-abstraction TTS chain (`TtsProvider` / `TtsService` singleton):

**Order:**
1. **Gemini TTS** (Google Cloud / Gemini API `gemini-2.5-flash-preview-tts`) — returns raw PCM, wrapped in a WAV container, played via `expo-audio`
2. **OpenRouter TTS** (OpenRouter chat completions with audio output, `openai/gpt-4o-audio-preview`, MP3) — real audio before local fallback
3. **Local TTS** (`local-tts` native module + `expo-speech`) — on-device final fallback

Keys are stored in `expo-secure-store` via `ttsService.setGeminiApiKey()` / `ttsService.setOpenRouterApiKey()`, with `EXPO_PUBLIC_GEMINI_API_KEY` / `EXPO_PUBLIC_OPENROUTER_API_KEY` as build-time fallback.

`announcements.ts` drives chunked speech through `ttsService.speak()`, which plays cloud audio to completion before proceeding to the next chunk, falling back to on-device speech if cloud audio cannot be produced or played.

---

## Environment Variables

| Variable | Purpose | Example |
|---|---|---|
| `FIREBASE_API_KEY` | Firebase project API key | `AIza...` |
| `FIREBASE_AUTH_DOMAIN` | Firebase auth domain | `reem-8fd60.firebaseapp.com` |
| `FIREBASE_PROJECT_ID` | Firebase project ID | `reem-8fd60` |
| `FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | `reem-8fd60.appspot.com` |
| `FIREBASE_MESSAGING_SENDER_ID` | Firebase sender ID | `...` |
| `FIREBASE_APP_ID` | Firebase app ID | `1:...` |
| `GEMINI_API_KEY` | Gemini API key (TTS + chat) | `AQ.Ab8RN...` |
| `OPENROUTER_API_KEY` | OpenRouter API key (TTS fallback) | `sk-or-v1-...` |
| `B2_APPLICATION_KEY` | Backblaze B2 application key | (set in CI/env) |
| `B2_KEY_ID` | Backblaze B2 key ID | (set in CI/env) |
| `B2_BUCKET_NAME` | Backblaze B2 bucket name | `reemai` |
| `EXPO_PUBLIC_*` | Public runtime config exposed to JS | see above |

Firebase project `reem-8fd60` rules/indexes are deployed separately. `.env` is gitignored and populated locally; CI injects secrets via GitHub Actions encrypted variables.

---

## Troubleshooting

| Issue | Likely cause / fix |
|---|---|
| `:default-assistant:compileReleaseKotlin` fails | `reactContext` must be a getter throwing `ReactContextLost()`; use `sendEvent(...)` not `emit(...)`; no `init {}` / default lambda values in `ModuleDefinition` |
| Duplicate `com.google.firebase.Timestamp` class | `with-firebase-resolution.js` packaging excludes (verify generated `android/app/build.gradle`) |
| Accessibility service not binding | Manifest must declare `exported="true"` + `BIND_ACCESSIBILITY_SERVICE`; user must toggle it on in Settings |
| Floating button not appearing | Grant "Display over other apps"; service runs as `specialUse` FGS |
| Widget not updating | Receiver must be `exported="true"`; widget resources must exist in merged `res/` |
| Notification triggers not firing | `TriggerDispatchTask` must be registered at bundle load (`index.js` imports `headless-registration.ts`); `isAllowedInForeground = true` |
| TTS silent (cloud providers) | Gemini now uses `generativelanguage.googleapis.com` TTS endpoint; OpenRouter requests `modalities: ["text","audio"]`; `speak()` plays audio via `expo-audio` before local fallback |
| Build OOMs on typecheck | `tsc --noEmit` needs ~2 GB RAM; skip locally and rely on CI / lint |

---

## License

MIT License. See `LICENSE` for details.

---

**Repository:** `NabinSharmaitgithub/Reem` — branch `main`  
**Workflow:** "Android APK Release" on GitHub Actions  
**Latest version:** `2.1.7`
