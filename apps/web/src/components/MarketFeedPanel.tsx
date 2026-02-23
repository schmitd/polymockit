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

const glassClass =
  "border border-[var(--line)] shadow-[var(--shadow)] backdrop-blur-[12px] bg-[linear-gradient(160deg,rgba(16,28,39,0.84),rgba(11,20,28,0.74))]";
const statusPillClass =
  "rounded-full border border-[var(--line)] bg-[rgba(18,35,46,0.74)] px-2 py-0.5 text-[0.78rem] text-[var(--muted)] font-['IBM_Plex_Mono']";
const buttonPrimaryClass =
  "rounded-[0.8rem] border-0 bg-[linear-gradient(135deg,#28cfae_0%,#12a6bc_100%)] px-4 py-2.5 font-bold text-[#022018] transition duration-150 hover:-translate-y-px hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-65";
const buttonSecondaryClass =
  "rounded-[0.8rem] border border-[var(--line)] bg-[rgba(11,20,28,0.58)] px-4 py-2.5 font-bold text-[var(--ink)] transition duration-150 hover:-translate-y-px hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-65";
const inputClass =
  "w-full rounded-[0.7rem] border border-[var(--line)] bg-[rgba(7,14,19,0.74)] px-3 py-2.5 text-[var(--ink)]";

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
    <section className={`${glassClass} flex h-full min-h-0 flex-col gap-3 overflow-hidden rounded-2xl p-3.5`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="m-0 leading-[1.16]">Polymarket Feed</h2>
          <p className="m-0 text-[var(--muted)]">Browse markets by feed, slug, and tags.</p>
        </div>
        <span className={statusPillClass}>{isRefreshingMarkets ? "Refreshing" : `${Math.min(markets.length, maxMarketRows)} shown`}</span>
      </div>

      <div className="grid items-center gap-2 xl:grid-cols-[auto_minmax(14rem,1fr)]">
        <div className="flex gap-2">
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

      <div className="min-h-10 overflow-x-auto overflow-y-hidden py-1">
        <div className="flex w-max min-w-full items-center gap-1.5 whitespace-nowrap">
        {isLoadingTags ? <span className="shrink-0 text-[var(--muted)]">Loading tags...</span> : null}
        {!isLoadingTags && visibleTags.length === 0 ? (
          <span className="shrink-0 text-[var(--muted)]">No active tags for this feed.</span>
        ) : null}
        {!isLoadingTags &&
          visibleTags.map((tag) => (
            <button
              type="button"
              key={tag.id}
              className={`shrink-0 rounded-full border px-2.5 py-1 text-[0.75rem] whitespace-nowrap ${
                selectedTagSlug === tag.slug
                  ? "border-[color-mix(in_srgb,var(--accent)_64%,transparent)] bg-[var(--accent-soft)] text-[var(--ink)]"
                  : "border-[var(--line)] bg-[rgba(10,19,28,0.76)] text-[var(--muted)]"
              }`}
              onClick={() => onSelectTag(tag.slug)}
              title={tag.slug}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid min-h-0 gap-2 overflow-y-auto pr-1">
        {markets.slice(0, maxMarketRows).map((market) => (
          <button
            type="button"
            key={market.marketId}
            className={`grid w-full gap-2 rounded-[0.82rem] border p-3 text-left text-[var(--ink)] ${
              market.marketId === selectedMarketId
                ? "border-[color-mix(in_srgb,var(--accent)_62%,transparent)] bg-[var(--accent-soft)]"
                : "border-[var(--line)] bg-[rgba(8,16,23,0.72)]"
            }`}
            onClick={() => onSelectMarket(market.marketId)}
          >
            <h3 className="m-0 mb-1 text-[0.95rem] leading-[1.16]">{shortMarket(market.question)}</h3>
            <div className="grid gap-0.5 font-['IBM_Plex_Mono'] text-[0.78rem] text-[var(--muted)]">
              {market.outcomes.map((outcome) => (
                <span key={`${market.marketId}-${outcome.name}`}>
                  {outcome.name}: {formatPercent(outcome.price)}
                </span>
              ))}
            </div>
            <div className="grid gap-0.5 font-['IBM_Plex_Mono'] text-[0.78rem] text-[var(--muted)]">
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
