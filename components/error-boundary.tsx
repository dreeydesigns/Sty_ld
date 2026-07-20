"use client";

import React from "react";
import Link from "next/link";

interface Props {
  children: React.ReactNode;
  /** Optional custom fallback UI. If omitted, shows the default card. */
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * ErrorBoundary — wraps any subtree and catches render-time errors.
 * Shows a friendly recovery card instead of a white screen.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomeComponentThatMightCrash />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    // In production you'd send this to Sentry / a logging service
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-[28px] bg-white p-8 text-center shadow-[0_12px_40px_rgba(13,27,42,0.08)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500 text-2xl">
            ⚠
          </div>
          <h2 className="mt-4 text-lg font-semibold text-[var(--ms-navy)]">
            Something went wrong
          </h2>
          <p className="mt-2 max-w-xs text-sm leading-6 text-[var(--ms-mauve)]">
            {this.state.message || "An unexpected error occurred in this section."}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex min-h-10 items-center rounded-full bg-[var(--ms-plum)] px-5 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Try again
            </button>
            <Link
              href="/"
              className="inline-flex min-h-10 items-center rounded-full border border-[var(--ms-border)] bg-white px-5 text-sm font-semibold text-[var(--ms-navy)] transition hover:border-[var(--ms-navy)]"
            >
              Go home
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Convenience wrapper — functional component for use with Suspense.
 * Provides both error catching and a suspense boundary together.
 */
export function SafeSection({
  children,
  fallback,
  suspenseFallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  suspenseFallback?: React.ReactNode;
}) {
  return (
    <ErrorBoundary fallback={fallback}>
      <React.Suspense
        fallback={
          suspenseFallback ?? (
            <div className="animate-pulse rounded-[28px] bg-white p-8 shadow-[0_12px_40px_rgba(13,27,42,0.08)]">
              <div className="h-4 w-1/3 rounded-full bg-[var(--ms-border)]" />
              <div className="mt-3 h-3 w-2/3 rounded-full bg-[var(--ms-border)]" />
              <div className="mt-2 h-3 w-1/2 rounded-full bg-[var(--ms-border)]" />
            </div>
          )
        }
      >
        {children}
      </React.Suspense>
    </ErrorBoundary>
  );
}
