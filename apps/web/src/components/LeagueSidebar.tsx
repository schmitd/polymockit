import type {
  EnrichedPosition,
  LeagueDetail,
  LeagueStanding,
  LeagueSummary,
  PolymarketHistoryPoint,
  PolymarketMarket,
} from "@polymockit/effect-services";
import type { FormEventHandler } from "react";
import { formatCurrency, formatDateTime, formatPercent, shortMarket } from "../lib/analytics";
import { PriceHistoryChart } from "./PriceHistoryChart";
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  inputClass,
  monoClass,
  panelClass,
  rowCardClass,
  sectionBoxClass,
  statusPillClass,
} from "./ui";

interface HistoryStats {
  latest: number;
  high: number;
  low: number;
}

interface LeagueSidebarProps {
  selectedLeague: LeagueSummary | null;
  leagueDetail: LeagueDetail | null;
  selectedMarket: PolymarketMarket | null;
  selectedOutcome: string | null;
  onSelectedOutcomeChange: (outcome: string) => void;
  marketHistory: PolymarketHistoryPoint[];
  historyStats: HistoryStats | null;
  isRefreshingLeague: boolean;
  standings: LeagueStanding[];
  maxLeaderboardRows: number;
  slugInput: string;
  onSlugInputChange: (slug: string) => void;
  isOpeningSlug: boolean;
  onOpenSlug: FormEventHandler<HTMLFormElement>;
  stakeInput: string;
  onStakeInputChange: (stake: string) => void;
  onPlaceBet: FormEventHandler<HTMLFormElement>;
  busy: string | null;
  myPositions: EnrichedPosition[];
  maxPositionsRows: number;
  onCashOutPosition: (position: EnrichedPosition) => void;
  maxRecentBetsRows: number;
}

