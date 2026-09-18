/**
 * lib/sms.ts
 *
 * SMS Delivery Adapter for STYLD.
 * Directly integrates Africa's Talking REST messaging API for transactional notifications and fallback OTPs.
 * Enforces strict PII masking on phone numbers and messages in server logs.
 */

export interface SMSDeliveryResult {
  success: boolean;
  status: string;
  messageId?: string;
  cost?: string;
  error?: string;
  note?: string;
}

export interface SMSProvider {
  name: string;
  isConfigured(): boolean;
  sendSMS(to: string, message: string): Promise<SMSDeliveryResult>;
}

/**
 * Masks a phone number to protect customer PII in application logs.
 * Example: "+254712345678" -> "+254***678"
 */
export function maskPhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return '***';
  const clean = phone.trim();
  if (clean.length <= 6) return '***';
  return clean.slice(0, 4) + '***' + clean.slice(-3);
}

export class AfricasTalkingSmsProvider implements SMSProvider {
  name = 'africastalking';

  isConfigured(): boolean {
    const username = process.env.AFRICASTALKING_USERNAME?.trim();
    const apiKey = process.env.AFRICASTALKING_API_KEY?.trim();
    return Boolean(username && apiKey);
  }

  async sendSMS(to: string, message: string): Promise<SMSDeliveryResult> {
    const username = process.env.AFRICASTALKING_USERNAME?.trim();
    const apiKey = process.env.AFRICASTALKING_API_KEY?.trim();

    if (!username || !apiKey) {
      console.warn(`[SMS] Delivery skipped: Africa's Talking credentials not configured. Destination: ${maskPhone(to)}`);
      return {
        success: false,
        status: 'unconfigured',
        error: "Africa's Talking credentials are not configured.",
      };
    }

    const isSandbox = username.toLowerCase() === 'sandbox';
    const endpoint = isSandbox
      ? 'https://api.sandbox.africastalking.com/version1/messaging'
      : 'https://api.africastalking.com/version1/messaging';

    const normalizedTo = to.trim().startsWith('+') ? to.trim() : `+${to.trim()}`;

    console.info(`[SMS] Sending SMS via Africa's Talking to ${maskPhone(normalizedTo)} (chars: ${message.length}, env: ${isSandbox ? 'sandbox' : 'production'})`);

    try {
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('to', normalizedTo);
      params.append('message', message);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'apiKey': apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: params.toString(),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMsg = data?.errorMessage || `HTTP ${response.status} from Africa's Talking`;
        console.error(`[SMS] Africa's Talking API error: ${errorMsg}`);
        return {
          success: false,
          status: 'error',
          error: errorMsg,
        };
      }

      const recipient = data?.SMSMessageData?.Recipients?.[0];
      const statusCode = recipient?.statusCode;
      const statusText = recipient?.status || 'Unknown';

      // Status codes < 200 indicate success / queued / in-transit
      const isSuccess = statusCode !== undefined && statusCode < 200;

      if (isSuccess) {
        return {
          success: true,
          status: statusText,
          messageId: recipient?.messageId,
          cost: recipient?.cost,
        };
      } else {
        console.warn(`[SMS] Delivery returned non-success status: ${statusText} (code: ${statusCode})`);
        return {
          success: false,
          status: statusText,
          error: `Provider rejected message with status: ${statusText}`,
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network failure';
      console.error(`[SMS] Failed to communicate with Africa's Talking: ${msg}`);
      return {
        success: false,
        status: 'network_error',
        error: 'Failed to communicate with SMS provider.',
      };
    }
  }
}

let cachedSmsProvider: SMSProvider | null = null;

export function getPrimarySMSProvider(): SMSProvider {
  if (!cachedSmsProvider) {
    cachedSmsProvider = new AfricasTalkingSmsProvider();
  }
  return cachedSmsProvider;
}

export const sendSMS = async (to: string, message: string): Promise<SMSDeliveryResult> => {
  const provider = getPrimarySMSProvider();
  return provider.sendSMS(to, message);
};
