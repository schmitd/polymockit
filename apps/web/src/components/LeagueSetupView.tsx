import type { LeagueSummary } from "@polymockit/effect-services";
import type { FormEventHandler } from "react";
import { formatCurrency } from "../lib/analytics";

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
    <main className="route-shell">
      <section className="panel glass league-admin-panel">
        <div className="panel-head">
          <div>
            <h2>League Setup</h2>
            <p className="muted">Create new leagues or join with invite code.</p>
          </div>
          <button type="button" className="secondary" onClick={onBackToDesk}>
            Back to desk
          </button>
        </div>
        <div className="league-admin-grid">
          <section>
            <h3>Create League</h3>
            <form className="stack compact" onSubmit={onCreateLeague}>
              <input
                required
                value={createLeagueForm.name}
                onChange={(event) => onCreateLeagueNameChange(event.target.value)}
                placeholder="League name"
              />
              <input
                required
                type="number"
                min={100}
                step={100}
                value={createLeagueForm.bankroll}
                onChange={(event) => onCreateLeagueBankrollChange(event.target.value)}
                placeholder="Starting bankroll"
              />
              <button type="submit" disabled={isCreatingLeague}>
                {isCreatingLeague ? "Creating..." : "Create"}
              </button>
            </form>
          </section>

          <section>
            <h3>Join League</h3>
            <form className="stack compact" onSubmit={onJoinLeague}>
              <input
                required
                value={joinCode}
                onChange={(event) => onJoinCodeChange(event.target.value.toUpperCase())}
                maxLength={8}
                placeholder="Invite code"
              />
              <button type="submit" disabled={isJoiningLeague}>
                {isJoiningLeague ? "Joining..." : "Join"}
              </button>
            </form>
          </section>

          <section>
            <h3>Your Leagues</h3>
            <div className="league-list">
              {leagues.length === 0 ? <p className="muted">No leagues yet. Create one to start.</p> : null}
              {leagues.map((league) => (
                <button
                  type="button"
                  key={league.leagueId}
                  className={`league-item ${league.leagueId === selectedLeagueId ? "active" : ""}`}
                  onClick={() => onOpenLeague(league.leagueId)}
                >
                  <div>
                    <strong>{league.name}</strong>
                    <small>Code {league.code}</small>
                  </div>
                  <div className="league-meta">
                    <span>{league.memberCount} players</span>
                    <span>{formatCurrency(league.myCash)} cash</span>
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
