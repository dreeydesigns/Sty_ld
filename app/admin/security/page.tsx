import { redirect } from 'next/navigation';
import { resolveCurrentStyldUser } from '@/lib/auth-resolver';
import { SecurityDashboard } from '@/components/security-dashboard';
export const dynamic='force-dynamic';
export default async function Security(){const s=await resolveCurrentStyldUser();if(!s)redirect('/auth/sign-in?returnTo=/admin/security');if(!s.admin)redirect('/unauthorized');if(!s.mfaVerified)redirect('/auth/mfa');return <SecurityDashboard/>;}
