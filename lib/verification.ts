/**
 * Styld - Provider verification presentation layer.
 *
 * This is the single place where a provider trust signal is turned into a
 * public badge. A badge is only ever shown when a trusted, server-backed
 * verification record exists.
 *
 * No verification service or authoritative records exist yet, so nothing on
 * this surface can be presented as identity-verified or business-verified.
 * When a real verification service is connected, it should resolve records
 * through resolveProviderVerification and everything else stays unchanged.
 */

export type VerificationKind = "identity" | "business";

export interface ProviderVerification {
  kind: VerificationKind;
  evidenceId: string;
  verifiedAt: string;
}

/**
 * Type guard for a trusted verification record. Any value that is not a
 * complete, well-formed record is rejected, so loose booleans, client state,
 * or partial objects can never trigger a badge.
 */
export function hasVerificationEvidence(value: unknown): value is ProviderVerification {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ProviderVerification>;
  const hasKind = candidate.kind === "identity" || candidate.kind === "business";
  const hasEvidenceId = typeof candidate.evidenceId === "string" && candidate.evidenceId.trim().length > 0;
  const hasVerifiedAt = typeof candidate.verifiedAt === "string" && candidate.verifiedAt.trim().length > 0;

  return hasKind && hasEvidenceId && hasVerifiedAt;
}

/**
 * Resolve the public verification record for a provider.
 *
 * Returns null until a trusted verification source is available. Callers
 * must treat null as "not verified" and show no badge.
 */
export function resolveProviderVerification(_provider: { slug: string }): ProviderVerification | null {
  return null;
}
