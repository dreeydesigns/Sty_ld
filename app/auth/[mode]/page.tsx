import { notFound } from "next/navigation";
import Link from "next/link";

import { PublicLayout } from "@/components/public-layout";
import { AuthCard, CTAButton, SectionReveal } from "@/components/marketplace-ui";
import { SignInRolePicker, SignUpRolePicker } from "@/components/role-picker-ui";

export default async function AuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ mode: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { mode } = await params;
  const { returnTo } = await searchParams;
  const safeReturnTo = returnTo?.startsWith("/") ? returnTo : "/home";

  if (!["sign-in", "sign-up", "forgot-password"].includes(mode)) {
    notFound();
  }

  const isSignIn = mode === "sign-in";
  const isSignUp = mode === "sign-up";

  return (
    <PublicLayout backHref="/" backLabel="Home">
      <SectionReveal>
        <AuthCard
          eyebrow="Account"
          title={
            isSignIn
              ? "Welcome back"
              : isSignUp
                ? "Create your account"
                : "Reset your password"
          }
          description={
            isSignIn
              ? "Select your account type — Client is the default for booking."
              : isSignUp
                ? "Most people start as a Client. Tap a role to see more."
                : "Enter your email and we will send a secure reset link."
          }
        >
          <div className="space-y-4">
            {isSignUp && <SignUpRolePicker />}

            {isSignIn && <SignInRolePicker returnTo={safeReturnTo} />}

            {mode === "forgot-password" && (
              <>
                <div className="rounded-[20px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-5 py-5 text-center">
                  <p className="text-sm font-semibold text-[var(--ms-navy)]">Password reset coming soon</p>
                  <p className="mt-2 text-xs leading-5 text-[var(--ms-mauve)]">
                    Password reset by email is not yet available. If you have access to your phone number, please{" "}
                    <Link className="font-semibold text-[var(--ms-plum)]" href="/auth/sign-in">
                      sign in with your phone number
                    </Link>{" "}
                    instead.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <CTAButton className="sm:flex-1" href="/auth/sign-in">
                    Back to sign in
                  </CTAButton>
                </div>
              </>
            )}

            {isSignUp && (
              <p className="rounded-[16px] bg-[var(--ms-soft-bg)] px-4 py-3 text-center text-xs leading-5 text-[var(--ms-mauve)]">
                Already have an account?{" "}
                <Link
                  className="font-semibold text-[var(--ms-plum)]"
                  href="/auth/sign-in?returnTo=/home"
                >
                  Sign in here.
                </Link>
              </p>
            )}

            {isSignIn && (
              <p className="text-center text-xs text-[var(--ms-mauve)]">
                New here?{" "}
                <Link
                  className="font-semibold text-[var(--ms-plum)]"
                  href="/auth/sign-up"
                >
                  Create a free account.
                </Link>
              </p>
            )}
          </div>
        </AuthCard>
      </SectionReveal>
    </PublicLayout>
  );
}

function FormField({
  label,
  type = "text",
}: {
  label: string;
  type?: string;
}) {
  return (
    <label className="block rounded-[24px] border border-[var(--ms-border)] bg-white px-4 py-4">
      <span className="text-xs uppercase tracking-[0.2em] text-[var(--ms-mauve)]">{label}</span>
      <input
        className="mt-3 w-full bg-transparent text-sm text-[var(--ms-charcoal)] outline-none placeholder:text-[var(--ms-mauve)]"
        placeholder={label}
        type={type}
      />
    </label>
  );
}
