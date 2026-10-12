import { redirect } from 'next/navigation';
import { resolveCurrentStyldUser } from '@/lib/auth-resolver';
export const dynamic='force-dynamic';
export default async function AdminLayout({children}:{children:React.ReactNode}){const s=await resolveCurrentStyldUser();if(!s)redirect('/auth/sign-in?returnTo=/admin');if(!s.admin)redirect('/unauthorized');if(!s.mfaVerified)redirect('/auth/mfa');return <>{children}</>;}
