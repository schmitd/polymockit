import { Context, Effect, Layer } from "effect";
import type { PolymarketHistoryPoint, PolymarketMarket, PolymarketTag } from "./types";

export interface PolymarketClientApi {
  listMarkets: (input?: {
    query?: string;
    tagSlug?: string;
    mode?: "trending" | "recent";
    limit?: number;
  }) => Effect.Effect<PolymarketMarket[], Error>;
  listTags: (input?: { limit?: number }) => Effect.Effect<PolymarketTag[], Error>;
  getMarketBySlug: (slug: string) => Effect.Effect<PolymarketMarket, Error>;
  getMarket: (marketId: string) => Effect.Effect<PolymarketMarket, Error>;
  getOutcomePrice: (marketId: string, outcome: string) => Effect.Effect<number | null, Error>;
  getOutcomeHistory: (marketId: string, outcome: string) => Effect.Effect<PolymarketHistoryPoint[], Error>;
}

export class PolymarketClient extends Context.Tag("PolymarketClient")<PolymarketClient, PolymarketClientApi>() {}

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

const normalizeError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }
  return new Error("Polymarket request failed.");
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

const toMarket = (market: RawMarket): PolymarketMarket => {
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
    throw new Error(`Polymarket API error (${response.status})`);
  }
  return (await response.json()) as T;
};

const fetchAbsoluteJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Polymarket API error (${response.status})`);
  }
  return (await response.json()) as T;
};

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

export const makePolymarketClientLayer = () => {

  return Layer.succeed(PolymarketClient, {
    listMarkets: (input = {}) =>
      Effect.tryPromise({
        try: async () => {
          const cappedLimit = Math.min(Math.max(Math.round(input.limit ?? 60), 10), 200);
          const search = input.query?.trim().toLowerCase() ?? "";
          const tagSlug = input.tagSlug?.trim().toLowerCase() ?? "";
          const mode = input.mode ?? "trending";
          const pageSize = Math.min(200, cappedLimit);
          const seen = new Set<string>();
          const markets: PolymarketMarket[] = [];
          let offset = 0;

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
            if (tagSlug) {
              params.set("tag_slug", tagSlug);
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
          const normalized = markets.slice(0, cappedLimit);
          if (mode === "recent") {
            return normalized.sort((a, b) => {
              const left = Date.parse(b.createdAt ?? "");
              const right = Date.parse(a.createdAt ?? "");
              return (Number.isFinite(left) ? left : 0) - (Number.isFinite(right) ? right : 0);
            });
          }
          return normalized.sort((a, b) => b.volume - a.volume);
        },
        catch: normalizeError,
      }),

    listTags: (input = {}) =>
      Effect.tryPromise({
        try: async () => {
          const cappedLimit = Math.min(Math.max(Math.round(input.limit ?? 80), 20), 200);
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
            .filter((tag): tag is PolymarketTag => tag !== null)
            .sort((a, b) => a.label.localeCompare(b.label));
        },
        catch: normalizeError,
      }),

    getMarketBySlug: (slug: string) =>
      Effect.tryPromise({
        try: async () => {
          const normalizedSlug = slug.trim().toLowerCase();
          if (!normalizedSlug) {
            throw new Error("Market slug is required.");
          }

          const params = new URLSearchParams({
            slug: normalizedSlug,
            limit: "1",
            active: "true",
            closed: "false",
          });
          const page = await fetchJson<RawMarket[]>(`/markets?${params.toString()}`);
          const exact = page.find((entry) => entry.slug?.toLowerCase() === normalizedSlug) ?? page[0];
          if (!exact) {
            throw new Error("No active market found for that slug.");
          }
          return toMarket(exact);
        },
        catch: normalizeError,
      }),

    getMarket: (marketId: string) =>
      Effect.tryPromise({
        try: async () => {
          const normalizedMarketId = marketId.trim();
          if (!normalizedMarketId) {
            throw new Error("Market ID is required.");
          }
          const data = await fetchJson<RawMarket>(`/markets/${encodeURIComponent(normalizedMarketId)}`);
          return toMarket(data);
        },
        catch: normalizeError,
      }),

    getOutcomePrice: (marketId: string, outcome: string) =>
      Effect.tryPromise({
        try: async () => {
          const normalizedMarketId = marketId.trim();
          const normalizedOutcome = outcome.trim().toLowerCase();
          if (!normalizedMarketId || !normalizedOutcome) {
            throw new Error("Market ID and outcome are required.");
          }

          const data = await fetchJson<RawMarket>(`/markets/${encodeURIComponent(normalizedMarketId)}`);
          const market = toMarket(data);
          const match = market.outcomes.find((entry) => entry.name.toLowerCase() === normalizedOutcome);
          return match?.price ?? null;
        },
        catch: normalizeError,
      }),

    getOutcomeHistory: (marketId: string, outcome: string) =>
      Effect.tryPromise({
        try: async () => {
          const normalizedMarketId = marketId.trim();
          const normalizedOutcome = outcome.trim().toLowerCase();
          if (!normalizedMarketId || !normalizedOutcome) {
            throw new Error("Market ID and outcome are required.");
          }

          const rawMarket = await fetchJson<RawMarket>(`/markets/${encodeURIComponent(normalizedMarketId)}`);
          const market = toMarket(rawMarket);
          const outcomeIndex = market.outcomes.findIndex((entry) => entry.name.toLowerCase() === normalizedOutcome);
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
        catch: normalizeError,
      }),
  });
};
