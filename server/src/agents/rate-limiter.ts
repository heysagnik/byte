/**
 * Gemini API rate limiter — protects against hitting free-tier limits.
 *
 * Gemini 2.5 Pro free tier limits (as of 2025):
 *   - 5 RPM  (requests per minute)
 *   - 25 RPD (requests per day)
 *   - 1,000,000 TPM (tokens per minute)
 *
 * This limiter queues all Gemini calls and enforces a minimum gap between
 * requests. It also retries automatically on 429 (rate limit) responses
 * with exponential backoff.
 */

const REQUESTS_PER_MINUTE = 5;
const MIN_INTERVAL_MS = Math.ceil((60 * 1000) / REQUESTS_PER_MINUTE); // 12 000ms between calls

const RETRY_BASE_DELAY_MS = 15_000; // start at 15s after a 429
const MAX_RETRIES = 4;

// ─── Queue ────────────────────────────────────────────────────────────────────

interface QueueEntry<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (err: unknown) => void;
  signal?: AbortSignal;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const queue: QueueEntry<any>[] = [];
let processing = false;
let lastCallAt = 0;

async function processQueue(): Promise<void> {
  if (processing || queue.length === 0) return;
  processing = true;

  while (queue.length > 0) {
    const entry = queue.shift()!;

    // Enforce minimum interval between calls
    const now = Date.now();
    const elapsed = now - lastCallAt;
    if (elapsed < MIN_INTERVAL_MS) {
      await sleep(MIN_INTERVAL_MS - elapsed);
    }

    // Double check if aborted while sleeping
    if (entry.signal?.aborted) continue;

    lastCallAt = Date.now();

    try {
      const result = await withRetry(entry.fn, 0, entry.signal);
      entry.resolve(result);
    } catch (err) {
      entry.reject(err);
    }
  }

  processing = false;
}

// ─── Retry with exponential backoff on 429 ───────────────────────────────────

async function withRetry<T>(fn: () => Promise<T>, attempt = 0, signal?: AbortSignal): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (signal?.aborted) throw new Error('cancelled');
    if (attempt >= MAX_RETRIES) throw err;

    const isRateLimit = isRateLimitError(err);
    if (!isRateLimit) throw err;

    // Exponential backoff: 15s, 30s, 60s, 120s
    const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
    console.warn(`[rate-limiter] 429 received — retrying in ${delay / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
    await sleep(delay);
    if (signal?.aborted) throw new Error('cancelled');

    // Update lastCallAt so the queue respects the new baseline
    lastCallAt = Date.now();
    return withRetry(fn, attempt + 1, signal);
  }
}

function isRateLimitError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const msg = String((err as { message?: string }).message ?? '').toLowerCase();
  const status = (err as { status?: number }).status;
  return status === 429 || msg.includes('429') || msg.includes('rate limit') || msg.includes('quota');
}

// ─── Public API ───────────────────────────────────────────────────────────────

class GeminiRateLimiter {
  /**
   * Schedule a Gemini API call through the rate-limited queue.
   * Returns a promise that resolves when the call completes.
   *
   * Usage:
   *   const response = await geminiLimiter.schedule(() => chat.sendMessage(msg), signal);
   */
  schedule<T>(fn: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (signal?.aborted) return reject(new Error('cancelled'));

      const entry: QueueEntry<T> = { fn, resolve, reject, signal };
      
      const onAbort = () => {
        const idx = queue.indexOf(entry);
        if (idx !== -1) queue.splice(idx, 1);
        reject(new Error('cancelled'));
      };

      if (signal) {
        signal.addEventListener('abort', onAbort, { once: true });
      }

      queue.push(entry);
      // Kick off queue processing (no-op if already running)
      processQueue().catch(err => console.error('[rate-limiter] Queue error:', err));
    });
  }

  /** Current queue depth — useful for logging */
  get queueDepth(): number {
    return queue.length;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

export const geminiLimiter = new GeminiRateLimiter();
