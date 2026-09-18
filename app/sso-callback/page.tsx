import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-page)] text-[var(--text-primary)]">
      <div className="text-center space-y-3">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-clay)] border-t-transparent" />
        <p className="text-sm text-[var(--text-secondary)]">Completing sign in…</p>
      </div>
      <AuthenticateWithRedirectCallback
        signInForceRedirectUrl="/home"
        signUpForceRedirectUrl="/home"
      />
    </div>
  );
}
