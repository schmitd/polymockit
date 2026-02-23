import type { AppUser } from "@polymockit/effect-services";

type AppRoute = "desk" | "leagues";

interface DashboardHeaderProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  user: AppUser;
  isSigningOut: boolean;
  onSignOut: () => void;
}

export function DashboardHeader({
  currentRoute,
  onNavigate,
  user,
  isSigningOut,
  onSignOut,
}: DashboardHeaderProps) {
  return (
    <header className="topbar glass">
      <div>
        <p className="eyebrow">Polymockit</p>
        <h1>Fantasy Prediction Desk</h1>
      </div>

      <div className="topbar-right">
        <div className="route-switch">
          <button type="button" className={currentRoute === "desk" ? "" : "secondary"} onClick={() => onNavigate("desk")}>
            Desk
          </button>
          <button
            type="button"
            className={currentRoute === "leagues" ? "" : "secondary"}
            onClick={() => onNavigate("leagues")}
          >
            League Setup
          </button>
        </div>

        <div className="identity-chip">
          <span className="avatar" style={{ backgroundColor: user.accentColor }}>
            {user.displayName.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <strong>{user.displayName}</strong>
            <small>@{user.username}</small>
          </div>
        </div>

        <button type="button" className="secondary" onClick={onSignOut} disabled={isSigningOut}>
          {isSigningOut ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </header>
  );
}
