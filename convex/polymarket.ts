import { ConvexError, v } from "convex/values";
import { action } from "./_generated/server";

const GAMMA_BASE = "https://gamma-api.polymarket.com";

type RawMarket = {
  id: string;
  question: string;
  slug?: string;
  outcomes?: string;
  outcomePrices?: string;
  clobTokenIds?: string;
  active: boolean;
  closed: boolean;
  endDate?: string;
  volume?: string;
  liquidity?: string;
  icon?: string;
  createdAt?: string;
  updatedAt?: string;
};

type RawTag = {
  id: string | number;
  label?: string;
  slug?: string;
};

type RawHistoryResponse = {
  history?: Array<{
    t: number;
    p: number;
  }>;
};

type RawEvent = {
  markets?: RawMarket[];
};

const parseStringArray = (input?: string): string[] => {
  if (!input) {
    return [];
  }
  try {
    const parsed = JSON.parse(input) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((item) => String(item));
  } catch {
    return [];
  }
};

const parseNumber = (input?: string): number => {
  if (!input) {
    return 0;
  }
  const value = Number.parseFloat(input);
  return Number.isFinite(value) ? value : 0;
};

const toMarket = (market: RawMarket) => {
  const outcomeNames = parseStringArray(market.outcomes);
  const outcomePrices = parseStringArray(market.outcomePrices).map((price) => Number.parseFloat(price));

  return {
    marketId: market.id,
    question: market.question,
    slug: market.slug,
    outcomes: outcomeNames.map((name, index) => ({
      name,
      price: Number.isFinite(outcomePrices[index]) ? outcomePrices[index] : 0,
    })),
    clobTokenIds: parseStringArray(market.clobTokenIds),
    active: market.active,
    closed: market.closed,
    endDate: market.endDate,
    volume: parseNumber(market.volume),
    liquidity: parseNumber(market.liquidity),
    icon: market.icon,
    createdAt: market.createdAt,
    updatedAt: market.updatedAt,
  };
};

const fetchJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${GAMMA_BASE}${path}`);
  if (!response.ok) {
    throw new ConvexError(`Polymarket API error (${response.status})`);
  }
  return (await response.json()) as T;
};

const fetchAbsoluteJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new ConvexError(`Polymarket API error (${response.status})`);
  }
  return (await response.json()) as T;
};

export const listMarkets = action({
  args: {
    query: v.optional(v.string()),
    tagSlug: v.optional(v.string()),
    mode: v.optional(v.union(v.literal("trending"), v.literal("recent"))),
    limit: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    const cappedLimit = Math.min(Math.max(Math.round(args.limit ?? 60), 10), 200);
    const search = args.query?.trim().toLowerCase() ?? "";
    const tagSlug = args.tagSlug?.trim().toLowerCase() ?? "";
    const mode = args.mode ?? "trending";
    const pageSize = Math.min(200, cappedLimit);
    const seen = new Set<string>();
    const markets: Array<ReturnType<typeof toMarket>> = [];
    let offset = 0;

    if (tagSlug) {
      while (markets.length < cappedLimit) {
        const params = new URLSearchParams({
          active: "true",
          closed: "false",
          limit: String(pageSize),
          offset: String(offset),
          tag_slug: tagSlug,
        });

        const page = await fetchJson<RawEvent[]>(`/events?${params.toString()}`);
        if (page.length === 0) {
          break;
        }

        for (const event of page) {
          for (const raw of event.markets ?? []) {
            const market = toMarket(raw);
            if (market.closed || !market.active) {
              continue;
            }
            if (
              search &&
              !market.question.toLowerCase().includes(search) &&
              !(market.slug ?? "").toLowerCase().includes(search)
            ) {
              continue;
            }
            if (seen.has(market.marketId)) {
              continue;
            }
            seen.add(market.marketId);
            markets.push(market);
            if (markets.length >= cappedLimit) {
              break;
            }
          }
          if (markets.length >= cappedLimit) {
            break;
          }
        }

        offset += page.length;
        if (page.length < pageSize) {
          break;
        }
      }
    } else {
      while (markets.length < cappedLimit) {
        const params = new URLSearchParams({
          active: "true",
          closed: "false",
          limit: String(pageSize),
          offset: String(offset),
        });
        if (search) {
          params.set("search", search);
        }

        const page = await fetchJson<RawMarket[]>(`/markets?${params.toString()}`);
        if (page.length === 0) {
          break;
        }

        for (const raw of page) {
          const market = toMarket(raw);
          if (seen.has(market.marketId)) {
            continue;
          }
          seen.add(market.marketId);
          markets.push(market);
          if (markets.length >= cappedLimit) {
            break;
          }
        }

        offset += page.length;
        if (page.length < pageSize) {
          break;
        }
      }
    }

    const normalized = markets.slice(0, cappedLimit);
    if (mode === "recent") {
      return normalized.sort((a, b) => {
        const left = Date.parse(a.createdAt ?? "");
        const right = Date.parse(b.createdAt ?? "");
        return (Number.isFinite(right) ? right : 0) - (Number.isFinite(left) ? left : 0);
      });
    }
    return normalized.sort((a, b) => b.volume - a.volume);
  },
});

export const getMarketBySlug = action({
  args: {
    slug: v.string(),
  },
  handler: async (_ctx, args) => {
    const slug = args.slug.trim().toLowerCase();
    if (!slug) {
      throw new ConvexError("Market slug is required.");
    }

    const params = new URLSearchParams({
      slug,
      limit: "1",
      active: "true",
      closed: "false",
    });
    const page = await fetchJson<RawMarket[]>(`/markets?${params.toString()}`);
    const exact = page.find((entry) => entry.slug?.toLowerCase() === slug) ?? page[0];
    if (!exact) {
      throw new ConvexError("No active market found for that slug.");
    }
    return toMarket(exact);
  },
});

export const listTags = action({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    const cappedLimit = Math.min(Math.max(Math.round(args.limit ?? 80), 20), 200);
    const page = await fetchJson<RawTag[]>(`/tags?limit=${cappedLimit}`);
    return page
      .map((tag) => {
        const slug = String(tag.slug ?? "").trim();
        const label = String(tag.label ?? slug).trim();
        if (!slug || !label) {
          return null;
        }
        return {
          id: String(tag.id),
          slug,
          label,
        };
      })
      .filter((tag): tag is { id: string; slug: string; label: string } => tag !== null)
      .sort((a, b) => a.label.localeCompare(b.label));
  },
});

export const getMarket = action({
  args: {
    marketId: v.string(),
  },
  handler: async (_ctx, args) => {
    const marketId = args.marketId.trim();
    if (!marketId) {
      throw new ConvexError("Market ID is required.");
    }
    const data = await fetchJson<RawMarket>(`/markets/${encodeURIComponent(marketId)}`);
    return toMarket(data);
  },
});

export const getOutcomePrice = action({
  args: {
    marketId: v.string(),
    outcome: v.string(),
  },
  handler: async (_ctx, args) => {
    const marketId = args.marketId.trim();
    const outcome = args.outcome.trim().toLowerCase();
    if (!marketId || !outcome) {
      throw new ConvexError("Market ID and outcome are required.");
    }

    const data = await fetchJson<RawMarket>(`/markets/${encodeURIComponent(marketId)}`);
    const market = toMarket(data);
    const match = market.outcomes.find((entry) => entry.name.toLowerCase() === outcome);
    return match?.price ?? null;
  },
});

const downsampleHistory = (
  points: Array<{
    timestamp: number;
    price: number;
  }>,
  maxPoints = 220,
) => {
  if (points.length <= maxPoints) {
    return points;
  }
  const step = Math.ceil(points.length / maxPoints);
  return points.filter((_, index) => index % step === 0);
};

export const getOutcomeHistory = action({
  args: {
    marketId: v.string(),
    outcome: v.string(),
  },
  handler: async (_ctx, args) => {
    const marketId = args.marketId.trim();
    const outcome = args.outcome.trim().toLowerCase();
    if (!marketId || !outcome) {
      throw new ConvexError("Market ID and outcome are required.");
    }

    const rawMarket = await fetchJson<RawMarket>(`/markets/${encodeURIComponent(marketId)}`);
    const market = toMarket(rawMarket);
    const outcomeIndex = market.outcomes.findIndex((entry) => entry.name.toLowerCase() === outcome);
    const tokenId = market.clobTokenIds[outcomeIndex] ?? market.clobTokenIds[0];

    if (!tokenId) {
      return [];
    }

    const params = new URLSearchParams({
      market: tokenId,
      interval: "max",
      fidelity: "60",
    });

    const historyResponse = await fetchAbsoluteJson<RawHistoryResponse>(
      `https://clob.polymarket.com/prices-history?${params.toString()}`,
    );
    const history = Array.isArray(historyResponse.history) ? historyResponse.history : [];
    return downsampleHistory(
      history
      .filter((entry) => Number.isFinite(entry.t) && Number.isFinite(entry.p))
      .map((entry) => ({
        timestamp: Math.floor(entry.t * 1000),
        price: entry.p,
      })),
    );
  },
});
