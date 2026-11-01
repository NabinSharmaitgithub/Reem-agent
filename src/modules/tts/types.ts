/**
 * TTS Provider types for the fallback chain:
 * Gemini TTS → OpenRouter TTS → Local TTS
 */

export type TtsProviderType = "gemini" | "openrouter" | "local";

export type TtsVoice = {
  id: string;
  name: string;
  language: string;
  gender?: "male" | "female" | "neutral";
  provider: TtsProviderType;
};

export type TtsSynthesisOptions = {
  /** BCP-47 language tag, e.g. "en-US" */
  language?: string;
  /** Voice ID to use (provider-specific) */
  voiceId?: string;
  /** Speaking rate multiplier (0.25–4.0) */
  rate?: number;
  /** Pitch adjustment */
  pitch?: number;
  /** Volume (0.0–1.0) */
  volume?: number;
};

export type TtsResult = {
  /** Base64-encoded audio data (for cloud providers) or file URI (for local) */
  audioData: string;
  /** Raw audio bytes when a provider already decoded the payload. */
  audioBytes?: Uint8Array;
  /** MIME type of the audio */
  mimeType: string;
  /** Duration in milliseconds */
  durationMs?: number;
  /** Provider that produced the result */
  provider: TtsProviderType;
};

export type TtsProvider = {
  type: TtsProviderType;
  name: string;
  isAvailable(): Promise<boolean>;
  synthesize(text: string, options?: TtsSynthesisOptions): Promise<TtsResult>;
  getVoices?(): Promise<TtsVoice[]>;
};

/**
 * TTS Configuration
 */
export type TtsConfig = {
  /** Preferred provider order */
  preferredOrder: TtsProviderType[];
  /** Enable automatic fallback */
  enableFallback: boolean;
  /** Gemini API key (stored securely) */
  geminiApiKey?: string;
  /** OpenRouter API key (stored securely) */
  openrouterApiKey?: string;
  /** Local TTS language preference */
  localLanguage?: string;
  /** Whether TTS is enabled at all */
  enabled: boolean;
};

export const DEFAULT_TTS_CONFIG: TtsConfig = {
  preferredOrder: ["gemini", "openrouter", "local"],
  enableFallback: true,
  geminiApiKey: undefined,
  openrouterApiKey: undefined,
  localLanguage: undefined,
  enabled: true,
};
