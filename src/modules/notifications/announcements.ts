import * as Speech from "expo-speech";
import { AppState, Platform } from "react-native";

import type { NotificationSettings } from "@/core/types/app-state";
import { ttsDebugEnabled } from "@/hooks/use-voice-input";
import { splitSpeechText } from "@/modules/chat/assistant-response";
import { ttsService } from "@/modules/tts";

import {
  claimAnnouncement,
  type AnnouncementAppState,
  type AnnouncementKind,
  type AnnouncementPlatform,
} from "./announcement-policy";
import { isVoiceInputActive } from "./voice-input-state";

const NOTIFICATION_CHIME_LEAD_MS = 1_200;

function currentPlatform(): AnnouncementPlatform {
  return Platform.OS === "android"
    ? "android"
    : Platform.OS === "ios"
      ? "ios"
      : "web";
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Speak text using the TTS fallback chain:
 *   Gemini TTS → OpenRouter TTS → Local TTS
 *
 * Returns true if speech was started successfully, false otherwise.
 */
async function speakWithFallback(text: string): Promise<boolean> {
  // ttsService.speak walks the chain and plays the resulting audio (cloud
  // clip via expo-audio, otherwise on-device speech), so a success here means
  // the text was actually spoken.
  try {
    const result = await ttsService.speak(text, {
      language: "en-US",
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
    });

    if (result.success) {
      return true;
    }
  } catch {
    // TTS service failed entirely, fall through to expo-speech below
  }

  // Final fallback: use expo-speech (system TTS) directly
  try {
    await new Promise<void>((resolve, reject) => {
      Speech.speak(text, {
        onDone: () => resolve(),
        onError: () => reject(new Error("expo-speech error")),
        onStopped: () => resolve(),
      });
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Speak text in chunks using the TTS fallback chain.
 * Splits long text into chunks and speaks them sequentially.
 */
async function speakAsync(text: string) {
  const chunks = splitSpeechText(text, Speech.maxSpeechInputLength);

  if (chunks.length === 0) {
    return;
  }

  for (const chunk of chunks) {
    const success = await speakWithFallback(chunk);
    if (!success) {
      // If a chunk fails, try the next one rather than aborting entirely
      continue;
    }
  }
}

/**
 * Speak a short announcement. The run-completion path awaits this so Android
 * keeps its foreground service alive until the utterance finishes.
 *
 * Resolves `true` when speech was started, `false` when policy skipped it.
 */
export async function announceAsync(input: {
  appState: AnnouncementAppState;
  conversationId: string;
  force?: boolean;
  kind: AnnouncementKind;
  settings: NotificationSettings;
  text: string;
}): Promise<boolean> {
  const text = input.text.replace(/\s+/g, " ").trim();

  if (!text) {
    return false;
  }

  const speechActive = await Speech.isSpeakingAsync().catch(() => false);
  const policyInput = {
    appState: input.appState,
    conversationId: input.conversationId,
    force: input.force ?? false,
    kind: input.kind,
    platform: currentPlatform(),
    settings: input.settings,
    speechActive,
    voiceInputActive: isVoiceInputActive(),
  };

  if (!claimAnnouncement(policyInput)) {
    return false;
  }

  // TTS debug mode: in release builds announcements are silent by default
  // unless the user has enabled them or this is a forced announcement.
  if (
    !input.force &&
    !ttsDebugEnabled() &&
    !input.settings.announcementEnabled
  ) {
    return false;
  }

  // Let the notification chime land first instead of talking over it.
  await wait(NOTIFICATION_CHIME_LEAD_MS);

  // Conditions can change during the lead-in (dictation starts, the user
  // begins reading a message aloud, or iOS moves to the background).
  if (isVoiceInputActive()) {
    return false;
  }

  if (await Speech.isSpeakingAsync().catch(() => false)) {
    return false;
  }

  if (currentPlatform() === "ios" && AppState.currentState !== "active") {
    return false;
  }

  await speakAsync(text).catch(() => {});
  return true;
}

/**
 * Speak text unconditionally — used when the user explicitly requests speech
 * (e.g. "read this aloud") and should bypass TTS debug mode and policy gating.
 */
export async function speakToUser(text: string): Promise<void> {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return;
  await Speech.stop().catch(() => {});
  await speakWithFallback(trimmed).catch(() => {});
}
