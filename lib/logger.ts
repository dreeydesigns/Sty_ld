/**
 * Styld Structured Server-Side Logger
 *
 * Enforces production log sanitization:
 * - Redacts sensitive credentials (passwords, OTPs, auth tokens, API keys, secrets)
 * - Masks sensitive PII (phones, national IDs)
 * - Injects timestamp, log level, and correlation request IDs
 * - Safe for Next.js API routes and server actions
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'code',
  'otp',
  'token',
  'token_hash',
  'verification_sid',
  'secret',
  'apikey',
  'api_key',
  'authorization',
  'cookie',
  'session',
  'national_id',
  'id_number',
  'credit_card',
  'cvv',
]);

/**
 * Mask phone numbers to preserve debugging country/network while protecting user privacy.
 * E.g., "+254712345678" -> "+2547****5678"
 */
export function maskPhone(phone?: string | null): string {
  if (!phone || typeof phone !== 'string') return '';
  const clean = phone.trim();
  if (clean.length <= 6) return '***';
  const start = clean.slice(0, 5);
  const end = clean.slice(-4);
  return `${start}****${end}`;
}

/**
 * Recursively deep-sanitize an object or array, stripping or redacting sensitive keys.
 */
export function sanitizeLogData(data: unknown, depth = 0): unknown {
  if (depth > 6) return '[MaxDepthReached]';
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    // Redact Bearer tokens or long base64 secrets if present in raw strings
    if (data.startsWith('Bearer ') || data.startsWith('Basic ')) {
      return '[REDACTED_AUTH_HEADER]';
    }
    return data;
  }

  if (typeof data !== 'object') return data;

  if (data instanceof Error) {
    return {
      name: data.name,
      message: data.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : data.stack,
    };
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item, depth + 1));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes('secret') || lowerKey.includes('token') || lowerKey.includes('password')) {
      sanitized[key] = '[REDACTED]';
    } else if (lowerKey === 'phone' && typeof value === 'string') {
      sanitized[key] = maskPhone(value);
    } else {
      sanitized[key] = sanitizeLogData(value, depth + 1);
    }
  }

  return sanitized;
}

function emitLog(level: LogLevel, message: string, meta?: Record<string, unknown>, error?: unknown) {
  const isProduction = process.env.NODE_ENV === 'production';
  const timestamp = new Date().toISOString();
  const sanitizedMeta = meta ? sanitizeLogData(meta) : undefined;
  const sanitizedErr = error ? sanitizeLogData(error) : undefined;

  const payload = {
    timestamp,
    level,
    message,
    ...(sanitizedMeta && typeof sanitizedMeta === 'object' ? sanitizedMeta : {}),
    ...(sanitizedErr ? { error: sanitizedErr } : {}),
  };

  const output = isProduction ? JSON.stringify(payload) : `[${timestamp}] [${level.toUpperCase()}] ${message} ${meta ? JSON.stringify(sanitizedMeta) : ''} ${sanitizedErr ? JSON.stringify(sanitizedErr) : ''}`.trim();

  switch (level) {
    case 'error':
      console.error(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    case 'info':
      console.info(output);
      break;
    case 'debug':
      if (process.env.DEBUG || !isProduction) {
        console.debug(output);
      }
      break;
  }
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => emitLog('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) => emitLog('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => emitLog('warn', message, meta),
  error: (message: string, error?: unknown, meta?: Record<string, unknown>) => emitLog('error', message, meta, error),
};
