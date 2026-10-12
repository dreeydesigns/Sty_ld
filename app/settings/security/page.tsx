"use client";
import { useEffect,useState } from 'react';
import Link from 'next/link';
type Session={id:string;browser:string;is_current:boolean;created_at:string};
type Event={id:string;event:string;created_at:string;user_agent:string};
export default function Security(){
 const [data,setData]=useState<{sessions:Session[];events:Event[]}>();const [error,setError]=useState('');
 async function load(){const r=await fetch('/api/auth/sessions',{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error);setData(d);}
 useEffect(()=>{load().catch(e=>setError(e.message));},[]);
 async function revoke(body:object){try{const r=await fetch('/api/auth/sessions',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw new Error('Unable to log out devices.');await load();}catch(e){setError(e instanceof Error?e.message:'Try again.');}}
 return <main className="mx-auto max-w-xl space-y-6 p-7"><Link href="/settings" className="underline">Back to settings</Link><h1 className="text-3xl font-semibold">Devices and security</h1><p>Review access to your account. Browser descriptions can be approximate.</p>{error&&<p role="alert">{error}</p>}
 {data?.sessions.map(s=><article className="space-y-2 rounded-xl border p-4" key={s.id}><p className="break-words text-sm">{s.browser||'Unknown browser'}</p><p>Signed in {new Date(s.created_at).toLocaleString()}</p>{s.is_current?<strong>This device</strong>:<button className="underline" onClick={()=>revoke({sessionId:s.id})}>Log out this device</button>}</article>)}
 <button className="rounded-xl border p-3" onClick={()=>revoke({allOthers:true})}>Log out all other devices</button><h2 className="text-xl font-semibold">Recent account activity</h2>{data?.events.map(e=><p className="border-b py-2 text-sm" key={e.id}>{e.event.replaceAll('_',' ')} · {new Date(e.created_at).toLocaleString()}</p>)}
 <p className="text-sm">Lost access? Contact support through Help. We never ask you to share a verification code.</p></main>;
}
