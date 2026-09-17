/**
 * lib/whatsapp-provider.ts
 *
 * WhatsApp OTP provider adapter for Styld.
 * Exports the legacy helper functions and bridges to the new OtpProvider interface.
 */

import {
  AuthFlowError,
  isWhatsAppDevMode,
  getOtpProvider,
  OtpProvider,
  TwilioVerifyWhatsAppProvider,
  DevWhatsAppOtpProvider,
  OtpSendParams,
  OtpSendResult,
  OtpCheckParams,
  OtpCheckResult,
  getTwilioConfig,
} from './otp-provider';

export {
  AuthFlowError,
  isWhatsAppDevMode,
  getOtpProvider,
  TwilioVerifyWhatsAppProvider,
  DevWhatsAppOtpProvider,
  getTwilioConfig,
};
export type { OtpProvider, OtpSendParams, OtpSendResult, OtpCheckParams, OtpCheckResult };

/** Return current WhatsApp provider configuration or throw if not configured. */
export function whatsappConfiguration() {
  if (isWhatsAppDevMode()) {
    return {
      account: 'AC00000000000000000000000000000000',
      secret: 'dev_sandbox_secret',
      service: 'VA00000000000000000000000000000000',
      isDev: true,
    };
  }

  const account = process.env.TWILIO_ACCOUNT_SID;
  const secret = process.env.TWILIO_AUTH_TOKEN;
  const service = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!account || !secret || !service || process.env.WHATSAPP_AUTH_ENABLED !== 'true') {
    throw new AuthFlowError('WhatsApp sign-in is not available yet. You can continue browsing while we finish connecting it.', 503);
  }
  if (!/^AC[0-9a-f]{32}$/i.test(account) || !/^VA[0-9a-f]{32}$/i.test(service)) {
    throw new AuthFlowError('WhatsApp sign-in is temporarily unavailable.', 503);
  }
  return { account, secret, service, isDev: false };
}

/**
 * Dispatch verification start or check through the active OtpProvider.
 * Retains compatibility with existing route callers and test fixtures.
 */
export async function whatsappRequest(
  path: 'Verifications' | 'VerificationCheck',
  fields: Record<string, string>
): Promise<{ sid: string; to: string; status: string; channel: string; valid?: boolean }> {
  const provider = getOtpProvider();

  if (path === 'Verifications') {
    const result = await provider.sendOtp({
      to: fields.To,
      channel: (fields.Channel as 'whatsapp') || 'whatsapp',
    });
    return {
      sid: result.sid,
      to: result.to,
      status: result.status,
      channel: result.channel,
    };
  }

  if (path === 'VerificationCheck') {
    const result = await provider.verifyOtp({
      to: fields.To || '',
      code: fields.Code,
      verificationSid: fields.VerificationSid,
    });
    return {
      sid: result.sid,
      to: result.to,
      status: result.status,
      channel: result.channel,
      valid: result.valid,
    };
  }

  throw new AuthFlowError('Invalid verification path', 400);
}
