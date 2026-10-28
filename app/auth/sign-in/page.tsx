import { PublicLayout } from "@/components/public-layout";
import { UnifiedAuthFlow } from "@/components/auth/unified-auth-flow";

export default async function AuthSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  // A repeated ?returnTo= arrives as an array, so only the first value is passed on.
  const { returnTo } = await searchParams;
  return (
    <PublicLayout backHref="/" backLabel="Home">
      <UnifiedAuthFlow returnTo={Array.isArray(returnTo) ? returnTo[0] : returnTo} />
    </PublicLayout>
  );
}
