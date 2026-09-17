export class AuthFlowError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

const devSidToPhone = new Map<string, string>();

export function isWhatsAppDevMode() {
  return process.env.WHATSAPP_DEV_MODE === 'true';
}

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

export async function whatsappRequest(path: 'Verifications' | 'VerificationCheck', fields: Record<string, string>) {
  const config = whatsappConfiguration();

  if (config.isDev) {
    if (path === 'Verifications') {
      const mockSid = 'VE' + Buffer.from(fields.To || '0').toString('hex').padEnd(32, '0').slice(0, 32);
      devSidToPhone.set(mockSid, fields.To);
      return {
        sid: mockSid,
        to: fields.To,
        status: 'pending',
        channel: 'whatsapp'
      };
    }
    if (path === 'VerificationCheck') {
      const sid = fields.VerificationSid;
      const to = devSidToPhone.get(sid) || '';
      const isValid = fields.Code === '123456' || fields.Code === '000000';
      if (!isValid) {
        throw new AuthFlowError('Invalid verification code. In dev/test mode, use code 123456.', 400);
      }
      return {
        sid,
        to,
        status: 'approved',
        channel: 'whatsapp'
      };
    }
  }

  const { account, secret, service } = config;
  const response = await fetch(`https://verify.twilio.com/v2/Services/${service}/${path}`, {
    method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Basic ${Buffer.from(`${account}:${secret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields),
  });
  if (!response.ok) {
    if (response.status === 429) throw new AuthFlowError('Too many attempts. Please wait before trying again.', 429);
    if (path === 'VerificationCheck' && [400, 404].includes(response.status)) throw new AuthFlowError('This code is invalid or expired. Request a new code.');
    throw new AuthFlowError('We could not connect to WhatsApp verification. Please try again later.', 503);
  }
  return response.json() as Promise<{ sid: string; to: string; status: string; channel: string }>;
}
