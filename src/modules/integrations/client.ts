/**
 * Outbound third-party API client (e.g. ERP, CRM, shipping).
 * In production, use env-based base URLs and OAuth where required.
 */
import { logger } from '../../core/logger.js';

export interface ExternalApiConfig {
  baseUrl: string;
  apiKey?: string;
  timeoutMs?: number;
}

export async function callExternalApi<T>(
  config: ExternalApiConfig,
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<{ ok: boolean; data?: T; status?: number; error?: string }> {
  const url = `${config.baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  const timeout = config.timeoutMs ?? 10000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
      },
      body: options.body != null ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = (await res.json().catch(() => ({}))) as T;
    if (!res.ok) {
      logger.warn({ url, status: res.status }, 'External API error');
      return { ok: false, status: res.status, error: (data as { message?: string }).message ?? res.statusText };
    }
    return { ok: true, data, status: res.status };
  } catch (err) {
    clearTimeout(timeoutId);
    const message = err instanceof Error ? err.message : String(err);
    logger.warn({ url, err: message }, 'External API request failed');
    return { ok: false, error: message };
  }
}
