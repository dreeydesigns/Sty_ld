"use client";
import { useEffect,useState } from 'react';
import Link from 'next/link';
import { Mail,ShieldCheck,ArrowRight } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { safeReturnTo } from '@/lib/auth-policy';
import { getGuestReturn, clearGuestReturn } from '@/lib/guest-session';
import { writeVerifiedAppSession } from '@/lib/client-session';
import { uiMessageForSendError, uiMessageForVerifyError } from '@/lib/email-reason';

interface Props {returnTo?:string;onSuccess?:(destination:string)=>void;preview?:boolean;}

export function UnifiedAuthFlow({returnTo,onSuccess,preview=false}:Props){
  const [email,setEmail]=useState('');const [code,setCode]=useState('');const [name,setName]=useState('');
  const [stage,setStage]=useState<'email'|'code'|'name'>('email');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const [seconds,setSeconds]=useState(0);const [google,setGoogle]=useState(false);
  const destination=safeReturnTo(returnTo || getGuestReturn());

  async function finish(){
    const response=await fetch('/api/me',{cache:'no-store'});const data=await response.json();
    if(!response.ok)throw new Error('Could not load your account. Please try again.');
    if(data.admin&&!data.mfaVerified){window.location.assign('/auth/mfa');return;}
    if(!data.user.firstName&&!data.user.displayName){setStage('name');return;}
    clearGuestReturn();writeVerifiedAppSession(data.user);if(onSuccess)onSuccess(destination);else window.location.assign(destination);
  }
  useEffect(()=>{if(preview)return;fetch('/api/auth/options').then(r=>r.json()).then(d=>setGoogle(d.google===true)).catch(()=>{});
    fetch('/api/me',{cache:'no-store'}).then(async r=>{if(r.ok)await finish();}).catch(()=>{});
  },[]);
  useEffect(()=>{if(!seconds)return;const t=setTimeout(()=>setSeconds(v=>v-1),1000);return()=>clearTimeout(t);},[seconds]);
  async function send(){
    if(preview)return;setBusy(true);setError('');
    try{const {error}=await authClient.emailOtp.sendVerificationOtp({email:email.trim().toLowerCase(),type:'sign-in'});
      if(error)throw new Error(uiMessageForSendError(error));setCode('');setStage('code');setSeconds(60);
    }catch(e){setError(e instanceof Error?e.message:'Please try again.');}finally{setBusy(false);}
  }

  async function submit(e:React.FormEvent){e.preventDefault();if(stage==='email'){await send();return;}if(preview)return;setBusy(true);setError('');
    try{if(stage==='code'){const {error}=await authClient.signIn.emailOtp({email:email.trim().toLowerCase(),otp:code});if(error)throw new Error(uiMessageForVerifyError(error));}
      else if(stage==='name'){const r=await fetch('/api/users/me',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({firstName:name.trim()})});if(!r.ok)throw new Error('Could not save your name.');}
      await finish();
    }catch(e){setError(e instanceof Error?e.message:'Please try again.');}finally{setBusy(false);}
  }

  function renderEmailStep(){
    return <label className="block text-sm">Email address<input autoFocus required type="email" autoComplete="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-xl border p-3" placeholder="you@example.com"/></label>;
  }
  function renderCodeStep(){
    return <label className="block text-sm">Verification code<input autoFocus required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} className="mt-2 w-full rounded-xl border p-3 text-center text-2xl tracking-[0.4em]"/></label>;
  }
  function renderNameStep(){
    return <label className="block text-sm">Preferred name<input autoFocus required minLength={2} maxLength={80} autoComplete="given-name" value={name} onChange={e=>setName(e.target.value)} className="mt-2 w-full rounded-xl border p-3"/></label>;
  }

  function renderStepContent(){
    switch(stage){
      case 'email': return renderEmailStep();
      case 'code': return renderCodeStep();
      case 'name': return renderNameStep();
      default: return renderEmailStep();
    }
  }

  return (
    <section className="mx-auto w-full max-w-md rounded-[32px] border border-[var(--border-subtle)] bg-[var(--auth-card-bg)] p-7 shadow-sm">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-elevated)] text-[var(--color-clay)]"><ShieldCheck/></div>
      <h1 className="text-3xl font-semibold text-[var(--text-primary)]">{stage==='email'?'Welcome to STYLD':stage==='code'?'Check your email':'What should we call you?'}</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{stage==='email'?'One account to book services, work as a professional, or manage your salon. No password to remember.':stage==='code'?'Enter the 6-digit code sent to '+email+'. It expires in 10 minutes.':'A preferred name is enough to get started.'}</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {renderStepContent()}
        {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
        <button disabled={busy||preview} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-ink)] p-3 font-semibold text-white transition hover:bg-[var(--color-ink)]/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-clay)] disabled:opacity-50">{busy?'Please wait…':stage==='email'?'Continue with email':'Continue'}<ArrowRight size={18}/></button>
      </form>
      {stage==='code'&&<div className="mt-4 flex justify-between text-sm"><button disabled={busy||seconds>0} onClick={send}>{seconds?'Resend in '+seconds+'s':'Resend code'}</button><button disabled={busy} onClick={()=>{setStage('email');setError('');}}>Change email</button></div>}
      {stage==='email'&&google&&<button disabled={busy} className="mt-4 w-full rounded-xl border p-3" onClick={async()=>{setBusy(true);const {error}=await authClient.signIn.social({provider:'google',callbackURL:'/auth/sign-in?returnTo='+encodeURIComponent(destination)});if(error){setError(error.message||'Google sign-in unavailable.');setBusy(false);}}}>Continue with Google</button>}
      <p className="mt-6 text-xs leading-5 text-[var(--text-muted)]"><Mail className="mr-1 inline" size={14}/>Your email is private. We record sign-ins to help protect your account.</p>
      <p className="mt-3 text-xs text-[var(--text-muted)]">By continuing, you agree to our <Link className="underline" href="/legal/terms">Terms</Link> and <Link className="underline" href="/legal/privacy">Privacy Policy</Link>.</p>
      <Link href="/discover" className="mt-5 block text-center text-sm underline">Continue as guest</Link>
      <Link href="/help" className="mt-3 block text-center text-xs underline">Lost access to your email? Get help</Link>
    </section>
  );
}
