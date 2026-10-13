"use client";
import { UnifiedAuthFlow } from './auth/unified-auth-flow';
export interface WhatsAppAuthFlowProps { returnTo?: string; onSuccess?: (destination:string)=>void; preview?:boolean; onBack?:()=>void; }
export function WhatsAppAuthFlow(props: WhatsAppAuthFlowProps) { return <UnifiedAuthFlow {...props}/>; }
