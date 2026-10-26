function isPresent(name: string): boolean {
  return Boolean(String(process.env[name] ?? '').trim());
}

export function emailAndAuthEnvStatus(): {
  email: { RESEND_API_KEY: boolean; RESEND_FROM_EMAIL: boolean; GMAIL_USER: boolean; GMAIL_APP_PASSWORD: boolean };
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
      GMAIL_USER: isPresent('GMAIL_USER'),
      GMAIL_APP_PASSWORD: isPresent('GMAIL_APP_PASSWORD'),
    },
    auth: {
      BETTER_AUTH_URL: isPresent('BETTER_AUTH_URL'),
      BETTER_AUTH_SECRET: isPresent('BETTER_AUTH_SECRET'),
    },
    database: {
      POSTGRES_URL: isPresent('POSTGRES_URL') || isPresent('DATABASE_URL'),
    },
    emailServiceConfigured: process.env.EMAIL_PROVIDER === 'gmail'
      ? isPresent('GMAIL_USER') && isPresent('GMAIL_APP_PASSWORD')
      : (!process.env.EMAIL_PROVIDER || process.env.EMAIL_PROVIDER === 'resend') && resendKey && resendFrom,
  };
}