import { getAuthHeaders } from './credentials.js';
import { error, info } from './output.js';
import { DEFAULT_HUB } from './constants.js';

const API_PREFIX = '/v1';
const DEFAULT_TIMEOUT = 30_000;
const MAX_RETRIES = 2;
const RETRY_CODES = [502, 503, 504];

interface HubRequestOptions {
  method?: string;
  body?: unknown;
  timeout?: number;
}

interface HubResponse<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

export class HubClient {
  constructor(
    private hubUrl: string = DEFAULT_HUB,
  ) {}

  async request<T = unknown>(path: string, opts: HubRequestOptions = {}): Promise<HubResponse<T>> {
    const url = `${this.hubUrl}${API_PREFIX}${path}`;
    const { method = 'GET', body, timeout = DEFAULT_TIMEOUT } = opts;

    const headers: Record<string, string> = {
      ...getAuthHeaders(this.hubUrl),
    };
    if (body) headers['Content-Type'] = 'application/json';

    let lastError: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          // exponential backoff: 500ms, 1000ms
          await new Promise(r => setTimeout(r, 500 * attempt));
        }

        const res = await fetch(url, {
          method,
          headers,
          ...(body ? { body: JSON.stringify(body) } : {}),
          signal: AbortSignal.timeout(timeout),
        });

        if (RETRY_CODES.includes(res.status) && attempt < MAX_RETRIES) {
          lastError = new Error(`Hub returned ${res.status}`);
          continue;
        }

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({})) as Record<string, string>;
          return { ok: false, status: res.status, error: errBody.error ?? res.statusText };
        }

        const data = await res.json() as T;
        return { ok: true, status: res.status, data };
      } catch (err) {
        lastError = err;
        if (attempt < MAX_RETRIES) continue;
      }
    }

    // All retries exhausted
    const hint = this.hubUrl === DEFAULT_HUB
      ? 'Check your internet connection.'
      : `Is the hub running at ${this.hubUrl}?`;
    throw Object.assign(
      new Error(`Failed to connect to hub: ${lastError instanceof Error ? lastError.message : String(lastError)}`),
      { hint },
    );
  }

  // Convenience: display a hub error consistently
  static handleError(err: unknown): void {
    if (err instanceof Error) {
      error(err.message);
      if ('hint' in err && typeof (err as Record<string, unknown>).hint === 'string') {
        info((err as Record<string, unknown>).hint as string);
      }
    } else {
      error(String(err));
    }
    process.exitCode = 1;
  }
}
