'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { RECOVERY_REASONS, RECOVERY_SUPPORT_EMAIL } from '@/lib/account-recovery';

const field = 'mt-2 min-h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--card-bg)] p-3';
const action = 'inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-ink)] px-5 py-3 text-sm font-semibold text-white';

export function AccountRecovery() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ reference: string; notified: boolean } | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch('/api/account-recovery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Please try again or email support.');
      setResult({ reference: body.reference, notified: body.notified === true });
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Please try again or email support.'); }
    finally { setBusy(false); }
  }
  return <div className="mx-auto max-w-2xl space-y-5 pb-8">
    <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--card-bg)] p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-clay-text)]">Account access</p>
      <h1 className="mt-3 text-3xl font-semibold">Let&apos;s get you back into STYLD</h1>
      <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">STYLD uses email sign-in codes. You do not need to reset a password.</p>
      <div className="mt-5 space-y-3">
        <details className="rounded-2xl border border-[var(--border-subtle)] p-4" open>
          <summary className="cursor-pointer font-semibold">I can open my email, but the code is missing</summary>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6">
            <li>Check that you entered the email address used for your STYLD account.</li>
            <li>Look in Spam, Junk and Promotions for a message from signin@auth.wearestyld.com.</li>
            <li>Wait for the resend timer, then request one new code. Use the newest code within 10 minutes.</li>
          </ol>
          <Link href="/auth/sign-in" className={`${action} mt-4`}>Return to sign in</Link>
        </details>
        <details className="rounded-2xl border border-[var(--border-subtle)] p-4">
          <summary className="cursor-pointer font-semibold">I cannot open my email, or I forgot the address</summary>
          <p className="mt-3 text-sm leading-6">First try your email provider&apos;s account recovery. If you are still signed in to STYLD on another device, keep that session open and check Settings for your account email.</p>
          <p className="mt-3 text-sm leading-6">If you still need help, send the request below. Using a different email to sign in creates a separate account and does not restore your existing profile.</p>
        </details>
      </div>
    </section>
    <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--card-bg)] p-6 sm:p-8" aria-labelledby="recovery-request-title">
      <h2 id="recovery-request-title" className="text-2xl font-semibold" tabIndex={-1}>Ask STYLD to review account access</h2>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">We must verify ownership before changing an account email or restoring access. Submitting a request does not sign you in or change your account.</p>
      {result ? <div role="status" className="mt-5 space-y-3 rounded-2xl bg-[var(--bg-surface-raised)] p-4">
        <p className="font-semibold">Your recovery request has been saved.</p>
        <p className="break-all text-sm">Reference: {result.reference}</p>
        <p className="text-sm leading-6">{result.notified ? 'STYLD support has been notified and can reply to the contact email you provided.' : 'Support email notification was unavailable. Please email support with this reference so we can follow up.'}</p>
        <p className="text-sm leading-6">Ownership still needs to be verified. Do not send a verification code or password.</p>
      </div> : <form onSubmit={submit} className="mt-5 space-y-4">
        <label className="block text-sm">What do you need help with?<select name="reason" className={field} required>{Object.entries(RECOVERY_REASONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="block text-sm">Your name<input name="name" autoComplete="name" minLength={2} maxLength={100} required className={field} /></label>
        <label className="block text-sm">Email we can reply to<input name="contactEmail" type="email" autoComplete="email" maxLength={254} required className={field} aria-describedby="reply-email-help" /></label>
        <p id="reply-email-help" className="text-xs leading-5 text-[var(--text-muted)]">Use an inbox you can open now. This will not replace your STYLD account email.</p>
        <label className="block text-sm">STYLD account email, if you know it<input name="accountEmail" type="email" autoComplete="off" maxLength={254} className={field} /></label>
        <label className="block text-sm">Profile name or profile link, if known<input name="accountReference" autoComplete="off" maxLength={200} className={field} /></label>
        <label className="block text-sm">Anything else we should know? (optional)<textarea name="note" maxLength={1200} rows={3} className={field} aria-describedby="recovery-privacy" /></label>
        <p id="recovery-privacy" className="text-xs leading-6 text-[var(--text-muted)]">Your details go to STYLD support for ownership review. Never include passwords, sign-in codes, recovery codes, payment details or identity documents.</p>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={busy} className={`${action} w-full disabled:opacity-50`}>{busy ? 'Saving request...' : 'Send recovery request'}</button>
      </form>}
      <p className="mt-5 break-words text-sm leading-6">You can also email <a href={`mailto:${RECOVERY_SUPPORT_EMAIL}?subject=STYLD%20account%20access`} className="underline">{RECOVERY_SUPPORT_EMAIL}</a>. We cannot confirm an account or restore access until ownership is verified.</p>
    </section>
    <div className="flex flex-wrap gap-5 text-sm"><Link className="inline-flex min-h-11 items-center underline" href="/auth/sign-in">Back to sign in</Link><Link className="inline-flex min-h-11 items-center underline" href="/help">General help</Link></div>
  </div>;
}
