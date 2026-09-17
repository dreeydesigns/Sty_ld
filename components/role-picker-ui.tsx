"use client";
import { WhatsAppAuthFlow } from '@/components/whatsapp-auth-flow';
export function SignInRolePicker(props: { returnTo: string; onSuccess?: (destination: string) => void }) { return <WhatsAppAuthFlow {...props} />; }
export function SignUpRolePicker(props: { onSuccess?: (destination: string) => void } = {}) { return <WhatsAppAuthFlow {...props} />; }
