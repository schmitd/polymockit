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
    <aside className="panel glass league-panel">
      <section className="market-history side-history">
        <div className="market-history-head">
          <h3>Market History</h3>
          {selectedOutcome ? <span className="status-pill">{selectedOutcome}</span> : null}
        </div>
        {selectedMarket ? <p className="muted">{shortMarket(selectedMarket.question)}</p> : null}
        <div className="history-frame">
          <PriceHistoryChart points={marketHistory} />
        </div>
        <div className="history-stats">
          <span>Latest {historyStats ? formatPercent(historyStats.latest) : "--"}</span>
          <span>Low {historyStats ? formatPercent(historyStats.low) : "--"}</span>
          <span>High {historyStats ? formatPercent(historyStats.high) : "--"}</span>
        </div>
      </section>

      {selectedLeague && leagueDetail ? (
        <>
          <div className="panel-head">
            <div>
              <h2>{selectedLeague.name}</h2>
              <p className="muted">Invite code {leagueDetail.league.code}</p>
            </div>
            <span className="status-pill">{isRefreshingLeague ? "Syncing" : "Live"}</span>
          </div>

          <section>
            <h3>Leaderboard</h3>
            <div className="leaderboard">
              {standings.slice(0, maxLeaderboardRows).map((entry, index) => (
                <div key={entry.userId} className="leader-row">
                  <div>
                    <strong>
                      #{index + 1} {entry.displayName}
                    </strong>
                    <small>@{entry.username}</small>
                  </div>
                  <div className="leader-metrics">
                    <span>{formatCurrency(entry.equity)} equity</span>
                    <span className={entry.pnl >= 0 ? "pos" : "neg"}>
                      {entry.pnl >= 0 ? "+" : ""}
                      {formatCurrency(entry.pnl)}
                    </span>
                  </div>
                </div>
              ))}
              {standings.length > maxLeaderboardRows ? (
                <p className="muted">Showing top {maxLeaderboardRows} of {standings.length} members.</p>
              ) : null}
            </div>
          </section>

          <section>
            <h3>Place Fantasy Bet</h3>
            <form className="slug-inline slug-inline-right" onSubmit={onOpenSlug}>
              <input
                value={slugInput}
                onChange={(event) => onSlugInputChange(event.target.value)}
                placeholder="Open market by slug..."
                aria-label="Open market by slug"
              />
              <button type="submit" disabled={isOpeningSlug || !slugInput.trim()}>
                {isOpeningSlug ? "..." : "Open"}
              </button>
            </form>
            <form className="stack compact" onSubmit={onPlaceBet}>
              <label>
                Market
                <p className="market-static">{selectedMarket?.question ?? "Choose a market on the left"}</p>
              </label>

              <label>
                Outcome
                <select value={selectedOutcome ?? ""} onChange={(event) => onSelectedOutcomeChange(event.target.value)}>
                  {(selectedMarket?.outcomes ?? []).map((outcome) => (
                    <option value={outcome.name} key={`${selectedMarket?.marketId}-${outcome.name}`}>
                      {outcome.name} ({formatPercent(outcome.price)})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Stake
                <input
                  required
                  type="number"
                  min={1}
                  step={1}
                  value={stakeInput}
                  onChange={(event) => onStakeInputChange(event.target.value)}
                />
              </label>

              <button type="submit" disabled={busy === "placeBet"}>
                {busy === "placeBet" ? "Submitting..." : "Buy Position"}
              </button>
            </form>
            <p className="muted compact-note">Returns are added to cash only when you cash out.</p>
          </section>

          <section>
            <h3>Open Positions</h3>
            <div className="positions-list">
              {myPositions.length === 0 ? <p className="muted">No positions yet.</p> : null}
              {myPositions.slice(0, maxPositionsRows).map((position) => (
                <div key={position._id} className="position-row">
                  <div>
                    <strong>{shortMarket(position.marketQuestion)}</strong>
                    <small>
                      {position.outcome} | {position.shares.toFixed(2)} shares
                    </small>
                  </div>
                  <div className="position-metrics">
                    <span>{formatCurrency(position.currentValue)}</span>
                    <span className={position.unrealizedPnl >= 0 ? "pos" : "neg"}>
                      {position.unrealizedPnl >= 0 ? "+" : ""}
                      {formatCurrency(position.unrealizedPnl)}
                    </span>
                    <button
                      type="button"
                      className="secondary cashout-button"
                      onClick={() => onCashOutPosition(position)}
                      disabled={busy === `cashOut:${position._id}`}
                    >
                      {busy === `cashOut:${position._id}` ? "Cashing out..." : "Cash Out"}
                    </button>
                  </div>
                </div>
              ))}
              {myPositions.length > maxPositionsRows ? (
                <p className="muted">Showing {maxPositionsRows} of {myPositions.length} positions.</p>
              ) : null}
            </div>
          </section>

          <section>
            <h3>Recent Bets</h3>
            <div className="positions-list">
              {leagueDetail.recentBets.slice(0, maxRecentBetsRows).map((bet) => (
                <div key={bet._id} className="position-row">
                  <div>
                    <strong>{shortMarket(bet.marketQuestion)}</strong>
                    <small>
                      {bet.displayName} {bet.side === "sell" ? "sold" : "bought"} {bet.outcome} at{" "}
                      {formatPercent(bet.price)}
                    </small>
                  </div>
                  <div className="position-metrics">
                    <span>{bet.side === "sell" ? `+${formatCurrency(bet.stake)}` : formatCurrency(bet.stake)}</span>
                    <small>{formatDateTime(bet.createdAt)}</small>
                  </div>
                </div>
              ))}
              {leagueDetail.recentBets.length > maxRecentBetsRows ? (
                <p className="muted">Showing {maxRecentBetsRows} of {leagueDetail.recentBets.length} recent bets.</p>
              ) : null}
            </div>
          </section>
        </>
      ) : (
        <div className="empty-state">
          <h2>No league selected</h2>
          <p>Create or join a league to start placing fantasy positions.</p>
        </div>
      )}
    </aside>
  );
}
