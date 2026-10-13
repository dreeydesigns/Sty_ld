import { AppShell } from '@/components/app-shell';
import Link from 'next/link';
export default function CounterPage() {
 return <AppShell currentNav="counter"><h1 className="text-3xl font-semibold">Counter</h1><p className="my-4">Our beauty marketplace is being prepared. Seller onboarding, product ordering and delivery are not available yet.</p><Link className="underline" href="/discover">Explore services</Link></AppShell>;
}
