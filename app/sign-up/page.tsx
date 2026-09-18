import { PublicLayout } from "@/components/public-layout";
import { UnifiedAuthFlow } from "@/components/auth/unified-auth-flow";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  return (
    <PublicLayout backHref="/" backLabel="Home">
      <UnifiedAuthFlow returnTo={returnTo} />
    </PublicLayout>
  );
}
