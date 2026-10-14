"use client";
import { useEffect,useState } from 'react';
import Link from 'next/link';
import { Mail,ShieldCheck,ArrowRight } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { safeReturnTo } from '@/lib/auth-policy';
import { getGuestReturn, clearGuestReturn } from '@/lib/guest-session';
import { writeVerifiedAppSession } from '@/lib/client-session';
import { uiMessageForSendError } from '@/lib/email-reason';

interface Props {returnTo?:string;onSuccess?:(destination:string)=>void;preview?:boolean;}

export function UnifiedAuthFlow({returnTo,onSuccess,preview=false}:Props){
  const [email,setEmail]=useState('');const [code,setCode]=useState('');const [name,setName]=useState('');
  const [stage,setStage]=useState<'email'|'code'|'name'|'interests'>('email');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const [seconds,setSeconds]=useState(0);const [google,setGoogle]=useState(false);
  const [interests,setInterests]=useState<string[]>([]);
  const destination=safeReturnTo(returnTo || getGuestReturn());

  async function finish(){
    const response=await fetch('/api/me',{cache:'no-store'});const data=await response.json();
    if(!response.ok)throw new Error('Could not load your account. Please try again.');
    if(data.admin&&!data.mfaVerified){window.location.assign('/auth/mfa');return;}
    if(!data.user.firstName&&!data.user.displayName){setStage('name');return;}
    const isClient = data.user.role === 'client';
    const hasInterests = data.user.interests && data.user.interests.length > 0;
    if(isClient && !hasInterests){setStage('interests');return;}
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
    try{if(stage==='code'){const {error}=await authClient.signIn.emailOtp({email:email.trim().toLowerCase(),otp:code});if(error)throw new Error(error.message||'Check your code and try again.');}
      else if(stage==='name'){const r=await fetch('/api/users/me',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({firstName:name.trim()})});if(!r.ok)throw new Error('Could not save your name.');}
      else if(stage==='interests'){const r=await fetch('/api/onboarding/client-interests',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({interests})});if(!r.ok){const err=await r.json();throw new Error(err.message||'Could not save interests.');}}
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
  function renderInterestsStep(){
    return (
      <div className="space-y-6">
        <p className="mb-3 text-sm text-[var(--text-secondary)]">Select your beauty interests</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            {id:'hair',label:'Hair',icon:'✂️'},
            {id:'nails',label:'Nails',icon:'💅'},
            {id:'makeup',label:'Makeup',icon:'💄'},
            {id:'skincare',label:'Skincare',icon:'✨'},
            {id:'massage',label:'Massage',icon:'🧘'},
            {id:'waxing',label:'Waxing',icon:'🧴'},
            {id:'brows',label:'Brows & Lashes',icon:'👁️'},
            {id:'lashes',label:'Lashes',icon:'👁️'},
            {id:'hair-color',label:'Hair Color',icon:'🎨'},
            {id:'braids',label:'Braids',icon:'🧶'},
            {id:'natural-hair',label:'Natural Hair',icon:'🌿'},
            {id:'bridal',label:'Bridal',icon:'👰'},
            {id:'mens-grooming',label:"Men's Grooming",icon:'🪒'},
            {id:'wellness',label:'Wellness',icon:'🧘'},
          ].map((opt)=>(
            <button
              key={opt.id}
              type="button"
              onClick={()=>setInterests(prev=>prev.includes(opt.id)?prev.filter(i=>i!==opt.id):[...prev,opt.id])}
              className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition text-left ${
                interests.includes(opt.id)
                  ? 'border-[var(--color-ink)] bg-[var(--color-ink)]/5 text-[var(--color-ink)]'
                  : 'border-[var(--border-subtle)] hover:border-[var(--color-clay)]'
              }`}
            >
              <span className="text-3xl">{['💇','💅','💄','✨','🧘','🧴','👁️','👁️','🎨','🧶','🌿','👰','🪒','🧘'][['hair','nails','makeup','skincare','massage','waxing','brows','lashes','hair-color','braids','natural-hair','bridal','mens-grooming','wellness'].indexOf(opt.id)]}</span>
              <span className="text-sm font-medium">{opt.label}</span>
              {interests.includes(opt.id) && (
                <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-ink)] text-white text-xs">✓</div>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderStepContent(){
    switch(stage){
      case 'email': return renderEmailStep();
      case 'code': return renderCodeStep();
      case 'name': return renderNameStep();
      case 'interests': return renderInterestsStep();
      default: return renderEmailStep();
    }
  }

  return (
    <section className="mx-auto w-full max-w-md rounded-[32px] border border-[var(--border-subtle)] bg-[var(--auth-card-bg)] p-7 shadow-sm">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-elevated)] text-[var(--color-clay)]"><ShieldCheck/></div>
      <h1 className="text-3xl font-semibold text-[var(--text-primary)]">{stage==='email'?'Welcome to STYLD':stage==='code'?'Check your email':stage==='name'?'What should we call you?':'What are you interested in?'}</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{stage==='email'?'One account to book services, work as a professional, or manage your salon. No password to remember.':stage==='code'?'Enter the 6-digit code sent to '+email+'. It expires in 10 minutes.':stage==='name'?'A preferred name is enough to get started.':'Select your beauty interests to personalize your feed.'}</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {renderStepContent()}
        {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
        <button disabled={busy||preview} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-ink)] p-3 font-semibold text-white transition hover:bg-[var(--color-ink)]/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-clay)] disabled:opacity-50">{busy?'Please wait…':stage==='email'?'Continue with email':stage==='code'?'Continue':stage==='name'?'Continue':'Save interests'}<ArrowRight size={18}/></button>
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