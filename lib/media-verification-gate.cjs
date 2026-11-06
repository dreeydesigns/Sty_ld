function previewMediaVerificationEnabled(env = {}, now = Date.now()) {
  const value = env.STYLD_MEDIA_VERIFICATION_STARTED_AT;
  if (env.VERCEL_ENV !== 'preview' || env.VERCEL_GIT_COMMIT_REF !== 'qoder/styld-beta-20261027' || typeof value !== 'string') return false;
  const started = Date.parse(value);
  return Number.isFinite(started) && new Date(started).toISOString() === value && now >= started && now - started < 3600000;
}
module.exports = { previewMediaVerificationEnabled };
