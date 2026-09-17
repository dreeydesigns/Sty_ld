"use client";

import React from "react";
import { UnifiedAuthFlow } from "@/components/auth/unified-auth-flow";

export interface WhatsAppAuthFlowProps {
  returnTo?: string;
  onSuccess?: (destination: string) => void;
  preview?: boolean;
}

/**
 * WhatsAppAuthFlow (Backward Compatible Delegator)
 *
 * Automatically forwards to the modern Unified Multi-Method Authentication Flow
 * (Google Identity Services, Universal Email OTP, Passkeys, Phone/Password).
 */
export function WhatsAppAuthFlow(props: WhatsAppAuthFlowProps) {
  return <UnifiedAuthFlow {...props} />;
}
