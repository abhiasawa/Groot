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
    detectedPeople?: Array<{
      name: string;
      relationship?: string;
      context?: string;
    }>;
    detectedTasks?: Array<{
      content: string;
      category?: string;
      dueDate?: string;
    }>;
    /** Email address shared by the user — used to link messaging account to app login */
    detectedEmail?: string;
    /** True when the user is asking Groot to resend their last image/photo */
    lastImageRequest?: boolean;
    /** AI-classified card category for the user's message */
    cardCategory?: "task" | "idea" | "reflection" | "emotion" | "media" | null;
    /** Commitments the user made (e.g. "I'm going to start running") */
    detectedCommitments?: string[];
    /** Previously-detected commitments the user has now fulfilled */
    fulfilledCommitments?: string[];
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
