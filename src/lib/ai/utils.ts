import { logger } from '@/lib/logger';
import type { CostEstimate, OpenRouterUsage, RetryOptions } from './types';

export const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export function backoffDelay(attempt: number, base: number, max: number, jitter = true): number {
  const exp = Math.min(max, base * Math.pow(2, attempt));
  if (!jitter) return exp;
  const rand = exp * (0.4 + Math.random() * 0.6); // 40% - 100% of exp
  return Math.min(max, Math.max(base, rand));
}

export function isRetriableStatus(status: number): boolean {
  return (
    status === 408 ||
    status === 409 ||
    status === 425 ||
    status === 429 ||
    (status >= 500 && status < 600)
  );
}

export async function retryWithExponentialBackoff<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions,
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void,
): Promise<T> {
  const { retries, baseDelayMs, maxDelayMs } = options;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;

      // Prefer retryAfterMs from error details if available
      const retryAfterMs = (error as any)?.details?.retryAfterMs;
      const delayMs =
        typeof retryAfterMs === 'number' && retryAfterMs > 0
          ? Math.min(retryAfterMs, maxDelayMs)
          : backoffDelay(attempt, baseDelayMs, maxDelayMs, true);

      onRetry?.(attempt, error, delayMs);
      await delay(delayMs);
    }
  }
  throw lastError;
}

export function sanitizeHeadersForLog(
  headers: Record<string, string | undefined> | Headers | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headers) return out;
  const entries: [string, string][] =
    headers instanceof Headers
      ? Array.from(headers.entries())
      : (Object.entries(headers).filter(([, v]) => typeof v === 'string') as [string, string][]);
  for (const [k, v] of entries) {
    const key = k.toLowerCase();
    if (key === 'authorization' || key === 'x-api-key') {
      out[k] = 'REDACTED';
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function sanitizeBodyForLog(body: unknown): unknown {
  try {
    if (typeof body === 'string') {
      const maybe = JSON.parse(body);
      return sanitizeBodyForLog(maybe);
    }
    if (body && typeof body === 'object') {
      const obj = Array.isArray(body) ? [...body] : { ...(body as Record<string, unknown>) };
      const redactKeys = ['apiKey', 'api_key', 'Authorization', 'authorization'];
      for (const key of Object.keys(obj as Record<string, unknown>)) {
        if (redactKeys.includes(key)) {
          (obj as Record<string, unknown>)[key] = 'REDACTED';
        } else {
          const val = (obj as Record<string, unknown>)[key];
          if (val && typeof val === 'object') {
            (obj as Record<string, unknown>)[key] = sanitizeBodyForLog(val) as any;
          }
        }
      }
      return obj;
    }
    return body;
  } catch {
    return '[unserializable body]';
  }
}

export function sanitizeRequestForLog(input: {
  url: string;
  method?: string;
  headers?: Record<string, string> | Headers;
  body?: unknown;
}) {
  return {
    url: input.url,
    method: input.method || 'GET',
    headers: sanitizeHeadersForLog(input.headers),
    body: sanitizeBodyForLog(input.body),
  };
}

// Basic price registry (per 1K tokens) for rough cost estimation.
// Values are indicative and can be adjusted as needed.
const PRICE_PER_1K: Record<string, { input: number; output: number }> = {
  // OpenAI models (example, adjust as needed)
  'gpt-4o': { input: 5.0, output: 15.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  // Anthropic models (example)
  'claude-3.5-sonnet': { input: 3.0, output: 15.0 },
};

export function calculateCostEstimate(
  model: string,
  usage?: OpenRouterUsage,
): CostEstimate | undefined {
  if (!usage) return undefined;
  const price = PRICE_PER_1K[model] || PRICE_PER_1K[model.toLowerCase()];
  const inputTokens = usage.prompt_tokens ?? 0;
  const outputTokens = usage.completion_tokens ?? 0;
  const totalTokens = usage.total_tokens ?? inputTokens + outputTokens;
  if (!price) {
    return {
      model,
      inputTokens,
      outputTokens,
      totalTokens,
      inputCostUSD: 0,
      outputCostUSD: 0,
      totalCostUSD: 0,
    };
  }
  const inputCostUSD = (inputTokens / 1000) * price.input;
  const outputCostUSD = (outputTokens / 1000) * price.output;
  return {
    model,
    inputTokens,
    outputTokens,
    totalTokens,
    inputCostUSD,
    outputCostUSD,
    totalCostUSD: inputCostUSD + outputCostUSD,
  };
}

export function safeJSONParse<T = unknown>(
  text: string,
): { ok: true; value: T } | { ok: false; error: Error } {
  try {
    return { ok: true, value: JSON.parse(text) as T };
  } catch (error) {
    return { ok: false, error: error as Error };
  }
}

/**
 * Attempt to extract the first JSON object from arbitrary LLM text.
 * Handles common cases like code fences (```json ... ```), leading/trailing prose,
 * and nested braces within quoted strings.
 */
export function extractFirstJsonObject<T = unknown>(
  text: string,
): { ok: true; value: T } | { ok: false; error: Error } {
  try {
    const s = (text || '').trim();
    if (!s) return { ok: false, error: new Error('Empty text') };

    // 1) Code-fence extraction
    const fenceMatch = s.match(/```\s*json\s*([\s\S]*?)```/i) || s.match(/```\s*([\s\S]*?)```/i);
    if (fenceMatch && fenceMatch[1]) {
      const fenced = fenceMatch[1].trim();
      const parsed = safeJSONParse<T>(fenced);
      if (parsed.ok) return parsed;
    }

    // 2) Balanced-brace scanning (find first top-level {...})
    const firstObj = (() => {
      let start = -1;
      let depth = 0;
      let inString = false;
      let escape = false;
      for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (start === -1) {
          if (ch === '{') {
            start = i;
            depth = 1;
            inString = false;
            escape = false;
          }
          continue;
        }
        if (escape) {
          escape = false;
          continue;
        }
        if (inString) {
          if (ch === '\\') {
            escape = true;
          } else if (ch === '"') {
            inString = false;
          }
          continue;
        }
        if (ch === '"') {
          inString = true;
          continue;
        }
        if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) return s.slice(start, i + 1);
        }
      }
      return '';
    })();
    if (firstObj) {
      const parsed = safeJSONParse<T>(firstObj);
      if (parsed.ok) return parsed;
    }

    // 3) If text itself is a JSON string with stray characters, try trimming non-JSON prefix/suffix
    const startIdx = s.indexOf('{');
    const endIdx = s.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const slice = s.slice(startIdx, endIdx + 1);
      const parsed = safeJSONParse<T>(slice);
      if (parsed.ok) return parsed;
    }

    return { ok: false, error: new Error('No JSON object found') };
  } catch (error) {
    return { ok: false, error: error as Error };
  }
}

export function buildAbortController(timeoutMs: number): {
  controller: AbortController;
  timeoutId: ReturnType<typeof setTimeout>;
} {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), Math.max(1, timeoutMs));
  return { controller, timeoutId };
}
