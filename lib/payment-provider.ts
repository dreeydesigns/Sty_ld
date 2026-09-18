/**
 * lib/payment-provider.ts
 *
 * Unified Payment Provider Architecture for STYLD.
 * Integrates Safaricom Daraja STK Push (M-Pesa Express) in sandbox/production mode.
 * Houses the feature-gated Stripe provider adapter (disabled by default for Nairobi launch).
 */

import { sql } from '@vercel/postgres';
import { maskPhone } from './sms';

export interface STKPushRequest {
  bookingId?: string;
  userId?: string;
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc?: string;
}

export interface STKPushResponse {
  ok: boolean;
  merchantRequestId?: string;
  checkoutRequestId?: string;
  responseCode?: string;
  responseDescription?: string;
  customerMessage?: string;
  error?: string;
}

export interface PaymentStatusQueryResponse {
  ok: boolean;
  status: 'pending' | 'completed' | 'failed' | 'unknown';
  receiptNumber?: string;
  resultDesc?: string;
  error?: string;
}

export interface PaymentProvider {
  name: string;
  isConfigured(): boolean;
  initiatePayment(request: STKPushRequest): Promise<STKPushResponse>;
  queryPaymentStatus(checkoutRequestId: string): Promise<PaymentStatusQueryResponse>;
}

/**
 * Normalizes Kenyan telephone numbers to the 254XXXXXXXXX format required by Daraja.
 * Accepts formats: "+254712345678", "0712345678", "712345678", "254712345678".
 */
export function normalizeMpesaPhone(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  } else if (!cleaned.startsWith('254') && cleaned.length === 9) {
    cleaned = '254' + cleaned;
  }
  return cleaned;
}

/**
 * Generates YYYYMMDDHHmmss timestamp string.
 */
function getMpesaTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

export class MpesaDarajaProvider implements PaymentProvider {
  name = 'mpesa';

  private cachedToken: string | null = null;
  private tokenExpiry = 0;

  isConfigured(): boolean {
    const key = process.env.MPESA_CONSUMER_KEY?.trim();
    const secret = process.env.MPESA_CONSUMER_SECRET?.trim();
    return Boolean(key && secret);
  }

  private getBaseUrl(): string {
    const env = (process.env.MPESA_ENV || 'sandbox').toLowerCase().trim();
    return env === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  /**
   * Fetches an OAuth access token from Safaricom Daraja.
   */
  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && now < this.tokenExpiry) {
      return this.cachedToken;
    }

    const consumerKey = process.env.MPESA_CONSUMER_KEY?.trim();
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET?.trim();

    if (!consumerKey || !consumerSecret) {
      throw new Error('M-Pesa consumer key or consumer secret is missing.');
    }

