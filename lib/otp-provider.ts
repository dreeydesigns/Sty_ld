/**
 * lib/otp-provider.ts
 *
 * Pluggable OTP Provider architecture for Styld authentication.
 * Integrates with Twilio Verify v2 using the WhatsApp channel and
 * official Meta-approved authentication templates (with Copy Code button).
 */

export class AuthFlowError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = 'AuthFlowError';
  }
}

export interface OtpSendParams {
  to: string; // E.164 formatted phone number (+254...)
  channel?: 'whatsapp' | 'sms';
  locale?: string;
}

export interface OtpSendResult {
  sid: string;
  to: string;
  status: 'pending' | 'approved' | 'canceled' | string;
  channel: string;
}

export interface OtpCheckParams {
  to: string; // E.164 formatted phone number (+254...)
  code: string; // 6-digit OTP
  verificationSid?: string;
}

export interface OtpCheckResult {
  sid: string;
  to: string;
  status: 'approved' | 'pending' | 'canceled' | string;
  valid: boolean;
  channel: string;
}

export interface OtpProvider {
  getProviderName(): string;
  isConfigured(): boolean;
  sendOtp(params: OtpSendParams): Promise<OtpSendResult>;
  verifyOtp(params: OtpCheckParams): Promise<OtpCheckResult>;
}

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  verifyServiceSid: string;
  authEnabled: boolean;
}

/** Read and validate Twilio credentials from the environment. */
export function getTwilioConfig(): TwilioConfig {
  return {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID || '',
    authEnabled: process.env.WHATSAPP_AUTH_ENABLED === 'true',
  };
}

export function isWhatsAppDevMode(): boolean {
  return process.env.WHATSAPP_DEV_MODE === 'true';
}

/**
 * TwilioVerifyWhatsAppProvider
 *
 * Communicates with Twilio Verify API v2 using the WhatsApp channel.
 * Uses Meta's approved WhatsApp authentication template with one-tap "Copy code".
 */
export class TwilioVerifyWhatsAppProvider implements OtpProvider {
  private config: TwilioConfig;

  constructor(config?: TwilioConfig) {
    this.config = config || getTwilioConfig();
  }

  getProviderName(): string {
    return 'twilio-verify-whatsapp';
  }

  isConfigured(): boolean {
    const { accountSid, authToken, verifyServiceSid, authEnabled } = this.config;
    if (!authEnabled || !accountSid || !authToken || !verifyServiceSid) {
      return false;
    }
    return /^AC[0-9a-f]{32}$/i.test(accountSid) && /^VA[0-9a-f]{32}$/i.test(verifyServiceSid);
  }

  private assertConfigured(): void {
    const { accountSid, authToken, verifyServiceSid, authEnabled } = this.config;
    if (!authEnabled || !accountSid || !authToken || !verifyServiceSid) {
      throw new AuthFlowError(
        'WhatsApp sign-in is not available yet. You can continue browsing while we finish connecting it.',
        503
      );
    }
    if (!/^AC[0-9a-f]{32}$/i.test(accountSid) || !/^VA[0-9a-f]{32}$/i.test(verifyServiceSid)) {
      throw new AuthFlowError('WhatsApp sign-in is temporarily unavailable.', 503);
    }
  }

  async sendOtp(params: OtpSendParams): Promise<OtpSendResult> {
    this.assertConfigured();

    const { accountSid, authToken, verifyServiceSid } = this.config;
    const bodyFields: Record<string, string> = {
      To: params.to,
      Channel: params.channel || 'whatsapp',
    };
    if (params.locale) {
      bodyFields.Locale = params.locale;
    }

    const url = `https://verify.twilio.com/v2/Services/${verifyServiceSid}/Verifications`;
    const response = await fetch(url, {
      method: 'POST',
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(bodyFields),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new AuthFlowError('Too many attempts. Please wait before trying again.', 429);
      }
      if (response.status === 400) {
        throw new AuthFlowError('Enter a valid phone number, including the country code.', 400);
      }
      throw new AuthFlowError('We could not connect to WhatsApp verification. Please try again later.', 503);
    }

    const data = (await response.json()) as { sid: string; to: string; status: string; channel: string };
    return {
      sid: data.sid,
      to: data.to,
      status: data.status,
      channel: data.channel,
    };
  }

  async verifyOtp(params: OtpCheckParams): Promise<OtpCheckResult> {
    this.assertConfigured();

    const { accountSid, authToken, verifyServiceSid } = this.config;
    const bodyFields: Record<string, string> = {
      To: params.to,
      Code: params.code,
    };
    if (params.verificationSid) {
      bodyFields.VerificationSid = params.verificationSid;
    }

    const url = `https://verify.twilio.com/v2/Services/${verifyServiceSid}/VerificationCheck`;
    const response = await fetch(url, {
      method: 'POST',
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(bodyFields),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new AuthFlowError('Too many attempts. Please wait before trying again.', 429);
      }
      if ([400, 404].includes(response.status)) {
        throw new AuthFlowError('This code is invalid or expired. Request a new code.', 400);
      }
      throw new AuthFlowError('We could not connect to WhatsApp verification. Please try again later.', 503);
    }

    const data = (await response.json()) as {
      sid: string;
      to: string;
      status: string;
      valid?: boolean;
      channel?: string;
    };

    const isApproved = data.status === 'approved' || data.valid === true;
    return {
      sid: data.sid,
      to: data.to || params.to,
      status: data.status,
      valid: isApproved,
      channel: data.channel || 'whatsapp',
    };
  }
}

/**
 * DevWhatsAppOtpProvider
 *
 * Sandbox provider for development and testing without incurring Twilio SMS/WhatsApp fees.
 * Accepts code 123456 or 000000 as valid.
 */
export class DevWhatsAppOtpProvider implements OtpProvider {
  private devSidToPhone = new Map<string, string>();

  getProviderName(): string {
    return 'dev-whatsapp-sandbox';
  }

  isConfigured(): boolean {
    return true;
  }

  async sendOtp(params: OtpSendParams): Promise<OtpSendResult> {
    const mockSid = 'VE' + Buffer.from(params.to || '0').toString('hex').padEnd(32, '0').slice(0, 32);
    this.devSidToPhone.set(mockSid, params.to);
    return {
      sid: mockSid,
      to: params.to,
      status: 'pending',
      channel: params.channel || 'whatsapp',
    };
  }

  async verifyOtp(params: OtpCheckParams): Promise<OtpCheckResult> {
    const sid = params.verificationSid || 'VE00000000000000000000000000000000';
    const to = this.devSidToPhone.get(sid) || params.to;
    const isValid = params.code === '123456' || params.code === '000000';
    if (!isValid) {
      throw new AuthFlowError('Invalid verification code. In dev/test mode, use code 123456.', 400);
    }
    return {
      sid,
      to,
      status: 'approved',
      valid: true,
      channel: 'whatsapp',
    };
  }
}

/** Factory: returns the active OtpProvider based on environment. */
export function getOtpProvider(): OtpProvider {
  if (isWhatsAppDevMode()) {
    return new DevWhatsAppOtpProvider();
  }
  return new TwilioVerifyWhatsAppProvider();
}
