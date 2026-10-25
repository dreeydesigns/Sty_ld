export const EMAIL_REASON_CODES = {
  NOT_CONFIGURED: 'EMAIL_NOT_CONFIGURED',
  NO_SENDER: 'EMAIL_NO_SENDER',
  INVALID_KEY: 'RESEND_INVALID_KEY',
  DOMAIN_NOT_VERIFIED: 'RESEND_DOMAIN_NOT_VERIFIED',
  INVALID_SENDER: 'RESEND_INVALID_SENDER',
  TEST_RECIPIENT_RESTRICTED: 'RESEND_TEST_RECIPIENT_RESTRICTED',
  DELIVERY_REJECTED: 'RESEND_DELIVERY_REJECTED',
  RATE_LIMITED: 'RESEND_RATE_LIMITED',
  UPSTREAM: 'RESEND_UPSTREAM_ERROR',
  NETWORK: 'EMAIL_NETWORK_ERROR',
} as const;

export type EmailReasonCode = (typeof EMAIL_REASON_CODES)[keyof typeof EMAIL_REASON_CODES];

export function isConfigLevelReason(code: unknown): boolean {
  return code === EMAIL_REASON_CODES.NOT_CONFIGURED
    || code === EMAIL_REASON_CODES.NO_SENDER
    || code === EMAIL_REASON_CODES.INVALID_KEY;
}

export function userMessageForReasonCode(code?: EmailReasonCode | null): string {
  if (isConfigLevelReason(code)) {
    return 'Email sign-in is not configured on this deployment yet. This is a setup issue, not something you did. Please try again later.';
  }
  if (code === EMAIL_REASON_CODES.RATE_LIMITED) {
    return 'Too many emails have been requested. Please wait a little while and try again.';
  }
  if (code === EMAIL_REASON_CODES.UPSTREAM
    || code === EMAIL_REASON_CODES.TEST_RECIPIENT_RESTRICTED
    || code === EMAIL_REASON_CODES.DELIVERY_REJECTED
    || code === EMAIL_REASON_CODES.DOMAIN_NOT_VERIFIED
    || code === EMAIL_REASON_CODES.INVALID_SENDER) {
    return 'We could not deliver your code. Please try again later.';
  }
  if (code === EMAIL_REASON_CODES.NETWORK) {
    return 'We could not deliver your code. Please try again later.';
  }
  return 'Could not send your code. Please try again.';
}

export function uiMessageForSendError(error: { code?: string; message?: string } | null | undefined): string {
  if (error?.code && Object.values(EMAIL_REASON_CODES).includes(error.code as EmailReasonCode)) {
    return userMessageForReasonCode(error.code as EmailReasonCode);
  }
  return error?.message || 'Could not send your code.';
}

export function uiMessageForVerifyError(error: { code?: string; message?: string; status?: number } | null | undefined): string {
  const message = String(error?.message || '');
  const code = String(error?.code || '');
  const haystack = (code + ' ' + message).toUpperCase();
  const status = typeof error?.status === 'number' ? error.status : null;

  if (haystack.includes('TOO_MANY_ATTEMPTS')) {
    return 'Too many attempts. Request a new code.';
  }
  if (haystack.includes('OTP_EXPIRED')) {
    return 'That code has expired. Request a new one.';
  }
  if (haystack.includes('INVALID_OTP')) {
    return 'That code did not match. Check the latest email and try again.';
  }
  if (haystack.includes('SERVICE_UNAVAILABLE') || haystack.includes('INTERNAL_SERVER_ERROR') || (status !== null && (status >= 500 || status === 0))) {
    return 'Sign-in is temporarily unavailable. Please try again in a moment.';
  }
  if (status === 429) {
    return 'Too many attempts. Request a new code.';
  }
  if (status === 400) {
    return 'That code did not match. Check the latest email and try again.';
  }
  return message || 'Check your code and try again.';
}

export function classifyResendFailure(status: number, body?: unknown): EmailReasonCode {
  const name = String((body as { name?: unknown } | null)?.name ?? '').toLowerCase();
  const message = String((body as { message?: unknown } | null)?.message ?? '');
  const lowered = message.toLowerCase();
  if (status === 429 || name.includes('rate_limit')) return EMAIL_REASON_CODES.RATE_LIMITED;
  if (status >= 500) return EMAIL_REASON_CODES.UPSTREAM;
  if (status === 401 || name.includes('invalid_api_key') || name.includes('restricted_api')) {
    return EMAIL_REASON_CODES.INVALID_KEY;
  }
  if (status === 403 && lowered.includes('only send testing emails')) {
    return EMAIL_REASON_CODES.TEST_RECIPIENT_RESTRICTED;
  }
  if ((status === 403 || status === 422) && (lowered.includes('domain') || lowered.includes('verif'))) {
    return EMAIL_REASON_CODES.DOMAIN_NOT_VERIFIED;
  }
  if (status === 422) return EMAIL_REASON_CODES.INVALID_SENDER;
  if (status === 403) return EMAIL_REASON_CODES.DELIVERY_REJECTED;
  return EMAIL_REASON_CODES.NETWORK;
}
