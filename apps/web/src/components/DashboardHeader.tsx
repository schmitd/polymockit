import type { AppUser } from "@polymockit/effect-services";

type AppRoute = "desk" | "leagues";

interface DashboardHeaderProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  user: AppUser;
  isSigningOut: boolean;
  onSignOut: () => void;
}

const glassClass =
  "border border-[var(--line)] shadow-[var(--shadow)] backdrop-blur-[12px] bg-[linear-gradient(160deg,rgba(16,28,39,0.84),rgba(11,20,28,0.74))]";
const eyebrowClass = "text-[0.72rem] uppercase tracking-[0.08em] font-bold text-[var(--accent)]";
const buttonPrimaryClass =
  "rounded-[0.8rem] border-0 bg-[linear-gradient(135deg,#28cfae_0%,#12a6bc_100%)] px-4 py-2.5 font-bold text-[#022018] transition duration-150 hover:-translate-y-px hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-65";
const buttonSecondaryClass =
  "rounded-[0.8rem] border border-[var(--line)] bg-[rgba(11,20,28,0.58)] px-4 py-2.5 font-bold text-[var(--ink)] transition duration-150 hover:-translate-y-px hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-65";

export function DashboardHeader({
  currentRoute,
  onNavigate,
  user,
  isSigningOut,
  onSignOut,
}: DashboardHeaderProps) {
  return (
    <header
      className={`${glassClass} mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[0.92rem] p-4 sm:mx-6`}
    >
      <div>
        <p className={eyebrowClass}>Polymockit</p>
        <h1 className="m-0 text-[clamp(1.15rem,2.5vw,1.6rem)] leading-[1.16]">Fantasy Prediction Desk</h1>
      </div>

      <div className="flex w-full flex-wrap items-center justify-end gap-3 xl:w-auto xl:justify-start">
        <div className="flex gap-2">
          <button
            type="button"
            className={currentRoute === "desk" ? buttonPrimaryClass : buttonSecondaryClass}
            onClick={() => onNavigate("desk")}
          >
            Desk
          </button>
          <button
            type="button"
            className={currentRoute === "leagues" ? buttonPrimaryClass : buttonSecondaryClass}
            onClick={() => onNavigate("leagues")}
          >
            League Setup
          </button>
        </div>

        <div className="flex min-w-0 items-center gap-2.5 rounded-full border border-[var(--line)] bg-[rgba(10,18,26,0.72)] px-3 py-1.5">
          <span
            className="grid h-7 w-7 place-items-center rounded-full font-semibold text-[#04110f]"
            style={{ backgroundColor: user.accentColor }}
          >
            {user.displayName.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <strong className="block">{user.displayName}</strong>
            <small className="font-['IBM_Plex_Mono'] text-[var(--muted)]">@{user.username}</small>
          </div>
        </div>

        <button type="button" className={buttonSecondaryClass} onClick={onSignOut} disabled={isSigningOut}>
          {isSigningOut ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </header>
  );
}
