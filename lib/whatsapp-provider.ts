/**
 * lib/whatsapp-provider.ts
 *
 * WhatsApp OTP provider adapter for Styld.
 * Exports the legacy helper functions and bridges to the new OtpProvider interface.
 */

import {
  AuthFlowError,
  isWhatsAppDevMode,
  isTestOtpModeActive,
  isStagingTestModeAllowed,
  getTestOtpPhoneAllowlist,
  isPhoneAllowlisted,
  getDevOtpHint,
  getOtpProvider,
  OtpProvider,
  TwilioVerifyWhatsAppProvider,
  DevWhatsAppOtpProvider,
  TestOtpProvider,
  OtpSendParams,
  OtpSendResult,
  OtpCheckParams,
  OtpCheckResult,
  getTwilioConfig,
} from './otp-provider';

export {
  AuthFlowError,
  isWhatsAppDevMode,
  isTestOtpModeActive,
  isStagingTestModeAllowed,
  getTestOtpPhoneAllowlist,
  isPhoneAllowlisted,
  getDevOtpHint,
  getOtpProvider,
  TwilioVerifyWhatsAppProvider,
  DevWhatsAppOtpProvider,
  TestOtpProvider,
  getTwilioConfig,
};
export type { OtpProvider, OtpSendParams, OtpSendResult, OtpCheckParams, OtpCheckResult };

/** Return current WhatsApp provider configuration or throw if not configured. */
export function whatsappConfiguration(): {
  account: string;
  secret: string;
  service: string;
  isDev: boolean;
  isTestMode: boolean;
} {
  if (isTestOtpModeActive()) {
    if (process.env.NODE_ENV === 'production' && !isStagingTestModeAllowed()) {
      throw new AuthFlowError(
        'Test authentication cannot run in production without explicit staging authorization and allowlist.',
        500
      );
    }
    return {
      account: 'AC_TEST_MODE_0000000000000000000',
      secret: 'test_mode_secret',
      service: 'VA_TEST_MODE_0000000000000000000',
      isDev: false,
      isTestMode: true,
    };
  }

  if (isWhatsAppDevMode()) {
    return {
      account: 'AC00000000000000000000000000000000',
      secret: 'dev_sandbox_secret',
      service: 'VA00000000000000000000000000000000',
      isDev: true,
      isTestMode: false,
    };
  }

  const account = process.env.TWILIO_ACCOUNT_SID;
  const secret = process.env.TWILIO_API_KEY_SECRET || process.env.TWILIO_AUTH_TOKEN;
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const service = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!account || !secret || !service || process.env.WHATSAPP_AUTH_ENABLED !== 'true') {
    throw new AuthFlowError('WhatsApp sign-in is not available yet. You can continue browsing while we finish connecting it.', 503);
  }
  if (!/^AC[0-9a-f]{32}$/i.test(account) || !/^VA[0-9a-f]{32}$/i.test(service)) {
    throw new AuthFlowError('WhatsApp sign-in is temporarily unavailable.', 503);
  }
  if (apiKeySid && !/^SK[0-9a-f]{32}$/i.test(apiKeySid)) {
    throw new AuthFlowError('WhatsApp sign-in is temporarily unavailable.', 503);
  }
  return { account, secret, service, isDev: false, isTestMode: false };
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