    const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const endpoint = `${this.getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(`[M-Pesa] Failed to obtain access token: HTTP ${response.status}`, body);
      throw new Error(`M-Pesa authentication failed with HTTP ${response.status}`);
    }

    const data = (await response.json()) as { access_token: string; expires_in: string };
    this.cachedToken = data.access_token;
    // Expire 60s early for safety
    this.tokenExpiry = now + (parseInt(data.expires_in, 10) - 60) * 1000;
    return this.cachedToken;
  }

  /**
   * Triggers an STK Push (Lipa Na M-Pesa Online) prompt on the customer phone.
   */
  async initiatePayment(request: STKPushRequest): Promise<STKPushResponse> {
    if (!this.isConfigured()) {
      return { ok: false, error: 'M-Pesa credentials are not configured.' };
    }

    try {
      const token = await this.getAccessToken();
      const shortcode = (process.env.MPESA_SHORTCODE || '174379').trim();
      // Default sandbox test passkey if not provided in env
      const passkey = (
        process.env.MPESA_PASSKEY ||
        'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'
      ).trim();

      const timestamp = getMpesaTimestamp();
      const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
      const normalizedPhone = normalizeMpesaPhone(request.phoneNumber);
      const callbackUrl = (
        process.env.MPESA_CALLBACK_URL ||
        'https://styld.co.ke/api/payments/mpesa/callback'
      ).trim();

      const roundedAmount = Math.max(1, Math.round(request.amount));
      const accountRef = (request.accountReference || 'STYLD').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 12);
      const description = (request.transactionDesc || 'Styld Booking').slice(0, 13);

      console.info(`[M-Pesa STK Push] Dispatching KES ${roundedAmount} request to ${maskPhone(normalizedPhone)} (Ref: ${accountRef})`);

      const response = await fetch(`${this.getBaseUrl()}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: roundedAmount,
          PartyA: normalizedPhone,
          PartyB: shortcode,
          PhoneNumber: normalizedPhone,
          CallBackURL: callbackUrl,
          AccountReference: accountRef,
          TransactionDesc: description,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data || data.ResponseCode !== '0') {
        const errorDesc = data?.ResponseDescription || data?.errorMessage || `HTTP ${response.status} from Daraja`;
        console.error(`[M-Pesa STK Push] Provider error: ${errorDesc}`);
        return {
          ok: false,
          responseCode: data?.ResponseCode,
          responseDescription: errorDesc,
          error: errorDesc,
        };
      }

      // Persist in payment_logs audit table
      try {
        await sql`
          INSERT INTO payment_logs (
            booking_id, user_id, amount, provider, reference,
            merchant_request_id, checkout_request_id, status, phone
          ) VALUES (
            ${request.bookingId ? request.bookingId : null},
            ${request.userId ? request.userId : null},
            ${roundedAmount},
            'mpesa',
            ${accountRef},
            ${data.MerchantRequestID || null},
            ${data.CheckoutRequestID || null},
            'pending',
            ${maskPhone(normalizedPhone)}
          )
        `;
      } catch (dbErr) {
        console.warn('[M-Pesa] Failed to record payment_log entry:', dbErr);
      }

      return {
        ok: true,
        merchantRequestId: data.MerchantRequestID,
        checkoutRequestId: data.CheckoutRequestID,
        responseCode: data.ResponseCode,
        responseDescription: data.ResponseDescription,
        customerMessage: data.CustomerMessage,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown network failure';
      console.error(`[M-Pesa STK Push] Exception: ${msg}`);
      return { ok: false, error: 'Failed to communicate with M-Pesa gateway.' };
    }
  }

  /**
   * Queries the status of an in-flight STK Push transaction.
   */
  async queryPaymentStatus(checkoutRequestId: string): Promise<PaymentStatusQueryResponse> {
    try {
      const token = await this.getAccessToken();
      const shortcode = (process.env.MPESA_SHORTCODE || '174379').trim();
      const passkey = (
        process.env.MPESA_PASSKEY ||
        'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'
      ).trim();
      const timestamp = getMpesaTimestamp();
      const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

      const response = await fetch(`${this.getBaseUrl()}/mpesa/stkpushquery/v1/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          CheckoutRequestID: checkoutRequestId,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data) {
        return { ok: false, status: 'unknown', error: 'Could not query transaction status.' };
      }

      const resultCode = data.ResultCode;
      if (resultCode === '0' || resultCode === 0) {
        return { ok: true, status: 'completed', resultDesc: data.ResultDesc };
      } else if (resultCode === '1032') {
        return { ok: true, status: 'failed', resultDesc: 'Cancelled by customer.' };
      } else {
        return { ok: true, status: 'failed', resultDesc: data.ResultDesc || 'Transaction failed.' };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return { ok: false, status: 'unknown', error: msg };
    }
  }
}

/**
 * Stripe Payment Provider ? Feature-flagged OFF for the Nairobi Launch.
 */
export class StripePaymentProvider implements PaymentProvider {
  name = 'stripe';

  isConfigured(): boolean {
    const isEnabled = process.env.ENABLE_STRIPE_PAYMENTS === 'true';
    const hasKeys = Boolean(process.env.STRIPE_API_SECRET_KEY);
    return isEnabled && hasKeys;
  }

  async initiatePayment(_request: STKPushRequest): Promise<STKPushResponse> {
    return {
      ok: false,
      error: 'Stripe card payments are currently disabled in this region. Please pay via M-Pesa.',
    };
  }

  async queryPaymentStatus(_checkoutRequestId: string): Promise<PaymentStatusQueryResponse> {
    return {
      ok: false,
      status: 'failed',
      error: 'Stripe payments are disabled.',
    };
  }
}

let cachedDarajaProvider: MpesaDarajaProvider | null = null;
let cachedStripeProvider: StripePaymentProvider | null = null;

export function getPaymentProvider(preferred: 'mpesa' | 'stripe' = 'mpesa'): PaymentProvider {
  if (preferred === 'stripe') {
    if (!cachedStripeProvider) cachedStripeProvider = new StripePaymentProvider();
    return cachedStripeProvider;
  }
  if (!cachedDarajaProvider) cachedDarajaProvider = new MpesaDarajaProvider();
  return cachedDarajaProvider;
}
