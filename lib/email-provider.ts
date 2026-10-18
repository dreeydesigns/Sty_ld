/**
 * lib/email-provider.ts
 *
 * Transactional Email Provider Adapter for STYLD.
 * Uses the explicitly selected Resend HTTP or Gmail SMTP delivery transport.
 */

import { EMAIL_REASON_CODES, classifyResendFailure, type EmailReasonCode } from './email-reason';
import { logger } from './logger';

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface EmailDeliveryResult {
  ok: boolean;
  messageId?: string;
  error?: string;
  reasonCode?: EmailReasonCode;
}

export interface EmailProvider {
  name: string;
  isConfigured(): boolean;
  sendEmail(payload: EmailPayload): Promise<EmailDeliveryResult>;
}

export class ResendEmailProvider implements EmailProvider {
  name = 'resend';

  isConfigured(): boolean {
    return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM_EMAIL?.trim());
  }

  async sendEmail(payload: EmailPayload): Promise<EmailDeliveryResult> {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
      return { ok: false, error: 'Resend API key is not configured.', reasonCode: EMAIL_REASON_CODES.NOT_CONFIGURED };
    }

    const apiUrl = (process.env.RESEND_API_URL || 'https://api.resend.com/emails').trim();
    const fromAddress = (payload.from || process.env.RESEND_FROM_EMAIL || '').trim();
    if (!fromAddress) return { ok: false, error: 'A verified email sender is not configured.', reasonCode: EMAIL_REASON_CODES.NO_SENDER };
    const toRecipients = Array.isArray(payload.to) ? payload.to : [payload.to];

    if (!payload.subject?.trim()) {
      return { ok: false, error: 'Email subject is required.' };
    }

    if (!payload.html && !payload.text) {
      return { ok: false, error: 'Email content (html or text) is required.' };
    }

    try {
      const response = await fetch(apiUrl, {
        signal: AbortSignal.timeout(10000),
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: toRecipients,
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
          reply_to: payload.replyTo,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMsg = data?.message || `HTTP ${response.status} from Resend`;
        const reasonCode = classifyResendFailure(response.status, data);
        logger.error('Email delivery failed', undefined, { provider: 'resend', reasonCode, httpStatus: response.status, providerError: String(errorMsg) });
        return { ok: false, error: errorMsg, reasonCode };
      }

      return {
        ok: true,
        messageId: data?.id || undefined,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown network failure';
      logger.error('Email delivery network error', undefined, { provider: 'resend', reasonCode: EMAIL_REASON_CODES.NETWORK, providerError: String(msg) });
      return { ok: false, error: 'Failed to communicate with email provider.', reasonCode: EMAIL_REASON_CODES.NETWORK };
    }
  }
}

export class GmailEmailProvider implements EmailProvider {
  name = 'gmail';

  isConfigured(): boolean {
    return Boolean(process.env.GMAIL_USER?.trim() && process.env.GMAIL_APP_PASSWORD?.trim());
  }

  async sendEmail(payload: EmailPayload): Promise<EmailDeliveryResult> {
    if (!this.isConfigured()) return { ok: false, reasonCode: EMAIL_REASON_CODES.NOT_CONFIGURED };
    if (!payload.subject?.trim() || (!payload.text && !payload.html)) return { ok: false, error: 'Email content and subject are required.' };
    // Load only for Gmail so the default HTTP adapter stays independent.
    const nodemailer = await import('nodemailer');
    const transport = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 465, secure: true,
      auth: { user: process.env.GMAIL_USER!.trim(), pass: process.env.GMAIL_APP_PASSWORD!.replace(/\s/g, '') },
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
      disableFileAccess: true, disableUrlAccess: true,
      logger: false, debug: false,
    });
    try {
      const result = await transport.sendMail({
        from: { name: 'STYLD', address: process.env.GMAIL_USER!.trim() },
        to: payload.to, subject: payload.subject, text: payload.text, html: payload.html,
        replyTo: payload.replyTo,
      });
      if (!result.accepted?.length || result.rejected?.length) {
        return { ok: false, reasonCode: EMAIL_REASON_CODES.NETWORK };
      }
      return { ok: true, messageId: result.messageId };
    } catch (error: unknown) {
      // SMTP errors can contain addresses or credentials. Never log their contents.
      const reasonCode = (error as { code?: string } | null)?.code === 'EAUTH'
        ? EMAIL_REASON_CODES.SMTP_AUTH : EMAIL_REASON_CODES.NETWORK;
      logger.error('Email delivery failed', undefined, { provider: 'gmail', reasonCode });
      return { ok: false, error: 'Email delivery failed. Check the Gmail delivery configuration.', reasonCode };
    } finally {
      transport.close();
    }
  }
}

export function getPrimaryEmailProvider(): EmailProvider {
  if (process.env.EMAIL_PROVIDER === 'gmail') return new GmailEmailProvider();
  if (!process.env.EMAIL_PROVIDER || process.env.EMAIL_PROVIDER === 'resend') return new ResendEmailProvider();
  return { name: 'unconfigured', isConfigured: () => false,
    sendEmail: async () => ({ ok: false, reasonCode: EMAIL_REASON_CODES.NOT_CONFIGURED }) };
}

export async function sendEmail(payload: EmailPayload): Promise<EmailDeliveryResult> {
  const provider = getPrimaryEmailProvider();
  return provider.sendEmail(payload);
}

export async function sendContactNotification(params: {
  name: string;
  email?: string | null;
  phone?: string | null;
  subject?: string | null;
  message: string;
}): Promise<EmailDeliveryResult> {
  const adminEmail = process.env.ADMIN_EMAIL?.trim() || 'support@styld.co.ke';
  const topic = params.subject?.trim() || 'General Inquiry';

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0f172a; margin-top: 0;">New Contact Form Message</h2>
      <p style="color: #475569;">You have received a new inquiry via the Styld contact form:</p>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr><td style="padding: 6px 0; font-weight: bold; width: 100px;">Sender:</td><td>${escapeHtml(params.name)}</td></tr>
        ${params.email ? `<tr><td style="padding: 6px 0; font-weight: bold;">Email:</td><td><a href="mailto:${escapeHtml(params.email)}">${escapeHtml(params.email)}</a></td></tr>` : ''}
        ${params.phone ? `<tr><td style="padding: 6px 0; font-weight: bold;">Phone:</td><td>${escapeHtml(params.phone)}</td></tr>` : ''}
        <tr><td style="padding: 6px 0; font-weight: bold;">Subject:</td><td>${escapeHtml(topic)}</td></tr>
      </table>
      <div style="background-color: #f8fafc; padding: 16px; border-radius: 6px; border-left: 4px solid #0f172a; color: #1e293b; white-space: pre-wrap;">
${escapeHtml(params.message)}
      </div>
      <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">Styld Platform &mdash; Automated notification</p>
    </div>
  `;

  const text = `New Contact Form Message\n\nSender: ${params.name}\nEmail: ${params.email || 'N/A'}\nPhone: ${params.phone || 'N/A'}\nSubject: ${topic}\n\nMessage:\n${params.message}`;

  return sendEmail({
    to: adminEmail,
    subject: `[Styld Contact] ${topic} - ${params.name}`,
    html,
    text,
    replyTo: params.email?.trim() || undefined,
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
