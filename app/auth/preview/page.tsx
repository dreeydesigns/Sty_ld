import { notFound } from 'next/navigation';
import { WhatsAppAuthFlow } from '@/components/whatsapp-auth-flow';
export default function AuthPreview() {
 if (process.env.NODE_ENV !== 'development') notFound();
 return <main className="min-h-screen bg-[#EFEAE4] px-4 py-10"><WhatsAppAuthFlow preview /></main>;
}
