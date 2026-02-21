import { ConvexReactClient } from "convex/react";
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

const asAction = (name: string) => name as unknown as FunctionReference<"action">;

const normalizeError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }
  return new Error("Polymarket request failed.");
};

export const makePolymarketClientLayer = (client: ConvexReactClient) => {

  return Layer.succeed(PolymarketClient, {
    listMarkets: (input = {}) =>
      Effect.tryPromise({
        try: async () => {
          return await client.action(asAction("polymarket:listMarkets"), input);
        },
        catch: normalizeError,
      }),

    listTags: (input = {}) =>
      Effect.tryPromise({
        try: async () => {
          return await client.action(asAction("polymarket:listTags"), input);
        },
        catch: normalizeError,
      }),

    getMarketBySlug: (slug: string) =>
      Effect.tryPromise({
        try: async () => {
          return await client.action(asAction("polymarket:getMarketBySlug"), { slug });
        },
        catch: normalizeError,
      }),

    getMarket: (marketId: string) =>
      Effect.tryPromise({
        try: async () => {
          return await client.action(asAction("polymarket:getMarket"), { marketId });
        },
        catch: normalizeError,
      }),

    getOutcomePrice: (marketId: string, outcome: string) =>
      Effect.tryPromise({
        try: async () => {
          return await client.action(asAction("polymarket:getOutcomePrice"), { marketId, outcome });
        },
        catch: normalizeError,
      }),

    getOutcomeHistory: (marketId: string, outcome: string) =>
      Effect.tryPromise({
        try: async () => {
          return await client.action(asAction("polymarket:getOutcomeHistory"), { marketId, outcome });
        },
        catch: normalizeError,
      }),
  });
};
