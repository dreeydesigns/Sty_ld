/**
 * Moderation decision contract for STYLD Build 1.
 *
 * Pure validation for admin review of pending social posts. The route
 * enforces authentication, admin role and MFA through requireAdmin; this
 * module re-checks the same facts plus post state so a decision fails closed
 * even if the caller, the row state or the service reference has changed
 * between authorization and write. Transitions use only the stored status
 * values: publication pending to published or rejected, moderation visible.
 */

import { serviceIdFromTags, serviceEligibleForLook, type ServiceRecord } from "./look-contract";

export const MODERATION_MIN_REASON_LENGTH = 5;
export const MODERATION_MAX_REASON_LENGTH = 500;

export type ModerationDecision = "approve" | "reject";

export type ModerationActor = {
  userId: string;
  admin: boolean;
  mfaVerified: boolean;
};

export type ModerationPostRow = {
  id: string;
  author_user_id: string;
  author_workspace_id: string;
  author_role: string;
  tags: string[];
  visibility: string;
  publication_status: string;
  moderation_status: string;
  deleted_at: string | Date | null;
};

export type ModerationCheck =
  | {
      ok: true;
      decision: ModerationDecision;
      resultingStatus: "published" | "rejected";
      serviceId: string | null;
      reason: string | null;
    }
  | { ok: false; error: string; status: 400 | 403 | 404 | 409 };

function normalizeReason(reason: unknown): { ok: true; value: string | null } | { ok: false; error: string } {
  if (reason === undefined || reason === null || reason === "") return { ok: true, value: null };
  if (typeof reason !== "string") return { ok: false, error: "Enter a valid decision reason." };
  const trimmed = reason.trim();
  if (trimmed.length > MODERATION_MAX_REASON_LENGTH) {
    return { ok: false, error: "Keep the decision reason short." };
  }
  return { ok: true, value: trimmed.length ? trimmed : null };
}

export function checkModerationDecision(input: {
  actor: ModerationActor | null | undefined;
  post: ModerationPostRow | null | undefined;
  decision: unknown;
  reason: unknown;
}): ModerationCheck {
  const { actor, post, decision, reason } = input;

  if (!actor || actor.admin !== true || actor.mfaVerified !== true) {
    return { ok: false, error: "Administrator MFA required.", status: 403 };
  }
  if (!post) {
    return { ok: false, error: "Post not found.", status: 404 };
  }
  if (actor.userId === post.author_user_id) {
    return { ok: false, error: "You cannot moderate your own posts.", status: 403 };
  }
  if (decision !== "approve" && decision !== "reject") {
    return { ok: false, error: "Choose approve or reject.", status: 400 };
  }

  const normalized = normalizeReason(reason);
  if (!normalized.ok) return { ok: false, error: normalized.error, status: 400 };
  if (
    decision === "reject" &&
    (!normalized.value || normalized.value.length < MODERATION_MIN_REASON_LENGTH)
  ) {
    return { ok: false, error: "A rejection reason of at least 5 characters is required.", status: 400 };
  }

  if (post.deleted_at) {
    return { ok: false, error: "This post has been deleted.", status: 409 };
  }
  if (post.moderation_status !== "visible") {
    return { ok: false, error: "This post is no longer awaiting a visibility decision.", status: 409 };
  }
  if (post.publication_status !== "pending") {
    return { ok: false, error: "This post is not awaiting review.", status: 409 };
  }

  return {
    ok: true,
    decision,
    resultingStatus: decision === "approve" ? "published" : "rejected",
    serviceId: serviceIdFromTags(post.tags),
    reason: normalized.value,
  };
}

export function approvalServiceEligible(
  post: ModerationPostRow,
  serviceId: string,
  service: ServiceRecord | null | undefined,
): boolean {
  return Boolean(
    service &&
      service.id === serviceId &&
      serviceEligibleForLook(service, post.author_workspace_id),
  );
}

export function moderationAuditDetails(input: {
  post: ModerationPostRow;
  decision: ModerationDecision;
  previousStatus: string;
  resultingStatus: string;
  reason: string | null;
  serviceId: string | null;
}): Record<string, unknown> {
  const details: Record<string, unknown> = {
    postId: input.post.id,
    decision: input.decision,
    previousStatus: input.previousStatus,
    resultingStatus: input.resultingStatus,
    authorUserId: input.post.author_user_id,
    authorWorkspaceId: input.post.author_workspace_id,
    authorRole: input.post.author_role,
    serviceId: input.serviceId,
  };
  if (input.reason) details.reason = input.reason;
  return details;
}
