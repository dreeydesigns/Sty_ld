import { redirect } from 'next/navigation';
import { resolveCurrentStyldUser } from '@/lib/auth-resolver';
import { ProviderServices } from '@/components/provider-services';
export const dynamic = 'force-dynamic';
export default async function ServicesSettings() {
  const actor=await resolveCurrentStyldUser();
  if(!actor) redirect('/auth/sign-in?returnTo=/settings/services');
  if(!actor.workspaceId || !['professional','salon'].includes(actor.role)) redirect('/unauthorized');
  if(actor.admin&&!actor.mfaVerified) redirect('/auth/mfa');
  return <ProviderServices workspaceId={actor.workspaceId} />;
}
