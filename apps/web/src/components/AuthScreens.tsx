interface RuntimeConfigErrorPanelProps {
  runtimeConfigError: string;
}

export function RuntimeConfigErrorPanel({ runtimeConfigError }: RuntimeConfigErrorPanelProps) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <section className="panel flex w-[min(36rem,100%)] flex-col gap-3 p-6">
        <p className="eyebrow">Polymockit Setup</p>
        <h1 className="title">Frontend env is not configured.</h1>
        <p className="m-0">
          Set <code>VITE_CONVEX_URL</code> in <code>/Users/david/projects/polymockit/.env.local</code> or{" "}
          <code>/Users/david/projects/polymockit/apps/web/.env</code>, then restart <code>bun run dev</code>.
        </p>
        <div className="banner banner-danger">{runtimeConfigError}</div>
      </section>
    </div>
  );
}
