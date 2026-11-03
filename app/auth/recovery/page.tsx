import type { Metadata } from 'next';
import { PublicLayout } from '@/components/public-layout';
import { AccountRecovery } from '@/components/auth/account-recovery';

export const metadata: Metadata = { title: 'Recover account access | STYLD', robots: { index: false, follow: false } };

export default function AccountRecoveryPage() {
  return <PublicLayout backHref="/auth/sign-in" backLabel="Sign in"><AccountRecovery /></PublicLayout>;
}
