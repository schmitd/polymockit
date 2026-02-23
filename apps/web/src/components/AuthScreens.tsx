interface RuntimeConfigErrorPanelProps {
  runtimeConfigError: string;
}

interface SignInPanelProps {
  error: string | null;
  isSigningIn: boolean;
  onSignIn: () => void;
}

export function BootScreen() {
  return (
    <div className="boot-screen">
      <div className="boot-card">
        <p className="eyebrow">Polymarket Fantasy League</p>
        <h1>Loading workspace...</h1>
        <p>Wiring Convex state and live market feeds.</p>
      </div>
    </div>
  );
}

export function RuntimeConfigErrorPanel({ runtimeConfigError }: RuntimeConfigErrorPanelProps) {
  return (
    <div className="auth-shell">
      <section className="auth-panel glass">
        <p className="eyebrow">Polymockit Setup</p>
        <h1>Frontend env is not configured.</h1>
        <p>
          Set <code>VITE_CONVEX_URL</code> in <code>/Users/david/projects/polymockit/.env.local</code> or{" "}
          <code>/Users/david/projects/polymockit/apps/web/.env</code>, then restart <code>bun run dev</code>.
        </p>
        <div className="banner error">{runtimeConfigError}</div>
      </section>
    </div>
  );
}

export function SignInPanel({ error, isSigningIn, onSignIn }: SignInPanelProps) {
  return (
    <div className="auth-shell">
      <section className="auth-panel glass">
        <p className="eyebrow">Polymockit</p>
        <h1>Build your prediction market fantasy league.</h1>
        <p>
          Use fake bankroll, draft from live Polymarket contracts, and compete on portfolio equity inside private
          leagues.
        </p>
        <button type="button" onClick={onSignIn} disabled={isSigningIn}>
          {isSigningIn ? "Signing in..." : "Sign in with Shoo"}
        </button>

        {error ? <div className="banner error">{error}</div> : null}
      </section>
    </div>
  );
}
