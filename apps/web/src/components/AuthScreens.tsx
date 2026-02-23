interface RuntimeConfigErrorPanelProps {
  runtimeConfigError: string;
}

interface SignInPanelProps {
  error: string | null;
  isSigningIn: boolean;
  onSignIn: () => void;
}

const glassPanelClass =
  "border border-[var(--line)] shadow-[var(--shadow)] backdrop-blur-[12px] bg-[linear-gradient(165deg,rgba(12,26,35,0.92),rgba(8,14,21,0.84))]";
const eyebrowClass = "text-[0.72rem] uppercase tracking-[0.08em] font-bold text-[var(--accent)]";
const bannerErrorClass =
  "rounded-[0.8rem] border px-4 py-3 text-[0.92rem] border-[color-mix(in_srgb,var(--danger)_45%,transparent)] bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[#ffd5da]";
const primaryButtonClass =
  "rounded-[0.8rem] border-0 bg-[linear-gradient(135deg,#28cfae_0%,#12a6bc_100%)] px-4 py-2.5 font-bold text-[#022018] transition duration-150 hover:-translate-y-px hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-65";

export function BootScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className={`${glassPanelClass} flex w-[min(36rem,100%)] flex-col gap-3 rounded-[1.2rem] p-[clamp(1.2rem,2vw,2rem)]`}>
        <p className={eyebrowClass}>Polymarket Fantasy League</p>
        <h1 className="m-0 text-[clamp(1.8rem,4.5vw,2.7rem)] leading-[1.16]">Loading workspace...</h1>
        <p className="m-0">Wiring Convex state and live market feeds.</p>
      </div>
    </div>
  );
}

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

export function SignInPanel({ error, isSigningIn, onSignIn }: SignInPanelProps) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <section
        className={`${glassPanelClass} flex w-[min(36rem,100%)] flex-col gap-3 rounded-[1.2rem] p-[clamp(1.2rem,2vw,2rem)]`}
      >
        <p className={eyebrowClass}>Polymockit</p>
        <h1 className="m-0 text-[clamp(1.8rem,4.5vw,2.7rem)] leading-[1.16]">
          Build your prediction market fantasy league.
        </h1>
        <p className="m-0">
          Use fake bankroll, draft from live Polymarket contracts, and compete on portfolio equity inside private
          leagues.
        </p>
        <button type="button" className={primaryButtonClass} onClick={onSignIn} disabled={isSigningIn}>
          {isSigningIn ? "Signing in..." : "Sign in with Shoo"}
        </button>

        {error ? <div className={bannerErrorClass}>{error}</div> : null}
      </section>
    </div>
  );
}
