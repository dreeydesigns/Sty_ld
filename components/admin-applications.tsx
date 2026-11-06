'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
type Application = { user_id: string; role: 'professional' | 'salon'; name: string; description: string; contact: string; status: string; created_at: string; reviewVersion: string };
type Audit = { event: string; created_at: string; reason: string };
const fieldClass = 'min-h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-2 text-sm';

function ApplicationReview({ application, onRefresh }: { application: Application; onRefresh: (notice: string) => void }) {
  const [reason, setReason] = useState('');
  const [applicationReviewed, setApplicationReviewed] = useState(false);
  const [contactReviewed, setContactReviewed] = useState(false);
  const [confirm, setConfirm] = useState<'approve' | 'reject' | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [audit, setAudit] = useState<Audit[] | null>(null);
  async function history() {
    setMessage('');
    try {
      const response = await fetch('/api/admin/applications?' + new URLSearchParams({ userId: application.user_id, role: application.role, status: 'all' }), { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok || body.ok !== true || !Array.isArray(body.audit)) throw new Error();
      setAudit(body.audit);
    } catch { setMessage('Audit history could not be loaded. Try again.'); }
  }
  async function decide() {
    if (!confirm || busy || reason.trim().length < 5 || (confirm === 'approve' && (!applicationReviewed || !contactReviewed))) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/admin/security', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: confirm, userId: application.user_id, role: application.role, reason: reason.trim(), review: { applicationReviewed, contactReviewed }, expectedReviewVersion: application.reviewVersion }) });
      const body = await response.json();
      if (response.status === 409) { setConfirm(null); setApplicationReviewed(false); setContactReviewed(false); onRefresh(body.error || 'Application changed. Review the latest details.'); return; }
      if (!response.ok || body.ok !== true) throw new Error(body.error || 'Decision was not saved.');
      setMessage(confirm === 'approve' ? 'Workspace approved. Audit record saved.' : 'Application rejected. Audit record saved.');
      setConfirm(null); onRefresh('Decision recorded. Queue refreshed.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Decision was not saved. Try again.'); }
    finally { setBusy(false); }
  }
  return <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4">
    <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h2 className="break-words text-base font-semibold">{application.name}</h2><p className="mt-1 text-xs capitalize text-[var(--text-secondary)]">{application.role} · {new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium' }).format(new Date(application.created_at))}</p></div><span className="rounded-full bg-[var(--surface-elevated)] px-2.5 py-1 text-xs font-medium capitalize">{application.status}</span></div>
    <details className="mt-3"><summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">Review application</summary>
      <dl className="mt-2 space-y-3 text-sm"><div><dt className="font-medium">Services, location and experience</dt><dd className="mt-1 whitespace-pre-wrap break-words text-[var(--text-secondary)]">{application.description}</dd></div><div><dt className="font-medium">Private review contact</dt><dd className="mt-1 break-all text-[var(--text-secondary)]">{application.contact}</dd></div></dl>
      {application.status === 'pending' && <div className="mt-4 space-y-3 border-t pt-4">
        <p className="text-xs text-[var(--text-secondary)]">Review this application individually. Approval grants provider access and does not verify identity or publish a profile. Cases needing document review must remain pending until secure document review is available.</p>
        <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={applicationReviewed} onChange={e => { setApplicationReviewed(e.target.checked); setConfirm(null); }} />Application details reviewed</label>
        <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={contactReviewed} onChange={e => { setContactReviewed(e.target.checked); setConfirm(null); }} />Contact and professional or business review completed</label>
        <label className="block text-sm font-medium">Decision reason<textarea maxLength={500} minLength={5} value={reason} onChange={e => { setReason(e.target.value); setConfirm(null); }} className={fieldClass + ' mt-2 min-h-24'} placeholder="Record the evidence and reason for this decision" /></label>
        <div className="flex flex-wrap gap-2"><button disabled={busy || reason.trim().length < 5 || !applicationReviewed || !contactReviewed} onClick={() => setConfirm('approve')} className="min-h-11 rounded-xl bg-[var(--color-ink)] px-4 text-sm font-semibold text-white disabled:opacity-50">Approve workspace</button><button disabled={busy || reason.trim().length < 5} onClick={() => setConfirm('reject')} className="min-h-11 rounded-xl border px-4 text-sm font-semibold disabled:opacity-50">Reject application</button></div>
        {confirm && <div className="space-y-3 rounded-xl border bg-[var(--surface-elevated)] p-3"><p className="text-sm">{confirm === 'approve' ? 'Approve this one workspace and grant provider access?' : 'Reject this one application?'} This decision is audited. No instant undo is offered.</p><div className="flex flex-wrap gap-2"><button disabled={busy} onClick={() => void decide()} className="min-h-11 rounded-xl bg-[var(--color-ink)] px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Saving...' : 'Confirm decision'}</button><button disabled={busy} onClick={() => setConfirm(null)} className="min-h-11 rounded-xl border px-4 text-sm">Cancel</button></div></div>}
      </div>}
      <button onClick={() => void history()} className="mt-3 min-h-11 rounded-xl border px-3 text-sm">View audit history</button>
      {audit && <ul className="mt-3 space-y-2 text-xs">{audit.length ? audit.map((entry, index) => <li key={index} className="rounded-xl border p-3"><p className="font-medium">{entry.event === 'admin_approve' ? 'Approved' : 'Rejected'} · {new Date(entry.created_at).toLocaleString('en-KE')}</p><p className="mt-1 whitespace-pre-wrap break-words">{entry.reason}</p></li>) : <li>No approval or rejection records for this application.</li>}</ul>}
      {message && <p role="status" className="mt-3 text-sm">{message}</p>}
    </details>
  </article>;
}

export function AdminApplications() {
  const params = useSearchParams();
  const [role, setRole] = useState(['professional','salon'].includes(params.get('role') || '') ? params.get('role')! : 'all');
  const [status, setStatus] = useState(['all','approved','rejected'].includes(params.get('status') || '') ? params.get('status')! : 'pending');
  const [sort, setSort] = useState('oldest');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<{ applications: Application[]; total: number } | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setError('');
    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/admin/applications?' + new URLSearchParams({ role, status, sort, q, page: String(page) }), { cache: 'no-store', signal: controller.signal });
        const body = await response.json();
        if (!response.ok || body.ok !== true || !Array.isArray(body.applications)) throw new Error(body.error || 'Applications could not be loaded.');
        if (!controller.signal.aborted) setData(body);
      } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Applications could not be loaded. Try again.'); }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [role, status, sort, q, page, refresh]);
  return <main className="space-y-4 p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">Applications</h1><p className="mt-1 text-sm text-[var(--text-secondary)]">Review one workspace at a time.</p></div><button onClick={() => setRefresh(value => value + 1)} className="min-h-11 rounded-xl border px-3 text-sm">Refresh</button></div>
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-medium">Search by name<input type="search" maxLength={100} value={q} onChange={e => { setQ(e.target.value); setPage(1); }} className={fieldClass + ' mt-1'} /></label><label className="text-xs font-medium">Role<select value={role} onChange={e => { setRole(e.target.value); setPage(1); }} className={fieldClass + ' mt-1'}><option value="all">All provider roles</option><option value="professional">Professional</option><option value="salon">Salon</option></select></label><label className="text-xs font-medium">Status<select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className={fieldClass + ' mt-1'}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="all">All statuses</option></select></label><label className="text-xs font-medium">Sort by date<select value={sort} onChange={e => { setSort(e.target.value); setPage(1); }} className={fieldClass + ' mt-1'}><option value="oldest">Oldest first</option><option value="newest">Newest first</option></select></label></div>
    {notice && <p role="status" className="rounded-xl border p-3 text-sm">{notice}</p>}
    {error ? <p role="alert" className="rounded-xl border p-4 text-sm">{error}</p> : !data ? <p role="status" className="py-4 text-sm">Loading applications...</p> : !data.applications.length ? <p className="rounded-2xl border p-4 text-sm">No applications match these filters.</p> : <><p className="text-xs text-[var(--text-secondary)]">{data.total} matching applications · Page {page}</p><div className="space-y-3">{data.applications.map(application => <ApplicationReview key={application.user_id + application.role} application={application} onRefresh={message => { setNotice(message); setRefresh(value => value + 1); }} />)}</div></>}
    <div className="flex items-center gap-3"><button disabled={page === 1} onClick={() => setPage(value => value - 1)} className="min-h-11 rounded-xl border px-3 text-sm disabled:opacity-50">Previous</button><button disabled={!data || page * 25 >= data.total} onClick={() => setPage(value => value + 1)} className="min-h-11 rounded-xl border px-3 text-sm disabled:opacity-50">Next</button></div>
  </main>;
}
