// Types for OpenRouter AI integration and client

import type { AiConfig } from '@/lib/aiConfig';

// Chat message roles supported by OpenAI/OpenRouter-compatible APIs
export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

// OpenRouter request/response types (compatible with OpenAI schema)
export interface OpenRouterChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  // Optional reasoning settings for reasoning-capable models (e.g. openai/gpt-5.1)
  reasoning?: {
    // OpenRouter forwards this to providers such as OpenAI; accepted values include
    // "low", "medium", "high". Use string to stay forward-compatible.
    effort?: 'low' | 'medium' | 'high' | string;
  };
  // Enable structured JSON responses where supported
  response_format?: { type: 'json_object' } | { type: 'text' };
  stream?: false;
}

export interface OpenRouterUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface OpenRouterChoice {
  index: number;
  message: ChatMessage & { refusal?: string | null };
  finish_reason: string | null;
}

export interface OpenRouterChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenRouterChoice[];
  usage?: OpenRouterUsage;
  // Some providers include extra cost/metadata fields; keep them typed as unknown for forward-compat
  [key: string]: unknown;
}

export interface OpenRouterErrorPayload {
  error: {
    message: string;
    type?: string;
    code?: string | number;
  };
}

export interface CostEstimate {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCostUSD: number;
  outputCostUSD: number;
  totalCostUSD: number;
}

export interface ChatCallMetrics {
  durationMs: number;
  attempts: number;
  fromCache?: boolean;
}

export interface ChatResponse {
  content: string;
  raw: OpenRouterChatResponse;
  usage: OpenRouterUsage;
  cost?: CostEstimate;
  metrics: ChatCallMetrics;
}

export interface OpenRouterClientConfig
  extends Pick<
    AiConfig,
    'modelName' | 'temperature' | 'maxTokens' | 'topP' | 'timeoutMs' | 'apiKey'
  > {
  baseUrl?: string; // defaults to https://openrouter.ai/api/v1
  // Additional retry configuration
  maxRetries?: number; // default 3
  baseDelayMs?: number; // default 500
  maxDelayMs?: number; // default 4000
  localOnly?: boolean; // if true, only allow localhost/127.0.0.1 base URLs
}

export interface RetryOptions {
  retries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitter?: boolean;
}

export interface JsonModeOptions<TOut = unknown> {
  ensureJson?: boolean; // default true — validate and parse JSON
  // Optional post-parse refiner/validator. Throw to signal invalid.
  refine?: (data: unknown) => TOut;
}

export interface RequestOptions {
  suppressToasts?: boolean; // if true, suppress user-facing toasts on errors
}

export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };
