import type { ConvexReactClient } from "convex/react";
import type { FunctionReference } from "convex/server";
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

const normalizeError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }
  return new Error("Polymarket request failed.");
};

const asAction = (name: string) => name as unknown as FunctionReference<"action">;

export const makePolymarketClientLayer = (client: ConvexReactClient) => {
  const cache = new Map<string, { expiresAt: number; value: unknown }>();
  const inflight = new Map<string, Promise<unknown>>();

  const resolveCached = async <T>(
    key: string,
    ttlMs: number,
    load: () => Promise<T>,
  ): Promise<T> => {
    const now = Date.now();
    const cached = cache.get(key);
    if (cached && cached.expiresAt > now) {
      return cached.value as T;
    }

    const running = inflight.get(key);
    if (running) {
      return (await running) as T;
    }

    const request = load()
      .then((value) => {
        if (ttlMs > 0) {
          cache.set(key, { expiresAt: Date.now() + ttlMs, value });
        }
        return value;
      })
      .finally(() => {
        inflight.delete(key);
      });

    inflight.set(key, request);
    return (await request) as T;
  };

  return Layer.succeed(PolymarketClient, {
    listMarkets: (input = {}) =>
      Effect.tryPromise({
        try: async () =>
          await resolveCached(
            `listMarkets:${JSON.stringify({
              query: input.query ?? "",
              tagSlug: input.tagSlug ?? "",
              mode: input.mode ?? "trending",
              limit: input.limit ?? 60,
            })}`,
            30_000,
            () =>
              client.action(asAction("polymarket:listMarkets"), {
                query: input.query,
                tagSlug: input.tagSlug,
                mode: input.mode,
                limit: input.limit,
              }),
          ),
        catch: normalizeError,
      }),

    listTags: (input = {}) =>
      Effect.tryPromise({
        try: async () =>
          await resolveCached(`listTags:${input.limit ?? 80}`, 300_000, () =>
            client.action(asAction("polymarket:listTags"), {
              limit: input.limit,
            }),
          ),
        catch: normalizeError,
      }),

    getMarketBySlug: (slug: string) =>
      Effect.tryPromise({
        try: async () =>
          await resolveCached(`getMarketBySlug:${slug.trim().toLowerCase()}`, 30_000, () =>
            client.action(asAction("polymarket:getMarketBySlug"), { slug }),
          ),
        catch: normalizeError,
      }),

    getMarket: (marketId: string) =>
      Effect.tryPromise({
        try: async () =>
          await resolveCached(`getMarket:${marketId.trim()}`, 20_000, () =>
            client.action(asAction("polymarket:getMarket"), { marketId }),
          ),
        catch: normalizeError,
      }),

    getOutcomePrice: (marketId: string, outcome: string) =>
      Effect.tryPromise({
        try: async () =>
          await resolveCached(`getOutcomePrice:${marketId.trim()}:${outcome.trim().toLowerCase()}`, 2_500, () =>
            client.action(asAction("polymarket:getOutcomePrice"), { marketId, outcome }),
          ),
        catch: normalizeError,
      }),

    getOutcomeHistory: (marketId: string, outcome: string) =>
      Effect.tryPromise({
        try: async () =>
          await resolveCached(`getOutcomeHistory:${marketId.trim()}:${outcome.trim().toLowerCase()}`, 300_000, () =>
            client.action(asAction("polymarket:getOutcomeHistory"), { marketId, outcome }),
          ),
        catch: normalizeError,
      }),
  });
};
