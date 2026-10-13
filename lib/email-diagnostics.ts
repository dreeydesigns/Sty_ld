function isPresent(name: string): boolean {
  return Boolean(String(process.env[name] ?? '').trim());
}

export function emailAndAuthEnvStatus(): {
  email: { RESEND_API_KEY: boolean; RESEND_FROM_EMAIL: boolean };
  auth: { BETTER_AUTH_URL: boolean; BETTER_AUTH_SECRET: boolean };
  database: { POSTGRES_URL: boolean };
  emailServiceConfigured: boolean;
} {
  const resendKey = isPresent('RESEND_API_KEY');
  const resendFrom = isPresent('RESEND_FROM_EMAIL');
  return {
    email: {
      RESEND_API_KEY: resendKey,
      RESEND_FROM_EMAIL: resendFrom,
    },
    auth: {
      BETTER_AUTH_URL: isPresent('BETTER_AUTH_URL'),
      BETTER_AUTH_SECRET: isPresent('BETTER_AUTH_SECRET'),
    },
    database: {
      POSTGRES_URL: isPresent('POSTGRES_URL') || isPresent('DATABASE_URL'),
    },
    emailServiceConfigured: resendKey && resendFrom,
  };
}