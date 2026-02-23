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

const glassClass =
  "border border-[var(--line)] shadow-[var(--shadow)] backdrop-blur-[12px] bg-[linear-gradient(160deg,rgba(16,28,39,0.84),rgba(11,20,28,0.74))]";
const buttonPrimaryClass =
  "rounded-[0.8rem] border-0 bg-[linear-gradient(135deg,#28cfae_0%,#12a6bc_100%)] px-4 py-2.5 font-bold text-[#022018] transition duration-150 hover:-translate-y-px hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-65";
const buttonSecondaryClass =
  "rounded-[0.8rem] border border-[var(--line)] bg-[rgba(11,20,28,0.58)] px-4 py-2.5 font-bold text-[var(--ink)] transition duration-150 hover:-translate-y-px hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-65";
const inputClass =
  "w-full rounded-[0.7rem] border border-[var(--line)] bg-[rgba(7,14,19,0.74)] px-3 py-2.5 text-[var(--ink)]";

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
      <section className={`${glassClass} flex h-full min-h-0 flex-col gap-3 overflow-hidden rounded-2xl p-3.5`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="m-0 leading-[1.16]">League Setup</h2>
            <p className="m-0 text-[var(--muted)]">Create new leagues or join with invite code.</p>
          </div>
          <button type="button" className={buttonSecondaryClass} onClick={onBackToDesk}>
            Back to desk
          </button>
        </div>
        <div className="grid min-h-0 gap-3 xl:grid-cols-3">
          <section className="grid gap-2">
            <h3 className="m-0 leading-[1.16]">Create League</h3>
            <form className="grid gap-2" onSubmit={onCreateLeague}>
              <input
                required
                className={inputClass}
                value={createLeagueForm.name}
                onChange={(event) => onCreateLeagueNameChange(event.target.value)}
                placeholder="League name"
              />
              <input
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

          <section className="grid gap-2">
            <h3 className="m-0 leading-[1.16]">Join League</h3>
            <form className="grid gap-2" onSubmit={onJoinLeague}>
              <input
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

          <section className="grid min-h-0 gap-2">
            <h3 className="m-0 leading-[1.16]">Your Leagues</h3>
            <div className="grid min-h-0 gap-2 overflow-hidden">
              {leagues.length === 0 ? <p className="m-0 text-[var(--muted)]">No leagues yet. Create one to start.</p> : null}
              {leagues.map((league) => (
                <button
                  type="button"
                  key={league.leagueId}
                  className={`w-full rounded-[0.82rem] border p-3 text-left text-[var(--ink)] ${
                    league.leagueId === selectedLeagueId
                      ? "border-[color-mix(in_srgb,var(--accent)_62%,transparent)] bg-[var(--accent-soft)]"
                      : "border-[var(--line)] bg-[rgba(8,16,23,0.72)]"
                  }`}
                  onClick={() => onOpenLeague(league.leagueId)}
                >
                  <div className="flex justify-between gap-2">
                    <div>
                      <strong className="block">{league.name}</strong>
                      <small className="font-['IBM_Plex_Mono'] text-[var(--muted)]">Code {league.code}</small>
                    </div>
                    <div className="grid gap-0.5 text-right font-['IBM_Plex_Mono'] text-[0.78rem]">
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
