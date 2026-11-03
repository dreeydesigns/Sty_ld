import { authPool } from '@/lib/auth-database';
import { consumeLimit } from '@/lib/security-events';
import { sendEmail } from '@/lib/email-provider';
import { parseRecoveryRequest, recoveryMessage, RECOVERY_SUPPORT_EMAIL } from '@/lib/account-recovery';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store' };
const respond = (body: object, status: number) => Response.json(body, { status, headers });

export async function POST(request: Request) {
  try {
    const origin = new URL(process.env.BETTER_AUTH_URL || request.url).origin;
    if (request.headers.get('origin') !== origin) return respond({ error: 'Please submit this request from STYLD.' }, 403);
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return respond({ error: 'Use the recovery form to send your request.' }, 415);
    const ip = process.env.VERCEL ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() : process.env.NODE_ENV !== 'production' ? 'dev-local' : undefined;
    if (!ip) return respond({ error: 'Recovery requests are temporarily unavailable. Please email support.' }, 503);
    if (!await consumeLimit(`recovery:${ip}`, 3, 900) || !await consumeLimit('recovery:daily', 30, 86400)) {
      return respond({ error: 'Too many requests. Please try again later or email support.' }, 429);
    }
    // Bound streamed bodies as well as requests with a Content-Length header.
    const reader = request.body?.getReader();
    if (!reader) return respond({ error: 'Complete the recovery form.' }, 400);
    let text = ''; let bytes = 0; const decoder = new TextDecoder();
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > 8192) { await reader.cancel(); return respond({ error: 'Your request is too long.' }, 413); }
      text += decoder.decode(part.value, { stream: true });
    }
    text += decoder.decode();
    let body: unknown;
    try { body = JSON.parse(text); } catch { return respond({ error: 'Complete the recovery form.' }, 400); }
    const input = parseRecoveryRequest(body);
    if (!input) return respond({ error: 'Check your name, email addresses and request details.' }, 400);
    const message = recoveryMessage(input);
    // Intake only. Never look up account existence or alter identity/session records.
    const { rows } = await authPool.query(
      'INSERT INTO contact_messages (name,email,subject,message) VALUES ($1,$2,$3,$4) RETURNING id',
      [input.name, input.contactEmail, 'STYLD account access request', message],
    );
    const reference = rows[0].id as string;
    let notified = false;
    try {
      if (await consumeLimit('email:daily', 90, 86400) && await consumeLimit('email:monthly', 2700, 31 * 86400)) {
        notified = (await sendEmail({ to: RECOVERY_SUPPORT_EMAIL, replyTo: input.contactEmail,
          subject: `[STYLD account access] ${reference}`, text: `${message}\nReference: ${reference}` })).ok;
      }
    } catch { /* The saved request remains available if notification fails. */ }
    return respond({ ok: true, reference, notified }, 201);
  } catch {
    // Never log addresses, recovery notes, credentials or provider responses.
    return respond({ error: 'We could not save your request. Please email support or try again later.' }, 503);
  }
}
