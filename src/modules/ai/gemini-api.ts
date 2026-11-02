/**
 * GeminiApi
 *
 * Google Gemini API client with retry logic, proxy support (GCLOUD_PROXY_URL),
 * and direct API key authentication (GEMINI_API_KEY).
 *
 * Supports gemini-2.5-flash and other Gemini models.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

export type GeminiModel = "gemini-2.5-flash" | "gemini-2.5-pro" | "gemini-1.5-flash" | "gemini-1.5-pro" | string;

export interface GeminiApiOptions {
  apiKey?: string;
  proxyUrl?: string;
  model?: GeminiModel;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
}

export interface GeminiResponse {
  text: string;
  model: string;
  usage?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
  raw: any;
}

export class GeminiApi {
  private apiKey: string;
  private proxyUrl: string | null;
  private model: GeminiModel;
  private temperature: number;
  private topP: number;
  private topK: number;
  private maxOutputTokens: number;
  private client: GoogleGenerativeAI | null = null;

  constructor(options: GeminiApiOptions = {}) {
    this.apiKey = options.apiKey || process.env.GEMINI_API_KEY || "";
    this.proxyUrl = options.proxyUrl || process.env.GCLOUD_PROXY_URL || null;
    this.model = options.model || "gemini-2.5-flash";
    this.temperature = options.temperature ?? 0.7;
    this.topP = options.topP ?? 0.9;
    this.topK = options.topK ?? 40;
    this.maxOutputTokens = options.maxOutputTokens ?? 2048;

    if (this.apiKey) {
      this.client = new GoogleGenerativeAI(this.apiKey);
    }
  }

  /**
   * Check if the Gemini API is configured and available.
   */
  isAvailable(): boolean {
    return Boolean(this.apiKey && this.client);
  }

  /**
   * Generate content using Gemini.
   * Automatically retries on transient errors with exponential backoff.
   */
  async generateContent(
    prompt: string,
    options?: {
      model?: GeminiModel;
      temperature?: number;
      topP?: number;
      topK?: number;
      maxOutputTokens?: number;
    },
  ): Promise<GeminiResponse> {
    if (!this.client || !this.apiKey) {
      throw new Error(
        "GeminiApi: Not initialized. Provide an API key or set GEMINI_API_KEY env var.",
      );
    }

    const modelName = options?.model || this.model;
    const model = this.client.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: options?.temperature ?? this.temperature,
        topP: options?.topP ?? this.topP,
        topK: options?.topK ?? this.topK,
        maxOutputTokens: options?.maxOutputTokens ?? this.maxOutputTokens,
      },
    });

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        return {
          text,
          model: modelName,
          usage: response.usageMetadata
            ? {
                promptTokenCount: response.usageMetadata.promptTokenCount || 0,
                candidatesTokenCount:
                  response.usageMetadata.candidatesTokenCount || 0,
                totalTokenCount: response.usageMetadata.totalTokenCount || 0,
              }
            : undefined,
          raw: result,
        };
      } catch (error: any) {
        lastError = error;

        // Check if it's a retryable error (rate limit, server error, network)
        const isRetryable =
          error?.status === 429 || // Rate limit
          (error?.status && error.status >= 500) || // Server errors
          error?.code === "ECONNRESET" || // Network
          error?.code === "ETIMEDOUT" || // Network timeout
          error?.message?.includes("rate limit") ||
          error?.message?.includes("quota");

        if (!isRetryable || attempt === maxRetries - 1) {
          throw error;
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error("GeminiApi: All retry attempts failed");
  }

  /**
   * Generate content with streaming (for real-time responses).
   */
  async *generateContentStream(
    prompt: string,
    options?: {
      model?: GeminiModel;
      temperature?: number;
      topP?: number;
      topK?: number;
      maxOutputTokens?: number;
    },
  ): AsyncGenerator<string> {
    if (!this.client || !this.apiKey) {
      throw new Error(
        "GeminiApi: Not initialized. Provide an API key or set GEMINI_API_KEY env var.",
      );
    }

    const modelName = options?.model || this.model;
    const model = this.client.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: options?.temperature ?? this.temperature,
        topP: options?.topP ?? this.topP,
        topK: options?.topK ?? this.topK,
        maxOutputTokens: options?.maxOutputTokens ?? this.maxOutputTokens,
      },
    });

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await model.generateContentStream(prompt);

        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            yield text;
          }
        }

        return; // Success, exit retry loop
      } catch (error: any) {
        lastError = error;

        const isRetryable =
          error?.status === 429 ||
          (error?.status && error.status >= 500) ||
          error?.code === "ECONNRESET" ||
          error?.code === "ETIMEDOUT" ||
          error?.message?.includes("rate limit") ||
          error?.message?.includes("quota");

        if (!isRetryable || attempt === maxRetries - 1) {
          throw error;
        }

        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error("GeminiApi: All retry attempts failed (stream)");
  }

  /**
   * Get available Gemini models.
   */
  async listModels(): Promise<string[]> {
    if (!this.client) {
      throw new Error("GeminiApi: Not initialized");
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(this.apiKey)}`,
      );
      if (!response.ok) throw new Error(`Gemini model list failed: ${response.status}`);
      const payload = (await response.json()) as { models?: { name?: string }[] };
      return (payload.models ?? [])
        .map((model) => model.name ?? "")
        .filter((name) => name.includes("gemini"));
    } catch (error) {
      console.error("GeminiApi: Failed to list models:", error);
      return [];
    }
  }

  /**
   * Get the current configuration.
   */
  getConfig() {
    return {
      model: this.model,
      temperature: this.temperature,
      topP: this.topP,
      topK: this.topK,
      maxOutputTokens: this.maxOutputTokens,
      hasApiKey: Boolean(this.apiKey),
      hasProxy: Boolean(this.proxyUrl),
      proxyUrl: this.proxyUrl,
    };
  }
}

// Singleton instance
let geminiApiInstance: GeminiApi | null = null;

export function getGeminiApi(options?: GeminiApiOptions): GeminiApi {
  if (!geminiApiInstance || options) {
    geminiApiInstance = new GeminiApi(options);
  }
  return geminiApiInstance;
}

export default GeminiApi;
