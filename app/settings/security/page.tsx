"use client";
import { useEffect,useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
type Session={id:string;browser:string;is_current:boolean;created_at:string};
type Event={id:string;event:string;created_at:string;user_agent:string};
export default function Security(){
 const [data,setData]=useState<{sessions:Session[];events:Event[]}>();const [error,setError]=useState('');
 async function load(){const r=await fetch('/api/auth/sessions',{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error);setData(d);}
 useEffect(()=>{load().catch(e=>setError(e.message));},[]);
 async function revoke(body:object){try{const r=await fetch('/api/auth/sessions',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw new Error('Unable to log out devices.');await load();}catch(e){setError(e instanceof Error?e.message:'Try again.');}}
 return <AppShell currentNav="settings" showBottomNav>
  <div className="mb-6 flex items-center gap-3">
    <Link href="/settings" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-primary)] shadow-sm transition hover:border-[var(--border-strong)]">
      <ArrowLeft className="h-4 w-4" />
    </Link>
    <div>
      <h1 className="text-[20px] font-bold text-[var(--text-primary)]">Devices and security</h1>
      <p className="text-[12px] text-[var(--text-secondary)]">Review access to your account</p>
    </div>
  </div>
  <div className="mx-auto max-w-md space-y-4 pb-24">
    <p className="text-[13px] leading-5 text-[var(--text-secondary)]">Review access to your account. Browser descriptions can be approximate.</p>
    {error&&<p role="alert" className="text-sm text-red-600">{error}</p>}
    {data?.sessions.map(s=><article className="space-y-2 rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-4 shadow-sm" key={s.id}><p className="break-words text-sm font-semibold text-[var(--text-primary)]">{s.browser||'Unknown browser'}</p><p className="text-[11px] text-[var(--text-secondary)]">Signed in {new Date(s.created_at).toLocaleString()}</p>{s.is_current?<strong className="text-[13px] text-[var(--text-primary)]">This device</strong>:<button className="text-sm font-semibold text-[var(--text-primary)] underline" onClick={()=>revoke({sessionId:s.id})}>Log out this device</button>}</article>)}
    <button className="w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3.5 text-left text-[13px] font-semibold text-[var(--text-primary)] transition hover:border-[var(--border-strong)]" onClick={()=>revoke({allOthers:true})}>Log out all other devices</button>
    <h2 className="text-[17px] font-bold text-[var(--text-primary)]">Recent account activity</h2>
    {data?.events.map(e=><p className="border-b border-[var(--border-subtle)]/60 py-2 text-sm text-[var(--text-secondary)]" key={e.id}>{e.event.replaceAll('_',' ')} · {new Date(e.created_at).toLocaleString()}</p>)}
    <p className="rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-4 text-[12px] leading-5 text-[var(--text-secondary)]">Lost access? Contact support through Help. We never ask you to share a verification code.</p>
  </div>
 </AppShell>;
}
