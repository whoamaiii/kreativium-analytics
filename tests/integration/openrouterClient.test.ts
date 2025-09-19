import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenRouterClient } from '@/lib/ai/openrouterClient';

vi.mock('@/lib/errorHandler', () => ({
  errorHandler: { handle: vi.fn(() => Promise.resolve()) },
}));

vi.mock('@/lib/aiConfig', async (orig) => {
  const mod: any = await orig();
  return {
    ...mod,
    loadAiConfig: (overrides?: any) => ({
      ...mod.DEFAULT_AI_CONFIG,
      enabled: true,
      apiKey: 'test-key',
      ...(overrides || {}),
    }),
  };
});

describe('OpenRouterClient integration (mocked fetch)', () => {
  const realFetch = global.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
    // @ts-expect-error Mock global fetch with vi.fn for integration harness
    global.fetch = vi.fn();
  });
  afterEach(() => {
    vi.useRealTimers();
    global.fetch = realFetch as any;
    vi.clearAllMocks();
  });

  it('handles successful JSON chat call', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"ok":true}' } }], model: 'gpt-4o-mini', usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 } }),
      headers: new Headers(),
    });
    const client = new OpenRouterClient();
    const { data, response } = await client.chatJSON('{"user":"hi"}', { ensureJson: true });
    expect(data).toEqual({ ok: true });
    expect(response.usage.total_tokens).toBe(15);
  });

  it('retries on 429 with retry-after and eventually succeeds', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: false, status: 429, text: async () => JSON.stringify({ error: { message: 'rate limit' } }), headers: new Headers({ 'retry-after': '1' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { content: '{"ok":true}' } }], model: 'gpt-4o-mini' }), headers: new Headers() });
    const client = new OpenRouterClient({ maxRetries: 1, baseDelayMs: 10, maxDelayMs: 50 });
    const { data } = await client.chatJSON('{"user":"hi"}', { ensureJson: true });
    expect(data).toEqual({ ok: true });
  });

  it('times out and throws recoverable timeout error', async () => {
    (global.fetch as any).mockImplementationOnce(() => new Promise(() => {}));
    const client = new OpenRouterClient({ timeoutMs: 10, maxRetries: 0 });
    await expect(client.chatJSON('{"user":"hi"}')).rejects.toBeTruthy();
  });

  it('handles non-retriable 400-level errors', async () => {
    (global.fetch as any).mockResolvedValueOnce({ ok: false, status: 400, text: async () => 'bad', headers: new Headers() });
    const client = new OpenRouterClient({ maxRetries: 0 });
    await expect(client.chatJSON('{"user":"hi"}')).rejects.toBeTruthy();
  });
});
