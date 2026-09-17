"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, KeyRound, MessageCircle, ShieldCheck } from 'lucide-react';
import { parsePhoneNumber } from '@/lib/phone-utils';
import { writeAppSession } from '@/lib/client-session';

export function WhatsAppAuthFlow({ returnTo = '/home', onSuccess, preview = false }: {
  returnTo?: string; onSuccess?: (destination: string) => void; preview?: boolean;
}) {
  const router = useRouter();
  const [authMethod, setAuthMethod] = useState<'whatsapp' | 'password'>('whatsapp');
  const [step, setStep] = useState<'phone' | 'code' | 'profile' | 'done'>('phone');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [role, setRole] = useState('client');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [devHint, setDevHint] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [providerStatus, setProviderStatus] = useState<{ available: boolean; devMode: boolean } | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/whatsapp')
      .then(res => res.json())
      .then(data => {
        if (active && data) {
          setProviderStatus({ available: data.available !== false, devMode: Boolean(data.devMode) });
          if (data.devMode && !devHint) {
            setDevHint('Sandbox Mode: Use code 123456');
          }
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [devHint]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown(value => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError('');
    const parsed = parsePhoneNumber(phone);
    if (!parsed.isValid) {
      setError('Please enter a valid phone number with country code (e.g. 0712 345 678 or +254).');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/signin-multi-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: parsed.fullE164, password, assumedRole: 'client' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid phone or password.');
      }
      if (data.user) {
        writeAppSession(data.user);
        const destination = returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/home';
        if (onSuccess) onSuccess(destination);
        else {
          router.push(destination);
          router.refresh();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function submit(action: 'start' | 'verify' | 'complete') {
    if (busy) return;
    setError('');
    const parsed = parsePhoneNumber(phone);
    if (action === 'start' && (!parsed.isValid || /[^\d+\s().-]/.test(phone))) {
      setError('Enter your WhatsApp number with its country code.');
      return;
    }
    setBusy(true);
    try {
      if (preview) {
        setStep(action === 'start' ? 'code' : action === 'verify' ? 'profile' : 'done');
        return;
      }
      const response = await fetch('/api/auth/whatsapp', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, phone: parsed.fullE164, code, firstName, role, acceptTerms: accepted }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Please try again.');
      }
      if (result.devHint) {
        setDevHint(result.devHint);
      }
      if (result.step === 'done') {
        const profileResponse = await fetch('/api/me', { credentials: 'include', cache: 'no-store' });
        const profile = await profileResponse.json();
        if (!profileResponse.ok || !profile.user) {
          throw new Error('You are signed in, but your profile could not load. Please refresh.');
        }
        writeAppSession(profile.user);
        const defaultDestination = profile.user.role === 'shop' ? '/dashboard/shop' : profile.user.role === 'delivery' ? '/dashboard/delivery' : '/home';
        const safeDestination = returnTo !== '/home' && returnTo.startsWith('/') && !returnTo.startsWith('//') && !returnTo.includes('\\') ? returnTo : defaultDestination;
        if (onSuccess) onSuccess(safeDestination);
        else {
          router.push(safeDestination);
          router.refresh();
        }
      } else {
        setStep(result.step);
        if (action === 'start') {
          setCooldown(60);
          setCode('');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const inputClass = 'styld-auth-input mt-2 w-full rounded-2xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3.5 text-base text-[var(--input-text)] placeholder-[var(--input-placeholder)] outline-none transition focus:border-[var(--color-clay)] focus:ring-2 focus:ring-[var(--color-clay)]/20';

  return (
    <section className="mx-auto w-full max-w-md rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 text-[var(--text-primary)] shadow-sm sm:p-8">
      {preview && (
        <p className="mb-5 rounded-xl bg-[var(--bg-surface-raised)] p-3 text-sm text-[var(--text-secondary)]">
          Design preview {"\u00B7"} No messages sent or accounts created.
        </p>
      )}

      {/* Header icon & subheader */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#909888]/15 text-[#909888]">
          {authMethod === 'whatsapp' ? (
            <MessageCircle aria-hidden="true" size={24} />
          ) : (
            <KeyRound aria-hidden="true" size={24} />
          )}
        </div>

        {/* Method Toggle */}
        <div className="flex rounded-full bg-[var(--bg-surface-raised)] p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setAuthMethod('whatsapp'); setError(''); }}
            className={`rounded-full px-3 py-1.5 transition ${
              authMethod === 'whatsapp'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            WhatsApp
          </button>
          <button
            type="button"
            onClick={() => { setAuthMethod('password'); setError(''); }}
            className={`rounded-full px-3 py-1.5 transition ${
              authMethod === 'password'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Password
          </button>
        </div>
      </div>

      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-clay-text)]">
        Styld {"\u00B7"} Your space for beauty
      </p>

      {providerStatus && !providerStatus.available && authMethod === 'whatsapp' && (
        <div className="mt-3 mb-1 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] p-3 text-xs text-[var(--text-secondary)]">
          <p className="font-semibold text-[var(--text-primary)]">WhatsApp verification connecting</p>
          <p className="mt-0.5 text-[var(--text-muted)]">Live WhatsApp authentication is being finalized. You can also sign in with your password.</p>
        </div>
      )}
      {providerStatus?.devMode && authMethod === 'whatsapp' && (
        <div className="mt-3 mb-1 rounded-2xl border border-[#909888]/30 bg-[#909888]/10 p-3 text-xs text-[var(--text-primary)]">
          <span className="font-semibold text-[#909888]">Sandbox Mode:</span> Simulated verification active. Test code: <span className="font-mono font-bold">123456</span>.
        </div>
      )}

      {authMethod === 'whatsapp' ? (
        <>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl font-display">
            {step === 'phone'
              ? 'A little closer to your next look.'
              : step === 'code'
              ? 'Check your WhatsApp.'
              : step === 'profile'
              ? 'What should we call you?'
              : "You're ready to explore."}
          </h1>

          <p className="mb-6 mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {step === 'phone'
              ? 'Sign in or join with your WhatsApp number. No password to remember.'
              : step === 'code'
              ? `Enter the six-digit code sent to ${parsePhoneNumber(phone).fullE164}.`
              : step === 'profile'
              ? "Just your first name to start. Add your photo, preferences, and location whenever you're ready."
              : 'Your verified Styld account is now active.'}
          </p>

          {step !== 'done' && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void submit(step === 'phone' ? 'start' : step === 'code' ? 'verify' : 'complete');
              }}
            >
              {step === 'phone' && (
                <label className="block text-sm font-medium text-[var(--text-primary)]">
                  WhatsApp number
                  <input
                    className={inputClass}
                    autoComplete="tel"
                    inputMode="tel"
                    type="tel"
                    placeholder="0712 345 678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    maxLength={25}
                  />
                  <span className="mt-2 block text-xs font-normal text-[var(--text-muted)]">
                    Kenyan numbers work with 07, 01, or +254. Include the country code for other numbers.
                  </span>
                </label>
              )}

              {step === 'code' && (
                <>
                  <label className="block text-sm font-medium">
                    Verification code
                    <input
                      className={`${inputClass} text-center text-2xl tracking-[0.4em] font-mono`}
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      required
                      autoFocus
                    />
                  </label>
                  {devHint && (
                    <p className="mt-2 rounded-xl bg-[#909888]/15 px-3 py-2 text-center text-xs font-medium text-[#909888]">
                      {devHint}
                    </p>
                  )}
                  <div className="mt-3 flex justify-between gap-3 text-sm">
                    <button
                      type="button"
                      className="underline text-[var(--text-link)] hover:text-[var(--text-primary)]"
                      disabled={busy}
                      onClick={() => {
                        setStep('phone');
                        setCode('');
                        setError('');
                      }}
                    >
                      Change number
                    </button>
                    <button
                      type="button"
                      className="underline text-[var(--text-link)] hover:text-[var(--text-primary)] disabled:opacity-50"
                      disabled={busy || cooldown > 0}
                      onClick={() => void submit('start')}
                    >
                      {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                    </button>
                  </div>
                </>
              )}

              {step === 'profile' && (
                <>
                  <label className="block text-sm font-medium text-[var(--text-primary)]">
                    First name
                    <input
                      className={inputClass}
                      autoComplete="given-name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      maxLength={100}
                      autoFocus
                    />
                  </label>
                  <details className="mt-4 text-sm text-[var(--text-secondary)]">
                    <summary className="cursor-pointer font-medium text-[var(--text-primary)]">
                      Joining Styld for business?
                    </summary>
                    <label className="mt-3 block text-[var(--text-primary)]">
                      Account type
                      <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value)}>
                        <option value="client">Client {"\u00B7"} Book beauty services</option>
                        <option value="professional">Independent professional</option>
                        <option value="salon">Salon</option>
                        <option value="shop">Beauty shop</option>
                        <option value="delivery">Delivery partner</option>
                      </select>
                    </label>
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      Business verification and service setup are completed after onboarding.
                    </p>
                  </details>
                  <label className="mt-5 flex items-start gap-3 text-sm leading-6 text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5 rounded border-[var(--border-subtle)] text-[var(--color-clay)] accent-[var(--color-clay)]"
                      checked={accepted}
                      onChange={(e) => setAccepted(e.target.checked)}
                      required
                    />
                    <span>
                      I agree to the{' '}
                      <Link href="/terms" className="underline text-[var(--text-primary)] hover:text-[var(--text-link)]" target="_blank">
                        Terms
                      </Link>{' '}
                      and have read the{' '}
                      <Link href="/privacy" className="underline text-[var(--text-primary)] hover:text-[var(--text-link)]" target="_blank">
                        Privacy Policy
                      </Link>
                      .
                    </span>
                  </label>
                </>
              )}

              {error && (
                <div role="alert" className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
                  <p>{error}</p>
                  {error.includes('not available yet') && (
                    <button
                      type="button"
                      onClick={() => { setAuthMethod('password'); setError(''); }}
                      className="mt-2 inline-flex items-center gap-1 font-semibold text-[var(--color-clay-text)] hover:underline"
                    >
                      Sign in with password instead &rarr;
                    </button>
                  )}
                </div>
              )}

              <button
                disabled={busy || (step === 'phone' && cooldown > 0)}
                className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--action-primary-bg)] px-5 py-4 text-sm font-semibold text-[var(--action-primary-text)] transition hover:bg-[var(--action-primary-hover)] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                type="submit"
              >
                {busy ? 'Please wait…' : step === 'phone' ? 'Send code on WhatsApp' : step === 'code' ? 'Verify & continue' : 'Join Styld'}
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </form>
          )}
        </>
      ) : (
        /* Password Authentication Mode */
        <form onSubmit={handlePasswordSubmit} className="mt-3">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl font-display">
            Welcome back.
          </h1>
          <p className="mb-6 mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Sign in with your registered phone number and account password.
          </p>

          <label className="block text-sm font-medium text-[var(--text-primary)]">
            Phone number
            <input
              className={inputClass}
              autoComplete="tel"
              inputMode="tel"
              type="tel"
              placeholder="0712 345 678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-[var(--text-primary)]">
            Password
            <input
              className={inputClass}
              autoComplete="current-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error && (
            <div role="alert" className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
              <p>{error}</p>
            </div>
          )}

          <button
            disabled={busy}
            className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--action-primary-bg)] px-5 py-4 text-sm font-semibold text-[var(--action-primary-text)] transition hover:bg-[var(--action-primary-hover)] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
            type="submit"
          >
            {busy ? 'Signing in…' : 'Sign in with Password'}
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </form>
      )}

      <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-[var(--text-secondary)]">
        <ShieldCheck size={18} className="shrink-0 text-[#909888]" aria-hidden="true" />
        Your number is used for account verification. Styld will never ask you to share a code in chat.
      </p>

      <Link
        href="/explore"
        className="mt-5 block text-center text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-4"
      >
        Keep exploring
      </Link>

      {preview && (
        <button
          className="mt-4 w-full text-sm underline text-[var(--text-link)] hover:text-[var(--text-primary)]"
          onClick={() => {
            setStep('phone');
            setCode('');
          }}
        >
          Restart preview
        </button>
      )}
    </section>
  );
}
