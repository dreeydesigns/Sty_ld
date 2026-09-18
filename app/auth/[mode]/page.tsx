import { notFound } from 'next/navigation';
import { PublicLayout } from '@/components/public-layout';
import { UnifiedAuthFlow } from '@/components/auth/unified-auth-flow';

export default async function AuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ mode: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { mode } = await params;
  const { returnTo } = await searchParams;
  if (!['sign-in', 'sign-up', 'forgot-password'].includes(mode)) notFound();
  return (
    <PublicLayout backHref="/" backLabel="Home">
      <UnifiedAuthFlow returnTo={returnTo} />
    </PublicLayout>
  );
}

