import { base64ToBytes, pcmToWav } from "./audio-bytes";
import { TtsProvider, TtsProviderType, TtsResult, TtsSynthesisOptions } from "./types";

/**
 * Gemini TTS Provider
 *
 * Uses the Gemini API's native speech generation
 * (`gemini-2.5-flash-preview-tts`) with a GEMINI_API_KEY.
 *
 * The API returns raw 16-bit PCM (`audio/L16`), which is wrapped in a WAV
 * container here so expo-audio can play it.
 *
 * Endpoint:
 * https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent
 */
const MODEL = "gemini-2.5-flash-preview-tts";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

/** Valid Gemini prebuilt voices; "Kore" is a neutral, clear default. */
const DEFAULT_VOICE = "Kore";

type GeminiTtsPart = {
  inlineData?: { mimeType?: string; data?: string };
};

type GeminiTtsResponse = {
  candidates?: {
    content?: {
      parts?: GeminiTtsPart[];
    };
  }[];
  error?: { message?: string };
};

/** Extracts the sample rate from `audio/L16;codec=pcm;rate=24000`. */
function parseSampleRate(mimeType: string | undefined): number {
  const match = mimeType?.match(/rate=(\d+)/);
  return match ? Number(match[1]) : 24000;
}

export class GeminiTtsProvider implements TtsProvider {
  readonly type: TtsProviderType = "gemini";
  readonly name = "Gemini TTS";

  private apiKey: string | null = null;

  setApiKey(key: string) {
    this.apiKey = key;
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey && this.apiKey.length > 0);
  }

  async synthesize(
    text: string,
    options?: TtsSynthesisOptions,
  ): Promise<TtsResult> {
    if (!this.apiKey) {
      throw new Error("Gemini TTS: API key not configured");
    }

    // Gemini TTS infers the language from the text itself; rate/pitch are not
    // controllable via this model.
    const speechConfig =
      options?.voiceId
        ? { voiceConfig: { prebuiltVoiceConfig: { voiceName: options.voiceId } } }
        : { voiceConfig: { prebuiltVoiceConfig: { voiceName: DEFAULT_VOICE } } };

    const response = await fetch(`${ENDPOINT}?key=${this.apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `Gemini TTS API error (${response.status}): ${errorText}`,
      );
    }

    const data = (await response.json()) as GeminiTtsResponse;
    const inline =
      data.candidates?.[0]?.content?.parts?.[0]?.inlineData;

    if (!inline?.data) {
      throw new Error(
        data.error?.message
          ? `Gemini TTS: ${data.error.message}`
          : "Gemini TTS: no audio in response",
      );
    }

    const pcm = base64ToBytes(inline.data);
    if (pcm.length === 0) {
      throw new Error("Gemini TTS: empty audio payload");
    }

    const wav = pcmToWav(pcm, parseSampleRate(inline.mimeType));

    return {
      audioData: "",
      audioBytes: wav,
      mimeType: "audio/wav",
      provider: "gemini",
    };
  }
}
