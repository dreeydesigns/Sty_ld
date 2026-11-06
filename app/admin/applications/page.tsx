import { Suspense } from 'react';
import { AdminApplications } from '@/components/admin-applications';
export const metadata = { title: 'Applications | STYLD', robots: { index: false, follow: false } };
export default function ApplicationsPage() { return <Suspense fallback={<p role="status" className="p-4">Loading applications...</p>}><AdminApplications /></Suspense>; }
