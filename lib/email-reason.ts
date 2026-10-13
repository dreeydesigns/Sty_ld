export const EMAIL_REASON_CODES = {
  NOT_CONFIGURED: 'EMAIL_NOT_CONFIGURED',
  NO_SENDER: 'EMAIL_NO_SENDER',
  INVALID_KEY: 'RESEND_INVALID_KEY',
  DOMAIN_NOT_VERIFIED: 'RESEND_DOMAIN_NOT_VERIFIED',
  INVALID_SENDER: 'RESEND_INVALID_SENDER',
  RATE_LIMITED: 'RESEND_RATE_LIMITED',
  UPSTREAM: 'RESEND_UPSTREAM_ERROR',
  NETWORK: 'EMAIL_NETWORK_ERROR',
} as const;

export type EmailReasonCode = (typeof EMAIL_REASON_CODES)[keyof typeof EMAIL_REASON_CODES];

export function isConfigLevelReason(code: unknown): boolean {
  return code === EMAIL_REASON_CODES.NOT_CONFIGURED
    || code === EMAIL_REASON_CODES.NO_SENDER
    || code === EMAIL_REASON_CODES.INVALID_KEY
    || code === EMAIL_REASON_CODES.DOMAIN_NOT_VERIFIED
    || code === EMAIL_REASON_CODES.INVALID_SENDER;
}

export function userMessageForReasonCode(code?: EmailReasonCode | null): string {
  if (isConfigLevelReason(code)) {
    return 'Email sign-in is not configured on this deployment yet. This is a setup issue, not something you did. Please try again later.';
  }
  if (code === EMAIL_REASON_CODES.RATE_LIMITED) {
    return 'Too many emails have been requested. Please wait a little while and try again.';
  }
  if (code === EMAIL_REASON_CODES.UPSTREAM) {
    return 'We could not deliver your code. Please try again later.';
  }
  if (code === EMAIL_REASON_CODES.NETWORK) {
    return 'We could not deliver your code. Please try again later.';
  }
  return 'Could not send your code. Please try again.';
}

export function uiMessageForSendError(error: { code?: string; message?: string } | null | undefined): string {
  if (error?.code && isConfigLevelReason(error.code)) {
    return userMessageForReasonCode(error.code as EmailReasonCode);
  }
  return error?.message || 'Could not send your code.';
}

export function classifyResendFailure(status: number, body?: unknown): EmailReasonCode {
  const name = String((body as { name?: unknown } | null)?.name ?? '').toLowerCase();
  const message = String((body as { message?: unknown } | null)?.message ?? '');
  const lowered = message.toLowerCase();
  if (status === 401 || status === 403 || name.includes('invalid_api_key') || name.includes('restricted_api')) {
    return EMAIL_REASON_CODES.INVALID_KEY;
  }
  if (status === 429 || name.includes('rate_limit')) return EMAIL_REASON_CODES.RATE_LIMITED;
  if (status === 422 && (lowered.includes('domain') || lowered.includes('verif'))) {
    return EMAIL_REASON_CODES.DOMAIN_NOT_VERIFIED;
  }
  if (status === 422) return EMAIL_REASON_CODES.INVALID_SENDER;
  if (status >= 500) return EMAIL_REASON_CODES.UPSTREAM;
  return EMAIL_REASON_CODES.NETWORK;
}