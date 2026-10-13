"use client";
import { UnifiedAuthFlow } from '@/components/auth/unified-auth-flow';
export function SignInRolePicker(props: { returnTo: string; onSuccess?: (destination: string) => void }) { return <UnifiedAuthFlow {...props} />; }
export function SignUpRolePicker(props: { onSuccess?: (destination: string) => void } = {}) { return <UnifiedAuthFlow {...props} />; }
