// Pure policy only. The current upload route does not yet use restricted delivery.
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
function validMedia(media) {
  if (!media || !uuid(media.ownerWorkspaceId) || typeof media.assetId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(media.assetId)
    || !Number.isSafeInteger(media.version) || media.version < 1 || !['pending', 'published', 'rejected', 'deleted'].includes(media.state)) throw new Error('Invalid media manifest.');
}
function mediaAccess(media, actor, now = Date.now()) {
  validMedia(media);
  if (media.revoked || ['rejected', 'deleted'].includes(media.state)) return { allowed: false, reason: 'unavailable' };
  if (media.state === 'published') return { allowed: Boolean(media.publicDerivativeVerified && media.approvedVersion === media.version), delivery: 'approved-derivative-only' };
  const owner = actor?.active === true && actor.workspaceId === media.ownerWorkspaceId && ['professional', 'salon'].includes(actor.role);
  const reviewer = actor?.active === true && actor.role === 'super_admin' && actor.mfaVerified === true && actor.canReviewMedia === true;
  if (!owner && !reviewer) return { allowed: false, reason: 'unauthorized' };
  if (media.deliveryType !== 'authenticated' || media.providerRestrictionVerified !== true) return { allowed: false, reason: 'storage-not-verified' };
  if (!Number.isFinite(media.accessExpiresAt) || media.accessExpiresAt <= now || media.accessExpiresAt > now + 300000) return { allowed: false, reason: 'expired-or-unbounded-access' };
  return { allowed: true, delivery: 'server-proxy-only', cacheControl: 'private, no-store', expiresAt: media.accessExpiresAt };
}
function mediaTransition(media, target, reviewer, evidence = {}) {
  validMedia(media);
  if (reviewer?.role !== 'super_admin' || reviewer.active !== true || reviewer.mfaVerified !== true || reviewer.canReviewMedia !== true) throw new Error('Authorized MFA reviewer required.');
  const allowed = { pending: ['published', 'rejected'], published: ['pending', 'deleted'], rejected: ['deleted'], deleted: [] };
  if (!allowed[media.state].includes(target)) throw new Error('Invalid moderation transition.');
  if (target === 'published' && (!evidence.publicDerivativeVerified || evidence.approvedVersion !== media.version || evidence.ownerWorkspaceId !== media.ownerWorkspaceId)) throw new Error('Verified derivative and current ownership required.');
  return Object.freeze({ from: media.state, to: target, version: media.version, assetId: media.assetId,
    auditRequired: true, databaseTransactionRequired: true, revokeProxyImmediately: target !== 'published',
    invalidatePublicDerivative: media.state === 'published', crossSystemTransaction: false });
}
module.exports = { mediaAccess, mediaTransition };
