export default function Loading() {
  // This is the first paint for every route that renders on the client, so it has to read as a
  // status to assistive tech rather than as a silent screen. The copy is the announcement.
  return (
    <div className="page-loader px-6 text-center" role="status" aria-live="polite">
      <div>
        <div className="loader-bloom mx-auto" aria-hidden="true" />
        <div className="loader-copy mt-8">
          <p className="font-display text-4xl text-[var(--color-primary)] font-medium tracking-tight">Styld</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-secondary)]">
            Preparing your beauty moment
          </p>
        </div>
      </div>
    </div>
  );
}
