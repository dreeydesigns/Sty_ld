export const RECOVERY_SUPPORT_EMAIL = 'trystyld@gmail.com';
export const RECOVERY_REASONS = {
  'missing-code': 'My sign-in code is not arriving',
  'lost-inbox': 'I cannot access my account email',
  'unknown-email': 'I do not remember my account email',
} as const;

export interface RecoveryRequest {
  name: string;
  contactEmail: string;
  accountEmail: string;
  accountReference: string;
  reason: keyof typeof RECOVERY_REASONS;
  note: string;
}

export function parseRecoveryRequest(value: unknown): RecoveryRequest | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const limits = { name: 100, contactEmail: 254, accountEmail: 254, accountReference: 200, reason: 30, note: 1200 };
  const clean: Record<string, string> = {};
  for (const [key, maximum] of Object.entries(limits)) {
    const field = body[key] ?? '';
    if (typeof field !== 'string' || field.length > maximum || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(field)) return null;
    clean[key] = field.trim();
  }
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (clean.name.length < 2 || !email.test(clean.contactEmail) || (clean.accountEmail && !email.test(clean.accountEmail))) return null;
  if (!Object.hasOwn(RECOVERY_REASONS, clean.reason)) return null;
  return { ...clean, contactEmail: clean.contactEmail.toLowerCase(), accountEmail: clean.accountEmail.toLowerCase() } as unknown as RecoveryRequest;
}

export function recoveryMessage(input: RecoveryRequest) {
  return [
    'Account access request. These details are unverified claims, not proof of ownership.',
    `Issue: ${RECOVERY_REASONS[input.reason]}`,
    `Name: ${input.name}`,
    `Reply email: ${input.contactEmail}`,
    `Account email, if known: ${input.accountEmail || 'Not provided'}`,
    `Account reference, if known: ${input.accountReference || 'Not provided'}`,
    `Notes: ${input.note || 'None'}`,
    'Do not change an account or grant access until ownership is independently verified. Never request a password, OTP or recovery code by email.',
  ].join('\n');
}
