"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, MessageCircle, ShieldCheck } from 'lucide-react';
import { parsePhoneNumber } from '@/lib/phone-utils';
import { writeAppSession } from '@/lib/client-session';

export function WhatsAppAuthFlow({ returnTo = '/home', onSuccess, preview = false }: {
  returnTo?: string; onSuccess?: (destination: string) => void; preview?: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'code' | 'profile' | 'done'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [role, setRole] = useState('client');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown(value => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);
  async function submit(action: 'start' | 'verify' | 'complete') {
    if (busy) return;
    setError('');
    const parsed = parsePhoneNumber(phone);
    if (action === 'start' && (!parsed.isValid || /[^\d+\s().-]/.test(phone))) { setError('Enter your WhatsApp number with its country code.'); return; }
    setBusy(true);
    try {
      if (preview) {
        setStep(action === 'start' ? 'code' : action === 'verify' ? 'profile' : 'done');
        return;
      }
      const response = await fetch('/api/auth/whatsapp', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, phone: parsed.fullE164, code, firstName, role, acceptTerms: accepted }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Please try again.');
      if (result.step === 'done') {
        const profileResponse = await fetch('/api/me', { credentials: 'include', cache: 'no-store' });
        const profile = await profileResponse.json();
        if (!profileResponse.ok || !profile.user) throw new Error('You are signed in, but your profile could not load. Please refresh.');
        writeAppSession(profile.user);
        const defaultDestination = profile.user.role === 'shop' ? '/dashboard/shop' : profile.user.role === 'delivery' ? '/dashboard/delivery' : '/home';
        const safeDestination = returnTo !== '/home' && returnTo.startsWith('/') && !returnTo.startsWith('//') && !returnTo.includes('\\') ? returnTo : defaultDestination;
        if (onSuccess) onSuccess(safeDestination); else { router.push(safeDestination); router.refresh(); }
      } else {
        setStep(result.step);
        if (action === 'start') { setCooldown(60); setCode(''); }
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Please try again.'); }
    finally { setBusy(false); }
  }
  const inputClass = 'styld-auth-input mt-2 w-full rounded-2xl border border-[#C4A495] bg-[#ffffff] px-4 py-4 text-base text-[#1A1A2E] outline-none focus:ring-2 focus:ring-[#9F4654]';
  return <section className="mx-auto w-full max-w-md rounded-[28px] border border-[#E6DCD4] bg-[#FAF8F5] p-6 text-[#1A1A2E] shadow-sm sm:p-8">
    {preview && <p className="mb-5 rounded-xl bg-[#EEE7DF] p-3 text-sm">Design preview Â· No messages sent or accounts created.</p>}
    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E4E8E0]"><MessageCircle aria-hidden="true" size={25} /></div>
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#71615B]">Styld Â· Your space for beauty</p>
    <h1 className="mt-3 text-3xl font-semibold tracking-tight">{step === 'phone' ? 'A little closer to your next look.' : step === 'code' ? 'Check your WhatsApp.' : step === 'profile' ? 'What should we call you?' : 'Youâ€™re ready to explore.'}</h1>
    <p className="mb-6 mt-3 text-sm leading-6 text-[#625650]">{step === 'phone' ? 'Sign in or join with your WhatsApp number. No password to remember.' : step === 'code' ? `Enter the six-digit code sent to ${parsePhoneNumber(phone).fullE164}.` : step === 'profile' ? 'Just your first name to start. Add your photo, preferences, and location whenever youâ€™re ready.' : 'This is the end of the preview. Your real account would now open.'}</p>
    {step !== 'done' && <form onSubmit={event => { event.preventDefault(); void submit(step === 'phone' ? 'start' : step === 'code' ? 'verify' : 'complete'); }}>
      {step === 'phone' && <label className="block text-sm font-medium">WhatsApp number<input className={inputClass} autoComplete="tel" inputMode="tel" type="tel" placeholder="0712 345 678" value={phone} onChange={e => setPhone(e.target.value)} required maxLength={25} /><span className="mt-2 block text-xs font-normal text-[#625650]">Kenyan numbers work with 07, 01, or +254. Include the country code for other numbers.</span></label>}
      {step === 'code' && <><label className="block text-sm font-medium">Verification code<input className={`${inputClass} text-center text-2xl tracking-[0.4em]`} autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} required autoFocus /></label><div className="mt-3 flex justify-between gap-3 text-sm"><button type="button" className="underline" disabled={busy} onClick={() => { setStep('phone'); setCode(''); setError(''); }}>Change number</button><button type="button" className="underline disabled:opacity-50" disabled={busy || cooldown > 0} onClick={() => void submit('start')}>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}</button></div></>}
      {step === 'profile' && <><label className="block text-sm font-medium">First name<input className={inputClass} autoComplete="given-name" value={firstName} onChange={e => setFirstName(e.target.value)} required maxLength={100} autoFocus /></label><details className="mt-4 text-sm"><summary className="cursor-pointer">Joining Styld for business?</summary><label className="mt-3 block">Account type<select className={inputClass} value={role} onChange={e => setRole(e.target.value)}><option value="client">Client Â· Book beauty services</option><option value="professional">Independent professional</option><option value="salon">Salon</option><option value="shop">Beauty shop</option><option value="delivery">Delivery partner</option></select></label><p className="mt-2 text-xs text-[#625650]">Business verification and service setup are separate from signing in.</p></details><label className="mt-5 flex items-start gap-3 text-sm leading-6"><input type="checkbox" className="mt-1 h-5 w-5 accent-[#9F4654]" checked={accepted} onChange={e => setAccepted(e.target.checked)} required /><span>I agree to the <Link href="/terms" className="underline" target="_blank">Terms</Link> and have read the <Link href="/privacy" className="underline" target="_blank">Privacy Policy</Link>.</span></label></>}
      {error && <p role="alert" className="mt-4 rounded-xl border border-[#D4A6AE] bg-[#F7E8EB] p-3 text-sm text-[#762E3A]">{error}</p>}
      <button disabled={busy || (step === 'phone' && cooldown > 0)} className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#9F4654] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#853B46] disabled:opacity-60" type="submit">{busy ? 'Please waitâ€¦' : step === 'phone' ? 'Send code on WhatsApp' : step === 'code' ? 'Verify & continue' : 'Join Styld'}<ArrowRight size={17} aria-hidden="true" /></button>
    </form>}
    <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-[#625650]"><ShieldCheck size={18} className="shrink-0" aria-hidden="true" />Your number is used for account verification. Styld will never ask you to share a code in chat.</p>
    <Link href="/explore" className="mt-5 block text-center text-sm font-medium underline underline-offset-4">Keep exploring</Link>
    {preview && <button className="mt-4 w-full text-sm underline" onClick={() => { setStep('phone'); setCode(''); }}>Restart preview</button>}
  </section>;
}
