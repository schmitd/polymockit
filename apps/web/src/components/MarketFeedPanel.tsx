import type { PolymarketMarket, PolymarketTag } from "@polymockit/effect-services";
import { formatCurrency, formatPercent, shortMarket } from "../lib/analytics";

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
    <section className="panel glass markets-panel">
      <div className="panel-head">
        <div>
          <h2>Polymarket Feed</h2>
          <p className="muted">Browse markets by feed, slug, and tags.</p>
        </div>
        <span className="status-pill">
          {isRefreshingMarkets ? "Refreshing" : `${Math.min(markets.length, maxMarketRows)} shown`}
        </span>
      </div>

      <div className="market-controls-row">
        <div className="toggle-row">
          <button
            type="button"
            className={feedMode === "trending" ? "" : "secondary"}
            onClick={() => onFeedModeChange("trending")}
          >
            Trending
          </button>
          <button
            type="button"
            className={feedMode === "recent" ? "" : "secondary"}
            onClick={() => onFeedModeChange("recent")}
          >
            Recent
          </button>
        </div>

        <div className="tag-filter-inline">
          <input
            value={tagSearch}
            onChange={(event) => onTagSearchChange(event.target.value)}
            placeholder="Filter tags..."
            aria-label="Filter tags"
          />
          {selectedTagSlug ? (
            <button type="button" className="secondary" onClick={() => onSelectTag(null)}>
              Clear
            </button>
          ) : null}
        </div>
      </div>

      <div className="tag-list single-row">
        {isLoadingTags ? <span className="muted">Loading tags...</span> : null}
        {!isLoadingTags &&
          visibleTags.slice(0, 40).map((tag) => (
            <button
              type="button"
              key={tag.id}
              className={`tag-chip ${selectedTagSlug === tag.slug ? "active" : ""}`}
              onClick={() => onSelectTag(tag.slug)}
              title={tag.slug}
            >
              {tag.label}
            </button>
          ))}
      </div>

      <div className="market-grid">
        {markets.slice(0, maxMarketRows).map((market) => (
          <button
            type="button"
            key={market.marketId}
            className={`market-card ${market.marketId === selectedMarketId ? "active" : ""}`}
            onClick={() => onSelectMarket(market.marketId)}
          >
            <h3>{shortMarket(market.question)}</h3>
            <div className="market-outcomes">
              {market.outcomes.map((outcome) => (
                <span key={`${market.marketId}-${outcome.name}`}>
                  {outcome.name}: {formatPercent(outcome.price)}
                </span>
              ))}
            </div>
            <div className="market-stats">
              <span>Vol {formatCurrency(market.volume)}</span>
              <span>Liquidity {formatCurrency(market.liquidity)}</span>
            </div>
          </button>
        ))}
        {markets.length > maxMarketRows ? <p className="muted">Showing {maxMarketRows} of {markets.length} markets.</p> : null}
      </div>
    </section>
  );
}
