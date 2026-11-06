import { AdminReviewQueue } from '@/components/admin-review-queue';
export const metadata = { title: 'Content review | STYLD', robots: { index: false, follow: false } };
export default function ContentReview() { return <main className="space-y-4 p-4 sm:p-6"><h1 className="text-2xl font-semibold">Content review</h1><AdminReviewQueue /></main>; }