export function LeagueSidebar({
  selectedLeague,
  leagueDetail,
  selectedMarket,
  selectedOutcome,
  onSelectedOutcomeChange,
  marketHistory,
  historyStats,
  isRefreshingLeague,
  standings,
  maxLeaderboardRows,
  slugInput,
  onSlugInputChange,
  isOpeningSlug,
  onOpenSlug,
  stakeInput,
  onStakeInputChange,
  onPlaceBet,
  busy,
  myPositions,
  maxPositionsRows,
  onCashOutPosition,
  maxRecentBetsRows,
}: LeagueSidebarProps) {
  return (
    <aside className={panelClass} aria-label="League desk">
      <section className={sectionBoxClass}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="section-title">Market History</h3>
          {selectedOutcome ? <span className={statusPillClass}>{selectedOutcome}</span> : null}
        </div>
        {selectedMarket ? <p className="m-0 text-[var(--muted)]">{shortMarket(selectedMarket.question)}</p> : null}
        <div className="h-[6.35rem]">
          <PriceHistoryChart points={marketHistory} />
        </div>
        <div className={`${monoClass} grid grid-cols-3 gap-1.5 text-[var(--muted)]`}>
          <span>Latest {historyStats ? formatPercent(historyStats.latest) : "--"}</span>
          <span>Low {historyStats ? formatPercent(historyStats.low) : "--"}</span>
          <span>High {historyStats ? formatPercent(historyStats.high) : "--"}</span>
        </div>
      </section>

      {selectedLeague && leagueDetail ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="title">{selectedLeague.name}</h2>
              <p className="m-0 text-[var(--muted)]">Invite code {leagueDetail.league.code}</p>
            </div>
            <span className={statusPillClass}>{isRefreshingLeague ? "Syncing" : "Live"}</span>
          </div>

          <section className="grid gap-2">
            <h3 className="section-title">Leaderboard</h3>
            <div className="grid gap-2 overflow-hidden">
              {standings.slice(0, maxLeaderboardRows).map((entry, index, rows) => (
                <div
                  key={entry.userId}
                  className={`flex justify-between gap-3 py-2 ${index < rows.length - 1 ? "border-b border-[var(--line)]/50" : ""}`}
                >
                  <div>
                    <strong className="block">
                      #{index + 1} {entry.displayName}
                    </strong>
                    <small className={`${monoClass} text-[var(--muted)]`}>@{entry.username}</small>
                  </div>
                  <div className={`${monoClass} grid gap-0.5 text-right`}>
                    <span>{formatCurrency(entry.equity)} equity</span>
                    <span className={entry.pnl >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}>
                      {entry.pnl >= 0 ? "+" : ""}
                      {formatCurrency(entry.pnl)}
                    </span>
                  </div>
                </div>
              ))}
              {standings.length > maxLeaderboardRows ? (
                <p className="m-0 text-[var(--muted)]">Showing top {maxLeaderboardRows} of {standings.length} members.</p>
              ) : null}
            </div>
          </section>
          <form className="mb-1 grid gap-2 xl:grid-cols-[minmax(0,1fr)_auto]" onSubmit={onOpenSlug}>
            <input
              className={inputClass}
              value={slugInput}
              onChange={(event) => onSlugInputChange(event.target.value)}
              placeholder="Open market by slug..."
              aria-label="Open market by slug"
            />
            <button type="submit" className={buttonPrimaryClass} disabled={isOpeningSlug || !slugInput.trim()}>
              {isOpeningSlug ? "..." : "Open"}
            </button>
          </form>
          <section className="grid gap-2">
            <form className="grid gap-2" onSubmit={onPlaceBet}>
              <h3 className="section-title">Buy Position</h3>
              <p className="m-0 text-[var(--muted)]">{selectedMarket?.question ?? "Choose a market on the left."}</p>
              <div className="grid items-center gap-2 xl:grid-cols-[auto_minmax(12rem,1fr)_auto_minmax(7rem,9rem)]">
                <label className="text-[0.88rem] font-semibold text-[var(--muted)]" htmlFor="position-outcome">Outcome</label>
                <select
                  id="position-outcome"
                  className={inputClass}
                  value={selectedOutcome ?? ""}
                  onChange={(event) => onSelectedOutcomeChange(event.target.value)}
                >
                  {(selectedMarket?.outcomes ?? []).map((outcome) => (
                    <option value={outcome.name} key={`${selectedMarket?.marketId}-${outcome.name}`}>
                      {outcome.name} ({formatPercent(outcome.price)})
                    </option>
                  ))}
                </select>
                <label className="text-[0.88rem] font-semibold text-[var(--muted)]" htmlFor="position-stake">Stake</label>
                <input
                  id="position-stake"
                  required
                  className={inputClass}
                  type="number"
                  min={1}
                  step={1}
                  value={stakeInput}
                  onChange={(event) => onStakeInputChange(event.target.value)}
                />
              </div>

              <button type="submit" className={`${buttonPrimaryClass} w-full sm:w-fit`} disabled={busy === "placeBet"}>
                {busy === "placeBet" ? "Submitting..." : "Buy Position"}
              </button>
            </form>
            <p className="m-0 text-[0.78rem] text-[var(--muted)]">Returns are added to cash only when you cash out.</p>
          </section>

          <section className="grid gap-2">
            <h3 className="section-title">Open Positions</h3>
            <div className="grid gap-2 overflow-hidden">
              {myPositions.length === 0 ? <p className="m-0 text-[var(--muted)]">No positions yet.</p> : null}
              {myPositions.slice(0, maxPositionsRows).map((position) => (
                <div
                  key={position._id}
                  className={`${rowCardClass} flex justify-between gap-3 p-3`}
                >
                  <div>
                    <strong className="block">{shortMarket(position.marketQuestion)}</strong>
                    <small className={`${monoClass} text-[var(--muted)]`}>
                      {position.outcome} | {position.shares.toFixed(2)} shares
                    </small>
                  </div>
                  <div className={`${monoClass} grid gap-0.5 text-right`}>
                    <span>{formatCurrency(position.currentValue)}</span>
                    <span className={position.unrealizedPnl >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}>
                      {position.unrealizedPnl >= 0 ? "+" : ""}
                      {formatCurrency(position.unrealizedPnl)}
                    </span>
                    <button
                      type="button"
                      className={`${buttonSecondaryClass} mt-1 px-2.5 py-1.5 text-[0.74rem]`}
                      onClick={() => onCashOutPosition(position)}
                      disabled={busy === `cashOut:${position._id}`}
                    >
                      {busy === `cashOut:${position._id}` ? "Cashing out..." : "Cash Out"}
                    </button>
                  </div>
                </div>
              ))}
              {myPositions.length > maxPositionsRows ? (
                <p className="m-0 text-[var(--muted)]">Showing {maxPositionsRows} of {myPositions.length} positions.</p>
              ) : null}
            </div>
          </section>

          <section className="grid gap-2">
            <h3 className="section-title">Recent Bets</h3>
            <div className="grid gap-2 overflow-hidden">
              {leagueDetail.recentBets.slice(0, maxRecentBetsRows).map((bet, index, rows) => (
                <div
                  key={bet._id}
                  className={`flex justify-between gap-3 py-2 ${index < rows.length - 1 ? "border-b border-[var(--line)]/50" : ""}`}
                >
                  <div>
                    <strong className="block">{shortMarket(bet.marketQuestion)}</strong>
                    <small className={`${monoClass} text-[var(--muted)]`}>
                      {bet.displayName} {bet.side === "sell" ? "sold" : "bought"} {bet.outcome} at {formatPercent(bet.price)}
                    </small>
                  </div>
                  <div className={`${monoClass} grid gap-0.5 text-right`}>
                    <span>{bet.side === "sell" ? `+${formatCurrency(bet.stake)}` : formatCurrency(bet.stake)}</span>
                    <small className={`${monoClass} text-[var(--muted)]`}>{formatDateTime(bet.createdAt)}</small>
                  </div>
                </div>
              ))}
              {leagueDetail.recentBets.length > maxRecentBetsRows ? (
                <p className="m-0 text-[var(--muted)]">
                  Showing {maxRecentBetsRows} of {leagueDetail.recentBets.length} recent bets.
                </p>
              ) : null}
            </div>
          </section>
        </>
      ) : (
        <div className="section-box p-6 text-center text-[var(--muted)]">
          <h2 className="title text-[var(--ink)]">No League Selected</h2>
          <p className="m-0">Create or join a league to start placing fantasy positions.</p>
        </div>
      )}
    </aside>
  );
}
