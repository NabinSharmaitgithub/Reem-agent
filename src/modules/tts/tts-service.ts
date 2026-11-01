import { createAudioPlayer } from "expo-audio";
import { File, Paths } from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import {
  DEFAULT_TTS_CONFIG,
  TtsConfig,
  TtsProviderType,
  TtsProvider,
  TtsResult,
  TtsSynthesisOptions,
  TtsVoice,
} from "./types";
import { GeminiTtsProvider } from "./gemini-tts";
import { LocalTtsProvider } from "./local-tts-provider";
import { OpenRouterTtsProvider } from "./openrouter-tts";

const GEMINI_API_KEY_KEY = "tts_gemini_api_key";
const OPENROUTER_API_KEY_KEY = "tts_openrouter_api_key";
const TTS_CONFIG_KEY = "tts_config";

/** Upper bound on a single cloud audio clip, so a stuck player cannot block speech. */
const MAX_PLAYBACK_MS = 30_000;

/** True for values that already point at a playable resource. */
function isPlayableUri(value: string): boolean {
  return /^(file:|content:|https?:|asset:)/i.test(value) || value.startsWith("/");
}

/**
 * Plays a local audio file to completion.
 *
 * Resolves when playback finishes (or the safety timeout elapses) so callers
 * can speak announcement chunks in order.
 */
function playAudioFile(uri: string): Promise<void> {
  return new Promise<void>((resolve) => {
    const player = createAudioPlayer({ uri });
    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let subscription: { remove(): void } | undefined;

    const finish = () => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      subscription?.remove();
      try {
        player.remove();
      } catch {
        // Player already released.
      }
      resolve();
    };

    subscription = player.addListener("playbackStatusUpdate", (status) => {
      if (status.didJustFinish) finish();
    });
    timeout = setTimeout(finish, MAX_PLAYBACK_MS);

    player.play();
  });
}

/**
 * TTS Service with fallback chain:
 *   Gemini TTS → OpenRouter TTS → Local TTS
 *
 * Automatically falls through providers on failure until one succeeds
 * or all are exhausted.
 */
export class TtsService {
  private providers: Map<TtsProviderType, TtsProvider> = new Map();
  private config: TtsConfig = { ...DEFAULT_TTS_CONFIG };
  private initPromise: Promise<void> | null = null;

  constructor() {
    // Initialize all providers
    this.providers.set("gemini", new GeminiTtsProvider());
    this.providers.set("openrouter", new OpenRouterTtsProvider());
    this.providers.set("local", new LocalTtsProvider());
  }

