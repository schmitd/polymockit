import type { AppUser } from "@polymockit/effect-services";
import { buttonPrimaryClass, buttonSecondaryClass, monoClass } from "./ui";

type AppRoute = "desk" | "leagues";

interface DashboardHeaderProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  user: AppUser | null;
  isAuthLoading: boolean;
  isSigningIn: boolean;
  isSigningOut: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

export function DashboardHeader({
  currentRoute,
  onNavigate,
  user,
  isAuthLoading,
  isSigningIn,
  isSigningOut,
  onSignIn,
  onSignOut,
}: DashboardHeaderProps) {
  const authActionLabel = isAuthLoading ? "Checking session..." : isSigningIn ? "Signing in..." : "Sign in";
  const isBusy = isAuthLoading || isSigningIn || isSigningOut;

  return (
    <header className="app-header">
      <div>
        <p className="eyebrow">Polymockit</p>
        <h1 className="title">Prediction leagues</h1>
      </div>

      <div className="header-actions">
        <nav className="desktop-navigation flex gap-2" aria-label="Primary">
          <button
            type="button"
            className={currentRoute === "desk" ? buttonPrimaryClass : buttonSecondaryClass}
            onClick={() => onNavigate("desk")}
            disabled={isAuthLoading}
          >
            Desk
          </button>
          <button
            type="button"
            className={currentRoute === "leagues" ? buttonPrimaryClass : buttonSecondaryClass}
            onClick={() => onNavigate("leagues")}
            disabled={isAuthLoading}
          >
            Leagues
          </button>
        </nav>

        {user ? (
          <>
            <div className="account-summary flex min-w-0 items-center gap-2.5">
              <span
                className="grid h-7 w-7 place-items-center rounded-full font-semibold text-[var(--canvas)]"
                style={{ backgroundColor: user.accentColor }}
                aria-hidden="true"
              >
                {user.displayName.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <strong className="block">{user.displayName}</strong>
                <small className={`${monoClass} text-[var(--muted)]`}>@{user.username}</small>
              </div>
            </div>
            <button type="button" className={buttonSecondaryClass} onClick={onSignOut} disabled={isBusy}>
              {isSigningOut ? "Signing out..." : "Sign out"}
            </button>
          </>
        ) : (
          <button type="button" className={buttonSecondaryClass} onClick={onSignIn} disabled={isBusy}>
            {authActionLabel}
          </button>
        )}
      </div>
    </header>
  );
}
