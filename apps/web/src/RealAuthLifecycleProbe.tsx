import { useAuth0 } from "@auth0/auth0-react";
import { useConvexAuth } from "convex/react";
import { useState } from "react";
import { buttonSecondaryClass } from "./components/ui";

export function RealAuthLifecycleProbe() {
  const { getAccessTokenSilently, isAuthenticated, isLoading } = useAuth0();
  const { isAuthenticated: isConvexAuthenticated, isLoading: isConvexLoading } = useConvexAuth();
  const [status, setStatus] = useState("Ready");

  const forceRefresh = async () => {
    setStatus("Refreshing token");
    try {
      await getAccessTokenSilently({ cacheMode: "off" });
      setStatus("Refresh token exchange succeeded");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Refresh token exchange failed");
    }
  };

  return (
    <main className="app-shell grid min-h-screen place-items-center p-6">
      <section className="panel-plain grid w-full max-w-xl gap-4 p-6" aria-live="polite">
        <p className="eyebrow">Real authentication probe</p>
        <h1 className="title" data-testid="real-auth-status">{status}</h1>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt>Auth0</dt>
          <dd data-testid="auth0-state">{isLoading ? "loading" : isAuthenticated ? "authenticated" : "signed out"}</dd>
          <dt>Convex</dt>
          <dd data-testid="convex-state">
            {isConvexLoading ? "loading" : isConvexAuthenticated ? "authenticated" : "signed out"}
          </dd>
        </dl>
        <button
          type="button"
          className={buttonSecondaryClass}
          onClick={() => void forceRefresh()}
          disabled={isLoading || isConvexLoading || !isAuthenticated}
        >
          Force refresh-token exchange
        </button>
        <p className="m-0 text-sm text-[var(--muted)]">
          This development-only probe discards the returned token and never renders or logs it.
        </p>
      </section>
    </main>
  );
}
