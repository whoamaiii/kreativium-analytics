import { logger } from '@/lib/logger';
import { errorHandler } from '@/lib/errorHandler';
import { loadAiConfig, type AiConfig } from '@/lib/aiConfig';
import { STORAGE_KEYS } from '@/lib/storage/keys';
import { SensoryCompassError, ErrorType } from '@/types/errors';

import type {
  ChatMessage,
  ChatResponse,
  JsonModeOptions,
  OpenRouterChatRequest,
  OpenRouterChatResponse,
  OpenRouterClientConfig,
  OpenRouterErrorPayload,
  RequestOptions,
  RetryOptions,
} from './types';

import {
  buildAbortController,
  calculateCostEstimate,
  isRetriableStatus,
  retryWithExponentialBackoff,
  sanitizeRequestForLog,
  safeJSONParse,
} from './utils';
import { aiMetrics } from '@/lib/ai/metrics';

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';

export class OpenRouterClient {
  private config: Required<OpenRouterClientConfig>;

  constructor(overrides?: Partial<OpenRouterClientConfig>) {
    // Base AI config from env with overrides
    const ai: AiConfig = loadAiConfig({
      modelName: overrides?.modelName,
      temperature: overrides?.temperature,
      maxTokens: overrides?.maxTokens,
      topP: overrides?.topP,
      timeoutMs: overrides?.timeoutMs,
      apiKey: overrides?.apiKey,
    });

    // Resolve model/key from env with safe browser fallbacks
    const envAny: Record<string, unknown> = (import.meta as any)?.env ?? {};
    const getLS = (k: string) => {
      try {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(k) || '' : '';
      } catch (e) {
        try {
          logger.warn('[OpenRouterClient] localStorage access failed', e as Error);
        } catch {}
        return '';
      }
    };
    const pickFirstNonEmpty = (...values: Array<unknown>): string => {
      for (const value of values) {
        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (trimmed.length > 0) return trimmed;
        }
      }
      return '';
    };

    // Precedence: explicit overrides > validated ai.modelName > env/localStorage > default
    let liveModel = overrides?.modelName ?? ai.modelName;
    if (!liveModel || liveModel.trim().length === 0) {
      liveModel =
        pickFirstNonEmpty(envAny.VITE_AI_MODEL_NAME, getLS(STORAGE_KEYS.AI_MODEL_NAME)) ||
        ai.modelName;
    }

    const liveKey = pickFirstNonEmpty(
      overrides?.apiKey,
      ai.apiKey,
      envAny.VITE_OPENROUTER_API_KEY,
      getLS(STORAGE_KEYS.OPENROUTER_API_KEY),
      getLS(STORAGE_KEYS.VITE_OPENROUTER_API_KEY),
    );

    this.config = {
      baseUrl: overrides?.baseUrl || (ai as any).baseUrl || DEFAULT_BASE_URL,
      modelName: liveModel,
      temperature: ai.temperature,
      maxTokens: ai.maxTokens,
      topP: ai.topP,
      timeoutMs: ai.timeoutMs,
      apiKey: liveKey,
      maxRetries: overrides?.maxRetries ?? 3,
      baseDelayMs: overrides?.baseDelayMs ?? 500,
      maxDelayMs: overrides?.maxDelayMs ?? 4000,
      localOnly: overrides?.localOnly ?? (ai as any)?.localOnly ?? false,
    } as Required<OpenRouterClientConfig>;