  /**
   * Loads the stored config and API keys once, before the first synthesis.
   *
   * Nothing else calls `loadApiKeys()` at startup, so without this the cloud
   * providers are never configured and every request would fall straight
   * through to on-device speech.
   */
  private ensureInitialized(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = (async () => {
        await this.loadConfig();
        await this.loadApiKeys();
      })().catch(() => {
        // Never block speech on a storage failure.
      });
    }
    return this.initPromise;
  }

  // ── Configuration ──────────────────────────────────────────────

  async loadConfig(): Promise<TtsConfig> {
    try {
      const raw = await SecureStore.getItemAsync(TTS_CONFIG_KEY);
      if (raw) {
        this.config = { ...DEFAULT_TTS_CONFIG, ...JSON.parse(raw) };
      }
    } catch {
      // Use defaults
    }
    return this.config;
  }

  async saveConfig(config: Partial<TtsConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    await SecureStore.setItemAsync(
      TTS_CONFIG_KEY,
      JSON.stringify(this.config),
    );
  }

  async setGeminiApiKey(key: string): Promise<void> {
    const gemini = this.providers.get("gemini") as GeminiTtsProvider;
    gemini.setApiKey(key);
    await SecureStore.setItemAsync(GEMINI_API_KEY_KEY, key);
    await this.saveConfig({ geminiApiKey: key });
  }

  async setOpenRouterApiKey(key: string): Promise<void> {
    const openrouter = this.providers.get(
      "openrouter",
    ) as OpenRouterTtsProvider;
    openrouter.setApiKey(key);
    await SecureStore.setItemAsync(OPENROUTER_API_KEY_KEY, key);
    await this.saveConfig({ openrouterApiKey: key });
  }

  async loadApiKeys(): Promise<void> {
    // Keys entered in Settings win; EXPO_PUBLIC_* build-time values are a
    // fallback so a preconfigured build works without extra setup.
    const envGemini =
      process.env.EXPO_PUBLIC_GEMINI_API_KEY ??
      process.env.GEMINI_API_KEY ??
      "";
    const envOpenRouter =
      process.env.EXPO_PUBLIC_OPENROUTER_API_KEY ??
      process.env.OPENROUTER_API_KEY ??
      "";

    try {
      const geminiKey =
        (await SecureStore.getItemAsync(GEMINI_API_KEY_KEY)) || envGemini;
      if (geminiKey) {
        const gemini = this.providers.get(
          "gemini",
        ) as GeminiTtsProvider;
        gemini.setApiKey(geminiKey);
      }
    } catch {
      // Ignore
    }

    try {
      const openrouterKey =
        (await SecureStore.getItemAsync(OPENROUTER_API_KEY_KEY)) ||
        envOpenRouter;
      if (openrouterKey) {
        const openrouter = this.providers.get(
          "openrouter",
        ) as OpenRouterTtsProvider;
        openrouter.setApiKey(openrouterKey);
      }
    } catch {
      // Ignore
    }
  }

  // ── Provider selection ─────────────────────────────────────────

  private getOrderedProviders(): TtsProvider[] {
    return this.config.preferredOrder
      .map((type) => this.providers.get(type))
      .filter((p): p is TtsProvider => Boolean(p));
  }

  private async getFirstAvailableProvider(): Promise<TtsProvider | null> {
    const providers = this.getOrderedProviders();
    for (const provider of providers) {
      try {
        if (await provider.isAvailable()) {
          return provider;
        }
      } catch {
        // Provider check failed, try next
      }
    }
    return null;
  }

  // ── Synthesis with fallback ────────────────────────────────────

  /**
   * Synthesize text to speech using the fallback chain.
   *
   * Tries providers in order: Gemini → OpenRouter → Local.
   * Returns the first successful result.
   *
   * @throws Error if all providers fail.
   */
  async synthesize(
    text: string,
    options?: TtsSynthesisOptions,
  ): Promise<TtsResult> {
    await this.ensureInitialized();

    const providers = this.getOrderedProviders();
    let lastError: Error | null = null;

    for (const provider of providers) {
      try {
        const isAvailable = await provider.isAvailable();
        if (!isAvailable) continue;

        const result = await provider.synthesize(text, options);
        return result;
      } catch (error) {
        lastError =
          error instanceof Error ? error : new Error(String(error));
        // Try next provider in chain
        continue;
      }
    }

    throw new Error(
      `TTS synthesis failed: all providers exhausted. Last error: ${lastError?.message}`,
    );
  }

  /**
   * Speak text using the fallback chain, playing the resulting audio.
   *
   * Gemini and OpenRouter return encoded audio that is written to the cache and
   * played with expo-audio; local TTS either returns a WAV file or speaks
   * directly through expo-speech. If cloud audio cannot be produced or played,
   * the text is spoken on-device so the user always hears something.
   */
  async speak(
    text: string,
    options?: TtsSynthesisOptions,
  ): Promise<{ provider: TtsProviderType; success: boolean }> {
    try {
      const result = await this.synthesize(text, options);

      // expo-speech already spoke the text.
      if (result.mimeType === "audio/spoken") {
        return { provider: "local", success: true };
      }

      // A provider that only produced text (no audio) is not a success: speak
      // it locally instead of returning silently.
      if (
        (!result.audioData && !result.audioBytes) ||
        result.mimeType.startsWith("text/")
      ) {
        await this.speakLocally(text, options);
        return { provider: "local", success: true };
      }

      try {
        await this.playResult(result);
        return { provider: result.provider, success: true };
      } catch (playbackError) {
        console.warn(
          "[TTS] Audio playback failed, falling back to local speech:",
          playbackError,
        );
        await this.speakLocally(text, options);
        return { provider: "local", success: true };
      }
    } catch (error) {
      console.error("[TTS] All providers failed:", error);
      // Last resort: the device voice, even when every provider threw.
      try {
        await this.speakLocally(text, options);
        return { provider: "local", success: true };
      } catch {
        return { provider: "local", success: false };
      }
    }
  }

  /** Plays a provider result, decoding base64 payloads to a cache file first. */
  private async playResult(result: TtsResult): Promise<void> {
    if (Platform.OS === "web") {
      throw new Error("Cloud TTS playback is not supported on web");
    }

    if (!result.audioBytes && isPlayableUri(result.audioData)) {
      await playAudioFile(result.audioData);
      return;
    }

    const extension = result.mimeType.includes("wav") ? "wav" : "mp3";
    const tempFile = new File(
      Paths.cache,
      `reem-tts-${Date.now()}.${extension}`,
    );

    try {
      if (tempFile.exists) tempFile.delete();
      tempFile.create();
      if (result.audioBytes) {
        tempFile.write(result.audioBytes);
      } else {
        tempFile.write(result.audioData, { encoding: "base64" });
      }
      await playAudioFile(tempFile.uri);
    } finally {
      try {
        if (tempFile.exists) tempFile.delete();
      } catch {
        // Cache cleanup is best effort.
      }
    }
  }

  /** Speaks through the on-device provider (native TTS file or expo-speech). */
  private async speakLocally(
    text: string,
    options?: TtsSynthesisOptions,
  ): Promise<void> {
    const local = this.providers.get("local");
    if (!local) throw new Error("Local TTS provider is not registered");

    const result = await local.synthesize(text, options);
    if (result.mimeType === "audio/spoken") return;
    if (result.audioData || result.audioBytes) await this.playResult(result);
  }

  // ── Voices ─────────────────────────────────────────────────────

  async getVoices(): Promise<TtsVoice[]> {
    const voices: TtsVoice[] = [];
    const providers = this.getOrderedProviders();

    for (const provider of providers) {
      try {
        if (provider.getVoices && (await provider.isAvailable())) {
          const providerVoices = await provider.getVoices();
          voices.push(...providerVoices);
        }
      } catch {
        // Ignore voice fetch errors for individual providers
      }
    }

    return voices;
  }

  // ── Utility ────────────────────────────────────────────────────

  getConfig(): TtsConfig {
    return { ...this.config };
  }

  isProviderAvailable(type: TtsProviderType): Promise<boolean> {
    const provider = this.providers.get(type);
    if (!provider) return Promise.resolve(false);
    return provider.isAvailable();
  }
}

// Singleton instance
export const ttsService = new TtsService();

// Auto-load API keys on module load
ttsService.loadApiKeys().catch(() => {
  // Ignore errors during auto-load
});
