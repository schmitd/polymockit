import type { LeagueSummary } from "@polymockit/effect-services";
import type { FormEventHandler } from "react";
import { formatCurrency } from "../lib/analytics";
import { buttonPrimaryClass, buttonSecondaryClass, inputClass, monoClass, panelClass, rowCardClass } from "./ui";

interface CreateLeagueFormState {
  name: string;
  bankroll: string;
}

interface LeagueSetupViewProps {
  createLeagueForm: CreateLeagueFormState;
  onCreateLeagueNameChange: (name: string) => void;
  onCreateLeagueBankrollChange: (bankroll: string) => void;
  onCreateLeague: FormEventHandler<HTMLFormElement>;
  isCreatingLeague: boolean;
  joinCode: string;
  onJoinCodeChange: (code: string) => void;
  onJoinLeague: FormEventHandler<HTMLFormElement>;
  isJoiningLeague: boolean;
  leagues: LeagueSummary[];
  selectedLeagueId: string | null;
  onOpenLeague: (leagueId: string) => void;
  onBackToDesk: () => void;
}

export function LeagueSetupView({
  createLeagueForm,
  onCreateLeagueNameChange,
  onCreateLeagueBankrollChange,
  onCreateLeague,
  isCreatingLeague,
  joinCode,
  onJoinCodeChange,
  onJoinLeague,
  isJoiningLeague,
  leagues,
  selectedLeagueId,
  onOpenLeague,
  onBackToDesk,
}: LeagueSetupViewProps) {
  return (
    <main className="p-3 sm:p-6">
      <section className={`${panelClass} h-full min-h-0 overflow-hidden`} aria-labelledby="league-setup-title">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="league-setup-title" className="title">League Setup</h2>
            <p className="m-0 text-[var(--muted)]">Create a league, join by code, or reopen an existing desk.</p>
          </div>
          <button type="button" className={buttonSecondaryClass} onClick={onBackToDesk}>
            Back to desk
          </button>
        </div>
        <div className="grid min-h-0 gap-3 xl:grid-cols-3">
          <section className="section-box grid gap-3 p-3">
            <h3 className="section-title">Create League</h3>
            <form className="grid gap-2" onSubmit={onCreateLeague}>
              <label className="sr-only" htmlFor="league-name">League name</label>
              <input
                id="league-name"
                required
                className={inputClass}
                value={createLeagueForm.name}
                onChange={(event) => onCreateLeagueNameChange(event.target.value)}
                placeholder="League name"
              />
              <label className="sr-only" htmlFor="league-bankroll">Starting bankroll</label>
              <input
                id="league-bankroll"
                required
                className={inputClass}
                type="number"
                min={100}
                step={100}
                value={createLeagueForm.bankroll}
                onChange={(event) => onCreateLeagueBankrollChange(event.target.value)}
                placeholder="Starting bankroll"
              />
              <button type="submit" className={buttonPrimaryClass} disabled={isCreatingLeague}>
                {isCreatingLeague ? "Creating..." : "Create"}
              </button>
            </form>
          </section>

          <section className="section-box grid gap-3 p-3">
            <h3 className="section-title">Join League</h3>
            <form className="grid gap-2" onSubmit={onJoinLeague}>
              <label className="sr-only" htmlFor="league-code">Invite code</label>
              <input
                id="league-code"
                required
                className={inputClass}
                value={joinCode}
                onChange={(event) => onJoinCodeChange(event.target.value.toUpperCase())}
                maxLength={8}
                placeholder="Invite code"
              />
              <button type="submit" className={buttonPrimaryClass} disabled={isJoiningLeague}>
                {isJoiningLeague ? "Joining..." : "Join"}
              </button>
            </form>
          </section>

          <section className="section-box grid min-h-0 gap-3 p-3">
            <h3 className="section-title">Your Leagues</h3>
            <div className="grid min-h-0 gap-2 overflow-hidden">
              {leagues.length === 0 ? <p className="m-0 text-[var(--muted)]">No leagues yet. Create one to start the table.</p> : null}
              {leagues.map((league) => (
                <button
                  type="button"
                  key={league.leagueId}
                  className={`${rowCardClass} w-full p-3 text-left`}
                  data-selected={league.leagueId === selectedLeagueId}
                  onClick={() => onOpenLeague(league.leagueId)}
                >
                  <div className="flex justify-between gap-2">
                    <div>
                      <strong className="block">{league.name}</strong>
                      <small className={`${monoClass} text-[var(--muted)]`}>Code {league.code}</small>
                    </div>
                    <div className={`${monoClass} grid gap-0.5 text-right`}>
                      <span>{league.memberCount} players</span>
                      <span>{formatCurrency(league.myCash)} cash</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
