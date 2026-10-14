import { PublicLayout } from "@/components/public-layout";
import { WorkspaceManagement } from "@/components/workspace-management";

export default function OnboardingPage() {
  return (
    <PublicLayout backHref="/account" backLabel="Account">
      <WorkspaceManagement initialRole="professional" />
    </PublicLayout>
  );
}
