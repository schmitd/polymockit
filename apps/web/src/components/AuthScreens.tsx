interface RuntimeConfigErrorPanelProps {
  runtimeConfigError: string;
}

const glassPanelClass =
  "border border-[var(--line)] shadow-[var(--shadow)] backdrop-blur-[12px] bg-[linear-gradient(165deg,rgba(12,26,35,0.92),rgba(8,14,21,0.84))]";
const eyebrowClass = "text-[0.72rem] uppercase tracking-[0.08em] font-bold text-[var(--accent)]";
const bannerErrorClass =
  "rounded-[0.8rem] border px-4 py-3 text-[0.92rem] border-[color-mix(in_srgb,var(--danger)_45%,transparent)] bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[#ffd5da]";

export function RuntimeConfigErrorPanel({ runtimeConfigError }: RuntimeConfigErrorPanelProps) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <section
        className={`${glassPanelClass} flex w-[min(36rem,100%)] flex-col gap-3 rounded-[1.2rem] p-[clamp(1.2rem,2vw,2rem)]`}
      >
        <p className={eyebrowClass}>Polymockit Setup</p>
        <h1 className="m-0 text-[clamp(1.8rem,4.5vw,2.7rem)] leading-[1.16]">Frontend env is not configured.</h1>
        <p className="m-0">
          Set <code>VITE_CONVEX_URL</code> in <code>/Users/david/projects/polymockit/.env.local</code> or{" "}
          <code>/Users/david/projects/polymockit/apps/web/.env</code>, then restart <code>bun run dev</code>.
        </p>
        <div className={bannerErrorClass}>{runtimeConfigError}</div>
      </section>
    </div>
  );
}
