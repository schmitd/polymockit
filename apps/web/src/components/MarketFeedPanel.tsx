import type { PolymarketMarket, PolymarketTag } from "@polymockit/effect-services";
import { formatCurrency, formatPercent, shortMarket } from "../lib/analytics";
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  inputClass,
  monoClass,
  panelClass,
  rowCardClass,
  statusPillClass,
} from "./ui";

type FeedMode = "trending" | "recent";

interface MarketFeedPanelProps {
  feedMode: FeedMode;
  onFeedModeChange: (mode: FeedMode) => void;
  isRefreshingMarkets: boolean;
  markets: PolymarketMarket[];
  maxMarketRows: number;
  selectedMarketId: string | null;
  onSelectMarket: (marketId: string) => void;
  tagSearch: string;
  onTagSearchChange: (search: string) => void;
  selectedTagSlug: string | null;
  onSelectTag: (tagSlug: string | null) => void;
  isLoadingTags: boolean;
  visibleTags: PolymarketTag[];
}

export function MarketFeedPanel({
  feedMode,
  onFeedModeChange,
  isRefreshingMarkets,
  markets,
  maxMarketRows,
  selectedMarketId,
  onSelectMarket,
  tagSearch,
  onTagSearchChange,
  selectedTagSlug,
  onSelectTag,
  isLoadingTags,
  visibleTags,
}: MarketFeedPanelProps) {
  return (
    <section className={panelClass} aria-labelledby="market-feed-title">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="market-feed-title" className="title">Polymarket Feed</h2>
          <p className="m-0 text-[var(--muted)]">Filter live markets, then select one to trade in your league.</p>
        </div>
        <span className={statusPillClass}>{isRefreshingMarkets ? "Refreshing" : `${Math.min(markets.length, maxMarketRows)} shown`}</span>
      </div>

      <div className="grid items-center gap-2 xl:grid-cols-[auto_minmax(14rem,1fr)]">
        <div className="flex gap-2" role="group" aria-label="Feed mode">
          <button
            type="button"
            className={feedMode === "trending" ? buttonPrimaryClass : buttonSecondaryClass}
            onClick={() => onFeedModeChange("trending")}
          >
            Trending
          </button>
          <button
            type="button"
            className={feedMode === "recent" ? buttonPrimaryClass : buttonSecondaryClass}
            onClick={() => onFeedModeChange("recent")}
          >
            Recent
          </button>
        </div>

        <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_auto]">
          <input
            className={inputClass}
            value={tagSearch}
            onChange={(event) => onTagSearchChange(event.target.value)}
            placeholder="Filter tags..."
            aria-label="Filter tags"
          />
          {selectedTagSlug ? (
            <button type="button" className={buttonSecondaryClass} onClick={() => onSelectTag(null)}>
              Clear
            </button>
          ) : null}
        </div>
      </div>

      <div className="min-h-10 py-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {isLoadingTags ? <span className="shrink-0 text-[var(--muted)]">Loading tags...</span> : null}
          {!isLoadingTags && visibleTags.length === 0 ? (
            <span className="shrink-0 text-[var(--muted)]">No active tags match this filter.</span>
          ) : null}
          {!isLoadingTags &&
            visibleTags.map((tag) => (
              <button
                type="button"
                key={tag.id}
                className="chip"
                data-selected={selectedTagSlug === tag.slug}
                onClick={() => onSelectTag(tag.slug)}
                title={tag.slug}
              >
                {tag.label}
              </button>
            ))}
        </div>
      </div>

      <div className="grid gap-2">
        {markets.slice(0, maxMarketRows).map((market) => (
          <button
            type="button"
            key={market.marketId}
            className={`${rowCardClass} grid w-full gap-2 p-3 text-left`}
            data-selected={market.marketId === selectedMarketId}
            onClick={() => onSelectMarket(market.marketId)}
          >
            <h3 className="section-title text-[0.95rem]">{shortMarket(market.question)}</h3>
            <div className={`${monoClass} grid gap-0.5 text-[var(--muted)]`}>
              {market.outcomes.map((outcome) => (
                <span key={`${market.marketId}-${outcome.name}`}>
                  {outcome.name}: {formatPercent(outcome.price)}
                </span>
              ))}
            </div>
            <div className={`${monoClass} grid gap-0.5 text-[var(--muted)] sm:grid-cols-2`}>
              <span>Vol {formatCurrency(market.volume)}</span>
              <span>Liquidity {formatCurrency(market.liquidity)}</span>
            </div>
          </button>
        ))}
        {markets.length > maxMarketRows ? (
          <p className="m-0 text-[var(--muted)]">Showing {maxMarketRows} of {markets.length} markets.</p>
        ) : null}
      </div>
    </section>
  );
}
