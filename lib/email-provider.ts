/**
 * lib/email-provider.ts
 *
 * Transactional Email Provider Adapter for STYLD.
 * Integrates Resend HTTP API for notification dispatch, receipts, and contact inquiries.
 */

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
}

export interface EmailProvider {
  name: string;
  isConfigured(): boolean;
  sendEmail(payload: EmailPayload): Promise<EmailDeliveryResult>;
}

export class ResendEmailProvider implements EmailProvider {
  name = 'resend';

  isConfigured(): boolean {
    return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim().length > 0);
  }

  async sendEmail(payload: EmailPayload): Promise<EmailDeliveryResult> {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
      return { ok: false, error: 'Resend API key is not configured.' };
    }

    const apiUrl = (process.env.RESEND_API_URL || 'https://api.resend.com/emails').trim();
    const fromAddress = (payload.from || process.env.RESEND_FROM_EMAIL || 'Styld <notifications@styld.co.ke>').trim();
    const toRecipients = Array.isArray(payload.to) ? payload.to : [payload.to];

    if (!payload.subject?.trim()) {
      return { ok: false, error: 'Email subject is required.' };
    }

    if (!payload.html && !payload.text) {
      return { ok: false, error: 'Email content (html or text) is required.' };
    }

    try {
      const response = await fetch(apiUrl, {
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
        console.error('[ResendEmailProvider] Delivery failed:', errorMsg);
        return { ok: false, error: errorMsg };
      }

      return {
        ok: true,
        messageId: data?.id || undefined,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown network failure';
      console.error('[ResendEmailProvider] Network error sending email:', msg);
      return { ok: false, error: 'Failed to communicate with email provider.' };
    }
  }
}

let cachedProvider: EmailProvider | null = null;

export function getPrimaryEmailProvider(): EmailProvider {
  if (!cachedProvider) {
    cachedProvider = new ResendEmailProvider();
  }
  return cachedProvider;
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
