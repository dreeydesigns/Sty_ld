"use client";
import { useEffect,useState } from 'react';
import Link from 'next/link';
import { safeReturnTo } from '@/lib/auth-policy';
export function WorkspaceManagement({initialRole='professional'}:{initialRole?:'professional'|'salon'}){
 const [data,setData]=useState<{roles:string[];current:string;workspaceId:string;workspaces:{id:string;role:string;available:boolean}[];applications:{role:string;status:string}[]}>();const [role,setRole]=useState(initialRole);const [name,setName]=useState('');const [description,setDescription]=useState('');const [contact,setContact]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
 const load=()=>fetch('/api/workspaces').then(r=>r.json()).then(d=>{if(d.error)setMessage(d.error);else setData(d);});useEffect(()=>{load().catch(()=>setMessage('Unable to load workspaces.'));},[]);
 async function act(url:string,body:object){setBusy(true);setMessage('');try{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.error);if(url.includes('/session'))location.assign(safeReturnTo(d.destination||'/home'));else if(url.includes('/api/workspaces')){location.assign('/workspace/application?role='+(body as { role: string }).role+'&status=pending');}else{setMessage('Application received. You can keep browsing while we review it.');await load();}}catch(e){setMessage(e instanceof Error?e.message:'Try again.');}finally{setBusy(false);}}
 return <main className="mx-auto max-w-xl space-y-6 p-7"><Link href="/settings" className="underline">Back to settings</Link><h1 className="text-3xl font-semibold">Your workspaces</h1><p>One account for booking, professional work and salon management.</p>
 <div className="flex flex-wrap gap-3">{data?.workspaces.map(w=><button disabled={busy||w.id===data.workspaceId||!w.available} className="rounded-xl border p-3 disabled:opacity-50" key={w.id} onClick={()=>act('/api/auth/session',{workspaceId:w.id})}>{w.role}{w.id===data.workspaceId?' · current':!w.available?' · not yet available':''}</button>)}</div>
 {data?.applications.map(a=><p key={a.role}>{a.role}: {a.status}</p>)}
 <p>Shop and Delivery accounts are planned. Their operational onboarding and dashboards are not live.</p><form className="space-y-4 rounded-2xl border p-5" onSubmit={e=>{e.preventDefault();act('/api/workspaces',{role,name,description,contact});}}><h2 className="text-xl font-semibold">Offer services / Manage a salon</h2>
 <label className="block">Workspace<select className="mt-1 w-full rounded border p-3" value={role} onChange={e=>setRole(e.target.value as 'professional'|'salon')}><option value="professional">Professional</option><option value="salon">Salon</option></select></label>
 <label className="block">Professional or business name<input required minLength={2} maxLength={100} className="mt-1 w-full rounded border p-3" value={name} onChange={e=>setName(e.target.value)}/></label>
 <label className="block">Services, location and experience<textarea required minLength={2} maxLength={2000} className="mt-1 w-full rounded border p-3" value={description} onChange={e=>setDescription(e.target.value)}/></label>
 <label className="block">Contact for verification<input required minLength={2} maxLength={200} className="mt-1 w-full rounded border p-3" value={contact} onChange={e=>setContact(e.target.value)}/></label>
 <p className="text-sm">We review your details before enabling provider access. Your contact details are not published by this form.</p><button disabled={busy} className="rounded-xl bg-[var(--color-ink)] p-3 text-white">Submit for review</button></form>
 {message&&<p role="status">{message}</p>}</main>;
}
