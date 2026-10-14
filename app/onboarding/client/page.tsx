import { PublicLayout } from "@/components/public-layout";
import { UnifiedAuthFlow } from "@/components/auth/unified-auth-flow";

export default function ClientOnboardingPage() {
  return (
    <PublicLayout backHref="/discover" backLabel="Discover">
      <UnifiedAuthFlow returnTo="/workspace/client" />
    </PublicLayout>
  );
}