    try {
      logger.debug('[OpenRouterClient] init config', {
        hasKey: !!this.config.apiKey,
        model: this.config.modelName,
      });
    } catch (e) {
      try {
        logger.warn('[OpenRouterClient] Constructor debug logging failed', e as Error);
      } catch {}
    }
  }

  private requiresApiKey(): boolean {
    // Require a key when targeting OpenRouter; allow keyless for local/other dev servers
    const url = (this.config.baseUrl || '').toLowerCase();
    return url.includes('openrouter.ai');
  }

  private isLocalBaseUrl(): boolean {
    const url = (this.config.baseUrl || '').toLowerCase();
    return url.includes('localhost') || url.includes('127.0.0.1');
  }

  private buildHeaders(): Headers {
    const apiKey = this.config.apiKey;
    if (this.config.localOnly && !this.isLocalBaseUrl()) {
      const err = new SensoryCompassError(
        ErrorType.AI_CONFIGURATION_ERROR,
        'Local-only mode enabled but base URL is not local',
        {
          code: 'AI_LOCAL_ONLY',
          userMessage:
            'Appen er satt til kun lokal AI. Sett VITE_AI_BASE_URL til http://localhost:1234/v1.',
          recoverable: false,
        },
      );
      throw err;
    }
    if (this.requiresApiKey() && !apiKey) {
      const err = new SensoryCompassError(
        ErrorType.AI_CONFIGURATION_ERROR,
        'Missing API key for OpenRouter',
        {
          code: 'AI_API_KEY_MISSING',
          userMessage: 'AI configuration error. Please contact support.',
          recoverable: false,
        },
      );
      throw err;
    }
    try {
      logger.debug('[OpenRouterClient] buildHeaders hasKey', { hasKey: !!apiKey });
    } catch (e) {
      try {
        logger.warn('[OpenRouterClient] Debug logging failed', e as Error);
      } catch {}
    }
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Accept', 'application/json');
    if (!this.config.localOnly && apiKey) headers.set('Authorization', `Bearer ${apiKey}`);
    // As recommended by OpenRouter
    if (typeof window !== 'undefined' && this.requiresApiKey()) {
      headers.set('HTTP-Referer', window.location.origin);
    }
    headers.set('X-Title', 'Sensory Compass');
    return headers;
  }

  private buildRequestBody(messages: ChatMessage[], jsonMode: boolean): OpenRouterChatRequest {
    const body: OpenRouterChatRequest = {
      model: this.config.modelName,
      messages,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      top_p: this.config.topP,
    };
    if (jsonMode) {
      body.response_format = { type: 'json_object' };
    }
    return body;
  }

  private async postChatCompletions(
    body: OpenRouterChatRequest,
    retry: RetryOptions,
  ): Promise<{ response: OpenRouterChatResponse; attempts: number; durationMs: number }> {
    const endpoint = `${this.config.baseUrl}/chat/completions`;
    try {
      aiMetrics.recordRequestStart();
    } catch {
      // Swallow metrics init errors to avoid noisy logs in production
    }
    const started = performance.now();
    let attempts = 0;

    const exec = async (attempt: number): Promise<OpenRouterChatResponse> => {
      attempts = attempt + 1;
      const { controller, timeoutId } = buildAbortController(this.config.timeoutMs);
      const headers = this.buildHeaders();
      const req: RequestInit = {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      };

      // Pre-request logging (sanitized)
      if (attempt === 0) {
        logger.info(
          '[OpenRouter] Request start',
          sanitizeRequestForLog({ url: endpoint, method: 'POST', headers, body }),
        );
      } else {
        logger.warn('[OpenRouter] Retrying request', {
          attempt,
          ...sanitizeRequestForLog({ url: endpoint, method: 'POST', headers }),
        });
      }

      try {
        const res = await fetch(endpoint, req);
        clearTimeout(timeoutId);

        if (!res.ok) {
          const text = await res.text().catch(() => '');

          // Extract retry-after header if present
          const retryAfterHeader = res.headers.get('retry-after');
          const retryAfterMs = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : undefined;

          // Try parse OpenRouter error payload for message
          let message = text;
          try {
            const parsed = JSON.parse(text) as OpenRouterErrorPayload;
            if (parsed?.error?.message) message = parsed.error.message;
          } catch (e) {
            try {
              logger.debug('[OpenRouterClient] Failed to parse error payload as JSON', {
                error: e instanceof Error ? { name: e.name, message: e.message } : String(e),
                snippet: text.slice(0, 160),
              });
            } catch {}
          }

          if (res.status === 429) {
            // Rate limited – signal retryable
            const retryable = new SensoryCompassError(
              ErrorType.AI_QUOTA_EXCEEDED,
              message || 'Rate limited by AI provider',
              {
                code: 'AI_RATE_LIMITED',
                recoverable: true,
                details: { status: res.status, retryAfterMs },
              },
            );
            throw retryable;
          }

          if (isRetriableStatus(res.status)) {
            const retryable = new SensoryCompassError(
              ErrorType.AI_API_FAILURE,
              message || 'Transient AI API error',
              {
                code: `HTTP_${res.status}`,
                recoverable: true,
                details: { status: res.status, retryAfterMs },
              },
            );
            throw retryable;
          }

          const err = new SensoryCompassError(
            ErrorType.AI_API_FAILURE,
            message || `AI API request failed with status ${res.status}`,
            { code: `HTTP_${res.status}`, recoverable: false, details: { status: res.status } },
          );
          throw err;
        }

        const json = (await res.json()) as OpenRouterChatResponse;
        return json;
      } catch (error) {
        clearTimeout(timeoutId);
        // Network or Abort errors should be typed and possibly retried
        if ((error as any)?.name === 'AbortError') {
          const err = new SensoryCompassError(ErrorType.TIMEOUT_ERROR, 'AI request timed out', {
            code: 'AI_TIMEOUT',
            recoverable: true,
          });
          throw err;
        }
        throw error;
      }
    };

    const res = await retryWithExponentialBackoff<OpenRouterChatResponse>(
      exec,
      retry,
      (attempt, error, delayMs) => {
        logger.warn('[OpenRouter] Retry scheduled', {
          attempt,
          delayMs,
          error:
            error instanceof Error ? { name: error.name, message: error.message } : String(error),
        });
      },
    );

    const durationMs = performance.now() - started;
    return { response: res, attempts, durationMs };
  }

  private pickFirstMessageContent(data: OpenRouterChatResponse): string {
    const message = data.choices?.[0]?.message;
    if (!message) {
      throw new SensoryCompassError(
        ErrorType.AI_INVALID_RESPONSE,
        'AI returned an unexpected response format',
        { code: 'AI_INVALID_RESPONSE', recoverable: true, details: { data } },
      );
    }

    const refusal =
      typeof (message as any).refusal === 'string'
        ? ((message as any).refusal as string).trim()
        : '';
    if (refusal.length > 0) {
      throw new SensoryCompassError(ErrorType.AI_REFUSAL, 'AI refused to provide a response', {
        code: 'AI_REFUSAL',
        userMessage: refusal,
        recoverable: false,
        details: { refusal, data },
      });
    }

    // Some providers place JSON only in tool_calls.function.arguments with empty/null content
    if (typeof (message as any).content === 'string') {
      return (message as any).content as string;
    }
    const toolArgs = (message as any)?.tool_calls?.[0]?.function?.arguments;
    if (toolArgs) {
      // Defer actual parsing of tool args to JSON handlers; return empty string to signal fallback path
      return '';
    }
    throw new SensoryCompassError(
      ErrorType.AI_INVALID_RESPONSE,
      'AI returned an unexpected response format',
      { code: 'AI_INVALID_RESPONSE', recoverable: true, details: { data } },
    );
  }

  // Public: generic chat call returning raw text
  async chat(
    messages: ChatMessage[] | string,
    overrides?: Partial<OpenRouterClientConfig>,
    options?: RequestOptions,
  ): Promise<ChatResponse> {
    try {
      const merged = overrides ? new OpenRouterClient({ ...this.config, ...overrides }) : this;
      const msgs: ChatMessage[] = Array.isArray(messages)
        ? messages
        : [{ role: 'user', content: String(messages) }];
      const body = merged.buildRequestBody(msgs, false);

      const { response, attempts, durationMs } = await merged.postChatCompletions(body, {
        retries: merged.config.maxRetries,
        baseDelayMs: merged.config.baseDelayMs,
        maxDelayMs: merged.config.maxDelayMs,
      });

      const content = merged.pickFirstMessageContent(response);
      if (content.trim().length === 0) {
        throw new SensoryCompassError(
          ErrorType.AI_EMPTY_RESPONSE,
          'AI returned an empty response',
          {
            code: 'AI_EMPTY_RESPONSE',
            recoverable: true,
            details: { responseModel: response.model },
          },
        );
      }
      const usage = response.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      const cost = calculateCostEstimate(response.model || merged.config.modelName, usage);

      logger.info('[OpenRouter] Request success', {
        model: response.model,
        usage,
        cost,
        metrics: { durationMs, attempts },
      });

      const resp = {
        content,
        raw: response,
        usage,
        cost,
        metrics: { durationMs, attempts },
      } as const;
      try {
        aiMetrics.recordSuccess(durationMs);
        aiMetrics.recordRetries(attempts);
      } catch (e) {
        try {
          logger.warn('[OpenRouterClient] Success metrics failed', e as Error);
        } catch {}
      }
      return resp as ChatResponse;
    } catch (error) {
      try {
        aiMetrics.recordFailure();
      } catch (e) {
        try {
          logger.warn('[OpenRouterClient] Failure metrics failed', e as Error);
        } catch {}
      }
      // Delegate to global error handler and rethrow wrapped
      const wrapped =
        error instanceof SensoryCompassError
          ? error
          : new SensoryCompassError(
              ErrorType.AI_API_FAILURE,
              (error as Error)?.message || 'AI request failed',
              { details: { error }, recoverable: true },
            );
      await errorHandler.handle(wrapped, { showToast: !options?.suppressToasts, logError: true });
      throw wrapped;
    }
  }

  // Public: chat with JSON-mode enabled and JSON parsing/validation
  async chatJSON<TOut = unknown>(
    input: ChatMessage[] | string | { system?: string; user: string },
    configOptions?: Partial<OpenRouterClientConfig> & JsonModeOptions<TOut>,
    requestOptions?: RequestOptions,
  ): Promise<{ data: TOut; response: ChatResponse }> {
    const jsonMode = true;
    const ensure = configOptions?.ensureJson ?? true;
    try {
      const merged = configOptions
        ? new OpenRouterClient({ ...this.config, ...configOptions })
        : this;
      const messages: ChatMessage[] = Array.isArray(input)
        ? input
        : typeof input === 'string'
          ? [{ role: 'user', content: input }]
          : [
              ...(input.system
                ? ([{ role: 'system', content: input.system }] as ChatMessage[])
                : []),
              { role: 'user', content: input.user },
            ];

      const body = merged.buildRequestBody(messages, jsonMode);
      const { response, attempts, durationMs } = await merged.postChatCompletions(body, {
        retries: merged.config.maxRetries,
        baseDelayMs: merged.config.baseDelayMs,
        maxDelayMs: merged.config.maxDelayMs,
      });

      const text = merged.pickFirstMessageContent(response);
      const trimmedText = text.trim();

      let value: TOut;
      if (!ensure) {
        // Skip JSON parsing/validation and return raw content
        value = text as TOut;
      } else {
        // Enforce JSON parse/refine
        let parsed = safeJSONParse<unknown>(text);
        let hasToolArgs = false;
        if (!parsed.ok) {
          // 0) Tool/function-call style responses
          try {
            const toolArgs = (response as any)?.choices?.[0]?.message?.tool_calls?.[0]?.function
              ?.arguments;
            if (typeof toolArgs === 'string') {
              const trimmedToolArgs = toolArgs.trim();
              if (trimmedToolArgs.length > 0) {
                hasToolArgs = true;
                const pa = safeJSONParse<unknown>(toolArgs);
                if (pa.ok) parsed = pa as any;
              }
            } else if (toolArgs && typeof toolArgs === 'object') {
              hasToolArgs = true;
              parsed = { ok: true, value: toolArgs } as any;
            }
          } catch {}

          // 1) Fallback JSON extraction strategies on content text
          if (!parsed.ok) {
            try {
              const { extractFirstJsonObject } = await import('./utils');
              const attempt = extractFirstJsonObject<unknown>(text);
              if (attempt.ok) {
                parsed = { ok: true, value: attempt.value } as any;
              }
            } catch {}
          }
        }
        if (!parsed.ok) {
          try {
            aiMetrics.recordJsonParseError();
          } catch (e) {
            try {
              logger.warn('[OpenRouterClient] JSON parse error metrics failed', e as Error);
            } catch {}
          }
          if (trimmedText.length === 0 && !hasToolArgs) {
            throw new SensoryCompassError(
              ErrorType.AI_EMPTY_RESPONSE,
              'AI returned an empty response',
              {
                code: 'AI_EMPTY_RESPONSE',
                recoverable: true,
                details: { responseModel: response.model },
              },
            );
          }
          throw new SensoryCompassError(
            ErrorType.AI_INVALID_RESPONSE,
            'AI returned invalid JSON response',
            {
              code: 'AI_JSON_PARSE_ERROR',
              recoverable: true,
              details: { textSnippet: text.slice(0, 200) },
            },
          );
        }

        if (configOptions?.refine) {
          try {
            value = configOptions.refine(parsed.value);
            try {
              aiMetrics.recordJsonValid();
            } catch (e) {
              try {
                logger.warn('[OpenRouterClient] JSON valid metrics failed', e as Error);
              } catch {}
            }
          } catch (err) {
            try {
              aiMetrics.recordJsonValidateError();
            } catch (e) {
              try {
                logger.warn('[OpenRouterClient] JSON validate error metrics failed', e as Error);
              } catch {}
            }
            throw new SensoryCompassError(
              ErrorType.AI_INVALID_RESPONSE,
              'AI returned JSON that failed validation',
              { code: 'AI_JSON_VALIDATE_ERROR', details: { error: String(err) } },
            );
          }
        } else {
          value = parsed.value as TOut;
          try {
            aiMetrics.recordJsonValid();
          } catch (e) {
            try {
              logger.warn('[OpenRouterClient] JSON valid metrics failed', e as Error);
            } catch {}
          }
        }
      }
      const usage = response.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      const cost = calculateCostEstimate(response.model || merged.config.modelName, usage);

      logger.info('[OpenRouter] JSON-mode success', {
        model: response.model,
        usage,
        cost,
        metrics: { durationMs, attempts },
      });

      const resp: ChatResponse = {
        content: text,
        raw: response,
        usage,
        cost,
        metrics: { durationMs, attempts },
      };
      try {
        aiMetrics.recordSuccess(durationMs);
        aiMetrics.recordRetries(attempts);
      } catch (e) {
        try {
          logger.warn('[OpenRouterClient] Success metrics failed', e as Error);
        } catch {}
      }
      return { data: value, response: resp };
    } catch (error) {
      try {
        aiMetrics.recordFailure();
      } catch (e) {
        try {
          logger.warn('[OpenRouterClient] Failure metrics failed', e as Error);
        } catch {}
      }
      const wrapped =
        error instanceof SensoryCompassError
          ? error
          : new SensoryCompassError(
              ErrorType.AI_API_FAILURE,
              (error as Error)?.message || 'AI JSON request failed',
              { details: { error }, recoverable: true },
            );
      await errorHandler.handle(wrapped, {
        showToast: !requestOptions?.suppressToasts,
        logError: true,
      });
      throw wrapped;
    }
  }
}

// Export a lightweight facade that reads fresh env each call
export const openRouterClient = {
  chat: (...args: any[]) => {
    // Respect per-call overrides passed as the second arg
    const overrides = (args?.[1] ?? undefined) as Partial<OpenRouterClientConfig> | undefined;
    const client = new OpenRouterClient(overrides);
    return client.chat(...(args as Parameters<OpenRouterClient['chat']>));
  },
  chatJSON: (...args: any[]) => {
    // Respect per-call overrides passed as the second arg
    const overrides = (args?.[1] ?? undefined) as Partial<OpenRouterClientConfig> | undefined;
    const client = new OpenRouterClient(overrides);
    // Preserve generic behavior by delegating at runtime; callers retain typing via export cast below
    return (client.chatJSON as any)(...args);
  },
} as {
  chat: OpenRouterClient['chat'];
  chatJSON: OpenRouterClient['chatJSON'];
};
