import { TtsProvider, TtsProviderType, TtsResult, TtsSynthesisOptions } from "./types";

/**
 * OpenRouter TTS Provider
 *
 * Routes TTS requests through OpenRouter to TTS-capable model providers.
 * Requires an OPENROUTER_API_KEY.
 *
 * Endpoint: https://openrouter.ai/api/v1/chat/completions
 */
export class OpenRouterTtsProvider implements TtsProvider {
  readonly type: TtsProviderType = "openrouter";
  readonly name = "OpenRouter TTS";

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
      throw new Error("OpenRouter TTS: API key not configured");
    }

    const language = options?.language || "en-US";
    const voice = options?.voiceId || "alloy";

    // OpenRouter exposes audio output through chat completions for
    // audio-capable models: `modalities` asks for audio, `audio` selects the
    // voice/container, and the base64 clip comes back on
    // `choices[0].message.audio.data`.
    const requestBody = {
      model: "openai/gpt-4o-audio-preview",
      modalities: ["text", "audio"],
      audio: {
        voice,
        format: "mp3",
      },
      messages: [
        {
          role: "system",
          content: `You are a text-to-speech system. Read the user message aloud verbatim. Language: ${language}. Do not add commentary or extra words.`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      max_tokens: 2048,
    };

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "HTTP-Referer": "https://reem.ai",
          "X-Title": "Reem AI Assistant",
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `OpenRouter TTS API error (${response.status}): ${errorText}`,
      );
    }

    const data = await response.json();

    // Audio-capable models return `message.audio.data` (base64). A text-only
    // completion means the routed model ignored the audio request — treat that
    // as a failure so the chain falls through to on-device speech instead of
    // silently "succeeding" with no sound.
    const audioBase64: string | undefined = data.choices?.[0]?.message?.audio?.data;

    if (!audioBase64) {
      throw new Error("OpenRouter TTS: response contained no audio data");
    }

    return {
      audioData: audioBase64,
      mimeType: "audio/mp3",
      provider: "openrouter",
    };
  }
}
