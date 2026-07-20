export default function Loading() {
  return (
    <div className="page-loader px-6 text-center">
      <div>
        <div className="loader-bloom mx-auto" />
        <div className="loader-copy mt-8">
          <p className="font-display text-4xl text-[var(--ms-plum)] font-medium tracking-tight">Styld</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--ms-mauve)]">
            Preparing your beauty moment
          </p>
        </div>
      </div>
    </div>
  );
}
