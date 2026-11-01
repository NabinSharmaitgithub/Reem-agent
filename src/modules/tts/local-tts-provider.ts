import * as Speech from "expo-speech";
import { getLocalTtsModule } from "local-tts";
import { Platform } from "react-native";

import {
  TtsProvider,
  TtsProviderType,
  TtsResult,
  TtsSynthesisOptions,
} from "./types";

/**
 * Local TTS Provider
 *
 * Uses on-device text-to-speech (expo-speech system TTS or the local-tts
 * native module). No network required, no API key needed.
 *
 * This is the final fallback in the TTS chain.
 */
export class LocalTtsProvider implements TtsProvider {
  readonly type: TtsProviderType = "local";
  readonly name = "Local TTS (On-Device)";

  async isAvailable(): Promise<boolean> {
    if (Platform.OS !== "android" && Platform.OS !== "ios") {
      return false;
    }
    // expo-speech is always available on mobile
    return true;
  }

  async synthesize(
    text: string,
    options?: TtsSynthesisOptions,
  ): Promise<TtsResult> {
    // Try the local-tts native module first (produces WAV file)
    const localModule = getLocalTtsModule();
    if (localModule) {
      try {
        const result = await localModule.synthesize(text, {
          language: options?.language,
          rate: options?.rate,
          pitch: options?.pitch,
        });
        return {
          audioData: result.uri,
          mimeType: "audio/wav",
          provider: "local",
          durationMs: result.durationMs,
        };
      } catch {
        // Fall through to expo-speech below
      }
    }

    // Fall back to expo-speech (system TTS) - this speaks immediately
    // and doesn't produce a file, so we return a marker
    await Speech.speak(text, {
      language: options?.language,
      pitch: options?.pitch,
      rate: options?.rate,
      volume: options?.volume,
    });

    return {
      audioData: "",
      mimeType: "audio/spoken",
      provider: "local",
    };
  }
}
