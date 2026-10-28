"use client";
import { useEffect,useState } from 'react';
import Link from 'next/link';
export default function MFA(){
 const [enabled,setEnabled]=useState<boolean|null>(null);const [secret,setSecret]=useState('');const [code,setCode]=useState('');
 const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [recovery,setRecovery]=useState(false);const [codes,setCodes]=useState<string[]>([]);
 useEffect(()=>{fetch('/api/auth/session').then(r=>r.json()).then(d=>{if(!d.success)location.assign('/auth/sign-in?returnTo=/auth/mfa');else setEnabled(d.session.mfaEnabled);}).catch(()=>setError('Could not load your account.'));},[]);
 async function perform(action:string){setBusy(true);setError('');try{
  const r=await fetch('/api/auth/mfa/totp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,code})});const d=await r.json();
  if(!r.ok)throw new Error(d.error);if(d.secret)setSecret(d.secret);else if(d.recoveryCodes)setCodes(d.recoveryCodes);else location.assign('/admin/security');
 }catch(e){setError(e instanceof Error?e.message:'Please try again.');}finally{setBusy(false);}}
 return <main className="mx-auto max-w-md space-y-5 p-8"><h1 className="text-2xl font-semibold">Protect your account</h1>
 <p>Administrator access requires an authenticator code after signing in.</p>
 {enabled===false&&!secret&&!codes.length&&<button disabled={busy} className="rounded-xl bg-[var(--color-ink)] p-3 text-white" onClick={()=>perform('setup')}>Set up authenticator</button>}
 {secret&&!codes.length&&<div className="space-y-3"><p>In your authenticator app, add a time-based account named STYLD using this setup key. Keep it private.</p><code className="block break-all rounded border p-3">{secret}</code></div>}
 {(enabled||secret)&&!codes.length&&<form onSubmit={e=>{e.preventDefault();perform(recovery?'recovery':enabled?'validate':'verify');}} className="space-y-4"><label className="block">{recovery?'Recovery code':'Authenticator code'}<input className="mt-2 w-full rounded border p-3" required value={code} autoComplete="one-time-code" onChange={e=>setCode(e.target.value)} maxLength={recovery?9:6}/></label><button disabled={busy} className="rounded-xl bg-[var(--color-ink)] p-3 text-white">Verify</button>{enabled&&<button type="button" onClick={()=>{setRecovery(!recovery);setCode('');}} className="ml-3 underline">{recovery?'Use authenticator':'Use recovery code'}</button>}</form>}
 {!!codes.length&&<div className="space-y-4"><p>Save these recovery codes privately. Each works once. They will not be shown again.</p><pre className="rounded border p-4">{codes.join('\n')}</pre><Link className="underline" href="/admin/security">I saved my codes, continue</Link></div>}
 {error&&<p role="alert" className="text-red-700">{error}</p>}
 </main>;
}
