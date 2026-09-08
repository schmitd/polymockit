import type { AppUser } from "@polymockit/effect-services";
import { useState } from "react";
import { DashboardHeader } from "./components/DashboardHeader";
import { buttonSecondaryClass } from "./components/ui";

const testUser: AppUser = {
  id: "test-user",
  username: "commissioner",
  displayName: "Test Commissioner",
  accentColor: "oklch(76% 0.14 74)",
};

export function AuthLifecycleHarness() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("Signed out");

  const signIn = () => {
    setBusy("signin");
    setMessage("Opening sign in");
    const popup = window.open("about:blank", "polymockit-auth-test", "popup,width=420,height=560");
    if (popup) {
      popup.document.title = "Auth test";
      popup.document.body.textContent = "Authentication complete";
    }
    window.setTimeout(() => {
      popup?.close();
      setUser(testUser);
      setBusy(null);
      setMessage("Session ready");
    }, 100);
  };

  const signOut = () => {
    setBusy("signout");
    const popup = window.open("about:blank", "polymockit-logout-test", "popup,width=420,height=560");
    if (popup) {
      popup.document.title = "Logout test";
      popup.document.body.textContent = "Signed out";
    }
    setUser(null);
    setMessage("Signed out");
    window.setTimeout(() => {
      popup?.close();
      setBusy(null);
    }, 100);
  };

  return (
    <div className="app-shell flex min-h-screen flex-col">
      <DashboardHeader
        currentRoute="desk"
        onNavigate={() => undefined}
        user={user}
        isAuthLoading={false}
        isSigningIn={busy === "signin"}
        isSigningOut={busy === "signout"}
        onSignIn={signIn}
        onSignOut={signOut}
      />
      <main className="grid flex-1 place-items-center p-6">
        <section className="panel-plain grid w-full max-w-xl gap-4 p-6" aria-live="polite">
          <p className="eyebrow">Authentication lifecycle harness</p>
          <h2 className="title" data-testid="session-state">{message}</h2>
          {user ? (
            <div data-testid="private-content">Private league data remains mounted.</div>
          ) : (
            <div data-testid="signed-out-content">No private league data is mounted.</div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={buttonSecondaryClass}
              onClick={() => setMessage("Secure session refreshed")}
              disabled={!user}
            >
              Simulate token refresh
            </button>
            <button
              type="button"
              className={buttonSecondaryClass}
              onClick={() => setMessage("Sign in was cancelled. The desk did not move.")}
            >
              Simulate popup cancellation
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
