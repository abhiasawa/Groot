/**
 * Provider interfaces — every AI service implements these.
 * Swap providers via env vars with zero code changes.
 */

export interface LLMMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface LLMResponse {
  text: string;
  metadata?: {
    profileUpdates?: Array<{
      category: string;
      key: string;
      value: string;
    }>;
    detectedMood?: string;
    shouldStoreMemory?: boolean;
    memoryTags?: string[];
    detectedDates?: Array<{
      date: string;
      event: string;
    }>;
  };
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface LLMProvider {
  name: string;
  generateResponse(
    systemPrompt: string,
    messages: LLMMessage[],
    options?: {
      maxTokens?: number;
      temperature?: number;
      jsonMode?: boolean;
    },
  ): Promise<LLMResponse>;
}

export interface VisionResult {
  description: string;
  extractedText: string | null;
  category: string;
}

export interface VisionProvider {
  name: string;
  analyzeImage(
    imageBuffer: Buffer,
    mimeType: string,
    prompt: string,
  ): Promise<VisionResult>;
}

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
}

export interface TranscriptionProvider {
  name: string;
  transcribe(
    audioBuffer: Buffer,
    mimeType: string,
  ): Promise<TranscriptionResult>;
}

export interface TTSProvider {
  name: string;
  synthesize(
    text: string,
    voice?: string,
  ): Promise<Buffer>;
}
