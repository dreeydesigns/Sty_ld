/** Readiness checks use presence only and never expose configuration values. */
export function authConfigurationReady(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.BETTER_AUTH_SECRET?.trim() && env.BETTER_AUTH_URL?.trim()
    && (env.POSTGRES_URL?.trim() || env.DATABASE_URL?.trim()));
}

export function emailConfigurationReady(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.RESEND_API_KEY?.trim() && env.RESEND_FROM_EMAIL?.trim());
}
